# RESUME — Backend (`/app/backend`)

Servidor FastAPI de la aplicación. Gestiona salas de juego **en memoria** (sin base de datos), ofrece una API REST mínima para crear salas y un WebSocket que sincroniza todo el estado entre GM, jugadores y overlays OBS en tiempo real.

## Ficheros

| Fichero | Descripción |
|---|---|
| `server.py` | **Núcleo del backend.** Contiene: <br>• Definición de la `FastAPI` con prefijo `/api` y CORS configurable por `.env`.<br>• `Room` (clase en memoria con cartas, biblioteca, historial, fondo, sombra, escala, tipo de dado, sonido y `last_activity`).<br>• **Endpoints REST**: `GET /api/`, `POST /api/room/create` (devuelve `token` público + `gmSecret` privado), `GET /api/room/{token}/info`.<br>• **WebSocket `/api/ws/{token}`**: primer mensaje `JOIN` con nombre/gmSecret/overlay; luego recibe acciones del cliente (`CARD_CREATE`, `CARD_PATCH`, `DICE_ROLL`, `SCALE_SET`, `BG_SET`, `BG_SHADE_SET`, `LIBRARY_UPSERT`, etc.) y hace **broadcast del estado completo** a todos los participantes.<br>• **Autorización mínima**: cualquier acción distinta de `DICE_ROLL` solo la puede ejecutar el cliente con `gmSecret` válido.<br>• **Tarea asyncio de cleanup**: cada `ROOM_CLEANUP_INTERVAL` segundos elimina salas sin usuarios cuya `last_activity` exceda `ROOM_TTL_SECONDS`. |
| `requirements.txt` | Dependencias Python del backend. Simplificado a lo mínimo imprescindible: `fastapi`, `uvicorn[standard]` (para soporte de WebSockets, uvloop, watchfiles, etc.) y `python-dotenv`. |
| `.env` *(no versionado)* | Variables de entorno del backend. Usadas: `CORS_ORIGINS` (orígenes permitidos, coma-separado), `ROOM_CLEANUP_INTERVAL` (intervalo en segundos entre limpiezas, default 300), `ROOM_TTL_SECONDS` (inactividad máxima antes de borrar sala vacía, default 1800). Las variables `MONGO_URL` / `DB_NAME` del template están presentes pero no se usan. |

## Carpetas

| Carpeta | Descripción |
|---|---|
| `tests/` | Directorio reservado para tests unitarios de backend (vacío actualmente). |
| `__pycache__/` | Caché de bytecode generada por Python (autogenerado). |

## Puntos clave

- **Sin base de datos**: el estado de cada sala vive en la memoria del proceso. Si se reinicia el backend, las salas desaparecen. Los datos que el GM quiera persistir se exportan desde la UI a YAML/JSON (fichero local del navegador).
- **WebSocket como canal principal**: el REST solo crea la sala. Todo lo demás (movimiento de cartas, tiradas, cambios de fondo, biblioteca, sombra) se comunica por WS.
- **Broadcast completo**: tras cada mutación, el servidor envía el estado íntegro a todos los clientes. Es viable porque el estado es compacto.
