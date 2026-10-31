# Foxy AI — respuesta con referencias F5E

- Agent / role: /root/foxy_visual_green, slice_worker
- Session or task ID: /root/foxy_visual_green; identificador de sesión no disponible
- Date: 2026-10-31
- Branch / worktree: codex/foxy-ai, C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Starting commit: ec53be6
- Phase and detailed task/spec links: F5E, [propuesta](../../odd/tasks/foxy-ai-proposal.md)
- Status: completed

## Request and scope
Validar salida IA y resolver referencias exclusivamente con mapa privado autorizado, sin modificar pruebas ni parser anterior.

## Work performed
Parser puro con límites Unicode y colecciones, validación de referencias fuente/documento, pertenencia y páginas; resuelve sourceKey a sourceId privado y descarta claves de fuente del resultado. Rechaza mapas ambiguos y claves ajenas. No se editaron pruebas.

## Verification
`node --test --test-reporter=dot src/core/domain/foxy-ai-answer-grounded.test.mjs src/core/domain/foxy-ai-resource.test.mjs`: exit 0, 10 PASS. `npm run api:build` y `npm run lint:boundaries -- --quiet`: exit 0. Sin proveedor real, DB ni secretos.

## Commits and outcomes
Sin commit propio.

## Handoff
Revisión independiente; integrar mapa construido desde grounding verificado. Mostrar fuentes no garantiza exactitud pedagógica de la respuesta.
