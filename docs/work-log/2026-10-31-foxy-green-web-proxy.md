# Foxy AI — proxy web H4

- Agent / role: /root/foxy_visual_green, slice_worker
- Session or task ID: /root/foxy_visual_green; identificador de sesión no disponible
- Date: 2026-10-31
- Branch / worktree: codex/foxy-ai, C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Starting commit: 6015e38
- Phase and detailed task/spec links: H4, [propuesta](../../odd/tasks/foxy-ai-proposal.md)
- Status: completed

## Request and scope
Proxy web con allowlist de rutas, headers mínimos y cita binaria opaca; sin proveedor real ni cambios ajenos.

## Work performed
Proxy limita rutas y métodos, query, URL y origen backend; solo propaga cookie, origin, CSRF y content-type. Rechaza redirects, codificación, JSON inválido y excesos; cita cN se transmite bajo límite binario con CSP sandbox y sin exponer identificadores de archivo. Plazos 10 s lectura, 30 s JSON y 60 s binario. Se añadió route Next con bodyParser deshabilitado. No se modificaron pruebas.

## Verification
`node --test --test-reporter=dot apps/web/src/lib/foxy-proxy.test.mjs`: exit 0, 4 PASS con servidores HTTP sintéticos. `npx tsc --noEmit -p apps/web/tsconfig.json`: exit 0; `npm run lint:boundaries -- --quiet`: exit 0. Sin proveedor real, secretos ni base retenida.

## Commits and outcomes
Sin commit propio.

## Handoff
Revisión independiente, integración con handler de citas y pruebas E2E de transporte real. Allowlist no incorpora rutas de recursos aún no diseñadas; validar cualquier expansión por separado.

## Corrección DOCX octet-stream
El proxy admite `application/octet-stream` solo para respuesta binaria de cita exitosa y fuerza `Content-Disposition: attachment` si el upstream no suministra disposición attachment; preserva disposición attachment válida, CSP, no-store/nosniff y límites. `node --test --test-reporter=dot apps/web/src/lib/foxy-proxy.test.mjs`: exit 0, 5 PASS; `npx tsc --noEmit -p apps/web/tsconfig.json` y `npm run lint:boundaries -- --quiet`: exit 0. Sin cambios de pruebas ni proveedor real.

## Corrección de cookie inválida
El proxy reenvía exclusivamente la forma canónica de borrado `foxmind_session=; Path=/; HttpOnly; SameSite=Lax[; Secure]; Max-Age=0`, sin separar cabeceras por comas, ignorando cookies ajenas y sin reenviar duplicados ambiguos. `node --test --test-reporter=dot apps/web/src/lib/foxy-proxy.test.mjs`: exit 0, 7 PASS. `npx tsc --noEmit -p apps/web/tsconfig.json` y `npm run lint:boundaries -- --quiet`: exit 0. Sin cambios de pruebas ni proveedor real.
