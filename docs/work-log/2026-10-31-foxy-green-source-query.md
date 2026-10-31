# Foxy AI — consulta de fuentes

- Agent / role: /root/foxy_visual_green, slice_worker
- Session or task ID: /root/foxy_visual_green; identificador de sesión no disponible
- Date: 2026-10-31
- Branch / worktree: codex/foxy-ai, C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Starting commit: 57e35aa
- Phase and detailed task/spec links: catálogo de fuentes, [propuesta](../../odd/tasks/foxy-ai-proposal.md)
- Status: completed

## Request and scope
Implementar parser de consulta con paginación estricta y tipos puros. No modificar pruebas ni trabajo ajeno.

## Work performed
Tipos y parser estrictos: tipos de fuente, límite 1–50 y cursor UUID/fecha UTC canónica validada mediante conversión reversible.

## Verification

node --test --test-reporter=dot src/core/domain/foxy-ai-source-query.test.mjs: exit 0, 3 pruebas PASS. npm run api:build: exit 0; npm run lint:boundaries -- --quiet: exit 0. Sin APIs externas nuevas; Context7 no aplica.

## Commits and outcomes
Sin commit propio.

## Handoff
Entregar al coordinador para revisión.
