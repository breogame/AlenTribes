# RESUME — Frontend (`/app/frontend`)

Aplicación React (Create React App + CRACO) que implementa el tablero de rol: landing, sala de juego para GM y jugadores, overlay solo-lectura para OBS, panel de dados, panel de música y todo el HUD.

## Ficheros raíz

| Fichero | Descripción |
|---|---|
| `package.json` | Dependencias Node y scripts. Stack clave: React 18, React Router 6, Tailwind CSS 3, shadcn/ui (Radix + cva), `react-draggable` (cartas + paneles arrastrables), `js-yaml` (export/import de cartas), `sonner` (toasts), `axios`, `lucide-react` (iconos). Herramientas dev: CRACO (override del webpack de CRA), ESLint, PostCSS. |
| `yarn.lock` | Lockfile generado por yarn. Fija las versiones exactas de todas las dependencias transitivas. |
| `craco.config.js` | Configuración de CRACO. Añade el alias `@` → `src/`, integra el plugin de health-check y (opcional) el plugin de visual-edits de Emergent. |
| `jsconfig.json` | Configuración para que el editor (VS Code) entienda el alias `@/*` → `src/*`. |
| `tailwind.config.js` | Configuración de Tailwind CSS: rutas de contenido (`src/**/*`), tokens de color basados en variables CSS, animaciones (`tailwindcss-animate`). |
| `postcss.config.js` | PostCSS con Tailwind y Autoprefixer. |
| `components.json` | Configuración de shadcn/ui (estilos, alias, framework). Dictaminaría futuros `npx shadcn add X`. |
| `README.md` | Template original de CRA. La documentación de verdad está en `/app/README.md`. |
| `.env` *(no versionado)* | Variables `REACT_APP_BACKEND_URL` (URL del backend local), `WDS_SOCKET_PORT` (HMR). |

## Carpetas

| Carpeta | Descripción |
|---|---|
| `public/` | Assets estáticos (HTML base). Ver `public/RESUME.md`. |
| `src/` | Código React de la aplicación. Ver `src/RESUME.md`. |
| `plugins/` | Plugins de build personalizados. Ver `plugins/RESUME.md`. |
| `node_modules/` | Dependencias instaladas por `yarn install` (no versionado). |
