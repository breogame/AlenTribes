# RESUME — Public assets (`/app/frontend/public`)

Ficheros estáticos servidos tal cual por el dev server de CRA / el build de producción. No pasan por Webpack.

## Ficheros

| Fichero | Descripción |
|---|---|
| `index.html` | Plantilla HTML raíz de la SPA. Define el `<title>`, meta tags (viewport, description), favicon y el `<div id="root">` donde React monta la aplicación. CRA inyecta automáticamente los bundles JS/CSS en esta plantilla durante el build. |
