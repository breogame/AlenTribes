# RESUME — Componentes (`/app/frontend/src/components`)

Componentes reutilizables de la aplicación: paneles del HUD, modales y la carta de personaje (componente principal). Todos los interactivos llevan `data-testid` para tests.

## Ficheros

| Fichero | Descripción |
|---|---|
| `CharacterCard.jsx` | **Componente más complejo.** Carta de personaje arrastrable (envuelta en `<Draggable>` con nodo externo para posición + nodo interno para escala/rotación, evitando conflicto de `transform`). Muestra: cabecera (nombre + iconos GM: duplicar, editar, rotar, eliminar), imagen con toggle melee/ranged, indicadores de herida, botón de info, grid de stats editables con steppers `+/-` (armadura, aguante, reservas, ataque, defensa, foco), y fila inferior destacada con ataque clicable (→ tirada), foco clicable (→ iniciativa) y defensa escalonada. Recibe `derived` (calculado por `computeDerived` de `cardUtils`) para mostrar avisos en rojo. Acepta `isOverlay` para ocultar controles en la vista OBS. |
| `MainMenu.jsx` | Menú superior izquierdo. Muestra cabecera (nombre de sala, estado WS, nº usuarios, badge GM) + botón minimizar persistido en `localStorage`. Secciones GM: crear carta, biblioteca, guardar YAML, cargar YAML/JSON, ajustes de dado, escalado global (+/-/reset), cambiar fondo, slider de sombra, compartir enlace, abrir overlay OBS, limpiar tablero. Para jugadores solo muestra mensaje informativo + ajustes de dado. |
| `DiceRollerPanel.jsx` | Panel inferior izquierdo con los tres lanzadores: Ataque, Iniciativa, Acción. Cada uno con input de cantidad y botón de tirar (con animación `dice-shake`). Panel **arrastrable** vía cabecera (drag handle con icono de grip) y **minimizable** (posición y estado minimizado persistidos en `localStorage`). |
| `RollHistoryPanel.jsx` | Panel lateral derecho con historial de tiradas. La última tirada se renderiza más grande y resaltada; el resto en formato compacto. Los números de los dados se muestran en cuadrados con textura de madera (`.wood-square`) y colores según el tipo de tirada (verde/rojo/morado/neutro). Minimizable con persistencia en `localStorage`. Solo el GM ve el botón de limpiar historial. |
| `MusicPanel.jsx` | Panel flotante de música (solo GM), arrastrable y colapsable a pastilla. Dos pestañas: <br>• **Local**: biblioteca acumulable de pistas (`<input multiple>`), playlist con selección, eliminar, vaciar, controles play/pausa/anterior/siguiente, toggle bucle (pista / playlist), volumen, **barra de progreso con seek** (clic o arrastre para saltar a cualquier segundo). El elemento `<audio>` se renderiza siempre (aunque esté colapsado) para no interrumpir la reproducción. <br>• **Spotify**: input de URL, extrae ID y embebe `<iframe>` oficial de `open.spotify.com/embed/...`. |
| `CreateCardModal.jsx` | Modal para crear o editar una carta. Campos: nombre, imagen (subida de archivo o URL), bando (5 colores), descripción y stats de creación (fortaleza, destreza, astucia, inteligencia, habilidad CC/distancia, mod arma CC/distancia) con los mínimos apropiados. |
| `LibraryModal.jsx` | Modal de biblioteca de cartas guardadas. Muestra plantillas (nombre, imagen, bando, descripción truncada) con acciones GM: añadir al tablero, quitar, y `Guardar tablero en biblioteca` (extrae plantillas de las cartas actuales). |
| `DiceSettingsModal.jsx` | Modal de ajustes de dado. Selector D6 / D12 (dos botones tipo segmented) y toggle de sonido de tiradas. |
| `JoinModal.jsx` | Modal que se muestra a los jugadores (no al GM) al entrar a una sala. Pide el nombre con el que aparecerán en el historial de tiradas. |
| `ShareLinkDialog.jsx` | Diálogo con el enlace completo de la sala (`/room/:token[?api=cloud]`) y botón copiar al portapapeles. Muestra badge `☁️ Cloud` cuando la sala está en el backend cloud. |
| `InfoDialog.jsx` | Diálogo genérico para mostrar la **descripción** de una carta (accesible también a jugadores tocando el icono `i` sobre la imagen de la carta). |
| `ConfirmDialog.jsx` | Diálogo de confirmación genérico (usado por la eliminación de cartas, con estilo rojo de alerta). |

## Carpetas

| Carpeta | Descripción |
|---|---|
| `ui/` | Componentes base de shadcn/ui. Ver `ui/RESUME.md`. |
