# Preparar y asignar actividades

Crear actividad ofrece dos caminos: manual y con IA. Ambos terminan en contenido privado revisable antes de asignarlo al aula.

## Manual: tres etapas

Alcance → Contenido (Consigna, Preguntas y Rúbrica) → Revisión → Confirmar la publicación. El editor pide tipo y alcance curricular con temas individuales o unidades completas, título, objetivo, consignas, materiales y rúbrica con criterios ponderados que sumen 100 %. Permite comentario docente, configuración de entrega/plazo y preguntas según tipo. Guardar borrador no publica; Asignar al aula es la decisión explícita.

El recorrido IA pide alcance e idea docente en la primera etapa. «Ajustes y fuentes» permite ajustar la generación sin iniciar una solicitud. «Generar propuesta» es la acción explícita; al terminar, la propuesta se aplica una sola vez como borrador privado y abre Contenido. El docente revisa consigna, preguntas y rúbrica en el mismo editor, pasa por Revisión y confirma la publicación. Si cambia el alcance o la idea, hace falta generar una propuesta actualizada. Las claves y los puntos se conservan privados.

Ambos caminos comparten jerarquía, editor de consignas y revisión final. Materiales/comentario y rúbrica se despliegan cuando se necesitan; los errores conducen al campo correspondiente. La ficha de actividad separa «Qué tenés que hacer», contexto, materiales y plazo, y muestra las entregas por intento. El modo IA agrega selección de fuentes y progreso real del trabajo; no publica automáticamente ni usa una demora simulada en producto.

## Contrato y compatibilidad

El transporte del aula usa POST /classrooms/:id/activities con revisión y operación create/save/publish/withdraw/metadata/deadline. La UI envía `unitIds`, `topicIds`, `objective`, `teacherComment` y `evaluationRubric` además del contenido, archivos, materiales, preguntas y plazo. El servicio valida forma/revisión/permisos; el proxy no los sustituye.

En escrituras con `unitIds`, cada unidad se expande a sus temas actuales dentro de la transacción. `topicIds` agrega temas individuales de la misma aula; se deduplican los cruces entre ambas selecciones. El orden empieza por temas explícitos, seguido por los temas de cada unidad en orden curricular. El alcance confirmado admite hasta 100 temas. Los DTO devuelven `topicIds` ya expandidos y `unitIds` derivados de los temas guardados. `unitId` y `topicId` conservan la referencia al primer tema. Si se edita una selección ya confirmada, enviar sus temas explícitos con `unitIds: []` para conservar el alcance.

La API conserva compatibilidad con escrituras `unitId` + `topicId` o `topicIds` de una sola unidad, y con actividades existentes sin objetivo/rúbrica. `teacherBrief` es la idea privada de generación, de hasta 1200 caracteres, disponible en el detalle docente y separada de `objective`. Omitirla al guardar conserva el valor existente. En un TP puede aceptar instrucciones escritas o archivo aprobado. Los requisitos del editor nuevo no son una migración retroactiva ni permiso para endurecer contratos sin aprobación.

Desarrollo no tiene opciones. Selección simple requiere al menos dos opciones y una correcta; múltiple, dos o más correctas y regla EXACT/PARTIAL admitida. El estudiante no recibe claves ni reglas privadas de puntuación.

## Bloqueo y plazos

Antes de participar se puede editar/retirar según reglas. Tras el primer intento, se bloquean contenido y recursos; los cambios admitidos de título/organización o extensión de plazo no reconstruyen preguntas ni historia. La zona horaria es del aula; huecos DST se rechazan y ambigüedades requieren elección. No eliminar ni acortar una fecha ya bloqueada ni reclasificar recepciones históricas.

Fuentes: [editor](../../../apps/web/src/features/activity-authoring/ui/ActivityAuthoring.tsx), [generación](../../../apps/web/src/features/activity-authoring/ui/GenerationSetup.tsx), [políticas](../../../apps/api/src/modules/activities/domain/activity-policy.ts). [Flujos comprobados](../../verification/flows.md).
