# Aulas, creación e ingreso

Un aula publicada tiene un único docente dueño. Un borrador incompleto es privado y no admite miembros. El rol de cuenta no concede acceso a aulas ajenas.

## Crear o continuar un aula

1. Tu aula: nombre, materia, grupo, ciclo, zona horaria y portada predefinida.
2. El programa: subir el documento, esperar aprobación y elegir Prepararlo con Foxy o Armarlo a mano. Subir el documento no inicia IA.
3. El recorrido: revisar y editar unidades y temas en campos visibles. La propuesta de IA requiere aplicación explícita antes de continuar.
4. Todo listo: revisar y volver a editar; Crear mi aula publica y vuelve a Activas en Mis aulas. Guardar y salir conserva el borrador sin publicar y selecciona Borradores, también si se empezó desde Inicio.

El asistente exige un PDF, DOC, DOCX, PPT o PPTX aprobado de hasta 20 MB y al menos una unidad con un tema. La API conserva la compatibilidad histórica con currículos manuales completos sin archivo. La zona horaria queda fija al crear el aula y la portada se elige del catálogo.

Si el archivo sigue pendiente de validación, Guardar y salir conserva su referencia. Al reabrir el borrador se consulta el estado de ese mismo archivo. El asistente habilita la preparación del recorrido cuando el archivo está aprobado.

## Presentación compartida con Carpetas de estudio

Los componentes de estado y servicios se reutilizan con Carpetas de estudio; aulas tiene una variante visual propia del asistente. Mis aulas presenta estados y búsqueda, siguiendo UI Lab: no incluye filtros adicionales de ciclo/división ni selector de tarjetas/lista. Cada espacio conserva sus campos, validaciones y servicios. El asistente de aulas dispone de una superficie amplia, encabezado opaco, área de contenido desplazable y pie de acciones visible. Ofrece las tres portadas de referencia y conserva la portada seleccionada de un borrador anterior si pertenece al catálogo legado.

La revisión presenta el resumen de unidades y temas y permite volver a editarlos. Durante la extracción IA se muestra la espera y, al terminar, un único editor de propuesta. El editor del plan guardado se presenta al aplicarla o elegir el método manual.

La carga del programa y el análisis de Foxy tienen pantallas de espera dedicadas, con las ilustraciones de UI Lab. Las etapas dependen de la respuesta real del archivo o del análisis; la animación es indeterminada y no presenta porcentajes inventados. Volver al programa conserva los datos y permite consultar el mismo proceso, sin volver a subir el archivo ni iniciar otra generación. Un error se presenta en rojo y ofrece las acciones de recuperación disponibles. Al terminar el análisis se abre la propuesta para revisarla y aplicarla explícitamente; no se publica el aula automáticamente.

[Capturas anteriores de Crear aula y Crear carpeta](../../design/current/README.md#creación-e-ingreso) · [Comparación de los cuatro pasos](../../verification/flows.md#crear-carpeta-con-la-presentación-de-crear-aula--2026-11-12)

## Pendientes de creación

El aviso Retomar creación apunta al borrador actualizado más recientemente. Las confirmaciones de guardado, creación e ingreso se muestran en verde; errores y mensajes informativos conservan su semántica.

Mis aulas ofrece Activas, Archivadas y, sólo al docente, Borradores con contador. Borradores reúne las aulas no publicadas; cada tarjeta muestra «Borrador», nombre (o «Tu próxima aula»), datos disponibles, «Paso N de 4», Continuar creación y Eliminar borrador. Conserva búsqueda por nombre/materia/grupo. Las invitaciones se muestran aparte. Las tarjetas de aulas publicadas muestran portada, grupo, materia, cantidad real de estudiantes y avance del plan para ambos roles autorizados.

Continuar retoma los datos, paso y método guardados. Abrir un borrador no inicia una nueva generación de IA; el archivo se vuelve a comprobar antes de avanzar o publicar. Los campos opcionales `wizardStep` (0–3) y `wizardMethod` (`ai`, `manual` o `null`) se validan en proxy y dominio, se guardan en el JSONB existente y se excluyen del contenido publicado. Los borradores anteriores sin estos campos abren en el primer paso. Confirmar la creación retira el borrador y muestra el aula entre Activas. Eliminar pide confirmación de pérdida de datos; cancelar no muta. Durante eliminación se bloquean acciones duplicadas; ante error se conserva el pendiente y el diálogo.

Contrato: `DELETE /classrooms/drafts/:id`, detrás del proxy `/api/v1`, cuerpo exacto `{ revision: string, confirm: true }`, respuesta `{ deleted: true }`. Exige sesión/correo verificado, docente dueño, borrador sin publicar y revisión vigente. Autoridad ajena/inexistente/eliminado: FORBIDDEN; revisión obsoleta o ya publicado: CONFLICT; confirmación inválida: INVALID_INPUT. No elimina aulas creadas.

La baja lógica interna `classroom_drafts.deleted_at` incrementa revisión y conserva referencias a archivos/extracciones. Revoca listado, continuación, edición, publicación, conteo de Inicio y autorización de archivos/IA; sin restauración en UI ni promesa de purga física. El worker invalida la fuente eliminada en sus controles; una llamada ya despachada puede terminar, pero no aplicarse al borrador. La limpieza interna de cargas incompletas conserva acceso técnico a la referencia eliminada para no bloquear la barrida. Evidencia y límites: [registro de pendientes](../../work-log/2026-11-08-root-pending-classrooms.md).

## Ingreso y pertenencia

El estudiante puede ingresar por código: Ver aula muestra la portada y los datos reales del destino; Aceptar y unirme inscribe y vuelve al catálogo en Activas con confirmación. Ahora no cierra la vista previa sin inscribir. Un código inválido conserva el formulario con error. Las invitaciones usan la misma presentación, con su vencimiento real, y requieren cuenta/correo correspondiente y aceptación explícita; recibir correo o visualizar una tarjeta no inscribe. La vista previa por código no inventa una fecha de vencimiento. Ambos endpoints proyectan `coverKey` opcional para compatibilidad con consumidores anteriores.

Salir o ser removido revoca el acceso actual y conserva entregas, notas y conversaciones. El docente ve exalumnos en Historial, separados de indicadores de alumnos actuales. Readmisión requiere invitación nueva; el código no sustituye esa condición.

Los códigos nuevos tienen 8 caracteres, elegidos con `crypto.randomInt` (sin sesgo de módulo) del alfabeto sin ambigüedades `23456789ABCDEFGHJKMNPQRSTVWXYZ` (sin 0, O, 1, I, L ni U), unos 6,5 x 10^11 valores posibles. No caducan por tiempo. Se presentan agrupados como `ABCD-EFGH` y se copian sin guion. Los códigos anteriores de 6 dígitos permanecen válidos hasta regeneración explícita; regenerar siempre produce el formato nuevo. La entrada se normaliza (recortar, mayúsculas, quitar espacios y guiones) y solo se acepta un código de 8 caracteres del alfabeto o uno anterior de 6 dígitos; cualquier otra forma se rechaza con `INVALID_INPUT` antes de consultar la base. Además del límite por cuenta y por origen, existe un límite global de 300 intentos fallidos cada 10 minutos entre todas las cuentas: al agotarse, toda vista previa responde 429 `RATE_LIMITED` con `Retry-After` hasta que la ventana se renueve. El contador (`account_action_controls`, acción `classroom-code-failure`, sujeto `global`) se confirma en la misma transacción que devuelve el resultado, por lo que sobrevive al rechazo; el rechazo se emite después de confirmar. Contrapartida conocida: un atacante con muchas cuentas puede agotar el límite y retrasar los ingresos por código de todos durante la ventana. La rotación reserva de forma atómica, nunca reutiliza códigos históricos y conserva el vigente si falla. El token de previsualización de ingreso conserva su vigencia de cinco minutos; las invitaciones conservan siete días y espera de reenvío de 60 segundos.

El docente puede pegar hasta 50 correos únicos separados por comas, punto y coma o saltos de línea. El formulario identifica entradas inválidas, conserva el local-part y normaliza el dominio; los duplicados se comparan sin distinguir mayúsculas. El resultado por persona distingue cola de envío, miembro actual, invitación existente, fallo confirmado y pendiente. No se promete entrega del correo ni inscripción automática. Una invitación existente se conserva y puede renovarse desde Alumnos si venció.

Contrato de lote (prefijo `/classrooms/:id/invitations/batch`): `POST /` con `{requestId: UUID, emails: string[]}` reserva un recibo, sin enviar; `GET /:requestId` recupera; `POST /:requestId/:index` con `{}` procesa una posición de forma idempotente. Todos exigen docente dueño, sesión verificada y, para mutación, CSRF/origen. El recibo ausente devuelve 404 `INVITATION_BATCH_NOT_FOUND` después de autorizar propiedad; otra cuenta obtiene 403. Cambiar el contenido del mismo requestId produce conflicto. Invitación, outbox y resultado se confirman juntos. Repetir una posición confirmada no reenvía.

La UI guarda únicamente el requestId por aula en sessionStorage. Cerrar/pausar detiene las siguientes posiciones; la petición en curso puede finalizar. Ante pérdida de respuesta se consulta el recibo y se pausa; continuar usa la misma identidad y sólo procesa pendientes. Las fallidas definitivas pueden pasar a un lote nuevo. Una ausencia confirmada vuelve al formulario, incluso después de un error de red anterior. Un aula archivada permite consultar/repetir resultados previos; una emisión pendiente queda fallida, sin emitir correo.

Protección local comprobada: ingreso por cuenta 10/minuto y 30/hora, adicional por peer; admisión de lotes separada sólo para docentes verificados con CSRF/origen válidos, 120/minuto por cuenta y 2000/minuto por socket compartido. Los buckets son durables. El límite general existente de 240/minuto por socket todavía aplica a ingreso estudiantil detrás del proxy. Se ensayaron 32 alumnos compartiendo socket; no se certificó carga masiva distribuida ni monitoreo operativo. No se confía en cabeceras de IP suministradas por el cliente.

## Archivo y administración

El docente edita nombre, materia, grupo y portada, invita, copia el código de ingreso y archiva o reactiva con confirmación. Aula archivada es de consulta: sin nuevas inscripciones ni mutaciones académicas. El estudiante aún puede confirmar su salida; para volver se requiere reactivación y nueva invitación. Reactivar no extiende plazos ni borra historia. No hay eliminación permanente del aula desde esta UI.

Fuentes: [Wizard](../../../apps/web/src/application/workflows/classroom-creation/ClassroomWizard.tsx), [secciones](../../../apps/web/src/features/classrooms/workspace/ClassroomNavigation.tsx), [servicios](../../../apps/api/src/modules/classrooms/). [Flujos comprobados](../../verification/flows.md) y [permisos por rol](../../product/features-by-role.md).

## Interior del aula

El catálogo ofrece Revisar invitación, Ahora no y Aceptar y unirme. Ahora no conserva la invitación pendiente. La capacidad de rechazo de la API se mantiene: `POST /invitations/:id/decline` registra quién la rechazó y cuándo, y tolera el reintento del mismo destinatario; retira la invitación pendiente y su aviso, sin alta ni reapertura de una inscripción.

Ambos roles comparten la cabecera compacta. El docente tiene Plan, Muro, Biblioteca, Actividades, Progreso, Estudiantes, Historial y Ajustes; el estudiante tiene Plan, Muro, Biblioteca, Actividades, Mi progreso y Compañeros. «Por revisar» lleva al docente a Progreso; «Por hacer» lleva al estudiante a Actividades.

En Plan, el docente marca temas y ambos roles consultan materiales y actividades relacionadas. En Biblioteca, el docente elige el archivo y revisa sus datos y vínculos antes de publicarlo. El Muro muestra avisos, consultas y respuestas de ese grupo. [Plan](../teaching/plan.md) · [Biblioteca](../teaching/library.md) · [Muro](../teaching/wall.md)

Estudiantes muestra integrantes actuales, fichas, código de ingreso e invitaciones. Una invitación rechazada se identifica como tal y queda fuera de reenvío y revocación. Compañeros muestra nombres y marca «Vos» con la identidad autenticada; la respuesta estudiantil no expone identificadores ni correos de compañeros. Historial conserva períodos de inscripción y acceso docente al recorrido anterior.

Ajustes presenta los datos y las portadas de la maqueta. Guardar conserva el ciclo y la configuración de corrección asistida ya persistidos. `PATCH /classrooms/:id/settings` acepta `coverKey` opcional del catálogo. Si se omite, conserva la portada persistida. Guardar requiere acceso docente, aula activa y revisión vigente. Archivar y reactivar tienen confirmación propia. [Ajustes del aula](../../../apps/web/src/features/classrooms/settings/ClassroomSettings.tsx) · [Prueba de transporte](../../../tests/p5-web-proxy.test.mjs).
