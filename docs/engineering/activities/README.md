# Actividades

Autoría, participación, entregas, intentos e historial. Consulta el [estado actual](../../implementation-roadmap.md#estado-actual).

- [Creación de actividades](authoring.md)
- [Participación](participation.md)
- [Entregas prácticas](practical-submissions.md)
- [Intentos de cuestionarios](questionnaire-attempts.md)
- [Historial y notificaciones](history-notifications.md)

## Rúbrica pública de Brújula

Ampliación aprobada el 2026-11-05: `evaluationRubric` es una lista opcional de hasta 12 criterios `{ name, description, weight }`. Los nombres son distintos (hasta 120 caracteres), las descripciones admiten hasta 1000 caracteres y las ponderaciones son enteras positivas que suman exactamente 100. La lista vacía conserva compatibilidad con actividades anteriores. Backend y proxy validan el mismo contrato; la UI informa el total antes de guardar.

La migración aditiva `202611050001_public_evaluation_rubric` incorpora JSONB `evaluation_rubric` con valor inicial `[]`. No copia `ai_grading_rubric`, que sigue siendo privado. Omitir el nuevo campo en un guardado conserva el valor existente. Borradores siguen privados y los criterios se consultan con la actividad publicada; después del primer intento, se aplica el bloqueo de contenido existente. Los criterios se muestran en autoría, sesión del alumno y corrección docente; no recalculan ni publican automáticamente una nota.

Las generaciones nuevas solicitan entre 2 y 4 criterios públicos en el esquema de respuesta; el docente puede modificarlos en la revisión de la propuesta y en el editor posterior. Aplicar una propuesta crea únicamente un borrador privado con los criterios revisados. Las propuestas históricas que no incluyen `evaluationRubric` siguen siendo legibles. Los criterios públicos no deben contener claves ni soluciones; la instrucción del proveedor lo exige, y la revisión docente antes de publicar sigue siendo necesaria.

La revisión del editor ofrece Guardar borrador y Asignar al aula. Asignar queda bloqueado con cambios sin guardar y abre una confirmación que publica únicamente el estado persistido. La respuesta del servidor y la actualización del aula deben confirmarse antes de mostrar éxito; los errores conservan el diálogo.

La ampliación inicial de criterios reutiliza los endpoints de actividad. La paridad integral posterior agrega `POST /foxy-ai/resources/:id/activity-draft`: convierte una propuesta revisada en un borrador privado, con destino autorizado e idempotencia; nunca asigna la actividad sin confirmación docente.

La migración `202611050002_brujula_activity_grading_wall` conserva objetivo y comentario de actividad, título de Muro y el snapshot de criterios puntuados. La sugerencia ponderada es independiente de la nota final editable y de su publicación; las notas anteriores se preservan. Aplicar migraciones es un paso del despliegue futuro, no ejecutado sobre datos retenidos en esta entrega. No revertir eliminando columnas que ya contienen datos. [Plan y evidencia](../../../odd/tasks/foxmind-brujula.md).
