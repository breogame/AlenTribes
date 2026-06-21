"""
Roleplay Stream Board - FastAPI backend with WebSockets.
In-memory per-room state (no database). Clients connect via WebSocket and
broadcast actions (card create/update/move/delete, dice rolls, etc).
"""
from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import json
import uuid
import asyncio
import logging
import secrets
from pathlib import Path
from typing import Dict, Any
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

app = FastAPI(title="Roleplay Stream Board")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Cleanup config
CLEANUP_INTERVAL_SECONDS = int(os.environ.get("ROOM_CLEANUP_INTERVAL", 5 * 60))
ROOM_TTL_SECONDS = int(os.environ.get("ROOM_TTL_SECONDS", 30 * 60))


# ---------------------------------------------------------------------------
# In-memory state
# ---------------------------------------------------------------------------
def _default_state() -> Dict[str, Any]:
    return {
        "cards": [],          # list of card dicts
        "library": [],        # saved card templates (by name)
        "history": [],        # dice roll log (newest first)
        "background": None,   # optional data URL
        "scale": 1.0,         # global card scale
        "diceType": 6,        # 6 | 12
        "soundEnabled": True,
    }


class Room:
    def __init__(self, token: str, gm_secret: str, name: str):
        self.token = token
        self.gm_secret = gm_secret
        self.name = name
        self.state: Dict[str, Any] = _default_state()
        self.clients: Dict[WebSocket, Dict[str, Any]] = {}  # ws -> {name, isGM}
        self.last_activity: datetime = datetime.now(timezone.utc)

    def touch(self) -> None:
        self.last_activity = datetime.now(timezone.utc)

    def serialize_state(self) -> Dict[str, Any]:
        return {
            "type": "STATE",
            "state": self.state,
            "users": [
                {"name": info["name"], "isGM": info["isGM"]}
                for info in self.clients.values()
                if not info.get("isOverlay")
            ],
            "roomName": self.name,
        }


ROOMS: Dict[str, Room] = {}


# ---------------------------------------------------------------------------
# Standalone dice sessions (for PJ.html players who roll outside the board)
# ---------------------------------------------------------------------------
class DiceSession:
    """In-memory ring buffer of rolls keyed by a shareable token.

    The GM creates a session, shares the token with the players. PJ.html
    POSTs rolls to /api/dice/submit and the GM's room polls /rolls.
    """

    def __init__(self, token: str, name: str):
        self.token = token
        self.name = name
        self.rolls: list[Dict[str, Any]] = []  # newest first
        self.last_activity: datetime = datetime.now(timezone.utc)

    def append(self, roll: Dict[str, Any]) -> None:
        self.rolls.insert(0, roll)
        self.rolls = self.rolls[:200]
        self.last_activity = datetime.now(timezone.utc)


DICE_SESSIONS: Dict[str, DiceSession] = {}


def _parse_sides(dice_type: Any) -> int:
    """Accepts 'd6', 'D12', 6, '6', etc. Returns 6 or 12, defaults to 6."""
    if isinstance(dice_type, (int, float)):
        v = int(dice_type)
    else:
        s = str(dice_type or "").lower().lstrip("d").strip()
        try:
            v = int(s)
        except ValueError:
            v = 6
    return 12 if v == 12 else 6


# ---------------------------------------------------------------------------
# REST endpoints
# ---------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"message": "Roleplay Stream Board API", "rooms": len(ROOMS)}


@api_router.post("/room/create")
async def create_room(payload: Dict[str, Any] | None = None):
    payload = payload or {}
    name = (payload.get("name") or "Partida sin nombre")[:80]
    token = secrets.token_urlsafe(8)
    gm_secret = secrets.token_urlsafe(16)
    ROOMS[token] = Room(token=token, gm_secret=gm_secret, name=name)
    logger.info(f"Created room {token} ('{name}')")
    return {"token": token, "gmSecret": gm_secret, "name": name}


@api_router.get("/room/{token}/info")
async def room_info(token: str):
    room = ROOMS.get(token)
    if not room:
        raise HTTPException(status_code=404, detail="Sala no encontrada")
    return {
        "token": room.token,
        "name": room.name,
        "users": len(room.clients),
    }


# ---------------------------------------------------------------------------
# Dice sessions for external clients (PJ.html)
# ---------------------------------------------------------------------------
@api_router.post("/dice/session")
async def create_dice_session(payload: Dict[str, Any] | None = None):
    payload = payload or {}
    name = (payload.get("name") or "Sesión de dados")[:80]
    token = secrets.token_urlsafe(8)
    DICE_SESSIONS[token] = DiceSession(token=token, name=name)
    logger.info(f"Created dice session {token} ('{name}')")
    return {"token": token, "name": name}


@api_router.post("/dice/submit")
async def submit_dice(payload: Dict[str, Any]):
    auth = (payload or {}).get("auth")
    if not auth:
        raise HTTPException(status_code=400, detail="Falta el token de sesión (auth)")
    sess = DICE_SESSIONS.get(auth)
    if not sess:
        raise HTTPException(status_code=404, detail="Sesión de dados no encontrada")

    pj_name = (payload.get("pj_name") or payload.get("pjName") or "Personaje")[:40]
    dice_result_raw = payload.get("dice_result") or payload.get("diceResult") or []
    if not isinstance(dice_result_raw, list) or not dice_result_raw:
        raise HTTPException(status_code=400, detail="dice_result debe ser una lista no vacía")

    sides = _parse_sides(payload.get("dice_type") or payload.get("diceType"))
    dice: list[int] = []
    for v in dice_result_raw:
        try:
            n = int(v)
        except (TypeError, ValueError):
            continue
        if 1 <= n <= sides:
            dice.append(n)
    if not dice:
        raise HTTPException(status_code=400, detail="Los resultados deben ser enteros entre 1 y el número de caras")

    roll = {
        "id": str(uuid.uuid4()),
        "user": pj_name,
        "type": "pj",
        "dice": dice,
        "sides": sides,
        "quantity": len(dice),
        "total": sum(dice),
        "diceType": sides,
        "at": datetime.now(timezone.utc).isoformat(),
        "source": "pj",
    }
    sess.append(roll)
    return {"ok": True, "id": roll["id"], "roll": roll}


@api_router.get("/dice/{token}/rolls")
async def list_dice_rolls(token: str, since: str = "", limit: int = 50):
    sess = DICE_SESSIONS.get(token)
    if not sess:
        raise HTTPException(status_code=404, detail="Sesión de dados no encontrada")
    sess.last_activity = datetime.now(timezone.utc)
    if since:
        rolls = [r for r in sess.rolls if r["at"] > since]
    else:
        rolls = sess.rolls[: max(1, min(200, limit))]
    return {"rolls": rolls, "name": sess.name, "token": sess.token}


# ---------------------------------------------------------------------------
# WebSocket endpoint
# ---------------------------------------------------------------------------
async def broadcast(room: Room, message: Dict[str, Any], exclude: WebSocket | None = None):
    payload = json.dumps(message, default=str)
    dead: list[WebSocket] = []
    for ws in list(room.clients.keys()):
        if ws is exclude:
            continue
        try:
            await ws.send_text(payload)
        except Exception:
            dead.append(ws)
    for ws in dead:
        room.clients.pop(ws, None)


def _clamp_history(history: list, limit: int = 200) -> list:
    return history[:limit]


def _apply_action(room: Room, action: Dict[str, Any], sender_name: str) -> bool:
    """Mutate the room state based on action. Returns True if broadcast needed."""
    atype = action.get("type")
    payload = action.get("payload") or {}
    state = room.state

    if atype == "CARD_CREATE":
        card = payload.get("card")
        if card and card.get("id"):
            state["cards"].append(card)
            return True

    elif atype == "CARD_UPDATE":
        card = payload.get("card")
        if card and card.get("id"):
            for i, c in enumerate(state["cards"]):
                if c["id"] == card["id"]:
                    state["cards"][i] = card
                    return True

    elif atype == "CARD_PATCH":
        # Partial update: {id, patch: {...}}
        cid = payload.get("id")
        patch = payload.get("patch") or {}
        for i, c in enumerate(state["cards"]):
            if c["id"] == cid:
                state["cards"][i] = {**c, **patch}
                return True

    elif atype == "CARD_DELETE":
        cid = payload.get("id")
        before = len(state["cards"])
        state["cards"] = [c for c in state["cards"] if c["id"] != cid]
        return len(state["cards"]) != before

    elif atype == "CARD_DUPLICATE":
        cid = payload.get("id")
        for c in state["cards"]:
            if c["id"] == cid:
                new_card = {**c, "id": str(uuid.uuid4())}
                pos = new_card.get("position") or {"x": 0, "y": 0}
                new_card["position"] = {"x": pos.get("x", 0) + 30, "y": pos.get("y", 0) + 30}
                new_card["name"] = f"{c.get('name', 'Carta')} (copia)"
                state["cards"].append(new_card)
                return True

    elif atype == "BOARD_CLEAR":
        state["cards"] = []
        return True

    elif atype == "LIBRARY_UPSERT":
        # payload: {cards: [...]} - merges by name (new names only)
        new_cards = payload.get("cards") or []
        existing_names = {c["name"] for c in state["library"]}
        added = 0
        for nc in new_cards:
            if nc.get("name") and nc["name"] not in existing_names:
                state["library"].append(nc)
                existing_names.add(nc["name"])
                added += 1
        return added > 0

    elif atype == "LIBRARY_REMOVE":
        name = payload.get("name")
        before = len(state["library"])
        state["library"] = [c for c in state["library"] if c["name"] != name]
        return len(state["library"]) != before

    elif atype == "LIBRARY_REPLACE":
        state["library"] = payload.get("cards") or []
        return True

    elif atype == "DICE_ROLL":
        roll = payload.get("roll")
        if roll:
            # Newest first
            state["history"].insert(0, roll)
            state["history"] = _clamp_history(state["history"])
            return True

    elif atype == "SCALE_SET":
        scale = float(payload.get("scale") or 1.0)
        state["scale"] = max(0.4, min(2.5, scale))
        return True

    elif atype == "BG_SET":
        state["background"] = payload.get("background")
        return True

    elif atype == "BG_SHADE_SET":
        shade = int(payload.get("shade") or 0)
        state["backgroundShade"] = max(0, min(100, shade))
        return True

    elif atype == "DICE_TYPE_SET":
        dt = int(payload.get("diceType") or 6)
        if dt in (6, 12):
            state["diceType"] = dt
            return True

    elif atype == "SOUND_SET":
        state["soundEnabled"] = bool(payload.get("enabled"))
        return True

    elif atype == "HISTORY_CLEAR":
        state["history"] = []
        return True

    elif atype == "STATE_REPLACE":
        # GM-only: replace the entire room state. Used when the GM enables
        # streaming after playing locally so the server inherits their state.
        new_state = payload.get("state")
        if isinstance(new_state, dict):
            merged = _default_state()
            merged.update(new_state)
            room.state = merged
            return True

    return False


@app.websocket("/api/ws/{token}")
async def websocket_room(ws: WebSocket, token: str):
    await ws.accept()
    room = ROOMS.get(token)
    if not room:
        await ws.send_text(json.dumps({"type": "ERROR", "message": "Sala no encontrada"}))
        await ws.close()
        return

    # Wait for initial JOIN message
    try:
        raw = await ws.receive_text()
        join = json.loads(raw)
    except Exception:
        await ws.close()
        return

    if join.get("type") != "JOIN":
        await ws.close()
        return

    name = (join.get("name") or "Invitado")[:40]
    is_gm = bool(join.get("gmSecret") and join.get("gmSecret") == room.gm_secret)
    is_overlay = bool(join.get("overlay"))

    # GM can seed the room state when (re)connecting after a local-only
    # session. We replace the entire state before sending the first STATE
    # broadcast so the connecting client never sees a transient default.
    initial_state = join.get("initialState")
    if is_gm and isinstance(initial_state, dict):
        merged = _default_state()
        merged.update(initial_state)
        room.state = merged

    room.clients[ws] = {"name": name, "isGM": is_gm, "isOverlay": is_overlay}
    room.touch()

    # Send initial state
    await ws.send_text(json.dumps({
        "type": "WELCOME",
        "you": {"name": name, "isGM": is_gm},
    }))
    await ws.send_text(json.dumps(room.serialize_state(), default=str))
    # Notify others
    await broadcast(room, room.serialize_state(), exclude=ws)

    try:
        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            # Only GM can mutate state. Dice rolls allowed for everyone.
            atype = msg.get("type")
            if not is_gm and atype != "DICE_ROLL":
                continue

            changed = _apply_action(room, msg, name)
            if changed:
                room.touch()
                # For card moves, we could broadcast only a light payload, but for
                # simplicity we broadcast full state (it's small).
                await broadcast(room, room.serialize_state())

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.warning(f"WS error in room {token}: {e}")
    finally:
        room.clients.pop(ws, None)
        try:
            await broadcast(room, room.serialize_state())
        except Exception:
            pass
        # Optional: clean up empty rooms after a while (not critical).


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


async def _cleanup_loop():
    """Periodically remove inactive rooms and dice sessions."""
    while True:
        try:
            await asyncio.sleep(CLEANUP_INTERVAL_SECONDS)
            now = datetime.now(timezone.utc)
            stale_rooms = []
            for token, room in list(ROOMS.items()):
                if not room.clients:
                    age = (now - room.last_activity).total_seconds()
                    if age > ROOM_TTL_SECONDS:
                        stale_rooms.append(token)
            for t in stale_rooms:
                ROOMS.pop(t, None)
                logger.info(f"Cleaned up inactive room {t}")

            stale_dice = []
            for token, sess in list(DICE_SESSIONS.items()):
                age = (now - sess.last_activity).total_seconds()
                if age > ROOM_TTL_SECONDS:
                    stale_dice.append(token)
            for t in stale_dice:
                DICE_SESSIONS.pop(t, None)
                logger.info(f"Cleaned up inactive dice session {t}")
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.warning(f"cleanup loop error: {e}")


@app.on_event("startup")
async def _start_cleanup():
    asyncio.create_task(_cleanup_loop())
