# Inicio, búsqueda y notificaciones

Inicio es el destino ordinario del login verificado. Docente: Por atender con entregas/consultas, acciones del aula, agenda personal, aula en foco y borradores de actividad. Estudiante: Mis entregas, accesos de aula, devoluciones publicadas y agenda personal.

Cada entrega por revisar corresponde a un intento, no sólo a una actividad agrupada. Los enlaces conservan destino de aula/actividad/intento y se reautorizan; no usar IDs de UI como permisos. La vista puede mostrar contadores Enseño/Estudio por compatibilidad de proyección; eso no es un selector de rol ni una cuenta con rol dual.

Buscar en FoxMind abre búsqueda del espacio autorizado. No sustituye pertenencia ni revela contenido ajeno. La navegación cuenta con accesos por rol y Mi cuenta.

Notificaciones ofrece filtros, apertura y marcado de lectura, con lista breve y pantalla completa. Abrir conversación/actividad usa el destino confirmado por el backend y permisos actuales. Descartar un badge no debe confundirse con abrir contenido o enviar correo.

Los módulos tienen carga, vacío y error/reintento propios. Datos desconocidos o paginados no se presentan como cero o porcentaje global inventado.

## Inicio docente: orden y selección de aulas

Seguimiento ofrece Más nuevas primero / Más antiguas primero, con elección independiente para Entregas y Consultas. Conserva defaults: entregas ascendentes por recepción, consultas descendentes por última actividad. La elección se mantiene en la vista, incluida la actualización automática; no es una preferencia persistente de cuenta.

`GET /home/modules/{review|queries}` admite `order=asc|desc`. El cliente y proxy lo transmiten; otros módulos rechazan ese parámetro. El cursor queda firmado para sujeto, módulo, zona y dirección efectiva. Cambiar de dirección vuelve a la primera página. El listado ampliado conserva orden y filas al reintentar errores transitorios; un cursor inválido ofrece Actualizar lista. Fallos de identidad retiran la vista privada.

Aula en foco permite elegir cualquier aula activa propia, incluidas páginas posteriores. La actualización revalida el ID seleccionado; si ya no está disponible, vuelve a un aula elegible. La búsqueda termina al reunir las aulas activas conocidas, sin recorrer la cola de archivadas. Un error de revalidación ofrece reintento sin perder la elección.

Crear actividad, Agregar material, Publicar aviso y Ver progreso abren un diálogo específico: elegir aula → Continuar → destino existente. Sólo una activa queda preseleccionada; varias requieren elección. Cargar más aulas conserva opciones y selección. Elegir destino no cambia Aula en foco. Cancelar/Escape cierra sin navegar y devuelve el foco.

Mini agenda docente mantiene dos eventos personales y la próxima entrega; el pulido visual no cambia fuentes, ventana temporal ni zona horaria. La interfaz del estudiante conserva sus flujos.

Ver [tarea](../../../odd/tasks/teacher-home-polish.md), [registro y alcance aprobado](../../work-log/2026-11-11-root-teacher-home-polish.md) y [evidencia](../../verification/teacher-home-polish.json). Reproducir QA visual con `node scripts/teacher-home-preview.mjs`: componentes/CSS reales y cliente sintético, sin sesión productiva ni proveedor.

Fuentes: [Home](../../../apps/web/src/features/home/ui/Home.tsx), [proyecciones](../../../apps/api/src/modules/home/application/service.ts), [notificaciones](../../../apps/web/src/features/notifications/ui/Notifications.tsx). [Recorridos y capturas](../../verification/flows.md).

La mini agenda docente muestra la fecha una sola vez en el bloque lateral; debajo del título conserva el horario local o Todo el día y, para entregas, el aula. El formato de agenda del estudiante permanece sin cambios.
