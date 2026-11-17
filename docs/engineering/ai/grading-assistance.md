# Revisar una sugerencia privada de corrección

El docente activa la capacidad por aula cuando está disponible. Las nuevas entregas confirmadas elegibles producen trabajos para TP, cuestionarios y evaluaciones; la consigna/puntajes y rúbrica opcional delimitan la propuesta.

En la corrección privada puede consultar estado, revisar, usar o descartar una sugerencia. Usar requiere confirmación y guarda corrección privada; reemplazar cambios locales sin guardar debe ser explícito. Descartar no cambia la corrección existente. Publicar la nota requiere la operación docente independiente.

La puntuación objetiva conserva el motor determinista. Fallos/archivos no procesables permiten corregir manualmente. Las respuestas y archivos autorizados pueden contener texto identificatorio: minimizar datos no equivale a anonimizar todo el contenido ni a usar la política de análisis individual.

El [contrato vigente](../../../odd/tasks/grading-ai-issue-2.md) conserva la ruta exigida por CI. Fuentes: [runtime](../../../apps/api/src/modules/grading/assistance/infrastructure/grading-ai/runtime.ts), [UI de revisión](../../../apps/web/src/features/grading/ai-review/GradingAiReview.tsx), [calificación](../grading/README.md).

Prueba actual: se inspeccionó la sección sin sugerencia y se completó corrección/publicación manual. No se generó, aplicó o descartó una propuesta IA nueva; esa rama queda limitada en la [matriz](../../verification/flows.md), sin reutilizar resultados históricos como prueba actual.
