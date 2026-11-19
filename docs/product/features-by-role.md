# Funcionalidades por rol y sección

Cada cuenta tiene un rol exclusivo: docente o estudiante. Además del rol, el backend verifica sesión, correo, propiedad y membresía según el recurso. Esta matriz describe capacidades vigentes y enlaza sus reglas; no concede permisos nuevos. El [roadmap](../implementation-roadmap.md) distingue implementación, verificación y publicación.

## Navegación global

| Sección | Docente | Estudiante | Fuente |
|---|---|---|---|
| Cuota de IA | Consultar USD 5 mensuales, uso por herramienta y reservas propias | Consultar USD 3 mensuales, incluidos esquemas e imágenes privadas en Mi Estudio | [Cuota y renovación](../engineering/ai/README.md) |
| Carpetas de estudio | Sin acceso | Crear carpetas privadas con materia y borrador retomable, importar un plan vinculado, abrir y descargar materiales autorizados, estudiar con Foxy, renombrar chats y recuperar propuestas tras recargar, adjuntar con opción de guardar en carpeta, practicar con devolución, generar imágenes privadas cuando el proveedor está habilitado y confirmar repasos en Agenda | [Estudio privado](../engineering/study/README.md) |
| Cuenta y perfil | Registro como docente; acceso/verificación, nombres y avatar Foxy/iniciales con guardado explícito, contraseña, recuperación y cierre de sesión | Mismos flujos con rol estudiante | [Identidad](../engineering/identity/README.md) |
| Inicio | Saludo y acciones por rol, semáforo con ficha y evidencia por estudiante y aula, entregas agrupadas y consultas, Crear actividad con selector de aula, tarjetas de aulas y agenda del día | Saludo y accesos a actividad y Mi estudio, pendientes, tarjetas de aulas y agenda del día | [Inicio](../engineering/home/README.md) |
| Mis aulas | Crear aula, consultar Activas/Archivadas/Pendientes, administrar códigos de seis dígitos, invitaciones por lote y miembros | Confirmar ingreso por código, aceptar o rechazar invitaciones propias y consultar aulas autorizadas | [Aulas](../engineering/classrooms/README.md) |
| Agenda | Eventos propios con recordatorio configurable y contexto académico autorizado, con detalle por día | Eventos propios con recordatorio configurable, plazos propios y repasos confirmados desde Estudio | [Agenda](../engineering/agenda/README.md) |
| Foxy AI | Conversaciones privadas, historial buscable, lectura progresiva en chat general compatible, contexto general o aula completa, apertura privada de adjuntos y conservación al cambiar contexto, cancelación de trabajos. Generar visuales, leer, editar y descargar creaciones o publicar una revisión en la Biblioteca del aula | Chat privado en Carpetas de estudio y consulta de materiales publicados autorizados | [Foxy](../engineering/ai/foxy.md) |
| Notificaciones | Filtrar avisos propios, abrir destinos autorizados y administrar su lectura | Filtrar avisos propios, revisar invitaciones, abrir destinos autorizados, incluidos repasos, y administrar su lectura | [Historial y avisos](../engineering/home/README.md) |

## Dentro de un aula

Los nombres visibles y agrupaciones pueden variar por rol; la autoridad es la capacidad del servicio, no la presencia de una pestaña.

| Sección/capacidad | Docente dueño | Estudiante con acceso vigente | Fuente |
|---|---|---|---|
| Plan de estudio | Editar unidades y temas durante la creación, revisar extracción asistida y marcar el avance por tema en el aula publicada | Consultar plan, avance compartido y recursos y actividades autorizados | [Plan](../engineering/teaching/plan.md) |
| Biblioteca | Publicar archivos aprobados o recursos escritos, describirlos, vincularlos a actividades elegibles, revisar o eliminar según conservación | Consultar recursos, sus vínculos a actividades publicadas, vista previa y descarga autorizada | [Biblioteca](../engineering/teaching/library.md), [archivos](../engineering/files/README.md) |
| Actividades | Preparar con temas de una o más unidades, partir de una idea privada para IA, revisar consignas, preguntas y criterios, y publicar | Consultar asignadas, resolver y confirmar entregas según tipo/plazo | [Autoría](../engineering/activities/authoring.md), [participación](../engineering/activities/participation.md) |
| Entregas y correcciones | Consultar intentos, corregir privadamente, revisar asistencia IA y publicar | Consultar sus intentos y resultados publicados | [Prácticos](../engineering/activities/participation.md), [cuestionarios](../engineering/activities/participation.md), [calificaciones](../engineering/grading/README.md) |
| Progreso | Consultar la ficha, pedir análisis de escritura con cuota propia y leer la estrategia compartida por el estudiante | Consultar su progreso y elegir qué estrategia compartir o retirar desde la carpeta vinculada | [Progreso](../engineering/grading/progress.md) |
| Muro y consultas | Comunicar y moderar según autoría/propiedad y reglas del aula | Participar según permisos; no adquirir administración | [Muro](../engineering/teaching/wall.md) |
| Alumnos y administración | Gestionar ingreso, código/invitaciones, miembros, archivo y ajustes admitidos | Consultar lo permitido y salir cuando corresponda; no administrar pares | [Aulas](../engineering/classrooms/README.md) |

## Recorridos y excepciones

Crear aula tiene cuatro pasos. Primero se completan datos y portada, luego se sube el documento y se elige IA o manual, se editan unidades y temas y se confirma la revisión. Subir el archivo lo envía a validación. La extracción y la publicación requieren sus propias acciones. El asistente exige un documento PDF, DOC, DOCX, PPT o PPTX aprobado de hasta 20 MB. La API conserva la compatibilidad histórica con currículos manuales completos sin archivo. [Especificación vigente](../foxmind-v1-functional-spec.md).

La corrección privada o una sugerencia IA no es visible como nota publicada para el estudiante. Publicar exige una acción docente independiente. Completar actividades, rendimiento y avance del plan son medidas diferentes; no inferir una a partir de otra.

Archivo de aula, salida y remoción modifican las operaciones/accesos permitidos. El historial conservado para el docente no concede acceso a quien salió. Consultá las reglas de dominio para cada operación; esta matriz no promete que todas las capacidades estén habilitadas en un aula archivada.

## Actualizar esta matriz

Actualizar la fila cuando cambien acciones, permisos, visibilidad o secciones. Agregar enlace al contrato/guía dueño y al estado de entrega. Las propuestas quedan identificadas como tales hasta aprobarse; una captura o una tabla física no acreditan una función terminada. Usá la [política](../documentation-policy.md) y la [plantilla](../templates/feature.md).
