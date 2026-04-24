"""
Backend tests for Roleplay Stream Board.

Covers:
  - REST: /api/, /api/room/create, /api/room/{token}/info
  - WebSocket: /api/ws/{token}
    * GM creates room -> connects with gmSecret -> receives WELCOME+STATE
    * Player joins same room -> receives STATE, listed as non-GM
    * GM CARD_CREATE broadcasts to player
    * GM CARD_PATCH (e.g., move) broadcasts to player
    * Player cannot mutate state (CARD_CREATE ignored)
    * Player CAN emit DICE_ROLL (broadcast to GM)
    * BOARD_CLEAR removes cards
    * LIBRARY_UPSERT / LIBRARY_REMOVE
    * SCALE_SET / DICE_TYPE_SET / SOUND_SET / BG_SET
    * Invalid room token -> ERROR + close
"""
import asyncio
import json
import os
import uuid
from urllib.parse import urlparse

import pytest
import requests
import websockets

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://roleplay-stream-1.preview.emergentagent.com").rstrip("/")
WS_BASE = BASE_URL.replace("http", "ws", 1)


# --------------------------- REST tests ---------------------------

class TestRoot:
    def test_root_returns_rooms_count(self):
        r = requests.get(f"{BASE_URL}/api/", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data.get("message") == "Roleplay Stream Board API"
        assert "rooms" in data and isinstance(data["rooms"], int)


class TestRoomCreate:
    def test_create_room_default_name(self):
        r = requests.post(f"{BASE_URL}/api/room/create", json={}, timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert "token" in data and isinstance(data["token"], str) and len(data["token"]) > 0
        assert "gmSecret" in data and isinstance(data["gmSecret"], str) and len(data["gmSecret"]) > 0
        # default name when not provided
        assert data["name"] == "Partida sin nombre"

    def test_create_room_custom_name(self):
        payload = {"name": "TEST_Sala Dragones"}
        r = requests.post(f"{BASE_URL}/api/room/create", json=payload, timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data["name"] == "TEST_Sala Dragones"

    def test_create_room_truncates_long_name(self):
        long = "X" * 200
        r = requests.post(f"{BASE_URL}/api/room/create", json={"name": long}, timeout=10)
        assert r.status_code == 200
        assert len(r.json()["name"]) <= 80


class TestRoomInfo:
    def test_room_info_ok(self):
        c = requests.post(f"{BASE_URL}/api/room/create", json={"name": "TEST_Info"}, timeout=10).json()
        r = requests.get(f"{BASE_URL}/api/room/{c['token']}/info", timeout=10)
        assert r.status_code == 200
        info = r.json()
        assert info["token"] == c["token"]
        assert info["name"] == "TEST_Info"
        assert info["users"] == 0

    def test_room_info_not_found(self):
        r = requests.get(f"{BASE_URL}/api/room/nonexistent_token_xyz/info", timeout=10)
        assert r.status_code == 404


# --------------------------- WebSocket helpers ---------------------------

async def _connect_and_join(token, name, gm_secret=None, timeout=10):
    """Open WS, send JOIN, collect WELCOME + first STATE. Returns (ws, welcome, state)."""
    ws = await websockets.connect(f"{WS_BASE}/api/ws/{token}", open_timeout=timeout)
    await ws.send(json.dumps({"type": "JOIN", "name": name, "gmSecret": gm_secret}))
    welcome = None
    state = None
    # Expect WELCOME then STATE
    for _ in range(2):
        raw = await asyncio.wait_for(ws.recv(), timeout=timeout)
        msg = json.loads(raw)
        if msg.get("type") == "WELCOME":
            welcome = msg
        elif msg.get("type") == "STATE":
            state = msg
    return ws, welcome, state


async def _recv_state(ws, timeout=8):
    """Wait until next STATE frame arrives."""
    deadline = asyncio.get_event_loop().time() + timeout
    while True:
        remaining = deadline - asyncio.get_event_loop().time()
        if remaining <= 0:
            raise asyncio.TimeoutError("No STATE received")
        raw = await asyncio.wait_for(ws.recv(), timeout=remaining)
        msg = json.loads(raw)
        if msg.get("type") == "STATE":
            return msg


def _create_room(name="TEST_WS"):
    r = requests.post(f"{BASE_URL}/api/room/create", json={"name": name}, timeout=10).json()
    return r["token"], r["gmSecret"]


# --------------------------- WebSocket tests ---------------------------

@pytest.mark.asyncio
class TestWebSocket:
    async def test_invalid_room_closes_with_error(self):
        ws = await websockets.connect(f"{WS_BASE}/api/ws/does_not_exist_123", open_timeout=10)
        try:
            raw = await asyncio.wait_for(ws.recv(), timeout=10)
            msg = json.loads(raw)
            assert msg["type"] == "ERROR"
            assert "no encontrada" in msg["message"].lower()
        finally:
            try:
                await ws.close()
            except Exception:
                pass

    async def test_gm_welcome_and_initial_state(self):
        token, gm_secret = _create_room("TEST_gm_welcome")
        ws, welcome, state = await _connect_and_join(token, "GM", gm_secret=gm_secret)
        try:
            assert welcome is not None
            assert welcome["you"]["isGM"] is True
            assert welcome["you"]["name"] == "GM"
            assert state is not None
            assert state["roomName"] == "TEST_gm_welcome"
            assert isinstance(state["state"]["cards"], list)
            assert state["state"]["cards"] == []
            assert state["state"]["diceType"] == 6
            assert state["state"]["scale"] == 1.0
            # User list must include GM
            assert any(u["isGM"] and u["name"] == "GM" for u in state["users"])
        finally:
            await ws.close()

    async def test_player_cannot_be_gm_without_secret(self):
        token, _ = _create_room("TEST_player_no_secret")
        ws, welcome, _ = await _connect_and_join(token, "Jugador1")
        try:
            assert welcome["you"]["isGM"] is False
        finally:
            await ws.close()

    async def test_gm_create_card_broadcasts_to_player(self):
        token, gm_secret = _create_room("TEST_broadcast")
        gm_ws, _, _ = await _connect_and_join(token, "GM", gm_secret=gm_secret)
        # Drain any pending state from the GM join broadcast
        try:
            player_ws, _, _ = await _connect_and_join(token, "Bob")
            # GM will receive a STATE update because player joined - drain it
            try:
                await asyncio.wait_for(gm_ws.recv(), timeout=2)
            except asyncio.TimeoutError:
                pass

            card_id = str(uuid.uuid4())
            card = {
                "id": card_id,
                "name": "TEST_Guerrero",
                "colorKey": "crimson",
                "fortaleza": 2,
                "position": {"x": 100, "y": 200},
            }
            await gm_ws.send(json.dumps({"type": "CARD_CREATE", "payload": {"card": card}}))

            # Player should receive a STATE with the new card
            state_msg = await _recv_state(player_ws, timeout=10)
            cards = state_msg["state"]["cards"]
            assert any(c["id"] == card_id and c["name"] == "TEST_Guerrero" for c in cards)
        finally:
            try: await gm_ws.close()
            except Exception: pass
            try: await player_ws.close()
            except Exception: pass

    async def test_player_cannot_mutate_state(self):
        token, gm_secret = _create_room("TEST_player_mutate")
        gm_ws, _, _ = await _connect_and_join(token, "GM", gm_secret=gm_secret)
        player_ws, _, _ = await _connect_and_join(token, "Eve")
        # drain GM's join-broadcast STATE
        try:
            await asyncio.wait_for(gm_ws.recv(), timeout=2)
        except asyncio.TimeoutError:
            pass
        try:
            fake_card = {"id": str(uuid.uuid4()), "name": "TEST_Pirata", "colorKey": "forest"}
            await player_ws.send(json.dumps({"type": "CARD_CREATE", "payload": {"card": fake_card}}))

            # GM should NOT receive any STATE broadcast as a result
            try:
                raw = await asyncio.wait_for(gm_ws.recv(), timeout=2)
                msg = json.loads(raw)
                if msg.get("type") == "STATE":
                    # If we somehow got a state, the card must NOT have been added
                    assert all(c["id"] != fake_card["id"] for c in msg["state"]["cards"])
            except asyncio.TimeoutError:
                pass  # expected - nothing broadcast
        finally:
            await gm_ws.close()
            await player_ws.close()

    async def test_player_dice_roll_broadcasts(self):
        token, gm_secret = _create_room("TEST_dice")
        gm_ws, _, _ = await _connect_and_join(token, "GM", gm_secret=gm_secret)
        player_ws, _, _ = await _connect_and_join(token, "Alice")
        try: await asyncio.wait_for(gm_ws.recv(), timeout=2)
        except asyncio.TimeoutError: pass

        try:
            roll = {
                "id": str(uuid.uuid4()),
                "type": "action",
                "dice": [4, 6, 1],
                "sides": 6,
                "total": 11,
                "quantity": 3,
                "player": "Alice",
                "at": "2026-01-01T00:00:00Z",
            }
            await player_ws.send(json.dumps({"type": "DICE_ROLL", "payload": {"roll": roll}}))
            state_msg = await _recv_state(gm_ws, timeout=10)
            history = state_msg["state"]["history"]
            # newest first
            assert history[0]["id"] == roll["id"]
            assert history[0]["player"] == "Alice"
        finally:
            await gm_ws.close()
            await player_ws.close()

    async def test_card_patch_moves_card(self):
        token, gm_secret = _create_room("TEST_patch")
        gm_ws, _, _ = await _connect_and_join(token, "GM", gm_secret=gm_secret)
        try:
            card_id = str(uuid.uuid4())
            await gm_ws.send(json.dumps({
                "type": "CARD_CREATE",
                "payload": {"card": {"id": card_id, "name": "TEST_Mover", "position": {"x": 0, "y": 0}}}
            }))
            await _recv_state(gm_ws, timeout=5)

            await gm_ws.send(json.dumps({
                "type": "CARD_PATCH",
                "payload": {"id": card_id, "patch": {"position": {"x": 555, "y": 777}}}
            }))
            state_msg = await _recv_state(gm_ws, timeout=5)
            card = next(c for c in state_msg["state"]["cards"] if c["id"] == card_id)
            assert card["position"] == {"x": 555, "y": 777}
        finally:
            await gm_ws.close()

    async def test_card_duplicate_and_delete(self):
        token, gm_secret = _create_room("TEST_dupdel")
        gm_ws, _, _ = await _connect_and_join(token, "GM", gm_secret=gm_secret)
        try:
            cid = str(uuid.uuid4())
            await gm_ws.send(json.dumps({
                "type": "CARD_CREATE",
                "payload": {"card": {"id": cid, "name": "TEST_Orig", "position": {"x": 10, "y": 20}}}
            }))
            await _recv_state(gm_ws, timeout=5)

            await gm_ws.send(json.dumps({"type": "CARD_DUPLICATE", "payload": {"id": cid}}))
            s = await _recv_state(gm_ws, timeout=5)
            cards = s["state"]["cards"]
            assert len(cards) == 2
            dup = next(c for c in cards if c["id"] != cid)
            assert dup["name"].endswith("(copia)")
            assert dup["position"]["x"] == 40 and dup["position"]["y"] == 50

            # Delete original
            await gm_ws.send(json.dumps({"type": "CARD_DELETE", "payload": {"id": cid}}))
            s = await _recv_state(gm_ws, timeout=5)
            assert all(c["id"] != cid for c in s["state"]["cards"])
            assert len(s["state"]["cards"]) == 1
        finally:
            await gm_ws.close()

    async def test_board_clear_and_library_ops(self):
        token, gm_secret = _create_room("TEST_library")
        gm_ws, _, _ = await _connect_and_join(token, "GM", gm_secret=gm_secret)
        try:
            # Upsert library
            await gm_ws.send(json.dumps({
                "type": "LIBRARY_UPSERT",
                "payload": {"cards": [
                    {"name": "TEST_LibA", "colorKey": "crimson"},
                    {"name": "TEST_LibB", "colorKey": "forest"},
                ]}
            }))
            s = await _recv_state(gm_ws, timeout=5)
            names = [c["name"] for c in s["state"]["library"]]
            assert "TEST_LibA" in names and "TEST_LibB" in names

            # Remove one
            await gm_ws.send(json.dumps({"type": "LIBRARY_REMOVE", "payload": {"name": "TEST_LibA"}}))
            s = await _recv_state(gm_ws, timeout=5)
            names = [c["name"] for c in s["state"]["library"]]
            assert "TEST_LibA" not in names and "TEST_LibB" in names

            # Create a card, then BOARD_CLEAR
            await gm_ws.send(json.dumps({
                "type": "CARD_CREATE",
                "payload": {"card": {"id": str(uuid.uuid4()), "name": "TEST_ToClear"}}
            }))
            await _recv_state(gm_ws, timeout=5)
            await gm_ws.send(json.dumps({"type": "BOARD_CLEAR", "payload": {}}))
            s = await _recv_state(gm_ws, timeout=5)
            assert s["state"]["cards"] == []
        finally:
            await gm_ws.close()

    async def test_scale_dice_type_sound_bg(self):
        token, gm_secret = _create_room("TEST_settings")
        gm_ws, _, _ = await _connect_and_join(token, "GM", gm_secret=gm_secret)
        try:
            await gm_ws.send(json.dumps({"type": "SCALE_SET", "payload": {"scale": 1.5}}))
            s = await _recv_state(gm_ws, timeout=5)
            assert s["state"]["scale"] == 1.5

            await gm_ws.send(json.dumps({"type": "DICE_TYPE_SET", "payload": {"diceType": 12}}))
            s = await _recv_state(gm_ws, timeout=5)
            assert s["state"]["diceType"] == 12

            await gm_ws.send(json.dumps({"type": "SOUND_SET", "payload": {"enabled": False}}))
            s = await _recv_state(gm_ws, timeout=5)
            assert s["state"]["soundEnabled"] is False

            await gm_ws.send(json.dumps({"type": "BG_SET", "payload": {"background": "https://example.com/bg.jpg"}}))
            s = await _recv_state(gm_ws, timeout=5)
            assert s["state"]["background"] == "https://example.com/bg.jpg"

            # scale clamp
            await gm_ws.send(json.dumps({"type": "SCALE_SET", "payload": {"scale": 99}}))
            s = await _recv_state(gm_ws, timeout=5)
            assert s["state"]["scale"] == 2.5
        finally:
            await gm_ws.close()

    async def test_room_info_reflects_user_count(self):
        token, gm_secret = _create_room("TEST_user_count")
        gm_ws, _, _ = await _connect_and_join(token, "GM", gm_secret=gm_secret)
        try:
            r = requests.get(f"{BASE_URL}/api/room/{token}/info", timeout=10).json()
            assert r["users"] == 1
            p_ws, _, _ = await _connect_and_join(token, "Player1")
            # brief wait for server to register
            await asyncio.sleep(0.3)
            r = requests.get(f"{BASE_URL}/api/room/{token}/info", timeout=10).json()
            assert r["users"] == 2
            await p_ws.close()
        finally:
            await gm_ws.close()
