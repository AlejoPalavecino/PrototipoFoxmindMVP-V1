# Muro y conversaciones

El docente publica avisos; el estudiante puede hacer consultas. Las publicaciones incluyen título/cuerpo y tienen alcance de aula, no son mensajes privados. Ambos roles pueden responder según sus permisos.

Las acciones de autoría/moderación permiten editar o eliminar sólo cuando la regla lo admite. La eliminación conserva las relaciones/historia necesarias; no suponer borrado en cascada de respuestas. En aula archivada se conservan lecturas y desaparecen las acciones de publicación.

Las consultas y respuestas alimentan avisos y el seguimiento docente de Inicio. Abrir una notificación revalida el destino; el identificador recibido en UI no es autoridad de acceso.

El Muro comparte tarjetas, autoría, fecha y respuestas anidadas entre docente y estudiante. Publicar y responder abren diálogos; una publicación exige título y cuerpo. Los estados de carga, vacío y error se distinguen junto al contexto. Si el POST confirma y el refresco falla, se ofrece recuperar la lectura sin repetir la publicación ya guardada.

Fuentes: [Wall](../../../apps/web/src/features/communication/ui/Wall.tsx), [servicios académicos](../../../apps/api/src/modules/communication/). [Flujos actuales](../../verification/flows.md): aviso docente, respuesta estudiantil, consulta y respuesta docente.
