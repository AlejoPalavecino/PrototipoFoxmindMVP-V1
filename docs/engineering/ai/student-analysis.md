# Análisis individual orientativo

El docente abre la ficha de un alumno y Análisis con IA. La capacidad utiliza su evidencia métrica anónima según el contrato, sin convertirla en corrección de respuestas o publicación de notas. Debe revisarse con los registros y criterio docente.

El servicio revalida propietario, alumno/pertenencia, estado y referencias del snapshot. Un cambio de datos puede volver obsoleto un resultado; no usarlo como predicción o diagnóstico personal. Una falla deja disponible consultar progreso y registros.

El perfil `student-report-v2` vincula una observación de entregas, puntualidad o rendimiento publicado con una acción docente concreta y una forma de comprobarla en la próxima revisión. Cada hallazgo cita actividades y la vista docente muestra sus nombres cuando siguen correspondiendo a la evidencia. El informe explicita que las métricas carecen de respuestas y criterios de evaluación. Una reentrega pendiente puede coexistir con una nota publicada y una nota ausente no se trata como cero.

El contrato de respuesta sigue siendo `student-report-v1`. Los trabajos encolados con ese perfil conservan su instrucción original y la lectura de un análisis existente sigue usando el hash de evidencia. **Volver a consultar** recupera el estado de la cola. El estudiante consulta sus propias métricas y devoluciones publicadas desde [Mi progreso](../grading/progress.md).

Fuentes: [servicio y worker](../../../apps/api/src/modules/grading/student-analysis/), [progreso](../grading/progress.md). En el [recorrido actual](../../verification/flows.md) se abrió la ficha y se observó el error/reintento de un proveedor sintético deliberadamente no disponible. No se acreditó generación exitosa del informe ni proveedor real en esta entrega.
