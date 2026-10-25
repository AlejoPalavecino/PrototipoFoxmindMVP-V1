# Aula 3D: Plan, Biblioteca, Muro y participantes

Este documento define la presentación y cada recorrido del espacio interno del aula. El comportamiento académico se conserva; la composición 3D y la navegación curricular integrada son diseño para implementar después. Continúa en [autoría de actividades](activity-authoring.md) y [entregas, corrección y progreso](submissions-and-grading.md).

## Estado, entradas y reglas comunes

**Diseño completo de estos recorridos; interfaz 3D todavía no implementada.** La base funcional P5–P8 y la extensión IA existen en el checkpoint del [roadmap](../../../implementation-roadmap.md). Esta especificación no ejecuta ni vuelve a verificar esos productos.

La página real es `/mis-aulas`: al abrir una tarjeta, `Classrooms` mantiene `classroomId` y `ClassroomView` cambia secciones en estado React. `/mis-aulas?aula=<uuid>` es una entrada existente desde Agenda, validada por el servidor; `&actividad=<uuid>` abre el contexto académico. `/mis-aulas?notificacion=<uuid>` recupera el destino autorizado. **No existe hoy una ruta independiente por pestaña ni se presupone `/aulas/:id/plan`.** Los nombres de pantalla siguientes son destinos de presentación, no URLs nuevas. Las notificaciones nunca sustituyen la comprobación de acceso actual.

| Superficie | Implementado hoy | Diseño de presentación 3D |
| --- | --- | --- |
| Aula | Cabecera de aula y pestañas; entrada ordinaria en Alumnos/Compañeros | Sidebar global desktop; cabecera compacta; entrada ordinaria en Plan para ambos roles; destinos explícitos de actividad/notificación prevalecen; accesos permanentes a todas las secciones |
| Plan | Unidades/temas, estados y administración | Unidades/temas a la izquierda; contexto seleccionado, materiales y actividades a la derecha |
| Biblioteca | Listado y carga/publicación/edición/eliminación explícitas | Lista escaneable, filtros locales por unidad/tema y panel de archivo |
| Muro | Hilos de texto y moderación | Columna legible de publicaciones y respuestas agrupadas |
| Participantes | Listas actuales/históricas, resumen docente, invitaciones/código | Lista de nombres y acciones según rol; historial separado |

Los filtros y la selección curricular propuestos son organización local de datos ya autorizados, no nuevos estados de negocio. Seleccionar un tema nunca lo marca Dado ni inicia una actividad. El material extra permanece accesible aunque no tenga unidad.

### Anatomía compartida y adaptación

- **Desktop, desde 1024 px:** sidebar global con Mis aulas activo; breadcrumb `Mis aulas / Nombre del aula`; nombre, materia/división/ciclo, docente, rol de esta membresía y zona horaria; navegación del aula; área principal blanca/crema. La portada de materia es pequeña, de `covers/{literature,math,biology,society,science,creative,general}.webp`; no ocupa un hero dentro del trabajo. Foxy aparece solo en una ayuda o estado, sin competir con el contenido.
- **Tablet, 768–1023 px:** navegación global compactable; la navegación curricular puede plegarse. No reducir el texto de materiales/preguntas para conservar dos columnas artificialmente.
- **Mobile, 320–767 px:** breadcrumb abreviado y un único conjunto de pestañas horizontales desplazables; selección y foco visibles, sin menú alternativo `Secciones del aula`. Plan usa botón `Unidades y temas` que abre una hoja con selección y cierre explícitos; el contenido elegido ocupa el ancho. Muro y participantes son una sola columna. Formularios largos usan pantalla/hoja de altura completa, con pie de acciones fuera del teclado y sin tapar el último campo.
- El fondo de materia acompaña la portada: Literatura lavanda, Matemática amarillo, Biología menta. Iconos SVG y labels identifican material, TP, cuestionario o evaluación; no se añade una gran imagen por tipo. Primarios naranja con texto oscuro. Error, foco, selección y estado no dependen solo del color.
- Orden de teclado: navegación global → cabecera → sección → navegación curricular si existe → contenido → acciones. Un panel de detalle recibe foco en su título y lo devuelve al disparador al cerrar. Escape cierra diálogos descartables; una mutación en curso no aparenta cancelarse. Botones de reordenar son accesibles sin arrastrar. Objetivos táctiles de al menos 44 px y reflow a 320 px; tablas se convierten en listas, no obligan al desplazamiento horizontal de toda la página.

### Estados que heredan todos los flujos

| Situación | Presentación y salida |
| --- | --- |
| Primera carga | Esqueleto de las filas esperadas y texto de estado; no mostrar “vacío” antes de la respuesta |
| Actualización | Conservar datos confirmados, indicar actualización y no fingir resultados nuevos |
| Sin datos | Mensaje específico; `states/empty.webp` pequeño solo si aporta orientación; CTA únicamente al rol autorizado |
| Error de red/servicio | Mensaje junto a la superficie, `Reintentar`; conservar entradas locales; nunca declarar guardado sin confirmación |
| 409/revisión desactualizada | “El aula cambió. Actualizá para revisar el estado antes de guardar.” Conservar texto local y permitir recargar; no reintentar silenciosamente ni pisar datos |
| Resultado de escritura incierto | Consultar primero el estado confirmado; no crear un segundo contenido para compensar una respuesta perdida |
| Sesión expirada/no verificada | Flujo de ingreso/verificación real con destino permitido; no prometer que entradas sin confirmar sobrevivan a recargar |
| Acceso revocado/aula ajena | Estado no disponible y `Volver a mis aulas`; retirar acciones y contenido privado; no mantener un panel visible de otra membresía |
| Aula archivada | Banner “Aula archivada · solo consulta”; conservar navegación/descarga autorizada; deshabilitar escrituras, cargas, publicaciones y cambios de estados. Reactivar pertenece a Configuración del aula |
| Concurrencia | Permisos y revisiones del servidor mandan. Una edición de Plan, Biblioteca, Muro o ajustes puede invalidar otra revisión de aula; no hacer fusión automática |
| Éxito | Mensaje concreto de la acción y estado persistido. `states/success.webp` no reemplaza el texto ni aparece tras cada cambio menor |

Los estados específicos de cada flujo se añaden a esta matriz. Cada aceptación requiere también teclado, mobile, autorización y los estados comunes aplicables.

## PLAN-01 — Consultar unidades, temas y trabajo asociado

**Entrada real y rol.** `/mis-aulas` → abrir aula → Plan; docente de esa aula o estudiante actual verificado. Carga `GET /api/v1/classrooms/:id` con `units`, `topics`, `plans` y revisión. Biblioteca/actividades se consultan por sus endpoints autorizados cuando se muestran en contexto.

**Desktop.** Rail curricular con unidades numeradas, nombre y despliegue de temas; fila de tema con nombre y chip Pendiente/Siguiente/Dado. A la derecha: breadcrumb de unidad/tema, título, estado de enseñanza y bloques `Materiales` y `Actividades`. La selección inicial de diseño es el tema Siguiente si existe; en su ausencia, la primera unidad disponible. Es una selección visual, no una recomendación académica nueva. Cabecera del Plan con `Archivo del plan` y acceso a versiones.

**Mobile.** La hoja `Unidades y temas` muestra el mismo orden/estado; al seleccionar cierra y enfoca el título del contexto. `Cambiar unidad o tema` permanece a mano. No duplicar el árbol completo por encima de cada recurso.

**Campos y acciones.** Consulta sin formulario. Una actividad de varios temas aparece una vez en cada contexto que realmente le corresponde, con todas sus asociaciones visibles al abrirla; el listado global y los indicadores la cuentan una sola vez. Material asociado solo a la unidad aparece en la vista de unidad; el tema muestra sus materiales específicos y una sección claramente rotulada `Materiales de la unidad`. `Material extra` enlaza a Biblioteca. Abrir material sigue LIB-01; abrir actividad sigue ACT-01/SUB-01, incluido el efecto real de iniciar un TP.

**Estados y aceptación.** Sin temas: explicar que todavía no hay temas para mostrar; docente ve `Agregar unidad/tema`, estudiante consulta lo restante. Sin recursos de un tema: “Todavía no hay materiales/actividades en este tema”; no decir que completó el aprendizaje. Si el tema desaparece tras actualizar, avisar y regresar a su unidad o al primer contexto disponible. Se acepta cuando ambos roles ven el mismo orden/estado, el estudiante no puede cambiarlos y ningún click curricular modifica notas, intentos o avance individual.

## PLAN-02 — Marcar el estado de enseñanza

**Entrada/rol.** Plan → acción `Estado de enseñanza` del tema; solo docente, aula activa. `POST /api/v1/classrooms/:id/plan` con `{revision, operation:{action:'setTopicState', id, status}}`; estados técnicos `PENDING`, `NEXT`, `TAUGHT`.

**Anatomía.** Desktop: selector junto al título del tema en el panel derecho y badge de lectura en el árbol. Mobile: acción del tema en el panel, sin selector diminuto en el rail. Label visible “Este estado describe lo enseñado en el aula”.

**Transición.** Elegir Pendiente, Siguiente o Dado → bloquear ese control durante guardado → confirmar respuesta → actualizar rail y progreso del plan. Como máximo un Siguiente en toda el aula; al elegir otro, el anterior pasa a Pendiente. Pasar Siguiente a Dado deja ninguno seleccionado; no avanzar automáticamente. Puede deshacer Dado manualmente.

**Estados y aceptación.** Conflicto conserva el valor confirmado y ofrece actualizar; no dejar el nuevo badge como si se hubiese guardado. Archivo/acceso perdido impide escribir aun con selector abierto. Se acepta al comprobar sustitución de Siguiente, opción de no tener Siguiente, reversión de Dado y ausencia de efectos sobre entregas/calificaciones. No hay estado “dominado” por estudiante.

## PLAN-03 — Añadir, renombrar y reordenar currículo

**Entrada/rol.** Plan → `Administrar plan`, solo docente activo. Mismo endpoint/revisión de PLAN-02. Operaciones existentes: `addUnit{name}`, `renameUnit{id,name}`, `reorderUnits{ids}`, `addTopic{unitId,name}`, `renameTopic{id,name}`, `reorderTopics{unitId,ids}`.

**Anatomía.** Desktop: modo administración en el panel derecho; árbol conserva contexto. Mobile: formulario por unidad/tema; `Subir`/`Bajar` explícitos. El orden no exige drag and drop. `Cancelar` cierra entradas no confirmadas; `Guardar nombre` o `Agregar` tiene alcance claro.

**Campos.** Nombre obligatorio, más que espacios, hasta 120 caracteres; contador y error junto al campo. Reordenar manda todos los IDs actuales de esa unidad o aula, sin duplicados ni elementos de otro contexto. Primer/último elemento no ofrece el movimiento imposible.

**Transición/estados.** Guardar conserva selección e identidad; añadir tema no modifica actividades existentes. Si cambió el currículo concurrentemente, recargar el orden real antes de volver a mover; no aplicar un array viejo sobre la estructura nueva. Cambios relevantes de currículo pueden volver obsoleta una propuesta IA, pero nunca reescriben una actividad histórica. Aula archivada permite leer nombres/orden sin modo edición.

**Aceptación.** Nombres/orden persisten al volver a abrir; ninguna acción cambia de unidad a un tema mediante un simple reordenamiento; texto inválido se rechaza sin truncar. Student no recibe controles de administración.

## PLAN-04 — Eliminar tema o unidad sin borrar historial

**Entrada/rol y contrato.** Plan → administración → `Eliminar tema/unidad`, docente activo. `deleteTopic{id,confirm:true}` o `deleteUnit{id,confirm:true}` dentro del envelope de revisión.

**Anatomía y confirmación.** Diálogo desktop/hoja mobile con nombre exacto y regla: tema solo Pendiente y sin materiales/actividades; unidad solo vacía y sin vínculos. `Cancelar` primario de escape; acción destructiva explícita. Nunca pedir borrar también entregas o materiales relacionados.

**Transiciones/estados.** Abrir confirmación no elimina. Confirmar → servidor revalida → retirar fila solo con éxito y enfocar elemento anterior/contenedor. Si hay vínculos, estado Dado/Siguiente, nuevo vínculo concurrente o revisión vieja: conservar entidad y explicar la restricción; actualizar para inspeccionar relaciones reales. Un tema secundario de actividad multitema también está vinculado. No hay restauración/borrado en cascada propuesto.

**Aceptación.** Cancelar no escribe; un tema vinculado o enseñado no se borra; unidad con temas no se borra; el historial académico permanece exacto. Archivado no permite abrir la confirmación de escritura.

## PLAN-05 — Descargar y publicar versiones del archivo del plan

**Entrada/rol.** `Archivo del plan` desde Plan. Ambos roles actuales consultan versiones autorizadas; solo docente activo publica una nueva. Archivos P4 privados y `appendVersion{fileId}` en el endpoint de Plan.

**Anatomía.** Panel desktop/hoja mobile con versiones numeradas y links `Descargar plan · Versión N`; no prometer fecha de versión si el DTO no la suministra. Versión vigente destacada por su número. Sección docente `Nueva versión` separada del historial.

**Campos y recorrido.** Seleccionar PDF/DOCX hasta 20 MB → cargar → revisión de contenido/seguridad → `Consultar revisión` si sigue pendiente → cuando esté aprobado, `Publicar nueva versión` → confirmar nuevo número. Selección/carga no reemplaza el plan. PDF ofrece preview privada y descarga; DOCX descarga. Las unidades/temas no se vuelven a extraer ni reemplazar automáticamente desde esta pantalla.

**Estados.** Tipo/tamaño inválido deja selector y explicación. Pendiente/rechazado/análisis no disponible bloquean publicación/lectura. Cuota llena conserva versiones existentes consultables. Error de append no vuelve a cargar bytes automáticamente; recuperar estado y revisión primero. Nueva versión conserva anteriores y puede invalidar propuestas IA ligadas a la versión previa; no altera consignas, intentos o notas.

**Aceptación.** Dos versiones siguen accesibles según permiso; estudiante no ve publicación; archivo no aprobado nunca es versión vigente. La publicación no constituye creación de aula ni generación IA.

## LIB-01 — Encontrar, consultar y descargar materiales

**Entrada/rol.** Aula → Biblioteca o material del Plan/actividad. Docente/estudiante actual; `GET /api/v1/classrooms/:id/library`. API de contenido privada `/api/v1/files/:fileId/content?mode=preview|download`.

**Anatomía.** Desktop: encabezado, filtro local Todos/Unidad/Tema/Extra, lista de filas con icono SVG de formato, título, asociación, nombre real, extensión y tamaño; acciones `Vista previa` cuando procede y `Descargar`. Mobile: filas apiladas, metadatos debajo del título y acciones visibles; preview en pantalla completa con volver. Esos filtros son presentación propuesta sobre la lista existente.

**Reglas.** Solo PDF/JPG/JPEG/PNG tienen preview; DOCX/PPTX/XLSX/ZIP descarga. Preview fallida conserva descarga autorizada. Nunca generar un enlace público, ejecutar ZIP ni añadir visor Office. Estudiante recibe únicamente materiales activos utilizables; docente también ve no disponibles y marcas de eliminación con su estado real. Material extra tiene label propio, no “sin organizar” como error.

**Estados/aceptación.** Biblioteca vacía tiene CTA Publicar solo docente; filtro sin resultados muestra `Quitar filtros`, sin sugerir que el aula está vacía. Archivo pendiente/rechazado carece de enlaces. Archivo eliminado retira lectura inmediatamente. Revocar membresía invalida acceso incluso si quedó una pestaña preview. Se acepta al consultar material extra sin actividad, descargar Office y recuperar de un fallo de preview sin saltar permisos.

## LIB-02 — Cargar archivo privado y publicar material

**Entrada/rol.** Biblioteca → `Publicar material`, docente activo. `POST /api/v1/files` admite scope de aula/purpose `material`; `PUT /files/:id/content` envía bytes; `GET /files/:id` consulta revisión; después `POST /classrooms/:id/library` con `{revision,operation:{action:'publish',title,fileId,unitId,topicId}}`.

**Anatomía y campos.** Desktop: panel de dos etapas Archivo → Datos/publicación; mobile la misma secuencia vertical. Selector acepta PDF/DOCX/PPTX/XLSX/JPG/JPEG/PNG/ZIP hasta 50 MB (50.000.000 bytes). No formatos Office viejos/macros ni audio/video. Tras aprobación: nombre obligatorio hasta 200; unidad opcional; tema opcional dependiente de unidad. Valor sin unidad = `Material extra / recomendado`; cambiar unidad limpia tema con aviso visible. Nunca recortar texto.

**Recorrido.** Seleccionar muestra “todavía no cargado”; subir muestra operación real sin porcentaje inventado; revisión pendiente ofrece consulta; aprobado habilita completar y `Publicar material`; éxito devuelve a lista con el nuevo material. Cargar no publica. No imponer que exista vínculo a actividad ni anunciar notificación de Biblioteca inexistente.

**Estados.** Tipo, tamaño, contenido real, archivo cifrado/ininspeccionable, scan rechazado o caído: no publicable. Cuota agotada explica y conserva lectura de archivos existentes. Error entre admisión y bytes conserva identificación confirmada cuando se dispone de ella; consultar antes de iniciar duplicado. Conflicto de aula mantiene metadata local y archivo aprobado, recupera revisión antes de republicar. Archivo no habilitado nunca aparece al estudiante.

**Aceptación.** Publicar extra, por unidad y por unidad+tema funciona con los mismos permisos. Tema ajeno o sin unidad se rechaza. Archivo aprobado se publica una sola vez; cambiar título no reenvía bytes. Archivado bloquea ambas etapas.

## LIB-03 — Editar nombre/asociación conservando el archivo

**Entrada/rol/contrato.** Biblioteca → fila → `Editar datos`, docente activo; `operation:{action:'edit',id,title,unitId,topicId}` y revisión de aula.

**Anatomía.** Diálogo desktop/hoja mobile con campos prellenados de LIB-02, nombre real del archivo de solo lectura y nota “Para corregir el archivo, publicá un material nuevo”. No selector de reemplazo.

**Transición y estados.** Guardar modifica organización e identidad visible, no bytes ni vínculos de actividad. Permitido aun si el material está vinculado/ya participaron, respetando archivo y políticas. Mientras guarda, evitar doble envío; con conflicto mantener formulario y pedir actualizar. Si el material se eliminó o el aula se archivó durante edición, no permitir reanimarlo mediante guardar.

**Aceptación.** Misma identidad/fileId antes/después; asociación válida; instrucciones/entregas no cambian. Cancelar no altera metadata. Permisos no se amplían por compartir fileId.

## LIB-04 — Eliminar material no vinculado

**Entrada/rol/contrato.** Biblioteca → `Eliminar material`, docente activo; `operation:{action:'delete',id,confirm:true}`. Material vinculado deshabilita control con explicación textual; el servidor revalida también referencias compartidas.

**Anatomía y transición.** Confirmación nombra material y avisa indisponibilidad irreversible; el espacio se libera al confirmarse borrado físico. Éxito inmediato de negocio = marca `Material eliminado`; `deletionPending=true` muestra “Borrado del archivo pendiente; espacio aún reservado”. Solo la confirmación real de almacenamiento muestra espacio liberado. Mobile conserva el mismo texto, sin esconderlo bajo un tooltip.

**Estados y aceptación.** Enlace/vínculo creado concurrentemente rechaza eliminación sin cambios. Fallo de storage no restaura material ni anuncia liberación de cuota; se consulta estado y se mantiene solicitud durable existente. Estudiante no recibe tombstones ni descarga eliminados. Se acepta al distinguir eliminación lógica, limpieza pendiente y limpieza confirmada; no ofrecer papelera/restauración ni limpiar otros archivos para obtener espacio.

## LIB-05 — Pantalla contextual de archivos privados

**Entrada real.** `/files?kind=classroom&id=<uuid>&purpose=plan|material`, o `kind=draft&purpose=plan` para creación. La página `files.tsx` y `PrivateFilePanel` exigen contexto exacto; claves adicionales, ID inválido o combinación no admitida devuelven “Abrí los archivos desde un borrador o aula existente con su contexto completo”. No es un drive global ni lista de todas las entregas.

**Anatomía/rol.** Desktop panel en shell; mobile una columna. Sesión/verificación, espacio disponible/en uso/cuota, selector, subida, estado y consulta. El backend conserva qué propietario/docente puede cargar. Estudiantes consultan los archivos autorizados desde Biblioteca o sus intentos; esta pantalla no añade permiso de subida a Biblioteca.

**Transiciones.** Sin sesión → Iniciar sesión; no verificada → Verificar correo. Seleccionar → `Subir archivo` → pendiente/rechazado/listo; reintento de subida conserva la identidad/bytes del mismo upload, `UPLOAD_CONFLICT` exige revisar selección. Actualizar consulta uso y archivo actual. Listo ofrece preview si soportada y descarga. Rate limit muestra espera del servidor; la UI no omite esa espera. Subir aquí no publica en Plan/Biblioteca.

**Conservación/aceptación.** Cuota cuenta plan/materiales/todos los intentos y borradores confirmados. No elegir un valor de producción en GB; mostrar el devuelto. Solo uploads incompletos abandonados tienen limpieza tras 24 horas de inactividad; no prometer caducidad de borrador confirmado. Se acepta sin acceso por URL manipulada, sin lectura de archivo no aprobado y con separación clara archivo aprobado/publicación.

## WALL-01 — Leer avisos y consultas

**Entrada/rol/contrato.** Aula → Muro; ambos roles actuales; `GET /api/v1/classrooms/:id/wall` devuelve revisión/posts. Notificación abre IDs de publicación/respuesta comprobados por servidor y enfoca el elemento real.

**Anatomía.** Columna centrada desktop, ancho completo mobile; cada hilo muestra Aviso/Consulta, iniciales automáticas, nombre/apellido, fecha/hora, marcador Editado si procede, texto y respuestas agrupadas con conteo. Publicaciones nuevas primero; respuestas antiguas primero. No diseño de burbujas de chat ni datos de correo/perfil público.

**Acciones/estados.** Actualizar no crea contenido. Target ya inaccesible informa sin mostrar hilo ajeno. Padre eliminado deja `Contenido eliminado` y respuestas conservadas. Vacío explica el propósito y muestra composición a miembros activos. Archivado deja lectura pero no composición. Texto con markup se presenta literal, nunca HTML.

**Aceptación.** Orden estable, autoría visible, enlaces de notificación enfocan publicación o respuesta y ningún control de reacción, adjunto, chat privado o fijado aparece.

## WALL-02 — Publicar aviso/consulta y responder

**Entrada/rol/contrato.** Muro → `Publicar aviso` docente o `Publicar consulta` estudiante; hilo → `Responder publicación`. `POST /:id/wall` con `{revision,operation:{action:'publish',body}}` o `{action:'reply',postId,body}`. El servidor deriva tipo/rol, no el formulario.

**Anatomía y campos.** Compositor desktop arriba de la lista; respuesta dentro de su hilo. Mobile el textarea crece sin ocultar contexto. Label “Visible para toda el aula”; texto requerido, no solo espacios, hasta 5.000 puntos de código Unicode; contador. Conserva saltos/tabulación y markup literal; controles inválidos se rechazan. No rich text.

**Transiciones.** Enviar → busy → contenido confirmado y limpiar solo ese compositor. Cancelar respuesta deja hilo intacto. Aviso notifica estudiantes actuales salvo autor; consulta al docente; respuesta al autor del padre si mantiene acceso, salvo autorrespuesta. No suscripción implícita de todos los participantes ni email académico.

**Estados y aceptación.** Error o 409 conserva texto, exige actualizar antes de nuevo intento. Padre eliminado entretanto impide nueva respuesta; no convertirla en publicación suelta. Archivo/acceso revocado bloquean. Se acepta que guardar y notificaciones ocurran juntos, no haya doble post por refresh y nunca se muestre éxito con transporte fallido.

## WALL-03 — Editar o moderar texto

**Entrada/rol.** Menú de contenido → `Editar` solo autor; `Eliminar` autor o docente del aula. El docente no puede reescribir texto ajeno. Capacidades `canEdit/canRemove` del servidor gobiernan controles.

**Anatomía/contrato.** Edición usa diálogo desktop/hoja mobile con texto previo, contador 5.000 y `Guardar texto`/Cancelar; `editPost` o `editReply` con id/body. Eliminación usa confirmación separada; `removePost`/`removeReply` con id/confirm:true y revisión.

**Transiciones/estados.** Editar conserva createdAt y muestra Editado tras confirmación; no dispara nueva notificación. Eliminar reemplaza texto por marca, preserva árbol y autoría; no borra respuestas ni ofrece deshacer. Padre eliminado no se edita/restaura ni admite nuevas respuestas; autores de respuestas supervivientes todavía pueden editarlas/eliminarlas y docente moderarlas. Conflicto/ya eliminado recarga estado sin restaurar texto por accidente. Solo lectura en archivado.

**Aceptación.** Probar autor estudiante, otro estudiante, docente y pérdida de acceso; cancelación no muta; el texto ajeno nunca se abre como editable al docente. Moderación no cambia notas o participantes.

## WALL-04 — Continuar un hilo desde notificaciones

**Entrada/rol.** Centro de notificaciones → item P6 → `Abrir publicación`; `POST /api/v1/classrooms/notifications/:id/open` con `{}` devuelve classroomId/postId/replyId y marca leído. `POST /notifications/:id/read` marca leído sin abrir y es idempotente.

**Anatomía.** El centro global cede al aula/Muro con hilo resaltado por borde y foco, no solo color; mobile cierra el centro antes de mostrar destino. La notificación conserva contexto aula y fecha; no expone otras respuestas privadas.

**Estados/aceptación.** Membresía revocada elimina item de lista elegible y rechaza acceso directo sin mutar. Tombstone accesible se puede abrir como historial. Aula archivada permite marcar leído sin escribir contenido ni avanzar revisión de aula. Notificación ajena no se abre. Repetir “leída” conserva primer timestamp; abrir no publica respuesta.

## PEOPLE-01 — Consultar participantes según rol

**Entrada/rol/contrato.** Aula → Alumnos (docente) o Compañeros (estudiante), `GET /api/v1/classrooms/:id/members`. Rol pertenece al aula, sin interruptor global; una cuenta puede enseñar otra materia.

**Anatomía.** Desktop lista con iniciales y nombre/apellido; docente ve periodos de membresía cuando el DTO los incluye y acciones `Ver resumen`/Remover. Estudiante solo nombres, sin emails, enlaces a perfil, notas, menús por persona ni mensajes. Mobile las filas docentes apilan acciones bajo el nombre; nunca columna vacía de acciones estudiantiles. Vacío se refiere a estudiantes, no a ausencia del docente.

**Transiciones/estados y aceptación.** Cargar lista no consulta notas de pares. Docente selecciona resumen → PEOPLE-02; estudiante no tiene transición por persona. Cambios concurrentes de matrícula se reflejan al actualizar; no mantener resumen de alguien con permisos revocados. En archivado se consulta y se deshabilita remover/invitar. Se acepta privacidad de nombres únicamente para compañeros y composición sin emails/avatares cargados.

## PEOPLE-02 — Resumen académico y antiguos estudiantes

**Entrada/rol/contrato.** Solo docente → `Ver resumen` actual o Historial. `GET /:id/members/:studentId` y `/members/:studentId/progress`; antiguos se listan por `GET /:id/history`. No hay directorio público.

**Anatomía.** Panel amplio desktop/pantalla mobile: nombre, banner Actual/Registro histórico, tres indicadores separados según PROG-03, lista de entregas cronológica con actividad/intento/fecha/nota y publicación. No presentar notas privadas como publicadas. Cerrar devuelve a la fila original. Historial es sección aparte de Alumnos, con periodos y motivo de salida disponibles, sin sumar antiguos al total actual.

**Estados/aceptación.** Sin entregas: “Todavía no hay entregas registradas”; sin notas: “Sin calificaciones publicadas”, no 0. Regreso reutiliza registros, nunca crea otra persona académica. Resumen de antiguo permanece docente y consultable en aula archivada, pero no habilita reentrega de no miembro. Acceso estudiante a otro ID se deniega. Ver detalles de notas/entregas sigue GRADE/SUB con permisos reales.

## PEOPLE-03 — Invitar, administrar invitaciones y código

**Entrada/rol.** Alumnos → `Invitar estudiantes`, bloque Invitaciones y Código; solo docente activo. Conserva los flujos de acceso definidos en la especificación, sin convertir invitación enviada en inscripción.

**Anatomía y campos.** Diálogo desktop/hoja mobile con correo completo, input textual/inputMode=email (no una validación HTML estrecha que excluya mailboxes admitidos). No normalizar local-part ni dominio mayúsculo: se rechaza como contrato existente. Lista docente con destinatario, Pendiente/Aceptada/Revocada/Vencida y estado real de envío: cola/aceptado para envío/error. No afirmar “entregado” por aceptación SMTP.

**Contrato/transición.** `POST /:id/invitations {email}` crea/renueva siete días sin duplicar pendiente; reenviar no acepta. `POST /:id/invitations/:invitationId/revoke {}` tras confirmar invalida la pendiente. `POST /:id/code {}` tras confirmar genera nuevo código e invalida anterior sin tocar matrículas. El código nuevo se muestra/copia cuando la respuesta lo devuelve; no recuperar ni inventar un código anterior que el servidor no devuelve. Fallo de portapapeles deja código visible y opción de selección manual.

**Estados y aceptación.** Reenvío fallido conserva invitación/estado real; revisar vigencia actual. Código no tiene vencimiento automático pero solo sirve primer ingreso; reingreso exige nueva invitación posterior a salida/remoción. Cuenta invitada debe aceptar explícitamente con ese email verificado. Archivado bloquea envíos/código/admisión. Aceptada no ofrece revocar matrícula mediante “revocar invitación”. Casos inválidos dan mensaje genérico sin filtrar registros privados. Resto del registro/aceptación pertenece al documento de cuentas/aulas del sistema.

## PEOPLE-04 — Remover o salir conservando historial

**Entrada/rol/contrato.** Docente Alumnos → Remover → `POST /:id/members/:studentId/remove {}`; estudiante actual → `Salir del aula` → `POST /:id/leave {}`. No remover docente, transferir propiedad o añadir co-docentes.

**Anatomía.** Confirmación desktop/hoja mobile nombra aula/persona y explica pérdida inmediata de acceso, conservación de entregas/notas/conversaciones y reingreso por nueva invitación. Cancelar conserva estado. Acción de estudiante queda en opciones del aula, separada de Salir de una actividad y Cerrar sesión.

**Transiciones/estados.** Éxito docente mueve persona a Historial y refresca totales actuales; éxito estudiante vuelve a Mis aulas. No borrar autores/hilos/archivos ni reclasificar entregas. Reingreso conserva obligaciones previas; actividades durante ausencia siguen las reglas de elegibilidad de SUB-02. Conflicto/membresía ya terminada consulta estado; error de red no declara salida confirmada. Archivado impide ambas escrituras según comportamiento existente.

**Aceptación.** Cuenta removida pierde lectura/descarga/escritura, incluso desde link antiguo; docente conserva historial; actual promedio/denominadores excluyen esa persona; nueva invitación restaura mismos registros sin duplicar. Código anterior no reingresa.

## Fuentes y límites del diseño

- [Especificación V1, §§2–11](../../../foxmind-v1-functional-spec.md), [Biblioteca P6](../../../p6-library.md), [Muro P6](../../../p6-muro.md).
- [ClassroomView](../../../../apps/classrooms-ui/ClassroomView.tsx), [Plan](../../../../apps/classrooms-ui/Plan.tsx), [Library](../../../../apps/classrooms-ui/Library.tsx), [Wall](../../../../apps/classrooms-ui/Wall.tsx), [contratos UI/API](../../../../apps/classrooms-ui/api.ts).
- [Página de archivos](../../../../apps/web/pages/files.tsx), [panel privado](../../../../apps/web/src/components/private-file-panel.tsx), [cliente de archivos](../../../../apps/web/src/lib/file-client.ts).
- [Dirección visual seleccionada](../references/index.json). La sidebar reemplaza visualmente la top bar histórica; no cambia permisos ni crea rutas/backend.

No se diseñan favoritos, reacciones, chat privado, co-docentes, gamificación, galerías públicas ni borrado automático de historial. Los endpoints, valores de revisión y límites existentes se reutilizan; nuevos filtros/composición responsive se verificarán cuando exista implementación. La cuota numérica de producción permanece diferida junto al hosting, sin bloquear el diseño del estado “espacio agotado”.
