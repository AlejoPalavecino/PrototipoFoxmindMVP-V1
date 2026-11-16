# P3/P4 · Backend de autoría y archivos

Agente /root/activity_backend_impl. 2026-11-15, rama codex/foxmind-product-parity, base ef6828b en worktree dedicado del mismo nombre. Encargo vigente del orquestador: alcance de temas interunidad, idea docente privada y formatos PDF/DOC/DOCX/PPT/PPTX hasta 20 MB con cuota acumulada de chat vigente. Custodia de schema y coordinación de migraciones para otros dominios. Fixtures y servicios sintéticos.

## Cambios

- Autoría manual e IA con temas de varias unidades del aula, expansión ordenada de unidades completas, proyección de unidad/tema primario compatible e idea privada con máximo 1200 caracteres. La aplicación de trabajos nuevos coteja la revisión base y conserva replay de solicitudes previas.
- Biblioteca guarda descripción y reemplazo de asociaciones en el mismo lock/revisión de aula. Las actividades con un intento conservan sus recursos. Los listados de estudiante filtran IDs de borradores.
- Admisión, planes, Biblioteca y adjuntos de chat admiten PDF/DOC/DOCX/PPT/PPTX con el límite de 20.000.000 bytes. Se conserva el cupo y máximo actual del chat. PPTX se extrae en orden leyendo relaciones del paquete. DOC/PPT se convierten en un contenedor descartable sin red, root de sólo lectura y proceso no privilegiado. Se escanea y conserva el original.
- Migraciones agregadas para autoría (001), formatos (002), Agenda y lecturas proyectadas (003), rechazo de invitación (006) y descripción de material (007). Foxy es dueño de la transición y SQL 004. El inventario congelado conserva todos los hashes previos.

## Evidencia

- RED autoría: `node --test tests/activity-parity-contract.test.mjs` falla 2/2 con INVALID_INPUT al encontrar nuevos campos. RED formatos: office-document-parity falla en tamaño de Biblioteca y PPTX sin extractor. RED Biblioteca: el comando válido con extras recibe INVALID_INPUT al validar llaves antes de la autorización.
- `npm run api:build` exit 0 con Prisma 7.10 y compilación TypeScript. Durante escrituras concurrentes falló transitoriamente por un test tipado de Study y por la integración Agenda/Study, ambos resueltos en sus unidades.
- `node --experimental-transform-types --test --test-concurrency=1 tests/library-parity-database.test.mjs tests/p6-library.test.mjs tests/activity-parity-database.test.mjs tests/activity-multitopic-database.test.mjs tests/activity-review-regressions.test.mjs` pasó 26 pruebas en PostgreSQL descartable. Una pasada posterior incorporó el primer intento concurrente y la verificación de revisión obsoleta, con 4/4 casos nuevos en total antes de agregar la prueba de migración con datos preexistentes.
- Jobs IA, publicación, resultado incierto y rúbrica privada: 30 aprobadas con `node --experimental-transform-types --test --test-concurrency=1 tests/activity-ai-jobs.test.mjs tests/grading-ai-settings.test.mjs tests/activity-ai-publication.test.mjs tests/activity-unknown-start.test.mjs`. Sin la bandera, el runner directo de Node no carga propiedades de parámetros TS de pruebas antiguas.
- Pruebas unitarias focalizadas de contratos, multitema, formatos, archivo y chat: 29 aprobadas. Inventario de migraciones: 2 aprobadas. `npm run docs:check` sin incidencias y `npm run lint:boundaries` exit 0 con 0 excepciones congeladas. Un primer lint concurrente encontró imports privados y un rename transitorio; los límites pasan en la repetición.
- `docker build --pull=false -t foxmind-office-converter:local config/office-converter` aprobado. `FOX_TEST_LEGACY_OFFICE=1 node --test tests/office-legacy-conversion.test.mjs` 1/1. Produce un DOC y un PPT sintéticos, comprueba validación MIME y extracción en lectores de actividad/chat y plan, y rechaza formato cruzado o CFB truncado.
- El preview sintético devolvía un objetivo vacío para solicitudes con idea privada sin objetivo público predeterminado. Reproduje INVALID_INPUT en el parser de propuesta, completé el objetivo y la rúbrica del fixture, y el contrato pasó 3/3.
- Las verificaciones finales pasaron 19 pruebas de jobs, publicación y contratos, 16 del lector/aislamiento/validación estructural y 3 de PPTX y conversión DOC/PPT. La comprobación de tipos con `--noEmit` pasó después del ajuste final al prompt y la revisión base.
- Pendiente de esta unidad: recorrido completo en navegador con proveedor sintético y formatos vía upload real en conjunto. El test de conversión prueba bytes y aislamiento local, y los servicios de PostgreSQL usan fixtures sintéticos. Sin publicación ni despliegue.

## Reversión

Antes de persistir contenido nuevo se pueden revertir los cambios de aplicación y conservar las migraciones aditivas. Después de crear asociaciones interunidad o cargar DOC/PPT, no restaurar una versión sin lectores compatibles ni reinstalar constraints antiguos sin preservar esos datos. Desactivar escrituras nuevas y corregir en avance conserva actividades, materiales y trabajos. El convertidor local se puede reconstruir desde el Dockerfile.


## Compatibilidad de descripciones FILE legadas

- RED observado: descripción proyectada como null, formulario sin texto previo y lector con texto duplicado. Archivos: `tests/product-parity-library-ui.test.mjs` y `tests/library-parity-database.test.mjs`.
- El listado usa `description` o el `body` legado en materiales FILE. La edición intacta omite el campo. Si el texto existente supera 2000 caracteres, el formulario muestra el límite, conserva el texto completo y permite acortarlo o borrarlo. Una descripción explícita reemplaza el valor legado en la misma transacción y `null` lo limpia. `body` explícito de un cliente legado sigue admitido. TEXT conserva el cuerpo separado.
- GREEN: `node --experimental-transform-types --test --test-concurrency=1 tests/product-parity-library-ui.test.mjs tests/library-parity-database.test.mjs tests/parity-library-revision-independent.test.mjs` 6/6. Incluye rollback por actividad externa, edición/borrado explícitos, omisión de texto largo e integridad de revisiones TEXT. La nueva prueba DB pudo ejecutar el servicio fuente con PostgreSQL descartable mientras la QA central usaba su compilado.
- Reparé la codificación UTF-8 de las guías de autoría, generación y Biblioteca. `npm run docs:check` exit 0. La corrección usa el esquema vigente. Revertir la compatibilidad requiere conservar el lector de `description` para archivos ya editados bajo el contrato nuevo.
