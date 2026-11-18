# Auditoría de guías funcionales y técnicas

Agente `guias`, auditoría documental en `main` desde `2ed07b67` (2026-11-18), con identidad de sesión no expuesta. El orquestador encargó revisar `docs/engineering`, `docs/product`, `docs/api` y la especificación funcional en paralelo con otros agentes.

## Resultado

- Contrasté la arquitectura con el árbol de `apps/api/src/modules`, `apps/web/src`, `src/core`, los manifiestos y Compose. La guía actual refleja 13 dominios y los refactors integrados. Los diseños aprobados conservan su ubicación y explicitan qué evidencia corresponde al candidato de origen.
- Conté 69 modelos en `schema.prisma` y 68 archivos SQL de migración. Actualicé el mapa de datos y describí reservas, movimientos, recibos, control de integridad y activos de Estudio desde el esquema y el SQL.
- Revisé las rutas de cuota y de imágenes de Estudio contra sus contratos, handlers y adaptadores de persistencia. Incorporé la lectura JSON/SSE con sesión verificada y el acceso privado al archivo guardado.
- Actualicé referencias de Gemini real, de los ensayos sintéticos y del piloto pendiente de coordinar. La consulta semanal documenta el estado agregado del uso, y el piloto preparado evalúa aprendizaje y trabajo docente. Usé los recibos de cada candidato para acotar qué se comprobó.
- Reparé la codificación mixta de Agenda y Archivos en UTF-8. Cambié referencias a capturas retiradas por la galería y a cinco registros técnicos retirados y un registro de Foxy por enlaces a su commit de origen.
- Conservé las rutas y el contenido de los contratos ejecutables `docs/api/accounts-sessions.openapi.json` y `odd/tasks/grading-ai-issue-2.md`.

## Comprobaciones y límites

`node --experimental-transform-types --disable-warning=ExperimentalWarning --test tests/documentation-links.test.mjs tests/p31-contracts.test.mjs tests/issue2-ci-workflow.test.mjs tests/p8-migration-inventory.test.mjs tests/activity-migration-inventory.test.mjs tests/monthly-ai-quota-client.test.mjs tests/monthly-ai-quota-transport.test.mjs` pasó 45 pruebas. La primera invocación sin transformación explícita de TypeScript falló al cargar una propiedad de parámetro en la prueba de transporte. El comando corregido ejecutó el caso.

`git diff --check -- docs/engineering docs/product docs/api docs/foxmind-v1-functional-spec.md` pasó. El chequeo de enlaces durante el trabajo concurrente detectó rutas pendientes de galería, diagramas y manifiesto fuera de esta superficie. Coordinación verifica el resultado combinado después de integrarlas. Revisé la decodificación UTF-8 estricta de los 29 archivos editados.

Auditoría documental y pruebas focalizadas en recursos sintéticos. No hubo QA de navegador nueva, consulta a bases retenidas, migraciones, invocación de proveedores, commits ni publicación en esta unidad.
