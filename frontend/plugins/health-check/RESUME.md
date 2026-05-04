# RESUME — Health-check plugin (`/app/frontend/plugins/health-check`)

Plugin de webpack que expone endpoints HTTP en el dev server de CRA para verificar el estado de compilación. Usado por la infraestructura de Emergent para detectar si el servicio está listo.

## Ficheros

| Fichero | Descripción |
|---|---|
| `webpack-health-plugin.js` | Plugin de webpack. Se engancha a los hooks de compilación (`compile`, `done`, `failed`) para registrar el estado actual (compiling / ok / error) en una variable compartida con los middlewares. |
| `health-endpoints.js` | Middlewares de Express que se añaden al dev server (p.ej. `GET /health`, `GET /__health`) y devuelven 200 cuando la compilación está terminada sin errores, o 503 mientras compila o si hay errores. |
