# Inicio, búsqueda y notificaciones

Inicio es el destino ordinario del login verificado. Docente: Por atender con entregas/consultas, acciones del aula, agenda personal, aula en foco y borradores de actividad. Estudiante: Mis entregas, accesos de aula, devoluciones publicadas y agenda personal.

Cada entrega por revisar corresponde a un intento, no sólo a una actividad agrupada. Los enlaces conservan destino de aula/actividad/intento y se reautorizan; no usar IDs de UI como permisos. La vista puede mostrar contadores Enseño/Estudio por compatibilidad de proyección; eso no es un selector de rol ni una cuenta con rol dual.

Buscar en FoxMind abre búsqueda del espacio autorizado. No sustituye pertenencia ni revela contenido ajeno. La navegación cuenta con accesos por rol y Mi cuenta.

Notificaciones ofrece filtros, apertura y marcado de lectura, con lista breve y pantalla completa. Abrir conversación/actividad usa el destino confirmado por el backend y permisos actuales. Descartar un badge no debe confundirse con abrir contenido o enviar correo.

Los módulos tienen carga, vacío y error/reintento propios. Datos desconocidos o paginados no se presentan como cero o porcentaje global inventado.

Fuentes: [Home](../../../apps/classrooms-ui/Home.tsx), [proyecciones](../../../apps/api/src/home/), [notificaciones](../../../apps/classrooms-ui/Notifications.tsx). [Recorridos y capturas](../../verification/flows.md).
