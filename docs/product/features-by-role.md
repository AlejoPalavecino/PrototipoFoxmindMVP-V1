# Funcionalidades por rol y sección

Cada cuenta tiene un rol exclusivo: docente o estudiante. Además del rol, el backend verifica sesión, correo, propiedad y membresía según el recurso. Esta matriz describe capacidades vigentes y enlaza sus reglas; no concede permisos nuevos. El [roadmap](../implementation-roadmap.md) distingue implementación, verificación y publicación.

## Navegación global

| Sección | Docente | Estudiante | Fuente |
|---|---|---|---|
| Carpetas de estudio | Sin acceso | Crear carpetas privadas, vincular una Biblioteca autorizada, estudiar con Foxy, adjuntar al chat con opción de guardar en la carpeta, practicar con devolución y confirmar repasos en Agenda | [Estudio privado](../engineering/study/README.md) |
| Cuenta y perfil | Registro como docente; acceso/verificación, nombres y avatar Foxy/iniciales con guardado explícito, contraseña, recuperación y cierre de sesión | Mismos flujos con rol estudiante | [Identidad](../engineering/identity/README.md) |
| Inicio | Entregas/consultas ordenables, aula en foco seleccionable, acciones con elección de aula, avisos y mini agenda | Aulas, pendientes y devoluciones publicadas propias | [Inicio](../engineering/home/README.md) |
| Mis aulas | Crear aula, consultar Activas/Archivadas/Pendientes; continuar o eliminar pendientes propios con confirmación; administrar aulas propias | Confirmar ingreso por código/invitación y consultar aulas autorizadas; sin Pendientes de creación | [Aulas](../engineering/classrooms/README.md) |
| Agenda | Eventos personales y contexto académico autorizado | Eventos personales y plazos propios | [Agenda](../engineering/agenda/README.md) |
| Foxy AI | Conversaciones privadas renombrables, historial con búsqueda y filtros, contexto y adjuntos; Herramientas y Creaciones con estados y destinos; revisión antes de publicar o crear un TP privado | Puede consultar material publicado autorizado y usar su propio chat en Carpetas de estudio | [Foxy](../engineering/ai/foxy.md) |
| Notificaciones | Abrir destinos autorizados de su actividad docente | Abrir destinos propios autorizados | [Historial y avisos](../engineering/home/README.md) |

## Dentro de un aula

Los nombres visibles y agrupaciones pueden variar por rol; la autoridad es la capacidad del servicio, no la presencia de una pestaña.

| Sección/capacidad | Docente dueño | Estudiante con acceso vigente | Fuente |
|---|---|---|---|
| Plan de estudio | Editar unidades/temas y estado de avance; revisar extracción asistida | Consultar plan y estado compartido | [Plan](../engineering/teaching/plan.md) |
| Biblioteca | Publicar recursos aprobados, editar asociación y eliminar según vínculos/conservación | Consultar recursos disponibles, vista previa y descarga autorizada | [Biblioteca](../engineering/teaching/library.md), [archivos](../engineering/files/README.md) |
| Actividades | Preparar manualmente o con IA; revisar consignas, preguntas, criterios y publicar | Consultar asignadas, resolver y confirmar entregas según tipo/plazo | [Autoría](../engineering/activities/authoring.md), [participación](../engineering/activities/participation.md) |
| Entregas y correcciones | Consultar intentos, corregir privadamente, revisar asistencia IA y publicar | Consultar sus intentos y resultados publicados | [Prácticos](../engineering/activities/participation.md), [cuestionarios](../engineering/activities/participation.md), [calificaciones](../engineering/grading/README.md) |
| Progreso | Consultar clase y alumnos actuales; conservar lectura docente de historia autorizada | Consultar únicamente su progreso | [Progreso](../engineering/grading/progress.md) |
| Muro y consultas | Comunicar y moderar según autoría/propiedad y reglas del aula | Participar según permisos; no adquirir administración | [Muro](../engineering/teaching/wall.md) |
| Alumnos y administración | Gestionar ingreso, código/invitaciones, miembros, archivo y ajustes admitidos | Consultar lo permitido y salir cuando corresponda; no administrar pares | [Aulas](../engineering/classrooms/README.md) |

## Recorridos y excepciones

Crear aula tiene cuatro pasos: datos/documento/portada → elección IA/manual → unidades/temas → revisión editable y confirmación. Subir el documento no inicia IA ni publica el aula. La [especificación vigente](../foxmind-v1-functional-spec.md) conserva la compatibilidad histórica del backend manual sin archivo; el asistente actual exige documento.

La corrección privada o una sugerencia IA no es visible como nota publicada para el estudiante. Publicar exige una acción docente independiente. Completar actividades, rendimiento y avance del plan son medidas diferentes; no inferir una a partir de otra.

Archivo de aula, salida y remoción modifican las operaciones/accesos permitidos. El historial conservado para el docente no concede acceso a quien salió. Consultá las reglas de dominio para cada operación; esta matriz no promete que todas las capacidades estén habilitadas en un aula archivada.

## Actualizar esta matriz

Actualizar la fila cuando cambien acciones, permisos, visibilidad o secciones. Agregar enlace al contrato/guía dueño y al estado de entrega. Las propuestas quedan identificadas como tales hasta aprobarse; una captura o una tabla física no acreditan una función terminada. Usá la [política](../documentation-policy.md) y la [plantilla](../templates/feature.md).
