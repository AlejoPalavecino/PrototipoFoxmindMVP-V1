# Foxy AI — catálogo curricular F3

- Agent / role: /root/foxy_green, slice_worker
- Session or task ID: /root/foxy_green; sesión no disponible
- Date: 2026-10-31
- Branch / worktree: codex/foxy-ai, C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Starting commit: 64f613f
- Phase and detailed task/spec links: [Foxy AI](../../odd/tasks/foxy-ai-proposal.md), F3 currículo
- Status: completed

## Request and scope
Implementar catálogo curricular y autorización a partir de conversación del docente, sin editar pruebas ni usar bases retenidas.

## Work performed
Se añadió context-catalog.ts y se exportó servicio en index.ts. El servicio usa run y classroom del módulo de aulas, verifica rol docente y conversación propia, revalida titularidad, conserva acceso de lectura a aulas archivadas sin habilitar generación, consulta plan ordenado y detecta límites sin truncar silenciosamente. GENERAL no consulta aula ni plan. Los códigos de denegación y límite se emiten tras run para evitar que ClassroomTransactionRunner los remapee.

## Verification
- `node --test --test-reporter=dot apps/api/src/foxy-ai/foxy-context-catalog.test.mjs`: 6 PASS, exit 0, dos ejecuciones.
- `npm run api:build`: exit 0 luego del ajuste final.
- `npm run lint:boundaries -- --quiet`: fallo inicial por import privado; corregido al barrel público y exit 0.
- Las pruebas usan dobles en memoria: no demuestran consultas SQL, permisos de sesión reales ni respuesta HTTP. No se ejecutó DB retenida.

## Commits and outcomes
Sin commit; coordinador revisa e integra.

## Handoff
Verificar servicio con ClassroomCore real, DB temporal, autorización de sesión y traducción HTTP; faltan catálogos documentales y actividades, generación, interfaz y publicación. No se declara la feature completa.
