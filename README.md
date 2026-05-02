# Tablero de Rol — Asistente para streaming

Webapp full-stack para asistir partidas de rol durante retransmisiones en OBS.
GM + jugadores sincronizados en tiempo real vía WebSockets.

## Estructura del repositorio

```
/
├── backend/                    # FastAPI + WebSockets (sin base de datos, estado en memoria)
│   ├── server.py
│   ├── requirements.txt        ← dependencias Python
│   └── .env                    # MONGO_URL, DB_NAME, CORS_ORIGINS (no usadas aún)
│
├── frontend/                   # React 19 (Create React App / CRACO)
│   ├── package.json            ← dependencias Node (React, react-draggable, js-yaml, shadcn/ui, etc.)
│   ├── yarn.lock
│   ├── .env                    # REACT_APP_BACKEND_URL
│   ├── craco.config.js
│   ├── tailwind.config.js
│   └── src/
│       ├── App.js
│       ├── pages/              # Landing, Room, OverlayRoom
│       ├── components/         # CharacterCard, MainMenu, DiceRollerPanel, etc.
│       ├── hooks/              # useRoom (WebSocket client)
│       └── lib/                # diceLogic, cardUtils, diceSound
│
├── design_guidelines.json      # paleta, tipografías y assets UI
└── memory/PRD.md               # PRD / backlog
```

## Requisitos previos

- **Node.js** 18+ y **yarn** (no usar npm)
- **Python** 3.10+ (con pip)
- No se requiere MongoDB ni ninguna base de datos: el backend mantiene el estado de cada
  sala en memoria (desaparece al reiniciar el servidor).

## Instalación

### Frontend

```bash
cd frontend
yarn install           # instala todas las dependencias de package.json
```

Crea el archivo `frontend/.env`:

```
REACT_APP_BACKEND_URL=http://localhost:8001
WDS_SOCKET_PORT=3000
```

### Backend

```bash
cd backend
pip install -r requirements.txt
```

Crea el archivo `backend/.env`:

```
MONGO_URL=mongodb://localhost:27017
DB_NAME=test_database
CORS_ORIGINS=*
# Opcional — configuración de limpieza automática de salas
ROOM_CLEANUP_INTERVAL=300     # en segundos (por defecto 5 min)
ROOM_TTL_SECONDS=1800         # en segundos (por defecto 30 min)
```

> Nota: aunque hay variables para MongoDB en `.env`, el servidor actual **no** las usa
> (el estado es puramente en memoria). Se mantienen para facilitar una migración futura.

## Arrancar en local

En dos terminales:

```bash
# Terminal 1 – backend
cd backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

```bash
# Terminal 2 – frontend
cd frontend
yarn start
```

Abre http://localhost:3000 en tu navegador.

## Uso básico

1. El **Game Master** entra en `/`, introduce el nombre de la partida y pulsa **Crear sala**.
2. Desde el menú superior izquierdo abre **Compartir enlace** y envía el link a sus jugadores.
3. Los **jugadores** abren el link, introducen su nombre y ya ven el tablero en directo.
4. Para integrarlo en **OBS** como overlay del stream, el GM pulsa
   **Abrir overlay OBS** en el menú (abre la ruta `/room/{token}/overlay`). En OBS se
   añade como *Origen → Navegador*. Parámetros opcionales de URL:
   - `?transparent=1` fondo transparente
   - `?noHistory=1` oculta el historial de tiradas

## Dependencias principales

Frontend (`frontend/package.json`):
- `react@^19.0.0` + `react-dom` + `react-router-dom@^7`
- `react-draggable@^4.5.0` (cartas movibles)
- `js-yaml@^4.1.1` (export/import YAML de cartas)
- `lucide-react` (iconos)
- `sonner` (toasts)
- `tailwindcss` + `tailwindcss-animate`
- `@radix-ui/*` (shadcn/ui)

Backend (`backend/requirements.txt`):
- `fastapi==0.110.1`, `uvicorn==0.25.0`
- `python-dotenv`
- (El resto de paquetes del template están incluidos aunque no todos son imprescindibles)

## Notas

- El backend usa WebSockets en `/api/ws/{token}`. En producción, el ingress debe
  permitir conexiones WS y todas las rutas del backend van prefijadas con `/api`.
- El estado se sincroniza emitiendo el estado completo de la sala tras cada acción.
  Esto es suficiente para partidas pequeñas (N jugadores, decenas de cartas).
- Tarea de limpieza: salas sin usuarios se eliminan tras `ROOM_TTL_SECONDS` de
  inactividad (revisada cada `ROOM_CLEANUP_INTERVAL`).
