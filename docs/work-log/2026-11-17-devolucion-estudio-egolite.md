# Devolución de desarrollo en Mi Estudio

Agente `devolucion`. Rama `feature/latencia-ia`, checkout principal, base `6e9c1312` con cambios de latencia y del arnés pedagógico en paralelo. Corrección de los hallazgos de formato y repetición observados con Ego Lite en [los dos pilotos](2026-11-17-root-ego-pedagogia-real.md).

Alcance autorizado por coordinación: presentación de la devolución orientativa, instrucción pedagógica para el siguiente caso y uso acotado del historial autorizado del chat vinculado. Pruebas con datos y proveedor sintéticos.

La devolución pide que el ejercicio de transferencia cambie la incógnita, la condición o la representación y conserve la resolución para el estudiante. El backend incluye hasta cuatro turnos del chat vinculado, de hasta 800 puntos de código cada uno, si siguen vigentes sus referencias y adjuntos. El motor aplica los controles de fuente y presupuesto de contexto. Una práctica previa sin conversación sigue funcionando con sus propias consignas, respuestas y fuentes.

El presentador de devoluciones repara separadores estructurales serializados y el asterisco residual junto a las etiquetas de orientación. Las respuestas del alumno y la devolución persistida se conservan. El proveedor recibe una instrucción de formato simple al generar nuevas devoluciones.

## Verificación

- RED con `node --test apps/api/src/modules/study/generation/application/engine.test.ts apps/api/src/modules/study/generation/application/tests/generation-protocol.test.mjs tests/frontend-study-step-views.test.mjs`. Fallaron tres comprobaciones por instrucción de transferencia ausente, falta de historial autorizado y defectos de formato visibles. Las otras 33 pasaron.
- GREEN con los tres archivos anteriores más `study-generation-cancellation.test.ts`, pruebas de servicio de carpetas, `study-runtime.test.mjs`, `study-ui-audit-regressions.test.mjs` y `study-ai-execution.test.mjs`, con `--experimental-transform-types --experimental-test-module-mocks`. Pasaron 86 de 86.
- ESLint sobre los seis archivos de producción tocados, `npm run docs:check` y `git diff --check` pasaron.

Estado local sin commits. La verificación de presentación usó el componente real renderizado a HTML. Este registro acredita composición, aislamiento y formato con un proveedor sintético. La prueba con Gemini y Ego Lite queda a cargo del coordinador.

### Regresión de preparación con PDF

La pasada real del coordinador detectó `SOURCE_UNAVAILABLE` antes del proveedor pese a que el PDF seguía vigente. El primer snapshot omitía el historial porque la lectura diferida aún no había hidratado el PDF. La revalidación lo incluía y por eso cambiaba el hash de entrada. La carga de documentos ahora reconstruye la entrada de devolución con el mismo criterio de legibilidad usado al revalidar. Se conserva la lectura diferida y la comprobación de referencias y de versión de custodia.

- RED en `generation-protocol.test.mjs`: 7/8. El caso nuevo reprodujo `SOURCE_UNAVAILABLE` en revalidación con una referencia PDF vigente y un chat vinculado.
- GREEN en `generation-protocol.test.mjs`: 8/8. El PDF se lee una sola vez, habilita el historial vinculado y el cambio de versión durante revalidación falla antes de provider.
- Regresión ampliada con los grupos anteriores y `generation-transaction-phases.test.mjs`: 89/89. ESLint de los dos archivos de producción ajustados y `git diff --check` verdes.

El coordinador recibió el candidato para recompilar y repetir el recorrido en la app habitual.
