# Aulas, creación e ingreso

Un aula publicada tiene un único docente dueño. Un borrador incompleto es privado y no admite miembros. El rol de cuenta no concede acceso a aulas ajenas.

## Crear o continuar un aula

1. Datos del aula: nombre, materia, división, ciclo, zona horaria y portada predefinida.
2. Plan de estudio: subir el documento, esperar aprobación y elegir IA o manual. Subir el documento no inicia IA.
3. Unidades y temas: editar estructura; revisar/aplicar una propuesta o escribir manualmente. El editor de texto está en un disclosure; el auxiliar Extraer unidades de un texto abre su propio formulario.
4. Revisión: comprobar y volver a editar; Confirmar y crear aula publica y vuelve a Mis aulas. Guardar borrador conserva sin publicar y permite continuar.

El asistente exige PDF/DOCX aprobado y al menos una unidad/tema. El API conserva compatibilidad con currículos manuales completos sin archivo; eso no habilita omitirlo en este recorrido UI. Zona horaria fija tras crear; las portadas no son una carga libre de imágenes.

## Presentación compartida con Carpetas de estudio

Los componentes de estado, pasos y portadas se reutilizan con Carpetas de estudio. Mis aulas agrega una píldora de estados con selección elevada y filtros directos de ciclo/división. Cada espacio conserva sus campos, validaciones y servicios. El asistente de aulas dispone de una superficie amplia, encabezado opaco, un único scroll y acciones alcanzables. Las opciones de portada muestran imagen y nombre completos.

La revisión del plan resume unidades/temas y permite abrir cada unidad. Las incompletas se abren inicialmente; completar un campo no colapsa la edición. Durante la extracción IA se muestra la espera y, al terminar, un único editor de propuesta; el editor del plan guardado se presenta al aplicarla o elegir el método manual.

[Crear aula en escritorio](../../design/current/ux-classroom-create-desktop.png) · [móvil](../../design/current/ux-classroom-create-mobile.png) · [portadas](../../design/current/ux-classroom-covers-mobile.png). El [recibo UX](../../verification/foxy-study-ux-polish.json) acredita presentación e interacción local; las reglas de propiedad/persistencia conservan su evidencia de dominio.

## Pendientes de creación

Mis aulas ofrece Activas, Archivadas y, sólo al docente, Pendientes con contador. Pendientes reúne sus borradores no publicados; cada tarjeta muestra automáticamente «Pendiente de creación», nombre (o «Aula sin nombre»), datos disponibles, Continuar creación y Eliminar pendiente. Conserva búsqueda por nombre/materia/división, filtros de ciclo/división y presentación tarjetas/lista. Las invitaciones se muestran aparte.

Continuar retoma el asistente guardado. Confirmar la creación retira el borrador de Pendientes y muestra el aula entre Activas. Eliminar pide confirmación de pérdida de datos; cancelar no muta. Durante eliminación se bloquean acciones duplicadas; ante error se conserva el pendiente y el diálogo. El vacío indica «No tenés aulas pendientes de creación».

Contrato: `DELETE /classrooms/drafts/:id`, detrás del proxy `/api/v1`, cuerpo exacto `{ revision: string, confirm: true }`, respuesta `{ deleted: true }`. Exige sesión/correo verificado, docente dueño, borrador sin publicar y revisión vigente. Autoridad ajena/inexistente/eliminado: FORBIDDEN; revisión obsoleta o ya publicado: CONFLICT; confirmación inválida: INVALID_INPUT. No elimina aulas creadas.

La baja lógica interna `classroom_drafts.deleted_at` incrementa revisión y conserva referencias a archivos/extracciones. Revoca listado, continuación, edición, publicación, conteo de Inicio y autorización de archivos/IA; sin restauración en UI ni promesa de purga física. El worker invalida la fuente eliminada en sus controles; una llamada ya despachada puede terminar, pero no aplicarse al borrador. La limpieza interna de cargas incompletas conserva acceso técnico a la referencia eliminada para no bloquear la barrida. Evidencia y límites: [registro de pendientes](../../work-log/2026-11-08-root-pending-classrooms.md).

## Ingreso y pertenencia

El estudiante puede ingresar por código: Ver aula muestra el destino; Confirmar inscripción inscribe y abre el aula. Un código inválido conserva el formulario con error genérico. Las invitaciones requieren cuenta/correo correspondiente y aceptación explícita; recibir correo o visualizar una tarjeta no inscribe.

Salir o ser removido revoca el acceso actual y conserva entregas, notas y conversaciones. El docente ve exalumnos en Historial, separados de indicadores de alumnos actuales. Readmisión requiere invitación nueva; el código no sustituye esa condición.

Los códigos nuevos usan seis dígitos criptográficamente aleatorios, conservan ceros iniciales y no caducan por tiempo. Se presentan en dos grupos de tres y se copian sin espacios. Los códigos anteriores permanecen válidos hasta regeneración explícita. La rotación reserva de forma atómica, nunca reutiliza códigos históricos y conserva el vigente si falla. El token de previsualización de ingreso conserva su vigencia de cinco minutos; las invitaciones conservan siete días y espera de reenvío de 60 segundos.

El docente puede pegar hasta 50 correos únicos separados por comas, punto y coma o saltos de línea. El formulario identifica entradas inválidas, conserva el local-part y normaliza el dominio; los duplicados se comparan sin distinguir mayúsculas. El resultado por persona distingue cola de envío, miembro actual, invitación existente, fallo confirmado y pendiente. No se promete entrega del correo ni inscripción automática. Una invitación existente se conserva y puede renovarse desde Alumnos si venció.

Contrato de lote (prefijo `/classrooms/:id/invitations/batch`): `POST /` con `{requestId: UUID, emails: string[]}` reserva un recibo, sin enviar; `GET /:requestId` recupera; `POST /:requestId/:index` con `{}` procesa una posición de forma idempotente. Todos exigen docente dueño, sesión verificada y, para mutación, CSRF/origen. El recibo ausente devuelve 404 `INVITATION_BATCH_NOT_FOUND` después de autorizar propiedad; otra cuenta obtiene 403. Cambiar el contenido del mismo requestId produce conflicto. Invitación, outbox y resultado se confirman juntos. Repetir una posición confirmada no reenvía.

La UI guarda únicamente el requestId por aula en sessionStorage. Cerrar/pausar detiene las siguientes posiciones; la petición en curso puede finalizar. Ante pérdida de respuesta se consulta el recibo y se pausa; continuar usa la misma identidad y sólo procesa pendientes. Las fallidas definitivas pueden pasar a un lote nuevo. Una ausencia confirmada vuelve al formulario, incluso después de un error de red anterior. Un aula archivada permite consultar/repetir resultados previos; una emisión pendiente queda fallida, sin emitir correo.

Protección local comprobada: ingreso por cuenta 10/minuto y 30/hora, adicional por peer; admisión de lotes separada sólo para docentes verificados con CSRF/origen válidos, 120/minuto por cuenta y 2000/minuto por socket compartido. Los buckets son durables. El límite general existente de 240/minuto por socket todavía aplica a ingreso estudiantil detrás del proxy. Se ensayaron 32 alumnos compartiendo socket; no se certificó carga masiva distribuida ni monitoreo operativo. No se confía en cabeceras de IP suministradas por el cliente.

## Archivo y administración

El docente edita datos/portada y opciones disponibles, invita, regenera código, retira miembros y archiva/reactiva con confirmación. Aula archivada es de consulta: sin nuevas inscripciones ni mutaciones académicas. El estudiante aún puede confirmar su salida; para volver se requiere reactivación y nueva invitación. Reactivar no extiende plazos ni borra historia. No hay eliminación permanente del aula desde esta UI.

Fuentes: [Wizard](../../../apps/web/src/application/academic-Wizard.tsx), [secciones](../../../apps/web/src/features/classrooms/ui/ClassroomNavigation.tsx), [servicios](../../../apps/api/src/modules/classrooms/). [Flujos comprobados](../../verification/flows.md) y [permisos por rol](../../product/features-by-role.md).
