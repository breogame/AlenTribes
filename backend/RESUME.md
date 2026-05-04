# RESUME — Backend (`/app/backend`)

Servidor FastAPI de la aplicación. Gestiona salas de juego **en memoria** (sin base de datos), ofrece una API REST mínima para crear salas y un WebSocket que sincroniza todo el estado entre GM, jugadores y overlays OBS en tiempo real.

## Ficheros

| Fichero | Descripción |
|---|---|
| `server.py` | **Núcleo del backend.** Contiene: <br>• Definición de la `FastAPI` con prefijo `/api` y CORS configurable por `.env`.<br>• `Room` (clase en memoria con cartas, biblioteca, historial, fondo, sombra, escala, tipo de dado, sonido y `last_activity`).<br>• **Endpoints REST** y **WebSocket `/api/ws/{token}`** (detalles abajo).<br>• **Autorización mínima**: cualquier acción distinta de `DICE_ROLL` solo la puede ejecutar el cliente con `gmSecret` válido.<br>• **Tarea asyncio de cleanup**: cada `ROOM_CLEANUP_INTERVAL` segundos elimina salas sin usuarios cuya `last_activity` exceda `ROOM_TTL_SECONDS`. |
| `requirements.txt` | Dependencias Python del backend. Simplificado a lo mínimo imprescindible: `fastapi`, `uvicorn[standard]` (para soporte de WebSockets, uvloop, watchfiles, etc.) y `python-dotenv`. |
| `.env` *(no versionado)* | Variables de entorno del backend. Usadas: `CORS_ORIGINS` (orígenes permitidos, coma-separado), `ROOM_CLEANUP_INTERVAL` (intervalo en segundos entre limpiezas, default 300), `ROOM_TTL_SECONDS` (inactividad máxima antes de borrar sala vacía, default 1800). Las variables `MONGO_URL` / `DB_NAME` del template están presentes pero no se usan. |

## Carpetas

| Carpeta | Descripción |
|---|---|
| `tests/` | Directorio reservado para tests unitarios de backend (vacío actualmente). |
| `__pycache__/` | Caché de bytecode generada por Python (autogenerado). |

---

# API Reference

Prefijo común: todas las rutas REST van con **`/api`**. El WebSocket también.

## REST endpoints

### 1. `GET /api/`

Healthcheck. Devuelve un JSON con un mensaje y el número de salas activas en memoria.

**Respuesta (200):**
```json
{
  "message": "Roleplay Stream Board API",
  "rooms": 3
}
```

**Uso en el frontend**: no se llama desde la UI. Útil para debug / monitoring.

---

### 2. `POST /api/room/create`

Crea una nueva sala en memoria. Devuelve el token público (se comparte con jugadores) y el `gmSecret` privado (se guarda solo en `localStorage` del GM — es lo que le da privilegios de edición).

**Body (opcional):**
```json
{ "name": "Partida del jueves" }
```
Si no se envía `name`, se usa `"Partida sin nombre"`. Se trunca a 80 caracteres.

**Respuesta (200):**
```json
{
  "token": "ciTIUM6ZBFY",
  "gmSecret": "WB3Lxi3ZFMoBwfpPEM-gSw",
  "name": "Partida del jueves"
}
```

**Errores:**
- 422: body JSON malformado.

**Uso en el frontend**: `Landing.jsx` lo invoca cuando el GM pulsa `Crear sala` o `Nueva sesión cloud`.

---

### 3. `GET /api/room/{token}/info`

Información ligera (no autenticada) sobre una sala.

**Path parameters:**
- `token` *(string)*: código de sala.

**Respuesta (200):**
```json
{
  "token": "ciTIUM6ZBFY",
  "name": "Partida del jueves",
  "users": 4
}
```

**Errores:**
- 404: `{"detail": "Sala no encontrada"}`.

**Uso en el frontend**: actualmente no se usa. Disponible para futuras mejoras (p. ej. previsualizar sala antes de entrar).

---

## WebSocket endpoint

### `WS /api/ws/{token}`

Canal principal de la aplicación. Una vez creada la sala vía REST, todo el resto de la comunicación pasa por aquí. Cada cliente (GM, jugador, overlay OBS) abre **una** conexión WS hacia su sala.

**URL completa:**
- Local: `ws://host:8001/api/ws/{token}`
- Producción: `wss://dominio/api/ws/{token}`

**Cierre inmediato:** si el `token` no existe, el servidor envía `{"type":"ERROR","message":"Sala no encontrada"}` y cierra la conexión.

### Flujo de conexión

```
1. Cliente → abre WebSocket
2. Cliente → JOIN (obligatorio como primer mensaje)
3. Servidor → WELCOME  (confirma permisos)
4. Servidor → STATE    (estado completo inicial)
5. Servidor → STATE    (broadcast a los demás clientes de la sala)
6. ...después...
   Cliente envía acciones → servidor las aplica → broadcast STATE a TODOS
```

### Mensaje inicial — `JOIN` (cliente → servidor)

```json
{
  "type": "JOIN",
  "name": "Pepe",
  "gmSecret": "WB3Lxi3ZFMoBwfpPEM-gSw",   // opcional; sin esto, eres jugador normal
  "overlay": true                           // opcional; marca la conexión como OBS overlay
}
```

- `name` se trunca a 40 caracteres. Si falta, se usa `"Invitado"`.
- `gmSecret`: si coincide con el de la sala, `isGM = true`. Si no, se ignora silenciosamente.
- `overlay`: los clientes overlay no aparecen en el contador de usuarios del GM.

Cualquier otro tipo de mensaje como primero cierra la conexión sin aviso.

### Mensajes servidor → cliente

| `type` | Cuándo | Payload |
|---|---|---|
| `WELCOME` | Inmediatamente tras un `JOIN` válido | `{ "you": { "name": "Pepe", "isGM": false } }` |
| `STATE` | Tras `JOIN`, tras cada acción aceptada, y cuando alguien entra/sale | `{ "state": {...}, "users": [...], "roomName": "..." }` (estructura abajo) |
| `ERROR` | Si la sala no existe en el handshake | `{ "message": "Sala no encontrada" }` |

El servidor **no envía deltas**: siempre reenvía el `STATE` completo.

### Acciones cliente → servidor

Todas tienen el mismo formato:

```json
{ "type": "<ACTION>", "payload": { ... } }
```

| `type` | Permiso | Payload | Efecto |
|---|---|---|---|
| `DICE_ROLL` | **Cualquiera** | `{"roll": {"id","user","type","dice":[...],"sides","total","at", ...}}` | Añade la tirada al historial (tope 200). El cliente calcula el resultado; el servidor solo lo difunde. |
| `CARD_CREATE` | Solo GM | `{"card": {id, name, imageUrl, colorKey, fortaleza, destreza, ..., position}}` | Añade carta al tablero. |
| `CARD_UPDATE` | Solo GM | `{"card": {...}}` (full object) | Reemplaza una carta existente por `id`. |
| `CARD_PATCH` | Solo GM | `{"id": "...", "patch": {...}}` | **El más usado**: parche incremental para cualquier cambio (posición, stats, modo melee/ranged, rotación). |
| `CARD_DELETE` | Solo GM | `{"id": "..."}` | Elimina la carta. |
| `CARD_DUPLICATE` | Solo GM | `{"id": "..."}` | Clona con nuevo id, posición desplazada +30px y sufijo `(copia)`. |
| `BOARD_CLEAR` | Solo GM | `{}` | Vacía `state.cards`. |
| `LIBRARY_UPSERT` | Solo GM | `{"cards": [...]}` | Añade plantillas a la biblioteca. Solo añade nombres no existentes (merge por nombre). |
| `LIBRARY_REMOVE` | Solo GM | `{"name": "..."}` | Quita plantilla por nombre. |
| `LIBRARY_REPLACE` | Solo GM | `{"cards": [...]}` | Sustituye la biblioteca entera. |
| `SCALE_SET` | Solo GM | `{"scale": 1.2}` | Escala global de las cartas. Clamp en [0.4, 2.5]. |
| `BG_SET` | Solo GM | `{"background": "data:image/..."}` | Cambia la imagen de fondo. Puede ser `null` para volver al fondo por defecto. |
| `BG_SHADE_SET` | Solo GM | `{"shade": 70}` | Grado de oscurecimiento del fondo (0-100). |
| `DICE_TYPE_SET` | Solo GM | `{"diceType": 12}` | Tipo de dado por defecto (solo 6 ó 12). |
| `SOUND_SET` | Solo GM | `{"enabled": false}` | Toggle del sonido de dados. |
| `HISTORY_CLEAR` | Solo GM | `{}` | Vacía el historial de tiradas. |

**Descartes silenciosos**: si un jugador normal envía cualquier acción distinta de `DICE_ROLL`, el servidor la ignora sin responder ni cerrar la conexión. Esto es la "privacidad básica" sin necesidad de tokens firmados.

### Estructura de `state` (lo que contiene cada `STATE`)

```js
{
  cards: [               // cartas en el tablero
    {
      id: "uuid",
      name, imageUrl, colorKey, description,
      fortaleza, destreza, astucia, inteligencia,
      meleeSkill, rangedSkill, meleeMod, rangedMod,
      armadura, aguante, maxAguante,
      reservaCC, reservaAD, ataqueCC, ataqueAD,
      defensaCC, defensaAD, foco, defenseRaw,
      modo: "melee" | "ranged",
      position: {x, y},
      scale: 1,
      rotation: 0,
    },
    ...
  ],
  library: [             // plantillas guardadas (solo campos de creación)
    { name, imageUrl, colorKey, fortaleza, ..., description },
    ...
  ],
  history: [             // últimas tiradas (tope 200, más reciente primero)
    { id, user, type, dice:[...], sides, quantity, total, diceType, at },
    ...
  ],
  background: "data:image/png;base64,..." | null,
  backgroundShade: 55,   // 0-100
  scale: 1.0,            // escala global de cartas
  diceType: 6,           // 6 | 12
  soundEnabled: true,
}
```

En cada `STATE` el servidor añade además:
- `users`: lista `[{name, isGM}, ...]` de usuarios conectados (excluye overlays).
- `roomName`: nombre de la sala.

### Reconexión

El hook `useRoom.js` del frontend maneja desconexiones automáticamente: si la conexión cae, intenta reconectar cada 1.5 s. Al hacerlo, el servidor reenvía `WELCOME` + `STATE`, así que el cliente recupera todo el contexto al instante.

### Ejemplo — handshake mínimo con Python

```python
import asyncio, json, websockets

async def demo():
    async with websockets.connect("wss://host/api/ws/TOKEN") as ws:
        await ws.send(json.dumps({"type": "JOIN", "name": "bot"}))
        welcome = json.loads(await ws.recv())    # {"type": "WELCOME", "you": {...}}
        state = json.loads(await ws.recv())      # {"type": "STATE", "state": {...}, ...}
        # Tirar un dado
        await ws.send(json.dumps({
            "type": "DICE_ROLL",
            "payload": { "roll": {
                "id": "abc", "user": "bot", "type": "action",
                "dice": [5], "sides": 6, "quantity": 1, "total": 5,
                "at": "2026-05-04T18:00:00Z"
            }}
        }))
        print(json.loads(await ws.recv()))       # nuevo STATE con la tirada

asyncio.run(demo())
```

---

## Puntos clave del diseño

- **Sin base de datos**: el estado de cada sala vive en la memoria del proceso. Si se reinicia el backend, las salas desaparecen. Los datos que el GM quiera persistir se exportan desde la UI a YAML/JSON.
- **WebSocket como canal principal**: el REST solo crea la sala. Todo lo demás (movimiento de cartas, tiradas, cambios de fondo, biblioteca, sombra) se comunica por WS.
- **Broadcast completo**: tras cada mutación, el servidor envía el estado íntegro a todos los clientes. Es viable porque el estado es compacto (decenas de cartas + tope 200 tiradas).
- **Autoridad del cliente en las tiradas**: el servidor confía en el resultado que le envía el cliente. Esto es aceptable en un contexto de streaming donde el GM supervisa la partida; si se necesitase anti-trampas se movería el cálculo al servidor.
