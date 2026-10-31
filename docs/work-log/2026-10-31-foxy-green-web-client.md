# Foxy AI — cliente web

- Agent / role: /root/foxy_visual_green, slice_worker
- Session or task ID: /root/foxy_visual_green; identificador de sesión no disponible
- Date: 2026-10-31
- Branch / worktree: codex/foxy-ai, C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Starting commit: 7cdaa7a
- Phase and detailed task/spec links: cliente web, [propuesta](../../odd/tasks/foxy-ai-proposal.md)
- Status: completed

## Request and scope
Cliente Foxy con rutas cerradas, sesión, CSRF fresco, señales de cancelación y errores seguros, sin activar UI ni proveedor real.

## Work performed
Métodos tipados de conversaciones, turnos, contexto, fuentes y citas; URL de cita derivada localmente de UUID y clave opaca. Cada mutación obtiene CSRF nuevo, ambas solicitudes heredan cancelación y plazo, fetch usa same-origin/no-store; cursores codificados UTF-8 base64url. Errores públicos en allowlist; sin retry ni UI activada.

## Verification
`node --test --test-reporter=dot apps/web/src/lib/foxy-client.test.mjs`: exit 0, 3 PASS con fetch sintético. `npx tsc --noEmit -p apps/web/tsconfig.json` y `npm run lint:boundaries -- --quiet`: exit 0. Sin datos retenidos ni proveedor real.

## Commits and outcomes
Sin commit propio.

## Handoff
Revisión independiente e integración UI; usar `citationUrl` para construir vínculos en lugar de confiar en un href arbitrario. Pruebas sintéticas no acreditan viaje autenticado integrado.
