# Análisis individual orientativo

El docente abre la ficha de un alumno y Análisis con IA. La capacidad utiliza su evidencia métrica anónima según el contrato, sin convertirla en corrección de respuestas o publicación de notas. Debe revisarse con los registros y criterio docente.

El servicio revalida propietario, alumno/pertenencia, estado y referencias del snapshot. Un cambio de datos puede volver obsoleto un resultado; no usarlo como predicción o diagnóstico personal. Una falla deja disponible consultar progreso y registros.

El perfil `student-report-v2` vincula una observación de entregas, puntualidad o rendimiento publicado con una acción docente concreta y una forma de comprobarla en la próxima revisión. Cada hallazgo cita actividades y la vista docente muestra sus nombres cuando siguen correspondiendo a la evidencia. El informe explicita que las métricas carecen de respuestas y criterios de evaluación. Una reentrega pendiente puede coexistir con una nota publicada y una nota ausente no se trata como cero.

El contrato de respuesta sigue siendo `student-report-v1`. Los trabajos encolados con ese perfil conservan su instrucción original y la lectura de un análisis existente sigue usando el hash de evidencia. **Volver a consultar** recupera el estado de la cola. El estudiante consulta sus propias métricas y devoluciones publicadas desde [Mi progreso](../grading/progress.md).

Las pruebas aisladas comprobaron un informe V2 con proveedor sintético, el reintento con perfil V1 y el rechazo a estudiantes y terceros. La utilidad con participantes queda pendiente de evaluación. [Servicio y worker](../../../apps/api/src/modules/grading/student-analysis/) · [Progreso](../grading/progress.md) · [Pruebas y límites](../../work-log/2026-11-18-informes-pedagogicos.md).

## Escritura de las entregas

La ficha permite al docente solicitar un análisis de escritura usando su cuota personal. Las producciones confirmadas, las consignas y los criterios correspondientes delimitan la evidencia. El docente puede consultar los intentos citados y revisar una sugerencia en su contexto. Abrir la ficha, revisar el informe y leer sus fuentes son lecturas. El color del semáforo sigue dependiendo de las obligaciones y sus plazos. [Criterios de acompañamiento](../../product/acompanamiento-docente-propuesta.md).

La cuota mensual distingue el análisis de escritura del informe de métricas. El trabajo toma hasta tres producciones con texto, procesa fragmentos acotados y devuelve observaciones vinculadas a un intento. El servicio valida el acceso y la vigencia al consultar el informe y sus fuentes. Un resultado vencido a los 30 días deja de estar disponible. Los trabajos usan el perfil de ejecución de análisis y mantienen una reserva por operación docente. [Pruebas de cuota y revocación](../../work-log/2026-11-19-backend-analisis-escritura.md).
