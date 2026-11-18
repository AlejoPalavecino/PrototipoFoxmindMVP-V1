# Reconciliación del arnés pedagógico

Agente `/root/pedagogy`. Rama local `feature/latencia-ia`, HEAD inicial `8299fcbc`, checkout compartido. El coordinador encargó la verificación del candidato pedagógico, la actualización del tablero y el ajuste de la prueba de identidad de perfiles. Las pruebas de este registro usan datos sintéticos.

Antes de editar, el validador TTP detectó que cambió el candidato de TASK-001, TASK-002, TASK-003 y TASK-005. Las primeras ejecuciones dirigidas registraron 173/174 y 133/134, ambas por la expectativa desfasada de `study-v4` en el contrato de perfiles. Exportaciones e informes pasaron 50/50 en la suite dirigida.

Otro escritor actualizó la expectativa de Study para V5 y conservó la comprobación de perfiles V1–V4. La siguiente ejecución registró 176/177 y 136/137 por un fixture nuevo de separadores que no llegaba al proveedor. El mismo escritor corrigió el fixture antes de la pasada combinada.

## Evidencia de la pasada combinada

La suite dirigida pasó 286/286, sin saltos. Duró 35,6 segundos. La salida queda en `.test-artifacts/harness-cierre/reconcile-candidate.tap`. Estas pruebas ejercitan la selección de instrucciones, los límites de contexto y de práctica, permisos de servicios sintéticos, documentos exportados e informes. Las huellas de TASK-001, TASK-002, TASK-003, TASK-005 y TASK-006 coincidieron antes y después. TASK-007 cambió durante la ejecución por trabajo concurrente de exportación.

```powershell
$tests = @(
  'apps/api/src/modules/study/generation/application/engine.test.ts',
  'tests/study-ai-execution.test.mjs',
  'apps/api/src/modules/study/folders/infrastructure/tests/service.test.ts',
  'apps/api/src/modules/study/generation/application/tests/study-generation-cancellation.test.ts',
  'tests/activity-ai-adapter.test.mjs',
  'tests/ai-generation-snapshots.test.mjs',
  'tests/ai-profile-client.test.mjs',
  'apps/api/src/modules/activities/generation/application/apply.test.mjs',
  'tests/activity-ai-ui.test.mjs',
  'apps/api/src/modules/study/generation/application/tests/generation-protocol.test.mjs',
  'tests/frontend-study-step-views.test.mjs',
  'apps/web/src/features/foxy/ui/foxy-collections.test.mjs',
  'apps/api/src/modules/foxy/turns/infrastructure/providers/tests/foxy-text-adapter.test.mjs',
  'apps/api/src/modules/foxy/turns/infrastructure/tests/foxy-turn-preparation.test.mjs',
  'apps/api/src/modules/foxy/visuals/infrastructure/providers/tests/foxy-image-adapter.test.mjs',
  'apps/api/src/modules/foxy/visuals/infrastructure/providers/tests/foxy-diagram-adapter.test.mjs',
  'apps/api/src/modules/foxy/visuals/infrastructure/tests/foxy-visual-configuration.test.mjs',
  'apps/api/src/modules/foxy/visuals/infrastructure/tests/foxy-visual-worker.test.mjs',
  'apps/api/src/modules/study/reviews/infrastructure/tests/exact-review-plan.test.ts',
  'apps/api/src/modules/study/reviews/infrastructure/tests/session-event.test.mjs',
  'tests/study-exact-repaso.test.mjs',
  'tests/study-ui-audit-regressions.test.mjs',
  'apps/api/src/modules/foxy/publications/infrastructure/tests/foxy-resource-pdf.test.mjs',
  'tests/brujula-authoring-complete.test.mjs',
  'tests/p6-library.test.mjs',
  'tests/parity-library-revision-independent.test.mjs',
  'tests/student-ai-contract.test.mjs',
  'tests/student-ai-references.test.mjs',
  'tests/classroom-progress-exact.test.mjs'
)
node --experimental-transform-types --experimental-test-module-mocks --test --test-reporter=tap $tests
```

`npm run docs:check` validó 211 archivos y 1.136 enlaces sin problemas. `git diff --check` pasó.

## Migración PDF y saltos de línea

La prueba de migración pasó 1/1 en PostgreSQL descartable con el build final disponible al ejecutarla. Preparó una reserva V1 antes de migrar, conservó archivo y digest al reanudarla y descargó un PDF V2 etiquetado con los permisos privados vigentes. El coordinador también incorporó el normalizador compartido para recursos nuevos de Estudio y Foxy. Después del cambio pasaron 58/58 pruebas de motor de Estudio, adaptador de texto Foxy e identidad de snapshots.

Pasaron 40/40 pruebas del renderizador, worker, lectura privada, reintentos y limpieza de publicaciones con el build disponible. La suite usa puertos sintéticos para almacenamiento y Docker descartable cuando requiere PostgreSQL. Salida en `.test-artifacts/harness-cierre/reconcile-pdf-sql.tap`.

```powershell
node --experimental-transform-types --import ./scripts/register-api-test-build.mjs --test --test-name-pattern 'migration preserves a receivable v1 PDF' apps/api/src/modules/files/custody/infrastructure/tests/foxy-publication-files.test.mjs
node --experimental-transform-types --experimental-test-module-mocks --test --test-reporter=tap apps/api/src/modules/foxy/turns/infrastructure/providers/tests/foxy-text-adapter.test.mjs apps/api/src/modules/study/generation/application/engine.test.ts tests/ai-generation-snapshots.test.mjs
$testDir = 'apps/api/src/modules/foxy/publications/infrastructure/tests'
$tests = @('foxy-resource-pdf.test.mjs', 'foxy-publication-worker.test.mjs', 'foxy-publication-file.test.mjs', 'foxy-publication-retry.test.mjs', 'foxy-publication-cleanup-lifecycle.test.mjs') | ForEach-Object { "$testDir/$_" }
node --experimental-transform-types --import ./scripts/register-api-test-build.mjs --test --test-concurrency=1 --test-reporter=tap $tests
```

## Cierre técnico

La repetición focalizada dio 97/97 para recursos y repaso y 23/23 para formatos e informes. Ambas huellas coincidieron antes y después. El recibo `python -X utf8 .test-artifacts/harness-cierre/verify_outcomes.py` pasó sobre las muestras y descargas reales con entradas sintéticas. El tablero reúne las ocho tareas técnicas cerradas y `taskboard.py check odd/tasks/pedagogical-harness.md --current` validó las huellas. El guion de evaluación queda disponible para un piloto posterior con autorización y participantes.

## Recorridos reales y alcance

La salida V5 del esquema en Ego Lite se leyó en párrafos, con relaciones causales y sin la observación interna de la muestra anterior. El informe docente basado en dos actividades sintéticas vinculó la acción sugerida a la entrega faltante y explicó el límite de los datos. La exportación se inspeccionó con Word y PDFium. [Recorridos](2026-11-17-root-cierre-arnes.md) · [Exportaciones](2026-11-18-exportacion-pedagogica.md).

Una prueba provisional reprodujo la pérdida de legibilidad de la rúbrica V5. El lector ponía una tabla de cinco columnas en un solo párrafo. La corrección de otro escritor define encabezados y viñetas como forma predeterminada en V6, conserva el pedido explícito de formato y mantiene la instrucción V5 histórica. El enfoque conserva el texto de los borradores existentes. La pasada combinada con V6 dio 288/288 y coincidieron antes y después las huellas de TASK-001, TASK-002, TASK-003, TASK-005, TASK-006 y TASK-007. La salida queda en `.test-artifacts/harness-cierre/reconcile-v6.tap`.

La repetición V6 en Ego Lite mostró dos criterios ponderados, cada uno con tres niveles de desempeño observable. El texto editable conservó todos los criterios de esa respuesta y el lector presentó encabezados y viñetas sin caracteres de tabla. Las capturas y el texto se conservan en `.test-artifacts/harness-cierre/rubrica-lectura.png` y `.test-artifacts/harness-cierre/rubrica-final.txt`. Las tablas en borradores anteriores o solicitadas explícitamente pueden seguir presentándose como texto. La certificación PDF/UA, la operación con lectores de pantalla y la medición con participantes quedan fuera de esta verificación.

El TXT y el DOCX descargados desde el recurso de la rúbrica conservaron los dos criterios y los seis descriptores en orden. Al comprobar `word/document.xml` con Python, los dos criterios tenían estilo `Heading3`. Archivos `rubrica-descargada.txt` y `rubrica-descargada.docx` de la misma carpeta de QA.

Las tres pruebas de recorridos visuales y reinicio pasaron en PostgreSQL descartable. El proveedor determinista permitió verificar la cola, el escaneo, la custodia, la recuperación y la descarga de PNG privados. Un estudiante y otro docente quedaron excluidos. La suite del adaptador verificó la instrucción pedagógica de imagen V2.

En Ego Lite, el recurso de imagen real se abrió como creación privada y mostró dos frente a seis flechas para comparar aperturas. El modelo agregó rótulos pese al pedido sin texto y dibujó flechas en sentidos opuestos. La salida sirve como boceto para revisar el sentido del flujo antes de usarla como explicación. Captura en `.test-artifacts/harness-cierre/imagen-final.png`.

```powershell
$testDir = 'apps/api/src/modules/foxy/visuals/infrastructure/tests'
$tests = @('foxy-visual-runtime-journey.test.mjs', 'foxy-visual-restart-profile.test.mjs') | ForEach-Object { "$testDir/$_" }
node --experimental-transform-types --import ./scripts/register-api-test-build.mjs --test --test-concurrency=1 --test-reporter=tap $tests
```
