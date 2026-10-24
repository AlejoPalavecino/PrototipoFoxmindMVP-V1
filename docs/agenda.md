# Agenda personal y entregas

Agenda reúne los eventos privados de cada cuenta y los plazos académicos a los que tiene acceso. Es una sección global junto a Inicio y Mis aulas. La implementación y su aceptación se siguen en [la tarea Agenda](../odd/tasks/agenda.md); este documento describe el comportamiento implementado y no sustituye sus pruebas.

## Organizar la semana

- Consultar el mes y seleccionar un día para ver sus eventos.
- Crear una clase, actividad o evaluación personal, con título, descripción y horario o día completo.
- Repetir un evento semanalmente hasta una fecha final, con un máximo de 53 ocurrencias por serie.
- Editar o eliminar un evento único o una serie completa. La interfaz debe indicar el alcance sobre la serie, también para fechas pasadas.
- Consultar las próximas entregas y abrir la actividad correspondiente.

Los eventos personales son privados. No publican actividades en un aula, no alteran notas ni generan avisos académicos para otras personas. No requieren pertenecer a un aula.

## Fechas y entregas

El formulario compacto reúne tipo y título, día y horario, duración de 30/60/90 minutos o fin manual. Al activar día completo conserva las horas elegidas para poder volver atrás. La repetición semanal muestra cuántos eventos se crearán y su último día; inicialmente sugiere cinco encuentros y permite cambiar el final.

El alcance y la evidencia de este flujo se siguen en [la mejora del formulario](../odd/tasks/agenda-compact-event-form.md).

Cada evento personal permite elegir Azul, Verde, Amarillo, Naranja, Rosa o Violeta, o dejar Automático para usar la categoría. La elección se guarda con el evento y aparece en el calendario, sus indicadores móviles y la lista del día. Se puede cambiar al editar o volver a Automático; una serie comparte el color en todas sus fechas. Los eventos anteriores conservan su aspecto y las entregas académicas mantienen su presentación propia. [Contrato y verificación de color](../odd/tasks/agenda-event-color.md).

Los eventos nuevos usan automáticamente la zona de la agenda. Una indicación como «Hora de Buenos Aires» aclara la referencia; en más opciones se puede elegir otra ciudad sin escribir códigos de zona. Editar conserva la zona guardada. Cambiarla mantiene la fecha y hora escritas, como explica el selector. Las notas y los eventos de varios días también están en más opciones.

Antes de guardar se muestra un resumen y los errores aparecen junto al campo correspondiente. Cerrar con cambios pide confirmación. Tras crear un evento, la agenda selecciona su día y ofrece «Ver evento». Editar mantiene el día que se estaba consultando y permite ir explícitamente al inicio de la serie.

Los eventos con horario conservan la zona horaria elegida y su hora local. La repetición semanal mantiene esa hora aunque cambie el desplazamiento respecto de UTC. Si una hora no existe o se repite por un cambio estacional, debe resolverse explícitamente; una serie con futuras ocurrencias conflictivas se rechaza en lugar de desplazar u omitir una clase.

Los eventos de día completo son fechas de calendario, sin conversión a medianoche UTC. Los plazos académicos conservan la zona horaria del aula. Cambiar la vista de la agenda no cambia esos plazos.

Próximas entregas se calcula con datos académicos reales: membresía, actividad publicada, elegibilidad, último intento y plazo efectivo, incluyendo la prórroga individual aplicable. Una entrega confirmada deja de estar pendiente; una reentrega habilitada puede volver a aparecer. Los plazos vencidos, actividades sin fecha, aulas archivadas y accesos revocados no se presentan como próximas entregas pendientes.

Una misma cuenta puede estudiar en unas aulas y enseñar en otras. La agenda distingue ambos contextos sin crear un rol global ni exponer al docente datos individuales del estudiante en el calendario.

## Seguridad y recuperación

El servidor deriva el dueño de la sesión y exige correo verificado. Cada escritura valida sesión, origen y CSRF. Los identificadores ajenos no permiten leer, editar o eliminar eventos. Los plazos académicos son de solo lectura desde Agenda y su apertura revalida permisos actuales.

Las revisiones detectan cambios simultáneos entre pestañas. Un conflicto permite recargar; un error conserva el formulario. Un alta tiene un identificador estable para evitar duplicados al reintentar. Un fallo al consultar debe mostrarse como error con reintento, nunca como una agenda vacía.

## Alcance de esta entrega

Para verificar contratos, persistencia y sesiones en bases desechables: `npm run test:agenda` (requiere Docker). El comando compila la API desde cero antes de ejecutar las suites y regresiones de Agenda. La compilación web y la comprobación visual se registran por separado; este comando no las sustituye.

Incluye eventos únicos y repetición semanal. No incluye edición de una ocurrencia individual dentro de una serie, recordatorios por correo, sincronización con calendarios externos, invitados ni eventos compartidos.

Los cambios se desarrollan en `codex/foxmind-agenda`, separado de main. La nueva migración se valida en recursos desechables propios; los datos de desarrollo existentes se conservan. Los resultados observados, limitaciones y estado de integración pertenecen al [registro del coordinador](work-log/2026-10-23-root-agenda.md).
