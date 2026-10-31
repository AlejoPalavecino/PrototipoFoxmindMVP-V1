# Corrección asistida por IA — issue #2

## Alcance acordado

El docente activa o desactiva la capacidad por aula. Las entregas confirmadas después de activarla generan automáticamente una propuesta privada para trabajos prácticos, cuestionarios y evaluaciones. La IA considera la consigna y los puntajes existentes, además de una rúbrica opcional configurada en la actividad. El usuario autorizó procesar respuestas y archivos, minimizando datos personales; el texto libre puede contener datos identificatorios.

La sugerencia incluye una nota y devolución; en preguntas objetivas el motor existente conserva el cálculo determinista. El docente revisa, edita, acepta o descarta la propuesta. Aceptar guarda una corrección privada; publicar sigue siendo una operación explícita e independiente. Fallos del proveedor o archivos no procesables dejan disponible la corrección manual.

## Estado y evidencia

Implementación integrada en main mediante PR #16, con verificación posterior autenticada y Gemini real: [TP con PDF](../../docs/work-log/2026-10-29-root-gemini-grading.md) y [cuestionario/evaluación](../../docs/work-log/2026-10-29-root-gemini-questionnaire-evaluation.md). Se observaron propuesta privada, edición/aplicación docente, privacidad y publicación explícita. Q/E cubren desarrollo y opción única EXACT; no todos los formatos ni capacidad productiva. El [registro inicial](../../docs/work-log/2026-10-29-root-issue2-correccion-ia.md) conserva su candidato y límites originales; no se reetiquetan pruebas antiguas como proveedor real. Sin despliegue.

La [guía vigente](../../docs/engineering/ai/grading-assistance.md) explica el recorrido docente; el [roadmap](../../docs/implementation-roadmap.md#estado-actual) mantiene el estado global. Se conserva esta ruta porque su existencia activa controles de integración en CI.
