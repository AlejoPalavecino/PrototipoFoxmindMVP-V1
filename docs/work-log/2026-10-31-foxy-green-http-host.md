# Foxy AI — host HTTP R2

- Agent / role: /root/foxy_visual_green, slice_worker
- Session or task ID: /root/foxy_visual_green; identificador de sesión no disponible
- Date: 2026-10-31
- Branch / worktree: codex/foxy-ai, C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Starting commit: a7601c7
- Phase and detailed task/spec links: R2, [propuesta](../../odd/tasks/foxy-ai-proposal.md)
- Status: completed

## Request and scope
Transport de Foxy con sesión, verificación docente, Origin y CSRF, sin alterar la ruta completa ni activar proveedor.

## Work performed
Host admite exactamente una vez, consulta sesión persistida, limpia cookie inválida, exige docente verificado y guarda Origin/CSRF para escrituras. Autenticador transaccional reutilizable revalida identidad en UoW. Middleware montado sin prefijo preserva URL completa; asigna request ID para Foxy. No se editaron pruebas ni activó runtime.

## Verification
Primer `node --test --test-reporter=dot apps/api/src/foxy-ai/foxy-host.test.mjs`: exit 1 porque importación fuente de identity/index.ts contiene decorador Nest no interpretado por Node strip-only. Test runner corrigió harness para usar build compilado. Repetición exit 0, 1 PASS en PostgreSQL efímero sintético. `npm run api:build` y `npm run lint:boundaries -- --quiet`: exit 0. Sin secretos, proveedor real ni base retenida.

## Commits and outcomes
Sin commit propio.

## Handoff
Revisión independiente; ensamblar host y servicios explícitamente sin activar proveedor hasta cumplir configuración y pruebas completas.
