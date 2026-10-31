# Foxy AI — handler HTTP H3

- Agent / role: /root/foxy_visual_green, slice_worker
- Session or task ID: /root/foxy_visual_green; identificador de sesión no disponible
- Date: 2026-10-31
- Branch / worktree: codex/foxy-ai, C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Starting commit: 8888c2a
- Phase and detailed task/spec links: H3, [propuesta](../../odd/tasks/foxy-ai-proposal.md)
- Status: completed

## Request and scope
Handler HTTP inyectado con admisión por ruta, validación y errores saneados, sin activar runtime ni proveedor real.

## Work performed
Handler CRUD, turnos y catálogo, capacidades, admisión única para cada ruta, validación de JSON de hasta 1 MiB y query/path, cursores base64url de JSON, no-store y nosniff. CSRF/Origin y autenticación se delegan al puerto de admisión. No se editaron pruebas ni conectó runtime.

## Verification
`node --test --test-reporter=dot apps/api/src/foxy-ai/foxy-http.test.mjs`: exit 0, 4 PASS con servidor HTTP y puertos sintéticos. `npm run api:build` y `npm run lint:boundaries -- --quiet`: exit 0. Sin proveedor real, secretos ni base retenida.

## Commits and outcomes
Sin commit propio.

## Handoff
Revisión independiente e integración real. Capabilities debe implementar validación de rol docente mediante UoW; la admisión inyectada solo ofrece las garantías de su implementación. Confirmar contrato de cursor con cliente.

## Corrección de seguridad HTTP
Lectura del cuerpo con deadline de 10 segundos, liberación de listeners y drenado al fallar; rechaza codificación de contenido y UTF-8 inválido; `EMPTY_CONTENT` se entrega como error 400 saneado. URL malformada se captura antes de enrutar y devuelve 400 sin detalle. Se conservó límite de 1 MiB. `node --test --test-reporter=dot apps/api/src/foxy-ai/foxy-http.test.mjs`: exit 0, 9 PASS, incluye 16 conexiones incompletas y control de slots. `npm run api:build` y `npm run lint:boundaries -- --quiet`: exit 0. Pruebas y servidor sintéticos; sin DB retenida ni secretos.
