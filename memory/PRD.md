# PRD - Tablero de Rol (Streaming RPG Assistant)

## Problema original (verbatim, ES)
> Hola. Necesitaría generar una pagina webapp que nos asista a mi y a mis jugadores en las partidas de rol vía streaming.

Detailed spec (usuario): tablero interactivo para retransmisión OBS, GM + jugadores,
cartas movibles con react-draggable, localStorage, sin base de datos, sincronización
en vivo entre usuarios (cartas, dados, historial), acceso por token/enlace, menú
principal (crear/biblioteca/guardar/cargar/dado/escalado/limpiar/fondo), tiradores de
dados (ataque/iniciativa/acción), historial lateral derecho con cuadrados de madera,
cartas con bando (5 colores), parámetros editables (armadura, aguante, reservas,
ataque, defensa, foco), heridas, modo cuerpo-a-cuerpo / distancia, descripción en info,
reglas de colores de dados específicas (D6/D12 y iniciativa=D3).

## Arquitectura
- **Frontend**: React 19, react-router-dom 7, react-draggable 4, js-yaml 4, shadcn/ui,
  sonner, lucide-react. Fuentes: Cormorant Garamond (display) + Alegreya Sans (body).
- **Backend**: FastAPI + WebSockets + estado en memoria por sala (sin MongoDB,
  cumpliendo requisito explícito del usuario).
- Archivos clave frontend: `src/pages/{Landing,Room}.jsx`, `src/hooks/useRoom.js`,
  `src/components/*`, `src/lib/{diceLogic,cardUtils,diceSound}.js`.
- Archivos clave backend: `backend/server.py` (REST + WS).

## Usuarios
1. **Game Master (GM)**: crea la sala, tiene todos los privilegios (crear/editar/mover/
   borrar cartas, biblioteca, guardar/cargar, cambiar fondo, ajustes de dado, limpiar).
2. **Jugador/a**: entra con el enlace, indica su nombre, solo puede tirar dados y
   consultar info de cartas.

## Core requirements (estáticos)
- Sin base de datos persistente (user hard requirement)
- Sincronización en tiempo real (WebSockets)
- Acceso por token de sala compartible (enlace)
- Privacidad básica: GM autentica con un gmSecret secreto
- localStorage para GM: recupera credenciales tras recargar
- Cartas movibles con react-draggable
- Export/Import YAML/JSON (biblioteca)

## Implementado (Feb 2026) ✅
- Landing page con creación de sala + entrada por código
- WebSocket `/api/ws/{token}` con broadcast de estado completo a todos los clientes
- Menú principal (top-left, glassmorphism) con opciones GM vs jugador
- 3 tiradores de dados (ataque, iniciativa, acción) en bottom-left con cantidad
- Historial de tiradas a la derecha: cuadrados con textura de madera; última tirada
  destacada en mayor tamaño; colores por tipo de dado/tirada (reglas completas)
- Cartas draggable con:
  - Nombre, imagen, 5 colores de bando (marco + glow)
  - Iconos de duplicar, escalar +/-, editar, rotar 90°, eliminar (con confirmación)
  - Icono de info con descripción (accesible a jugadores)
  - Toggle modo melee / ranged (oculta los stats del modo inactivo)
  - Grid de stats con steppers +/-: armadura, aguante, reserva CC/AD, ataque/defensa
  - Rojo de aviso cuando aguante > 3*(fortaleza+1), cuando reservas exceden máximo,
    cuando ataque+defensa > reserva total, cuando foco > destreza+astucia
  - Indicadores de herida (círculos rojos) cuando aguante baja por (fortaleza+1)
  - Carta en escala de grises (muerta) cuando armadura+aguante = 0
  - Fila destacada inferior clicable: ataque (→ tirada de ataque), foco (→ iniciativa),
    defensa (nivel escalonado 1/2/3/4 según raw)
- Modal crear/editar carta con todos los campos obligatorios
- Biblioteca: mostrar cartas guardadas, colocar en tablero, eliminar, guardar tablero
  completo en biblioteca
- Guardar (exporta YAML de cartas del tablero), Cargar (import YAML/JSON, merge por
  nombre único)
- Ajustes de dado (D6/D12) + toggle de sonido (sintetizado con Web Audio API)
- Escalado global (+/-, reset) y escalado por carta
- Cambio de fondo (upload de imagen del GM, se sincroniza a todos)
- Compartir enlace (dialog con copy-to-clipboard del link + código de sala)
- Limpiar tablero con confirmación nativa
- Reconexión automática WS (1.5s retry)
- Fuentes cinematic (Cormorant Garamond + Alegreya Sans), paleta dark fantasy
  (obsidiana + latón + carmesí)
- data-testid en todos los elementos interactivos

## Implementado (Jun 2026) ✅
- **Fondos de vídeo animados**:
  - Nuevo componente `BoardBackground.jsx` que detecta el tipo del fondo
    (prefijo `data:video/`) y renderiza `<video autoplay loop muted playsInline>`
    o el `<div>` con `background-image` clásico.
  - El input "Cambiar fondo" acepta ahora imágenes y vídeos
    (`mp4`, `webm`, `ogg`, `mov`).
  - Validación: rechazo si el archivo supera 40 MB; aviso suave a partir de
    8 MB para vídeos (`localStorage` tiene cuota limitada).
  - Estilos CSS `.board-bg-video` + `.board-bg-shade` reproducen la misma
    saturación/brillo y la viñeta radial dependiente de `--bg-shade` que
    teníamos para imágenes.
  - `OverlayRoom.jsx` también usa `BoardBackground`, de forma que el OBS
    overlay también reproduce el vídeo (perfecto para escenas con hoguera,
    nieve, lluvia, etc.).
  - Compatibilidad total con la retransmisión: el data URL del vídeo viaja
    por WebSocket como cualquier otro fondo y se sincroniza con jugadores y
    overlay.

## Implementado (Jun 2026 — anterior) ✅
- **Indicador de PJ activos en el ribbon de retransmisión**:
  - El `StreamingRibbon` muestra ahora `🎲 N PJ activos` con icono de dado,
    contabilizando los `pj_name` distintos que han enviado tiradas en los
    últimos 5 minutos (tooltip incluido).
  - Heartbeat de 30 s en `Room.jsx` para que el contador se enfríe sólo aún
    sin nuevas tiradas; cálculo memoizado sobre `state.history`.
- **Filtros en el historial de tiradas** (`RollHistoryPanel`):
  - Chips: `Todos` · `Mías` · `PJ` + dropdown `Jugador ▾` con la lista de
    nombres distintos del historial.
  - Filtro persistido en `localStorage` (`rsb:history-filter`) entre sesiones;
    se restablece automáticamente si el jugador filtrado desaparece tras un
    `Limpiar historial`.
  - Badge del filtro activo junto al título "Historial" + contador
    `N de Total` debajo de los chips.
  - Botón `X` para quitar el filtro y vacío contextual ("Ninguna tirada
    coincide con el filtro").
  - Dropdown se cierra al hacer click fuera; estilo con glass-morphism.

## Implementado (Jun 2026 — anterior) ✅
- **Tiradas externas desde PJ.html** (independiente de la retransmisión):
  - Nuevo endpoint REST en backend:
    - `POST /api/dice/session` → crea sesión, devuelve `{token, name}`.
    - `POST /api/dice/submit` body `{auth, pj_name, dice_type, dice_result}`
      → valida token, parsea `d6`/`d12`, valida que cada dado esté en rango
      y guarda la tirada en un ring buffer (200 últimas).
    - `GET /api/dice/{token}/rolls?since=<iso>` → lista las tiradas más
      recientes (newest-first), soporta `since` para polling incremental.
  - Limpieza de sesiones inactivas integrada en el cleanup loop existente
    (mismo TTL que las salas).
  - Nuevo botón en `MainMenu` (solo GM): **"Tiradas PJ"** con indicador
    `● Activo` cuando el polling está activo.
  - Nuevo modal `PjDiceDialog.jsx`: auto-genera token al abrirse por primera
    vez, muestra el token + endpoint + payload de ejemplo, botones de copiar
    y "Regenerar token".
  - Token persistido en `localStorage` (`rsb:pj-dice:<roomToken>`) para
    sobrevivir refrescos.
  - Hook `usePjDicePoll`: polling cada 3s con cursor `since=<lastSeen>`,
    invocado únicamente cuando hay token y el usuario es GM.
  - Las tiradas externas se inyectan como acción `DICE_ROLL` en el store
    unificado, por lo que aparecen en el historial **incluso con
    retransmisión apagada**, y se propagan vía WS a los espectadores cuando
    la retransmisión está activa.
  - Nuevo tipo de tirada `pj` en `RollHistoryPanel` (etiqueta "PJ").

## Implementado (Jun 2026 — anterior) ✅
- **Toggle "Habilitar retransmisión"** (GM, por defecto OFF):
  - Cuando OFF, el GM juega 100% local: el estado se gestiona con un reducer
    cliente (`/src/lib/localReducer.js`) que replica `_apply_action` del backend
    y se persiste en `localStorage` (`rsb:local-state:<token>`).
  - **No se abre ningún WebSocket** mientras esté OFF — cumple el requisito
    explícito del usuario de evitar tráfico innecesario.
  - Al activarlo, el GM transmite su estado local en el mensaje `JOIN` mediante
    el campo `initialState` (sólo procesado si el cliente es GM). El servidor
    aplica ese estado antes de emitir el primer broadcast `STATE`, evitando
    cualquier parpadeo a "estado por defecto" en la transición OFF→ON.
  - Se mantiene además la acción `STATE_REPLACE` (GM-only) para re-sembrar
    el estado manualmente sin desconectar.
  - Botones "Compartir enlace" y "Abrir overlay OBS" sólo se muestran cuando
    la retransmisión está activa.
  - Indicador de estado en el header del menú: gris ("local") / amarillo
    ("conectando") / verde ("en vivo") / rojo ("sin conexión").
- **Ribbon de retransmisión** (`StreamingRibbon.jsx`):
  - Banner pinned-top centrado, glassmorphism dorado, sólo visible cuando la
    retransmisión está activa.
  - Punto pulsante rojo en "En vivo", ámbar en "Conectando…", gris en "Sin
    conexión".
  - Contador de espectadores (excluye al GM).
  - Botón "Detener" integrado que apaga la retransmisión y vuelve al modo
    local sin perder el estado.
  - Animación `ribbon-drop` (entrada) y `ribbon-pulse-red` (punto en vivo).
- **Refactor del store (un único `state`)**:
  - `useGameState` ya no envuelve a `useRoom`: ahora gestiona directamente la
    conexión WebSocket y mantiene una **única** variable de estado, hidratada
    desde `localStorage` y actualizada tanto por el reducer local (modo OFF)
    como por los broadcasts `STATE` del servidor (modo ON). Se persiste en
    `localStorage` en ambos modos.
  - `useRoom` queda como hook minimal de solo lectura para `OverlayRoom`.
- **Toaster** movido a `bottom-right` para no colisionar con el ribbon.
- **Limpieza de dependencias**:
  - Eliminado `@emergentbase/visual-edits` de `package.json` y del require
    condicional en `craco.config.js`.
  - Eliminado `package-lock.json` proveniente del pull; se regeneró `yarn.lock`
    con `yarn install`.
- **Persistencia del nombre de sala en local mode**: `Landing.jsx` ahora guarda
  `roomName` en `localStorage` junto con las credenciales del GM.

## Implementado (Apr 2026) ✅
- **Modo Overlay para OBS**: ruta `/room/{token}/overlay` — vista de solo lectura
  (tablero + historial, sin menú ni edición). Soporta `?transparent=1` para fondo
  transparente (ideal como fuente de navegador con overlay en OBS) y `?noHistory=1`
  para ocultar el historial.
- **Música ambiente**: panel flotante togglable (bottom-left centro) con dos fuentes:
  - Archivo local (mp3/wav) con play/pause, volumen, mute y loop
  - Spotify (track / playlist / álbum): parser de URL oficial → embed iframe nativo
- **Cleanup automático de salas**: task asyncio de fondo revisa cada 5 min y elimina
  salas con 0 usuarios conectados e inactividad > 30 min. Configurable vía
  `ROOM_CLEANUP_INTERVAL` y `ROOM_TTL_SECONDS` en .env.
- **Overlay no cuenta como usuario**: el flag `overlay: true` en el mensaje JOIN
  hace que el cliente no aparezca en el contador de usuarios del GM.

## Tests
- Backend: 17/17 pytest (REST + WebSocket, todas las acciones, GM auth, permisos)
- Frontend: Playwright end-to-end (landing → GM room → create card → dice roll → 2nd
  context player join → player roll sync → share link) — 100% OK

## Backlog (futuro)
### P1
- Grid opcional sobre el tablero (alternable) para ayudar a alinear cartas
- Snap a grid para las cartas
- Música ambiente con player (integrable con Spotify o subida local)
- Atajos de teclado globales (R=rotar, D=duplicar, Supr=borrar)
- Cleanup de salas sin usuarios tras N minutos (liberar memoria)

### P2
- Modo "Spectator/Stream" que oculta controles de GM (para una segunda ventana OBS)
- Exportar resumen de sesión (historial de tiradas) en PDF
- Importar avatar desde URL de Pexels/Imgur directamente en el modal de creación
- Temporizador visible con alertas acústicas
- Tokens con iconos/emojis de estado (envenenado, aturdido, etc.)
- Dice tray animado (dado 3D rodando visualmente, no solo el cuadrado final)

### P3
- Ficha completa de personaje con bio, inventario y habilidades
- IA opcional para generar descripciones/retratos de NPCs on-demand (Claude/GPT)
