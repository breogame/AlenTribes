# RESUME — Páginas (`/app/frontend/src/pages`)

Componentes de página montados por el router de `App.js`. Uno por cada ruta visible de la aplicación.

## Ficheros

| Fichero | Descripción |
|---|---|
| `Landing.jsx` | **Ruta `/`.** Pantalla de entrada. Dos tarjetas: <br>• **GM**: input de nombre de partida y dos botones — `Crear sala` (backend local) y `Nueva sesión cloud` (backend compartido en `alentribes-api...run.app`). Tras crear, guarda `gmSecret` + `apiSource` en `localStorage` y navega a `/room/:token?gm=1[&api=cloud]`. <br>• **Jugador**: input de código de sala y botón `Entrar en la sala` → navega a `/room/:token`. |
| `Room.jsx` | **Ruta `/room/:token`.** Página principal de la partida. Responsabilidades: <br>• Resolver el backend (local vs cloud) a partir de `?api`. <br>• Restaurar credenciales del GM o mostrar `JoinModal` para que el jugador introduzca su nombre. <br>• Conectar con `useRoom` y renderizar el HUD completo: cartas (con `CharacterCard` + `react-draggable`), `MainMenu`, `DiceRollerPanel`, `RollHistoryPanel` y `MusicPanel` (solo GM). <br>• Wire de todas las acciones WebSocket: crear/editar/mover/duplicar/borrar cartas, guardar YAML, cargar YAML/JSON, cambiar fondo, ajustar sombra, cambiar escala global, tirar dados (incluyendo los clicks en la fila destacada de cada carta), compartir enlace, abrir overlay. <br>• Gestión de modales: `CreateCardModal`, `LibraryModal`, `DiceSettingsModal`, `ShareLinkDialog`, `InfoDialog`, `ConfirmDialog`. |
| `OverlayRoom.jsx` | **Ruta `/room/:token/overlay`.** Vista **solo lectura** pensada para añadirse como fuente de navegador en OBS. No muestra menú, ni dados, ni controles de edición — solo las cartas y el historial. Parámetros de URL: <br>• `?transparent=1` → fondo transparente (ideal para chroma/overlay).<br>• `?noHistory=1` → oculta el panel de historial.<br>• `?api=cloud` → se conecta al backend cloud.<br>Se une al WS con `overlay: true` para no contar como usuario en el recuento del GM. |
