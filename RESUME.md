# RESUME — Raíz del proyecto (`/app`)

Raíz del repositorio. Contiene las dos aplicaciones (backend y frontend), metadata del proyecto y guías de diseño.

## Ficheros

| Fichero | Descripción |
|---|---|
| `README.md` | Documentación principal del repositorio: estructura de carpetas, instrucciones de instalación (yarn / pip), variables de entorno y guía básica de uso de la app. |
| `design_guidelines.json` | Guía de estilo UI/UX generada al inicio del proyecto. Define paleta de colores (dark fantasy + latón), tipografías (Cormorant Garamond + Alegreya Sans), layout, componentes, animaciones y assets (textura de madera, imagen de fondo por defecto). |
| `test_result.md` | Marcador/placeholder para informes de test del subagente de testing. |
| `yarn.lock` | (Artefacto residual). El lockfile real de dependencias frontend está en `/app/frontend/yarn.lock`. Este archivo raíz no es funcional. |

## Carpetas

| Carpeta | Descripción |
|---|---|
| `backend/` | Servidor FastAPI (REST + WebSocket). Mantiene el estado de las salas en memoria. Ver `backend/RESUME.md`. |
| `frontend/` | Aplicación React (tablero, cartas arrastrables, dados, música, overlay OBS). Ver `frontend/RESUME.md`. |
| `memory/` | Documentación viva del producto: PRD y credenciales de test. Ver `memory/RESUME.md`. |
| `tests/` | Directorio reservado para tests de integración (vacío actualmente). |
| `test_reports/` | Informes JSON del subagente de testing. Se genera automáticamente. |
