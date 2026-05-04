# RESUME — Custom hooks (`/app/frontend/src/hooks`)

Custom hooks de React encapsulando lógica reutilizable.

## Ficheros

| Fichero | Descripción |
|---|---|
| `useRoom.js` | **Hook principal** de la aplicación. Gestiona la conexión WebSocket con una sala. Acepta `{ token, name, gmSecret, joinExtras, apiUrl }` y devuelve `{ state, you, users, roomName, status, error, send }`. Responsabilidades: construir la URL `wss://` a partir del `apiUrl` (resolviendo http→ws, https→wss), abrir la conexión, enviar el mensaje inicial `JOIN`, procesar mensajes entrantes (`WELCOME`, `STATE`, `ERROR`) actualizando state local, reconectar automáticamente cada 1.5 s si la conexión cae, y limpiar al desmontar. |
| `use-toast.js` | Hook del template de shadcn/ui para toasts tradicionales. **No se usa actualmente** — la app usa `sonner` directamente vía `toast.success(...)` / `toast.error(...)` importado de la librería. Se mantiene para compatibilidad por si se necesita el API de shadcn. |
