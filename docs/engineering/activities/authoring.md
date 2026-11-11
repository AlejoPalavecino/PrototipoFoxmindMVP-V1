# Preparar y asignar actividades

Crear actividad ofrece dos caminos: manual y con IA. Ambos terminan en contenido privado revisable antes de asignarlo al aula.

## Manual: dos etapas

Preparar actividad → Revisar y asignar. El editor pide tipo, unidad y uno o más temas, título, objetivo, consignas, materiales y rúbrica con criterios ponderados que sumen 100 %. Permite comentario docente, configuración de entrega/plazo y preguntas según tipo. Guardar borrador no publica; Asignar al aula es la decisión explícita.

El recorrido IA configura tema/objetivo → material/nivel → revisión/generación. La propuesta editable conserva claves/puntos privados; Usar propuesta revisada como borrador conduce al editor normal para revisar y asignar.

Ambos caminos comparten jerarquía, editor de consignas y revisión final. Materiales/comentario y rúbrica se despliegan cuando se necesitan; los errores conducen al campo correspondiente. La ficha de actividad separa «Qué tenés que hacer», contexto, materiales y plazo, y muestra las entregas por intento. El modo IA agrega selección de fuentes y progreso real del trabajo; no publica automáticamente ni usa una demora simulada en producto.

## Contrato y compatibilidad

El transporte del aula usa POST /classrooms/:id/activities con revisión y operación create/save/publish/withdraw/metadata/deadline. La UI actual envía topicIds, objective, teacherComment y evaluationRubric además del contenido, archivos, materiales, preguntas y plazo. El servicio valida forma/revisión/permisos; el proxy no los sustituye.

El API conserva compatibilidad con topicId y actividades existentes sin objetivo/rúbrica. En un TP puede aceptar instrucciones escritas o archivo aprobado. Los requisitos del editor nuevo no son una migración retroactiva ni permiso para endurecer contratos sin aprobación.

Desarrollo no tiene opciones. Selección simple requiere al menos dos opciones y una correcta; múltiple, dos o más correctas y regla EXACT/PARTIAL admitida. El estudiante no recibe claves ni reglas privadas de puntuación.

## Bloqueo y plazos

Antes de participar se puede editar/retirar según reglas. Tras el primer intento, se bloquean contenido y recursos; los cambios admitidos de título/organización o extensión de plazo no reconstruyen preguntas ni historia. La zona horaria es del aula; huecos DST se rechazan y ambigüedades requieren elección. No eliminar ni acortar una fecha ya bloqueada ni reclasificar recepciones históricas.

Fuentes: [editor](../../../apps/web/src/features/activity-authoring/ui/ActivityAuthoring.tsx), [generación](../../../apps/web/src/features/activity-authoring/ui/GenerationSetup.tsx), [políticas](../../../apps/api/src/modules/activities/domain/activity-policy.ts). [Flujos comprobados](../../verification/flows.md).
