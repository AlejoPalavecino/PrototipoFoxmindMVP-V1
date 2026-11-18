# Verificación independiente de los pilotos pedagógicos

- Agente: recorridos, verificación independiente. Identificador de sesión del cliente no expuesto.
- Fecha: 2026-11-17. Checkout principal, rama `feature/latencia-ia`, base `6e9c1312`, con cambios locales concurrentes de latencia y arnés pedagógico. Candidato de navegador con build web de las 23:15:31 UTC y API de las 23:17:49 UTC.
- Alcance delegado: comprobaciones de los recorridos de estudio privado y generación del borrador docente. Escritura acotada a este registro y a artefactos ignorados propios.

## Evidencia

- `npm run web:build` salió 0. El coordinador confirmó el build API y Prisma antes de iniciar su runtime.
- `node --test --test-concurrency=1 --test-reporter=spec apps/api/src/modules/study/folders/infrastructure/tests/service.test.ts apps/api/src/modules/study/generation/application/tests/conversation-generation.test.ts apps/api/src/modules/study/generation/application/tests/study-generation-cancellation.test.ts tests/study-exact-practice.test.mjs` — 38 pasaron, 0 fallaron. Prueba explícita de cancelación con reserva, recibo persistido y respuesta tardía descartada. También cubre ámbito de conversación, autosave, protección de claves y reintento.
- `node --experimental-transform-types --disable-warning=ExperimentalWarning --test --test-concurrency=1 --test-reporter=spec tests/activity-ai-jobs.test.mjs tests/activity-ai-lifecycle.test.mjs tests/activity-ai-ui.test.mjs tests/activity-ai-adapter.test.mjs` — 36 pasaron, 0 fallaron. PostgreSQL temporal y proveedor sustituido. La insuficiencia persiste información faltante sin propuesta ni borrador. La aplicación repetida conserva un borrador privado y editable.
- `node --import ./scripts/register-api-test-build.mjs --experimental-transform-types --test --test-concurrency=1 --test-reporter=spec apps/api/src/modules/study/folders/infrastructure/tests/http.test.mjs tests/activity-ai-host.test.mjs` — 6 pasaron, 0 fallaron. HTTP real con identidad persistida, propiedad, rol, Origin y CSRF.
- `node --import ./scripts/register-api-test-build.mjs --experimental-transform-types --test --test-concurrency=1 --test-reporter=spec apps/api/src/modules/study/generation/application/engine.test.ts tests/activity-ai-adapter.test.mjs apps/api/src/modules/activities/generation/application/apply.test.mjs` — 39 pasaron, 0 fallaron. Incluye los casos del adapter de la pasada anterior. Verifica la estrategia por operación, fuentes autorizadas, prioridad de devolución, composición para el proveedor y aplicación de la propuesta.

## Navegador

`node scripts/study-preview.mjs` sirvió el candidato con PostgreSQL, almacenamiento, escáner, Mailpit y proveedores sintéticos del fixture. Playwright Chromium usó contextos independientes. Ejecución `node .test-artifacts/pedagogical-journeys/browser.mjs .test-artifacts/study-preview-aeb4377e4ff52eb5/fixture.json study` y la equivalente con `teacher`. Los resultados, logs y capturas sintéticas quedaron en `.test-artifacts/pedagogical-journeys/`.

- Estudiante, 390 × 844, siete comprobaciones pasadas. Envió una consulta con intento previo, generó desde la herramienta Practicar, respondió selección simple, múltiple y desarrollo. La API omitió claves y explicaciones en el intento activo. Cancelar el diálogo conservó ACTIVE. La finalización guardó el texto entregado y una devolución orientativa con un siguiente paso. Reintentar abrió un intento vacío y mantuvo idéntico el anterior. Un docente y un segundo estudiante verificado recibieron 403 al pedir la carpeta.
- Docente, 1440 × 900, dos comprobaciones pasadas. Eligió Cuestionario, tema, objetivo, idea privada y PDF. La propuesta mostró procedencia con página. La vista de estudiante omitió la idea y controles de corrección. El título editado llegó al editor con la idea privada consultable por el docente. La API devolvió DRAFT, el listado estudiantil quedó idéntico y el acceso directo al borrador devolvió 403. No se registró una petición de publicación.
- Se inspeccionaron las capturas de devolución y editor. La cancelación de una generación ya reservada se probó en servicio. En navegador se probó la cancelación de la finalización.
- Primeros intentos de la verificación: la ejecución de actividad sin transformación TS no pudo cargar archivos con parámetros de constructor. Se repitió con la opción del runner del proyecto. El guion de navegador de estudiante inicialmente esperaba 200 para la subida (devuelve 201) y una etiqueta histórica del botón de práctica. Corregidos esos supuestos del guion, la pasada completa salió 0.
- La instancia se detuvo mediante el archivo de señal propio. El proceso terminó con código 0, `P4 owned cleanup failures: 0` y se retiró el fixture de acceso. Sin servicios retenidos ni proveedores reales.

## Límites y continuidad

Se comprobó el recorrido y el contrato de instrucciones con resultados sintéticos. Quedan pendientes la comparación ciega entre modelos/salidas, la fidelidad y el nivel de desafío con un proveedor real, y cualquier medición educativa o de tiempos docentes. La evidencia UI corresponde a los dos tamaños indicados. Sin commits de esta verificación. El coordinador reconcilia hallazgos y actualiza el [tablero](../../odd/tasks/pedagogical-harness.md).
