# RESUME — shadcn/ui components (`/app/frontend/src/components/ui`)

Biblioteca de componentes base de [shadcn/ui](https://ui.shadcn.com/). Son componentes de React/Radix sin estado de negocio, pensados para copiar-pegar y personalizar. Vienen con el template inicial.

**Nota**: esta aplicación usa su propio estilado cinematográfico (paneles glassmorphism, latón, etc.) y solo utiliza de aquí los componentes listados abajo como realmente usados. Los demás quedan disponibles por si en el futuro se añaden (biblioteca extensa con ~45 componentes).

## Componentes actualmente usados

| Fichero | Uso en la app |
|---|---|
| `sonner.jsx` | Wrapper de `sonner` para los toasts. Usado en `App.js` (montaje del `<Toaster />`) y en `Landing.jsx` / `Room.jsx` para notificar éxito/errores (crear sala, exportar cartas, etc.). |

## Componentes disponibles (no usados actualmente)

Todos los siguientes son componentes base de Radix UI estilizados con Tailwind. Se incluyen por si en iteraciones futuras se necesitan sin tener que re-instalar:

`accordion`, `alert`, `alert-dialog`, `aspect-ratio`, `avatar`, `badge`, `breadcrumb`, `button`, `calendar`, `card`, `carousel`, `checkbox`, `collapsible`, `command`, `context-menu`, `dialog`, `drawer`, `dropdown-menu`, `form`, `hover-card`, `input`, `input-otp`, `label`, `menubar`, `navigation-menu`, `pagination`, `popover`, `progress`, `radio-group`, `resizable`, `scroll-area`, `select`, `separator`, `sheet`, `skeleton`, `slider`, `switch`, `table`, `tabs`, `textarea`, `toast`, `toaster`, `toggle`, `toggle-group`, `tooltip`.

Cada `.jsx` exporta componentes named con sus primitivas (`export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }` etc.) ya estilizados y listos para usar con el sistema de theming global definido en `src/index.css` (variables CSS `--background`, `--foreground`, etc.).

## Si se quiere aligerar el bundle

Ningún fichero no usado aquí se importa desde el código propio. Webpack hace tree-shaking del JS, así que **no afectan al bundle final** aunque estén en disco. Se pueden eliminar sin impacto si se prefiere tener el repositorio más limpio; mantenerlos facilita extender la UI sin volver a correr `npx shadcn add ...`.
