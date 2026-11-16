# Generación revisada de actividades

Crear con IA comparte las tres etapas del editor: Alcance → Contenido → Revisión. En Alcance, el docente elige tipo, temas de una o más unidades o unidades completas y escribe su idea. «Ajustes y fuentes» reúne nivel, dificultad, duración, extensión y fuentes/contexto; abrirlo o cerrarlo no genera contenido. Las solicitudes nuevas requieren `teacherBrief` de 1 a 1200 caracteres. La IA usa esa idea como guía y genera el objetivo público en la propuesta. La idea queda en la solicitud del trabajo y en el borrador docente aplicado. La extensión define cuántas preguntas de desarrollo/simple/múltiple o consignas se solicitan.

«Generar propuesta» crea un trabajo, no una actividad asignada. Cuando termina, el resultado se aplica una sola vez como borrador privado y abre Contenido en el [editor de actividades](../activities/authoring.md). Allí se revisan título, objetivo, consignas, claves, puntos y rúbrica antes de la revisión final y la publicación explícita. Las fuentes se identifican por consigna/pregunta; no son garantía de exactitud.

Los archivos compatibles para este ingreso son PDF, DOC, DOCX, PPT y PPTX con límites propios; un PNG disponible en Biblioteca no pasa automáticamente a fuente compatible. El trabajo conserva el snapshot ordenado del alcance y referencias verificables a las fuentes. Si cambian el alcance, las fuentes o la revisión requerida para aplicar, hay que generar otra propuesta. Los trabajos ya aceptados conservan el contrato y hash anteriores, incluso si llegaron antes de incorporar la idea privada.

Errores, cola, propuesta vieja y recuperación de generación conservan límites e identidad; no reenviar un resultado incierto o sobreescribir cambios por llegar tarde.

Fuentes: [configuración](../../../apps/web/src/features/activity-authoring/ui/GenerationSetup.tsx), [propuesta](../../../apps/web/src/features/activity-authoring/ui/ActivityGenerationProposal.tsx), [servicios](../../../apps/api/src/modules/activities/infrastructure/activity-ai/). [Prueba actual](../../verification/flows.md): cuestionario con tres tipos de pregunta y evaluación, proveedor sintético, borrador privado y asignación revisada.
