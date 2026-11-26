# Inicio, búsqueda y notificaciones

Inicio es el destino ordinario al ingresar con una cuenta verificada. Abre con un saludo, la fecha local y acciones por rol. Lo que el saludo agrega sale sólo del contrato de Inicio ([home-expedition.ts](../../../apps/web/src/features/home/model/home-expedition.ts)). El recorrido toma de `modules.agenda` lo que queda de hoy, como mucho tres, porque ese módulo sólo trae lo que todavía no pasó. La burbuja toma la primera fila de `review` (docente) o la primera actividad abierta de `pending` (estudiante), y no aparece si el módulo no está listo. El avance docente es `readyToPublish` sobre `needsReview + readyToPublish`: la API no informa cuántos estudiantes debían entregar. El avance del estudiante usa `questionProgress` cuando existe. El docente puede crear una actividad o preparar con Foxy. El estudiante puede continuar o consultar una actividad disponible y abrir Mi estudio. Debajo se agrupan prioridades, mini agenda y aulas. En Inicio docente, el semáforo de acompañamiento agrega prioridades por estudiante y aula. Los borradores y las devoluciones publicadas se consultan dentro de las aulas.

En escritorio, «Tu próximo paso» conserva tarjetas verticales del ancho de una columna incluso con una sola actividad. Los contenedores estrechos usan la adaptación compacta móvil. La cantidad de actividades no debe cambiar la jerarquía visual de escritorio ni agregar contenido ficticio.

En Inicio móvil/tablet, la barra de navegación permanece visible al hacer scroll para conservar acceso al menú y a la búsqueda. El drawer mantiene foco y posición de lectura al cerrarse.

Cada entrega por revisar corresponde a un intento, no sólo a una actividad agrupada. Los enlaces conservan destino de aula/actividad/intento y se reautorizan; no usar IDs de UI como permisos. La vista puede mostrar contadores Enseño/Estudio por compatibilidad de proyección; eso no es un selector de rol ni una cuenta con rol dual.

Buscar en FoxMind consulta el espacio autorizado. La navegación incluye accesos por rol y Mi cuenta. La barra lateral de escritorio se puede plegar. La preferencia se guarda en el navegador y en móvil hay un menú compacto.

Notificaciones ofrece filtros, apertura y marcado de lectura, con lista breve y pantalla completa. Abrir conversación/actividad usa el destino confirmado por el backend y permisos actuales. Descartar un badge no debe confundirse con abrir contenido o enviar correo.

Los módulos tienen carga, vacío y error/reintento propios. Datos desconocidos o paginados no se presentan como cero o porcentaje global inventado.

## Inicio docente: orden y selección de aulas

Por acompañar permite alternar Entregas y Consultas. En Entregas, la vista previa agrupa por actividad y cada fila abre el intento correspondiente. Conserva el orden predeterminado: entregas ascendentes por recepción y consultas descendentes por última actividad. Inicio no agrega un control de orden ausente en la maqueta. El contrato de consulta ampliada mantiene su capacidad de ordenar.

`GET /home/modules/{review|queries}` admite `order=asc|desc`. El cliente y proxy lo transmiten; otros módulos rechazan ese parámetro. El cursor queda firmado para sujeto, módulo, zona y dirección efectiva. Cambiar de dirección vuelve a la primera página. El listado ampliado conserva orden y filas al reintentar errores transitorios; un cursor inválido ofrece Actualizar lista. Fallos de identidad retiran la vista privada.

Tus aulas muestra hasta tres aulas activas con portada, materia, cantidad de estudiantes cuando se conoce y avance del plan. La tarjeta abre el aula; no agrega un pie con el próximo tema. Ver mis aulas abre el catálogo. Crear actividad pide elegir un aula activa propia y confirmar con Continuar. Si sólo hay una disponible, queda preseleccionada. El selector pagina las aulas, conserva la selección y ofrece reintentar si falla la carga. Sin aulas propias, la acción del saludo abre Crear aula. Agregar material, publicar un aviso y ver progreso siguen disponibles desde el aula.

Tu día, con calma presenta los eventos del día local para ambos roles, con horario de inicio/fin, duración y color. Consulta Agenda por rango de fechas; no filtra la proyección de próximos eventos de Home, que omite los horarios ya pasados. La tira compacta conserva cinco días y los accesos a la fecha seleccionada, a Agenda y a crear un evento. La vista completa conserva plazos y repasos confirmados. La corrección se sigue en [el registro de paridad exacta de Inicio](../../work-log/2026-11-15-root-home-exact-parity.md).

El pulido anterior y su verificación quedan documentados en el [registro del 11 de noviembre](../../work-log/2026-11-11-root-teacher-home-polish.md) y la [evidencia de ese corte](../../verification/teacher-home-polish.json).

Fuentes: [Home](../../../apps/web/src/features/home/dashboard/Home.tsx), [proyecciones](../../../apps/api/src/modules/home/dashboard/application/service.ts), [notificaciones](../../../apps/web/src/features/notifications/inbox/Notifications.tsx). [Registro del candidato](../../work-log/2026-11-15-root-product-parity.md).

## Bandeja unificada

`GET /classrooms/notifications/page` acepta `limit`, `cursor`, `unread` y `kind` (`all`, `activity`, `classroom` o `agenda`). El tipo y el estado se aplican antes del límite. `totalCount` y `unreadCount` cuentan las notificaciones visibles de toda la cuenta. El cursor firmado incluye cuenta, filtros, fecha e ID. Un cursor de otra selección se rechaza y requiere volver a la primera página.

Las proyecciones reúnen las notificaciones existentes de aula, actividades y resultados, las invitaciones pendientes, las altas de integrantes con pertenencia vigente y los avisos de repaso y de eventos propios. Abrir, marcar leída y marcar no leída vuelven a comprobar el recurso y la cuenta. Los avisos de Agenda y de invitación abren un diálogo con el recurso vigente encima de la bandeja. «Ahora no» no responde a la invitación. Cambiar el estado de lectura es idempotente y «Marcar todas como leídas» incluye toda la bandeja autorizada. Tras confirmar la escritura, la bandeja conserva las páginas abiertas y vuelve a consultarlas con cursores vigentes. Si falla esa consulta, el reintento sólo lee.

Una invitación vencida, revocada, declinada o aceptada sale de la bandeja. Un miembro dado de baja y un aviso de Agenda o repaso cuyo origen se retiró dejan de proyectarse. La apertura desde una página anterior devuelve un estado genérico. Las lecturas de invitaciones, ingresos y eventos se guardan por cuenta e identidad de proyección. Las lecturas de repaso comparten el estado de su sesión durable; las notificaciones de aula conservan su tabla y sus permisos. [Consulta y lecturas](../../../apps/api/src/modules/home/notifications/infrastructure/notification-page.ts) · [Contrato](../../../src/core/domain/home/notifications.ts).


## Responsabilidades del backend

`home/dashboard` posee la lectura de Inicio, sus proyecciones por modulo y su transporte. `home/notifications` posee `NotificationInboxService`, la bandeja, los destinos de apertura y la persistencia de lectura. Conserva las URLs `/classrooms/notifications`, incluidos pagina, apertura, lectura individual y lectura masiva. La fachada HTTP academica delega en este servicio sin trasladar esos casos al Muro.

`communication/wall` gobierna publicaciones, respuestas y moderacion. Produce sus avisos dentro de la misma transaccion que cambia el Muro y avanza la revision. Los productores de otros dominios conservan igualmente su insercion atomica; Home no agrega una transaccion independiente para producir avisos.

La bandeja descubre primero el aula de un aviso perteneciente a la cuenta, toma el bloqueo estandar del aula y vuelve a comprobar la visibilidad del destino antes de marcar. Las proyecciones revalidan sus origenes; la lectura masiva bloquea aulas en orden global y reevalua los destinos bajo esos bloqueos. Los repositorios de Muro y de bandeja reciben comandos tipados separados; la bandeja no expone operaciones de publicacion.
