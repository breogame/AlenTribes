# RESUME — Memoria del proyecto (`/app/memory`)

Documentación "viva" que el agente mantiene entre iteraciones: estado del producto, tareas pendientes y credenciales de test.

## Ficheros

| Fichero | Descripción |
|---|---|
| `PRD.md` | Product Requirements Document. Describe el problema original (verbatim del usuario), la arquitectura elegida (React + FastAPI + WebSocket + in-memory, sin BBDD), los perfiles de usuario (GM y jugadores), los requisitos inamovibles, la lista de funcionalidades implementadas agrupadas por fecha (Feb 2026 — MVP inicial, Apr 2026 — overlay/música/cleanup) y el backlog priorizado (P1/P2/P3) con features futuras. |
| `test_credentials.md` | Documento leído por el subagente de testing. Como esta app no tiene sistema de login, explica el flujo alternativo: cómo el GM crea una sala (→ `gmSecret` en `localStorage`), cómo los jugadores entran con solo un nombre, y cómo conectarse al WebSocket (`wss://` + mensaje JOIN). Incluye los endpoints REST y los selectores `data-testid` principales para scripting de Playwright. |
