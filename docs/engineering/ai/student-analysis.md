# Análisis individual con IA

El docente abre la ficha desde la tarjeta del estudiante en el aula. FoxMind genera automáticamente un análisis cuando hay evidencia académica suficiente y lo actualiza cuando cambia. Presenta fortalezas, necesidades de apoyo, recomendaciones y límites como orientación para el criterio docente, no como diagnóstico.

El proveedor recibe únicamente métricas y referencias anónimas: no recibe nombres, correos, identificadores reales, títulos, fechas exactas, respuestas, adjuntos ni texto libre. La relación con el estudiante y la asociación de cada referencia con su actividad permanecen en el servidor. El docente ve el título de la actividad cuando el informe sigue vigente. Los pendientes no equivalen a cero; se utilizan calificaciones publicadas y vigentes.

Solo el docente del aula consulta el informe de un estudiante actualmente matriculado. El procesamiento vuelve a comprobar matrícula, cuenta docente y evidencia; comparte concurrencia y presupuesto con las otras funciones de IA. Una respuesta incierta del proveedor no se vuelve a enviar automáticamente. La migración `202610280001_student_ai` debe aplicarse mediante el procedimiento normal de cada entorno antes de ejecutar esta versión.

Verificación y límites: [registro de verificación](../../work-log/2026-10-28-root-student-ai-verification.md). El recorrido autenticado con un estudiante sintético y Gemini real se verificó en infraestructura aislada.
