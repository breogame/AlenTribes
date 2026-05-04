# RESUME — Código React (`/app/frontend/src`)

Punto de entrada y raíz del árbol de componentes de la aplicación.

## Ficheros

| Fichero | Descripción |
|---|---|
| `index.js` | Punto de entrada de la SPA. Crea el `root` de React (`ReactDOM.createRoot`) y monta `<App />` dentro de `<React.StrictMode>`. Importa `index.css` (estilos globales + Tailwind base). |
| `index.css` | Estilos globales. Incluye:<br>• `@import` de Google Fonts (Cormorant Garamond + Alegreya Sans).<br>• Directivas `@tailwind base/components/utilities`.<br>• Variables CSS raíz (paleta de colores, tipografías, variables shadcn).<br>• Clases compartidas: `.panel-glass`, `.menu-btn`, `.wood-square` (cuadrados de madera del historial), `.card-frame` (marcos de cartas con color de bando), animaciones `@keyframes dice-shake` / `roll-slide-in`, steppers, scroll fino, etc. |
| `App.js` | Componente raíz. Define el `BrowserRouter` con las 3 rutas: `/` → `Landing`, `/room/:token/overlay` → `OverlayRoom`, `/room/:token` → `Room`. Monta también el `<Toaster />` de sonner. |
| `App.css` | Estilos específicos de la aplicación (no globales): layout del tablero (`.board-root`, `.board-bg` con variable `--bg-shade` para la sombra graduable, `.grain-overlay`), landing (`.landing-root`, `.landing-card`), botones temáticos (`.brass-btn`, `.ghost-btn`, `.roll-btn`), modales (`.modal-overlay`, `.modal-panel`) y bloques de dados. |

## Carpetas

| Carpeta | Descripción |
|---|---|
| `pages/` | Componentes de página (una por ruta). Ver `pages/RESUME.md`. |
| `components/` | Componentes reutilizables (paneles, modales, carta). Ver `components/RESUME.md`. |
| `hooks/` | Custom hooks de React. Ver `hooks/RESUME.md`. |
| `lib/` | Utilidades puras y lógica no-React. Ver `lib/RESUME.md`. |
