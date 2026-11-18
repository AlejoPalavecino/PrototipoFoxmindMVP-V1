# Alineación de actividades y acceso al alcance

- Agente docente, implementación y QA focalizada. El cliente no expone el identificador de sesión.
- Base en el checkout principal `feature/latencia-ia`, commit `6e9c1312`, con cambios locales concurrentes.
- El alcance comprende versionar las instrucciones de generación preservando snapshots anteriores y comprobar la selección de temas con puntero en un viewport corto. Las pruebas propias usan datos sintéticos. [Pasada en Ego Lite](2026-11-17-root-ego-pedagogia-real.md).
- Implementación y verificación sintética terminadas. Sin commits.

## Reproducción y corrección

- La prueba RED de generación ejecutó `node --experimental-transform-types --test --test-name-pattern='every item must assess' tests/activity-ai-adapter.test.mjs` y falló porque la instrucción llegaba al modelo sin revisión individual de cada ítem. V3 exige que cada ítem use la operación del objetivo, incluidas preguntas de selección. Las instrucciones V1 y V2 conservan su texto. La respuesta sigue usando `activity-proposal-v1`.
- La prueba RED de interfaz ejecutó `node .test-artifacts/pedagogical-journeys/authoring-scope.mjs .test-artifacts/study-preview-0bf054d58cd05651/fixture.json` y reprodujo el clic interceptado por `.p5-form-footer` a 1538 × 646, con una selección de tema dentro del viewport. El runtime sintético se detuvo con `P4 owned cleanup failures: 0`. En Alcance las acciones quedan después del formulario y el estado de guardado permanece en el flujo. La regresión usa un clic real con Chromium en la integración P7.

## Pruebas focalizadas de fuente

- `node --experimental-transform-types --experimental-test-module-mocks --test tests/activity-ai-adapter.test.mjs tests/ai-generation-snapshots.test.mjs tests/ai-profile-client.test.mjs apps/api/src/modules/activities/generation/application/repository.test.mjs` pasó 61/61. Incluye conteo y generación bajo tres versiones en ambos transportes sintéticos, V2 local encolada con V3 activa, y contradicción de perfil/columna rechazada antes de elegir proveedor.
- `node --experimental-transform-types --experimental-test-module-mocks --test tests/activity-ai-ui.test.mjs tests/activity-question-review.test.mjs apps/api/src/modules/activities/generation/application/apply.test.mjs` pasó 13/13.
- `npm run docs:check` salió 0, 211 archivos y 1134 enlaces verificados en ese corte.
- `node --experimental-transform-types --test --test-concurrency=1 tests/activity-parity-database.test.mjs tests/activity-ai-jobs.test.mjs tests/activity-ai-lifecycle.test.mjs` pasó 25/25 con PostgreSQL descartable y proveedor sintético. V1, V2 y V3 se encolaron bajo sus perfiles activos, se procesaron con esos mismos perfiles y conservaron el esquema de respuesta.

## Navegador

- Chromium, build `U-tCSGNGGsJ3w6qrrVV26`, runtime de `node scripts/study-preview.mjs` con cuentas e infraestructura descartables. El guion `node .test-artifacts/pedagogical-journeys/authoring-scope.mjs .test-artifacts/study-preview-1365f22857586d75/fixture.json` aprobó 1538 × 646 y 390 × 844. En escritorio, un clic de puntero a 33 px del borde inferior seleccionó el tema. En móvil se pudo elegir el tema. En ambos se continuó a Contenido. Se inspeccionaron las capturas `.test-artifacts/pedagogical-journeys/teacher-scope-1538.png` y `teacher-scope-390.png`. El runtime terminó con `P4 owned cleanup failures: 0`.
- La primera pasada de `node --test --test-isolation=none --test-concurrency=1 tests/p7-authoring-integration.test.mjs` pasó la nueva regresión, la persistencia del TP privado y ARQ-07. La comprobación de publicación agotó 30 segundos al buscar el aviso de asignación. Quedaron dos subpruebas omitidas y ambos entornos se limpiaron con 0 fallos. Se movió la regresión a la última subprueba del fixture de enlaces de ARQ-07 para excluir sus lecturas del recorrido de publicación. La repetición de P7 T1 con el guion anterior, equivalente al T1 final, pasó 5/5 sobre el mismo build, incluyendo publicación, editor de preguntas y controles de sesión. El guion observó `Retry-After=44s` durante una lectura y esperó el tiempo indicado.
- En la ubicación final de la regresión, `node --test --test-isolation=none --test-concurrency=1 --test-name-pattern='ARQ-07' tests/p7-authoring-integration.test.mjs` pasó 2/2. Se verificaron la navegación y el clic bajo el borde de la pantalla. Ambas limpiezas terminaron con 0 fallos.

La evidencia propia de generación usa proveedores sintéticos. La próxima comprobación de contenido consiste en revisar cada ítem de una salida de Gemini con el mismo objetivo de comparación de la pasada en Ego Lite.
