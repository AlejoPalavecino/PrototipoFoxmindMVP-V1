# TASK-007 backend editorial

- Agente: /root/foxy_editor_backend; sesión no expuesta. Fecha 2026-11-16.
- Rama/worktree: codex/foxmind-product-parity, C:/Users/alejo/.codex/worktrees/foxmind-product-parity/ProtipoFoxMind. Base ef6828b96084b0fcaf9a883e4afb95e0871cf1d6; cambios ajenos preexistentes preservados.
- Alcance autorizado por coordinador: overlay editorial título/texto de visuales, revisión/idempotencia, publicación por snapshot y catálogo; migración aditiva y pruebas sintéticas. TASK-007 de odd/tasks/foxy-study-exact-parity.md. Sin Git, proveedores reales ni datos retenidos.
- Ownership: backend Foxy y dominio, bootstrap/transporte, puerto/adaptador Materials y schema/migración necesarios. UI y documentación canónica pertenecen a otros autores.
- Contrato coordinado: PATCH assets/:id/editorial con expectedRevision/requestId/title/description; GET/PATCH editorial {revision,title,description}, canEdit; payload conserva original. PATCH suma receipt EDIT. PREPARE editorialRevision opcional para compatibilidad y obligatorio desde UI nueva.
- Estado: IN_PROGRESS. Pruebas RED por agregar y ejecutar; luego implementación y PostgreSQL descartable con custodia del helper existente.
- Límites: no validación de proveedor educativo real; build/QA final y revisión independiente a cargo de root.

## Implementación y evidencia

- Overlay `editorial_revision/title/description` independiente de payload/revisión binaria. PATCH autenticado propietario, validación 200/12000 caracteres, revisión esperada, recibos EDIT compartidos con DISCARD y respuesta con inspección vigente + recibo original.
- Publicación conserva snapshot_visual original y agrega snapshot_description/source_editorial_revision inmutables. Publicaciones históricas quedan NULL (proyección revisión0) sin reescribir filas/recibos. Índice UNIQUE parcial cubre nuevas publicaciones por asset/revisión/editorial/aula; dedup consulta también legacy.
- Solicitudes PREPARE deduplicadas guardan recibo inmutable en foxy_publication_command_requests; replay explícito y legacy conserva publicación aunque luego EDIT o DISCARD. Prueba RED reprodujo CONFLICT antes de la corrección; luego GREEN.
- GET de publicación visual expone editorialSnapshot privado (título/texto/revisión congelados). Legacy retorna texto/revisión NULL y confirmación conserva ausencia de body. UI coordinada para mostrar snapshot antes de confirmar.
- Catálogo usa título editorial. MaterialPublisherPort permite body opcional (límite actual materials.body de20000); confirmación visual usa título/cuerpo de snapshot. La columna description de Materials (2000) permanece intacta.
- `node node_modules/typescript/bin/tsc -p apps/api/tsconfig.json --noEmit`: exit0. Compilación emit final también exit0; sólo .build/api para tests, sin arrancar servicios.
- `git diff --check` focal de fuentes modificadas: exit0.
- Parser RED por función inexistente, luego1/1 PASS. HTTP+regresiones privadas y servicio visual11/11 PASS.
- SQL: pruebas de edición/replay, permisos/validación/revocación, carrera duplicada y revisiones competidoras, snapshot previo/nuevo, migración poblada y alias PREPARE; última ejecución conjunta en curso. Fixture withAiDatabase crea PostgreSQL tmpfs con etiqueta propia, valida dueño y elimina sólo contenedor propio.
- Runtime final IMAGE/DIAGRAM2/2 PASS: PREPARE anterior→EDIT→worker→confirm; publicación nueva explícita; título catálogo; título/cuerpo de ambas copias y digest/bytes originales intactos tras nueva edición.
- Fallos de preparación conservados: primer SQL bloqueado por daemon Docker apagado (root lo inició); strip-only no admite parameter properties, y transform-only no reemplaza build requerido por decoradores. Se usó loader de build habitual. Fixture IMAGE tenía modelo sintético incompatible con validación fija (corregido al modelo permitido con proveedor sintético); DIAGRAM cambiado al ejemplo ejecutable de dos nodos. Dos strings propios en test quedaron CP1252 por pipeline PowerShell/Python; normalizados a UTF-8, sin cambio productivo.
- Estado: candidato productivo congelado; root y revisor avisados. Sin commits/push/deploy, sin acceso a secretos, datos retenidos o proveedor real. Siguiente: cierre de suite conjunta y revisión independiente.

## Cierre del autor

- Suite final conjunta: `node --import ./scripts/register-api-test-build.mjs --experimental-transform-types --disable-warning=ExperimentalWarning --test --test-concurrency=1 apps/api/src/modules/foxy/infrastructure/tests/foxy-visual-editorial-publication.test.mjs apps/api/src/modules/foxy/infrastructure/tests/foxy-visual-editorial.test.mjs apps/api/src/modules/foxy/infrastructure/tests/foxy-visual-editorial-contract.test.mjs apps/api/src/modules/foxy/infrastructure/tests/foxy-visual-editorial-http.test.mjs` →11/11 PASS, exit0, sin skips (108.4s).
- Estado autor: implementación y pruebas focales completas, candidato congelado. Revisión independiente e integración QA/CI a cargo del coordinador; no se declara TASK-007 DONE desde este registro.
- Sin procesos propios activos al cierre. Base temporal PostgreSQL removida por helper tras comprobar propietario; servicios compartidos intactos.

## Reapertura por QA real — proyección de inspección

- Root reprodujo GET200 READY sin editorialSnapshot: projection() en application/publication-service.ts reconstruye la respuesta pública y omite el campo del repositorio. La prueba previa comprobaba SQL y publicación completa pero no la propagación del snapshot a HTTP.
- Alcance: cambio mínimo del mapper sólo para visuales, más regresión HTTP con servicio/repositorio/PostgreSQL reales; ningún proxy ni servicio compartido. RED pendiente y después fix, tipos/freeze.
- RED real ejecutado (sin build loader, source transform): GET200 no contenía editorialSnapshot, assertion actual undefined vs snapshot congelado. El test usa createFoxyHandler → createFoxyPublicationService → createFoxyPublicationRepository → PostgreSQL descartable, con autenticación sintética; no stub de snapshot/repositorio/servicio.
- Corrección productiva: dos líneas en projection() del servicio para incluir una allowlist explícita de title/description/revision únicamente en visuales con snapshot. No cambia consulta ni permisos.
- GREEN: regresión HTTP real1/1 PASS; mismo test junto inspección/lista públicas3/3 PASS. Suite completa foxy-publication-service5/5 PASS. diff --check focal exit0. Candidato congelado y root avisado para build/navegador final; tipos API en curso.
- Tipos finales tras corrección: `node node_modules/typescript/bin/tsc -p apps/api/tsconfig.json --noEmit` →exit0. Sin procesos propios activos. Falta sólo QA/revisión integrados del coordinador.
