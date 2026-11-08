# Generación revisada de actividades

Crear con IA configura tres pasos: Tema y objetivo → Material y nivel → Revisar y generar. El docente elige tipo, unidad/temas, objetivo, nivel, dificultad, duración y fuentes/contexto explícitos. La extensión define cuántas preguntas de desarrollo/simple/múltiple o consignas se solicitan.

Generar propuesta privada crea un trabajo, no una actividad asignada. La propuesta permite revisar título, objetivo, consignas, claves, puntos y rúbrica. Las fuentes se identifican por consigna/pregunta; no son garantía de exactitud. Usar propuesta revisada como borrador conduce al [editor de dos etapas](../activities/authoring.md).

Los archivos compatibles para este ingreso son PDF/DOCX con límites propios; un PNG disponible en Biblioteca no pasa automáticamente a fuente compatible. Sin contexto/fuentes suficientes se informa el límite; no inventar contenido fuera de lo elegido.

Errores, cola, propuesta vieja y recuperación de generación conservan límites e identidad; no reenviar un resultado incierto o sobreescribir cambios por llegar tarde.

Fuentes: [configuración](../../../apps/classrooms-ui/GenerationSetup.tsx), [propuesta](../../../apps/classrooms-ui/ActivityGenerationProposal.tsx), [servicios](../../../apps/api/src/classrooms/activity-ai/). [Prueba actual](../../verification/flows.md): cuestionario con tres tipos de pregunta y evaluación, proveedor sintético, borrador privado y asignación revisada.
