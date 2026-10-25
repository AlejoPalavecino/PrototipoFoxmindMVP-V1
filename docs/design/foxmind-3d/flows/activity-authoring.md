# Preparar actividades: autoría manual e IA con revisión docente

Los tres tipos de actividad comparten una entrada clara y terminan en el mismo editor: guardar conserva trabajo privado; publicar habilita la actividad. La propuesta 3D reorganiza la experiencia sin cambiar el bloqueo por participación, los contratos ni la privacidad de claves. Para la resolución y las notas, continuar en [entregas y corrección](submissions-and-grading.md).

## Qué existe y qué se implementará después

La autoría manual, actividades multitema, generaciones IA durables, revisión, aplicación y publicación están implementadas en el checkpoint del [roadmap](../../../implementation-roadmap.md). El diseño responsive/3D de este archivo todavía es una propuesta. No se declara verificación nueva de runtime ni se reutiliza autorización histórica para implementarlo.

Entrada real: `/mis-aulas` → abrir aula → Actividades. [Activities](../../../../apps/classrooms-ui/Activities.tsx) abre editores y previews en estado React; no hay rutas propias para “crear”, “generar” o cada actividad. Agenda admite `/mis-aulas?aula=<uuid>&actividad=<uuid>` y las notificaciones abren destinos comprobados. Todos los endpoints abreviados de este documento tienen prefijo `/api/v1/classrooms`; `:id` es classroomId y `:activityId`/`:jobId` son IDs reales de la respuesta, nunca índices visuales.

### Anatomía común

- **Desktop:** shell/role del [espacio del aula](classroom-workspace.md); navegación curricular a la izquierda cuando se entra desde Plan; editor en área principal. Actividades tiene lista de filas, filtros de presentación por unidad/tema/tipo/estado y CTA `Crear actividad` docente. El CTA abre elección Manual/Con IA, reutilizando las acciones actuales. Cuestionario/TP/evaluación se distinguen con icono SVG y label; no una imagen decorativa grande.
- **Editor desktop:** breadcrumb con aula/unidad, tipo y estado; secciones Organización → Consignas/preguntas → Recursos → Entrega/plazo → revisión. Resumen lateral angosto solo si cabe sin quitar ancho de lectura. Acciones `Guardar actividad`, `Vista estudiante` y volver; `Publicar` separado y con estado confirmado. El docente ve “Cambios sin guardar” o “Guardado confirmado”, nunca un autosave ficticio.
- **Mobile:** editor a pantalla completa, secciones en orden vertical y resumen plegable. Navegación de preguntas por lista/botones accesibles; no una miniatura de editor desktop. Pie de acciones con espacio reservado al final; teclado no oculta errores/último campo. Dialog de publicación ocupa hoja completa si el contenido no cabe. Pérdida de datos locales se advierte al salir con cambios; `Seguir editando` conserva pantalla y `Salir sin guardar` no toca el servidor. Este guard de salida es presentación propuesta; el componente actual avisa que la recuperación de cambios locales no está garantizada.
- **Privacidad:** preview docente se rotula como tal y puede mostrar claves privadas; `Vista estudiante` omite flags correctos, reglas privadas y contexto/evidencia IA no públicos. Ninguna preview del docente inicia intento ni activa bloqueo.
- **Accesibilidad:** labels persistentes, errors junto al campo y resumen enfocado al fallar, foco de vuelta al CTA al cerrar, orden de teclado natural y reflow a 320 px. Desplegables no ocultan campos inválidos: abrir la sección antes de enfocar. Naranja con texto oscuro; badges con texto, no solamente color. Carga usa esqueleto; `states/unavailable.webp` queda reservado para indisponibilidad de superficie completa.

### Estados comunes a ACT y AI

Se hereda la matriz de [estados del aula](classroom-workspace.md#estados-que-heredan-todos-los-flujos). Docente de otra aula/estudiante nunca ve autoría o trabajos IA privados. Aula archivada deja consulta de contenido autorizado sin guardar, generar, aplicar, publicar ni retirar. Cada escritura confirma revisión del aula; 409 mantiene campos locales y pide revisar el estado real, sin fusionar contenido ni regenerar automáticamente. Una respuesta perdida se resuelve consultando el objeto ya creado; ningún refresh vuelve a crear una actividad o llamada al proveedor. Los estados siguientes concretan estas reglas por flujo.

## ACT-01 — Encontrar una actividad y elegir su recorrido

**Entrada y rol.** Actividades desde aula/Plan/notificación. `GET /:id/activities`: docente ve borradores privados, publicadas y retiradas; estudiante únicamente lo publicado autorizado. Seleccionar unidad/tema es filtro, no cambia la asociación de ninguna actividad.

**Anatomía.** Desktop filas con tipo, título o `Borrador sin título`, estado de publicación, unidad y todos los temas, plazo con zona, bloqueo por participación y acciones. Mobile filas apiladas; CTA de estudiante `Abrir trabajo práctico` o `Consultar actividad`, historial propio aparte. No sintetizar “pendiente de corregir” desde una ausencia de nota sin leer el contexto real de intentos.

**Acciones y transición.** Docente: Crear manualmente/Generar con IA; Continuar borrador/Editar; Vista previa docente; Ver entregas; en publicada, Habilitar primera entrega; Publicar o Retirar solo si no bloqueada. Estudiante: consultar/resolver e historial propios; abrir TP sigue SUB-01 y puede iniciar intento. No hay botón Eliminar actividad ni configuración inicial de cantidad arbitraria de intentos.

**Estados y aceptación.** Vacío docente invita a crear; vacío estudiante dice que todavía no hay actividades publicadas. Filtro vacío propone limpiar filtros. Borrador no aparece al estudiante ni emite notificación; retirada deja historia docente sin prometer que se eliminó. Error de lista no se presenta como cero actividades. Se acepta que la misma actividad multitema no duplique filas globales, entregas, Agenda ni notas.

## ACT-02 — Crear un borrador manual y organizarlo

**Entrada/rol/contrato.** Crear actividad → Manual → tipo, docente activo. `POST /:id/activities {revision,operation:{action:'create',type}}`, `type=ASSIGNMENT|QUESTIONNAIRE|EVALUATION`; crea ID privado y abre editor. Guardar usa `operation:{action:'save',id,payload}`.

**Campos.** Título hasta 200, unidad, temas de esa unidad; instrucciones/Observaciones hasta 5.000; `materialIds`; plazo opcional y `allowLate`; TP añade `attachmentRequired` e `instructionFileIds`; otros tipos usan `questions`. Borrador admite título/currículo incompletos, 0–100 temas; una pregunta agregada sí debe ser válida para guardarse. Publicación exige título no blanco, una unidad real y 1–100 temas únicos de esa unidad. No convertir primer tema en asociación única: el alias legacy `topicId` representa solo el primero.

**Anatomía/recorrido.** Tipo elegido se muestra fijo en editor; cambiar tipo no convierte silenciosamente un borrador existente. Desktop Organización muestra unidad y checklist de temas; mobile checklist debajo de la unidad. Cambiar unidad limpia selección previa y explica que debe elegir temas de la nueva. `Guardar actividad` mantiene DRAFT; al volver recupera último estado confirmado. Guardar incompleto no publica. No guardar cada tecla ni reclamar recuperación de cambios sin confirmar.

**Estados/aceptación.** Create con respuesta incierta consulta la lista antes de crear otro; no afirmar idempotencia general que el endpoint manual no define. Save inválido conserva campos y señala error; no “guardar” preguntas inválidas omitiéndolas. 409 por otra escritura requiere revisión actual. Si un estudiante comenzó mientras el docente editaba una publicada, aplicar ACT-07; no reenviar contenido viejo. Se acepta recuperar un borrador con varios temas y no duplicar identidad.

## ACT-03 — Escribir un trabajo práctico y sus recursos

**Entrada/rol.** Editor de ASSIGNMENT, docente activo, antes de primera participación para contenido. Guardado por ACT-02; carga privada de instrucciones con purpose `instructions`, scope de la misma aula y target `activityId`.

**Anatomía.** Bloque `Consignas y recursos`: Observaciones, lista de instrucciones PDF/Word, casilla `Archivos de entrega obligatorios`, materiales de Biblioteca y resumen de lo que verá el estudiante. Mobile usa la misma secuencia; cada archivo tiene estado textual y quitar vínculo propio.

**Campos/reglas.** Consigna escrita, PDF/DOCX aprobado hasta 20 MB cada uno o ambos; al publicar se requiere al menos una de estas fuentes de instrucciones. Material de Biblioteca vinculado no sustituye por sí solo esa consigna. `attachmentRequired=true` exige al menos un archivo aprobado al entregar; false permite entrega sin archivos confirmada. TP no admite preguntas estructuradas del cuestionario. No añadir respuesta de texto de TP, editor colaborativo ni rúbricas no acordadas.

**Transiciones.** Seleccionar archivo → cargar → validar/escanear → aprobado → añadir a lista del editor → guardar asociación. Si queda revisión pendiente, bloquear guardado que lo incluiría y ofrecer consultar o descartar selección pendiente. “Desvincular instrucciones” antes del bloqueo elimina el vínculo del payload; no declara borrado físico/cuota liberada. Biblioteca lista materiales activos aprobados de la misma aula; seleccionar 0..n vincula identidades existentes, nunca copia bytes ni publica las claves. Recursos de otra unidad del aula pueden vincularse; el currículo de la actividad conserva su propia unidad/temas.

**Estados/aceptación.** Archivo no aprobado no puede guardarse como consigna ni descargarse. Cuota llena explica y deja usar consigna textual o archivos ya válidos. Sin Biblioteca muestra explicación y enlace a LIB-02; el docente puede seguir sin materiales. Después del primer intento se bloquean instrucciones, adjuntos, requisito de entrega y materialIds; título/currículo/plazo tienen políticas separadas. Se acepta un TP solo escrito, solo archivo y combinado; no permite publicar uno sin ninguna consigna.

## ACT-04 — Construir cuestionario o evaluación

**Entrada/rol/contrato.** Editor QUESTIONNAIRE/EVALUATION → Agregar pregunta; docente activo antes de primer intento. `questions[]` con `type,prompt,points,scoringRule,options[{text,correct}]`. Pregunta y opciones reciben IDs persistidos al guardar; después de participación no se reconstruyen mediante metadata.

**Anatomía.** Desktop índice de preguntas y área de edición legible con “Pregunta N”, tipo, consigna, puntos y opciones. Mobile una pregunta/sección expandida; índice accesible, sin depender de arrastrar. Acciones existentes Agregar/Quitar pregunta, Agregar/Quitar opción. El orden visible es el del payload; no prometer un control de reordenamiento de preguntas que no existe aún. Total de puntos es informativo, no debe forzarse a 10.

| Tipo | Campos y validación | Presentación privada |
| --- | --- | --- |
| Desarrollo | Consigna no blanca, puntos positivos hasta dos decimales; sin opciones y scoringRule null | Aviso “Corrección manual docente” |
| Una respuesta correcta | Mínimo 2 opciones no blancas; exactamente una marcada correcta; EXACT | Selección privada de clave única |
| Varias respuestas correctas | Mínimo 2 opciones y mínimo 2 correctas; EXACT o PARTIAL por pregunta | Regla explicada con ejemplo y checkbox de cada correcta |

**Límites reales.** Autoría manual permite hasta 20.000 puntos de código en consigna/opción; Observaciones 5.000. Puntos como decimal positivo canónico con máximo dos decimales; no negativos/cero/exponentes/NaN/Infinity ni redondeo silencioso. El editor español acepta coma y normaliza el separador al contrato. No imponer los límites IA de 30 preguntas, 6 opciones, 2.000 caracteres o 100 puntos a toda la autoría manual: sus restricciones son propias de la generación. El transporte conserva sus límites operativos; no se promete tamaño ilimitado.

**Cambio de tipo y puntuación.** Antes de guardar, cambiar tipo reinicia las opciones incompatibles como hoy; el diseño pide confirmación si elimina texto, para evitar pérdida local. PARTIAL = `P × correctas seleccionadas / correctas totales` si no hay incorrectas; cualquier incorrecta da 0 solo en esa pregunta. EXACT exige todas las correctas y ninguna incorrecta. Una pregunta de 6 puntos con 3 correctas y 2 elegidas recibe 4; no hay penalización a otras preguntas.

**Estados/aceptación.** Pregunta parcial local muestra Pendiente de completar; guardar se rechaza conservando pantalla hasta validarla/quitarla. Cuestionario/evaluación publicada exige al menos una pregunta y ninguna inválida. No ofrecer archivo de instrucciones de TP ni attachmentsRequired en estos tipos. Claves son privadas en preview docente/editor y ausentes en vista estudiante. Tras participación la estructura completa queda solo lectura. Se aceptan mezcla de tres tipos y totales positivos distintos de 10.

## ACT-05 — Elegir plazo y política de recepción

**Entrada/rol.** Editor → Entrega y fecha límite; docente activo. Resolver hora: `POST /:id/activities/deadline {local}` → zona/choices. Guardado inicial en payload; después del bloqueo: `operation:{action:'deadline',id,deadline,allowLate}` con revisión actual.

**Anatomía/campos.** Desktop bloque separado del contenido con fecha/hora a precisión minuto, zona IANA fija del aula, `Sin fecha límite` cuando el valor es null y casilla `Permitir entregas tardías`. Mobile mismo bloque en una columna. Nada se interpreta silenciosamente en zona del dispositivo. Sin plazo no existe clasificación tardía.

**Reglas/transiciones.** Antes de primer intento se puede añadir/cambiar/quitar fecha y elegir política. Después: fecha existente solo se extiende; no quitar/adelantar; actividad iniciada sin plazo no adquiere uno; permitir tardías solo cambia de no a sí. `Guardar plazo y recepción` separado de `Guardar organización` evita aparentar que se guardaron consignas bloqueadas. Extender no reetiqueta puntualidad histórica. A estudiantes se informa cambio de plazo publicado mediante evento existente.

**DST y frontera.** Hora inexistente muestra error y requiere otra; repetida muestra ambas ocurrencias con offset y exige selección explícita, sin valor por defecto. Antes de 18:00:00 servidor = a tiempo; a las 18:00:00 o después = tarde si permitido, rechazo si cerrado. Inicio de upload/click no reserva hora. La zona se muestra junto a cada plazo y no puede editarse aquí.

**Estados/aceptación.** Conflicto conserva elección local y muestra fecha vigente al recargar; doble hora no se guarda sin ocurrencia. Recepción puede cerrar mientras un formulario está abierto; la UI no promete envío futuro válido por mostrar una fecha vieja. Individuales se configuran en SUB-06/SUB-07, no alterando a todos. Probar actividad sin fecha iniciada, extensión y cambio solo más permisivo, sin reescribir comprobantes previos.

## ACT-06 — Revisar, publicar o retirar

**Entrada/rol/contrato.** Lista/editor confirmado → Vista previa docente o Publicar/Retirar. `GET /:id/activities/:activityId/preview`; `POST /:id/activities {revision,operation:{action:'publish'|'withdraw',id}}`. Solo docente activo, sin primer intento para publicar/retirar.

**Anatomía.** Preview desktop panel amplio/mobile pantalla completa con el contenido guardado, label docente y toggle seguro Vista estudiante. Resumen previo a publicar: tipo, título, unidad/temas, consignas/preguntas, recursos aprobados, entrega requerida, plazo/zona y política tardía. No mostrar que un cambio local sin guardar se publicará.

**Transiciones.** Guardar válido → revisar → `Publicar` → confirmación “Será visible para estudiantes; se publica el estado guardado” → éxito PUBLISHED y evento ACTIVITY_PUBLISHED. Si hay cambios locales, guardar y revalidar primero o salir explícitamente; publicar no guarda de forma implícita. Retirar publicada sin participación → confirmar → WITHDRAWN, deja de visible al estudiante. Borrador/retirada válidos pueden publicarse mediante acción explícita; no borrar actividad. Aplicación IA no salta esta etapa y vuelve a comprobar procedencia/fuentes/currículo.

**Estados/aceptación.** Título/currículo/consigna/pregunta incompleta, archivo no listo o propuesta obsoleta impiden publicación y señalan paso a corregir. Primer intento concurrente bloquea retiro/cambios sin destruir historial. Archivo archivado impide publicar aun si confirmación ya estaba abierta. Notificación no se emite por guardar ni preview. Student DTO nunca recibe correct flags, contexto docente o propuesta IA privada.

## ACT-07 — Corregir organización después de participación

**Entrada/rol/contrato.** Editar actividad con `locked=true`; docente activo. `metadata{id,title,unitId,topicIds}`; plazo por ACT-05. Estudiante TP inicia al abrir instrucciones; cuestionario/evaluación al Comenzar; preview docente nunca inicia.

**Anatomía.** Aviso permanente “La participación comenzó”; Organización editable y Consignas/recursos/preguntas solo lectura con explicación del bloqueo. CTA para otro contenido: `Crear una actividad nueva`, sin copiar intentos ni notas. Mobile no esconde el aviso al plegar secciones.

**Campos/transiciones.** Título hasta 200 y asociación válida de una unidad/1–100 temas para publicada; puede cambiar organización sin alterar requisitos. Observaciones son consigna y siguen bloqueadas. Instrucciones, opciones/claves/puntos/reglas, archivos requeridos y materiales vinculados tampoco cambian. Guardar organización conserva IDs de preguntas, intentos y calificación efectiva.

**Estados/aceptación.** Conflicto con participación recién iniciada muestra estado real y no “salva” el contenido viejo por metadata. Borradores locales permanecen solo en pantalla hasta decisión explícita; no prometer conversión automática en actividad nueva. Se acepta corregir título/temas y extender plazo sin modificar ninguna respuesta, pregunta o nota; no ofrecer retiro/eliminación para eludir bloqueo.

## AI-01 — Preparar una generación explícita y sus fuentes

**Entrada/rol/contrato.** Actividades → Generar con IA, solo docente actual activo. `GET /:id/activity-generations/sources` devuelve plan vigente y materiales no eliminados del aula, procesables o no con motivo. `GET /:id/activity-generations` recupera últimos 20 trabajos. Abrir/recargar/seleccionar fuentes solo lee; no llama a generar.

**Anatomía.** Desktop formulario central y resumen de selección; mobile bloques: Tipo/currículo → Objetivo/contexto → Fuentes → Extensión → Generar. Lista de fuentes con nombre/tipo/tamaño, plan o material, asociación y checkbox explícito desmarcado por defecto. Fuentes de la unidad pueden ordenarse primero, sin seleccionarlas silenciosamente ni ocultar otras unidades del aula. Entradas no procesables siguen visibles deshabilitadas con razón textual.

| Campo | Validación del contrato |
| --- | --- |
| Tipo | TP, cuestionario o evaluación |
| Unidad y temas | Una unidad, 1–100 temas únicos de esa misma unidad |
| Objetivo | Obligatorio, 1–1.000 puntos de código, no blanco |
| Nivel del grupo | Opcional, hasta 200 |
| Dificultad | Básica/Intermedia/Avanzada |
| Duración aproximada | Entero 5–240 minutos; no es un cronómetro de evaluación |
| Contexto docente | Hasta 5.000; obligatorio con contenido suficiente si no hay documentos |
| Fuentes | 0–6 IDs `plan:<versionId>` o `material:<materialId>` del aula; no URLs/fileIds arbitrarios |
| TP | 1–20 consignas y cero preguntas |
| Cuestionario/evaluación | 1–30 preguntas totales; desarrollo/única/múltiple, 0–30 cada subtipo sin superar total |
| Avisos conocidos | DOCX requiere aceptar que se leen textos/tablas, no imágenes |

**Lectura documental.** PDF/DOCX aprobados: cada uno hasta 20.000.000 bytes y suma hasta 20.000.000; PDFs hasta 100 páginas entre todos; texto DOCX hasta 200.000 caracteres. Biblioteca admite más formatos/tamaños para consulta, pero eso no los convierte en fuentes IA. No OCR de imágenes Word ni truncamiento/omisión silenciosa; todas las fuentes seleccionadas se leen o se informa fallo. Solo títulos de temas/objetivo no constituyen contenido suficiente. No se incorporan calificaciones, respuestas o identidades estudiantiles al contexto de generación.

**Acción/estados/aceptación.** `Generar borrador` envía StartActivityGeneration con revisión y requestId estable de la operación. Mostrar antes “Usa IA y puede consumir cuota”; una solicitud explícita inicia un trabajo, no una publicación. Tipo cambia cantidades incompatibles y exige revisar selección; no modifica una generación ya enviada. Fuente desaparecida/no lista/oversize impide usarla; no deseleccionar a escondidas. Si IA no disponible, conservar formulario y ofrecer camino manual. Se acepta operar sin documentos solo con contexto sustancial, elegir material de otra unidad de la misma aula y no generar al abrir/refrescar.

## AI-02 — Seguir y recuperar el trabajo durable

**Entrada/contrato.** Tras generar o Generaciones recientes → Recuperar. `POST /:id/activity-generations` devuelve 202 nuevo o 200 replay; `GET /:id/activity-generations/:jobId` consulta. Mismo rol docente y aula incluso para GET.

**Anatomía.** Estado al inicio del área de generación con nombre/tipo/fecha disponibles, sin porcentaje ni ETA inventada; reporte de fuentes plegable y lista de últimos 20 trabajos. Mobile resume estado antes del formulario. Cerrar no se presenta como Cancelar trabajo, porque solo se detiene el polling local.

| Estado | Texto y acciones |
| --- | --- |
| QUEUED | En cola; esperar/actualizar/cerrar; formulario actual no envía otro trabajo |
| RUNNING | Generando; recuperar después; no reenviar automáticamente |
| READY | Lista para revisar → AI-03 |
| FAILED | No se pudo generar; motivo seguro y datos faltantes si existen → AI-05 |
| STALE | Programa/fuentes modificados; contenido no aplicable → revisar selección y nueva generación explícita |
| APPLIED | Borrador creado → Abrir borrador creado por ID; no Aplicar otra vez |

**Recuperación/concurrencia.** Trabajo persiste aunque cierre/navegue; recuperar vuelve a consultar permisos/snapshot. El componente actual consulta periódicamente mientras activo (1,5 s); la propuesta conserva espera honesta, pausa al cerrar y permite actualización manual. Repetir la misma petición identificada devuelve el mismo resultado; cambiar body con igual requestId da conflicto. No promete idempotencia durable del navegador después de perder todo estado local; buscar reciente antes de nueva solicitud. Cambios de revisión ajenos al snapshot exigen CAS actualizado pero no necesariamente invalidan fuentes.

**Aceptación.** Cerrar/reabrir encuentra el mismo trabajo; ninguna lectura usa cuota de generación. No exponer prompt crudo, texto privado completo, paths de storage ni errores del proveedor. Recuperar trabajo ajeno/revocado falla sin filtrar propuesta. Archivado conserva consulta autorizada y bloquea generar/aplicar.

## AI-03 — Revisar propuesta privada y vista estudiante

**Entrada/rol.** READY → `Revisar esta propuesta`; docente del aula. Copia local de propuesta persistida; no se guarda una corrección docente de propuesta por cada tecla. Solo aplicar crea borrador durable con esa copia revisada.

**Anatomía.** Desktop área editable y vista estudiante alternable; mobile alterna por botón, sin dos columnas estrechas. Banner “Revisión docente privada; las referencias ayudan a revisar, no certifican exactitud”. Título, objetivo, observaciones, consignas TP o preguntas/opciones/claves/puntos editables. Fuentes por consigna/pregunta en disclosure con nombre y página PDF cuando existe; DOCX/contexto sin número de página inventado. El informe de lectura explica cualquier limitación.

**Validaciones propias.** Propuesta conserva tipo/cantidades solicitados; editor de revisión no permite cambiar el tipo/mezcla ni cantidad del trabajo ya generado. Título 1–200; objetivo 1–1.000; observaciones hasta 5.000; cada consigna/pregunta 1–2.000; opciones 2–6 de 1–500; puntos positivos hasta 100 con dos decimales; claves/reglas según ACT-04. Cada item conserva referencia estructural a fuente seleccionada o contexto, y página PDF válida. Editar semántica obliga a revisar que las referencias sigan apoyando el texto; la UI no garantiza esa correspondencia automáticamente.

**Composición y salida.** Al aplicar se combinan `Objetivo: ...`, observaciones y consignas TP numeradas; total de instrucciones resultante no supera 5.000. No truncar si el docente amplió texto: indicar qué debe reducir. Vista estudiante muestra consignas/preguntas/opciones/puntos públicos y omite claves, flags correctos y datos de trabajo/contexto IA. No genera soluciones TP/desarrollo ni corrige por IA.

**Estados/aceptación.** Dirty = “Propuesta editada sin aplicar”; cerrar puede perder solo cambios locales, propuesta original sigue recuperable. Fuentes/currículo cambiados vuelve STALE y bloquea aplicación; no ofrecer aplicar una copia vieja por estar montada. Advertencias DOCX_IMAGES_OMITTED/PARTIAL_CONTENT/GROUNDING_REQUIRES_REVIEW se expresan en español; no presentar código técnico crudo. Se acepta revisar claves privadas y comprobar que la preview estudiante no las contiene.

## AI-04 — Aplicar la propuesta como nuevo borrador

**Entrada/rol/contrato.** Revisión válida READY → `Usar propuesta revisada como borrador`, docente activo. `POST /:id/activity-generations/:jobId/apply {revision,requestId,proposal}` → generationId/activityId/revision.

**Transición.** Revalidar permiso, snapshot, fuentes, currículo y propuesta → crear exactamente un nuevo DRAFT → APPLIED y abrir editor habitual ACT-02 por ID. No reemplazar borrador manual ni actividad previa. Guardado/aplicación no crean intento, nota, obligación ni notificación estudiantil; publicar después con ACT-06. Materiales seleccionados se vinculan como identidades normales seguras; plan no se convierte en material de Biblioteca. Defaults: sin fecha, no tardías, archivos de entrega no obligatorios, sin archivos propios de instrucciones; docente revisa estos valores en editor.

**Anatomía y estados.** Desktop/mobile muestran “Creando borrador…” y bloquean doble click; luego confirmación concreta y editor, sin celebración que sugiera publicación. Respuesta perdida → recuperar generación; APPLIED permite abrir borrador ya creado, nunca aplicar por otro requestId para obtener copia. Conflicto exige refrescar aula/snapshot, conserva copia local para consulta sin autorizar contenido stale. Fuente dejó de ser utilizable → no crear borrador parcial. Aula archivada bloquea aun si READY.

**Aceptación.** Un job aplicado solo produce un activityId; el borrador contiene ediciones revisadas, varios temas una identidad, sin respuestas estudiantiles ni calificaciones. Student no lo ve hasta publicación; procedencia se verifica otra vez al publicar aunque el runtime IA se haya desactivado.

## AI-05 — Regenerar, resolver fallos y preservar trabajo

**Entrada/rol/contrato.** READY/FAILED/STALE → `Preparar regeneración completa`; docente activo. `POST /:id/activity-generations/:jobId/regenerate` con StartActivityGeneration completo más `acknowledgePossibleCharge`. Genera sucesor nuevo; anterior permanece recuperable. No endpoint de reintento implícito ni cancelación prometida.

**Anatomía/recorrido.** Panel muestra parámetros/fuentes actuales y confirma “Se creará otra propuesta; la anterior se conserva”. Cambiar formulario no modifica retrospectivamente el job. Si nuevo resultado se elige mientras hay ediciones locales: `Conservar ediciones` o `Reemplazar ediciones por esta propuesta`; nunca reemplazo al llegar una respuesta. Conservar edición no declara que se guardó en servidor. Una generación aplicada se abre como borrador; no se regenera como si aún fuera READY.

| Error/condición | Mensaje y recuperación específica |
| --- | --- |
| SOURCE_UNAVAILABLE / FILE_NOT_READY | Revisar fuente y su aprobación; elegir fuentes válidas antes de nueva solicitud |
| AI_INPUT_LIMIT | Reducir documentos/páginas/texto dentro de límites; no recortar automáticamente |
| INSUFFICIENT_CONTENT | Mostrar preguntas/datos faltantes; añadir contexto/material suficiente; no ampliar temario con conocimiento general |
| INVALID_AI_OUTPUT | Explicar que no cumple formato; nueva solicitud explícita o autoría manual; no aplicar fragmentos |
| AI_UNAVAILABLE | Camino manual disponible; no instalar proveedor ni pedir credenciales en la pantalla |
| AI_RATE_LIMITED | Respetar espera/admisión devuelta; actualizar estado no vuelve a generar |
| AI_BUDGET_EXCEEDED | Explicar presupuesto disponible agotado; manual o volver después de resolución operativa; no vender otro plan |
| AI_TIMEOUT | Mostrar fallo registrado y recuperación explícita según estado; no asumir que reintentar es gratuito |
| PROVIDER_OUTCOME_UNKNOWN | Explicar posible consumo sin propuesta; requiere marcar reconocimiento de posible cargo y confirmar una generación nueva; nunca reenviar por timeout/refresh |
| STALE | Revisar currículo/plan/fuentes actuales y generar solicitud nueva; no reutilizar permisos/snapshot viejo |

**Concurrencia y aceptación.** Idempotencia distingue igual operación de nueva intención; fuente/currículo revalidados antes de nueva llamada. Confirmación de cargo aparece solo para resultado incierto y no se marca por defecto. Failed no se reenvía solo; active no permite doble solicitud local. Cuotas/presupuesto se comparten con extracción de plan, no se inventa un segundo saldo. Se acepta guardar propuesta anterior, conservar dirty local y no mostrar nueva generación como reemplazo/publicación automática.

## Diferencias observadas que debe resolver la implementación visual

1. `ActivityGenerationForm` actual limita cada subtipo de pregunta a 10; el contrato admite hasta 30 por subtipo con total de 30. Este diseño expone el límite del contrato sin reducir capacidad del servidor; al implementar debe alinearse el control y verificarse la suma.
2. `ActivityPreview` conserva una frase de estudiante que dice que el flujo de intentos está pendiente. P7/P8 ya existen y `AttemptSession` los usa. La nueva copia debe decir “Consultar no equivale a entregar”, sin declarar una funcionalidad inexistente.
3. El diccionario de advertencias de UI no desarrolla `GROUNDING_REQUIRES_REVIEW`; esta especificación exige texto legible. La capacidad/contrato existe; no constituye un nuevo error de negocio.
4. Los guards de salida, resumen de revisión, filtros y composición responsive son diseño nuevo de presentación sobre operaciones existentes. No se afirma que estén implementados o probados por estos documentos.

## Fuentes contrastadas y aceptación de cobertura

- [Especificación funcional, §§7–9 y aceptación §15](../../../foxmind-v1-functional-spec.md), [guía de IA](../../../activity-ai.md), [contrato IA/multitema](../../../../odd/tasks/classroom-activity-ai.md), [P7](../../../../odd/tasks/p7-activities.md).
- [Activities](../../../../apps/classrooms-ui/Activities.tsx), [ActivityAuthoring](../../../../apps/classrooms-ui/ActivityAuthoring.tsx), [currículo](../../../../apps/classrooms-ui/ActivityCurriculum.tsx), [generación](../../../../apps/classrooms-ui/ActivityGeneration.tsx), [formulario](../../../../apps/classrooms-ui/ActivityGenerationForm.tsx), [revisión de propuesta](../../../../apps/classrooms-ui/ActivityGenerationProposal.tsx), [hook](../../../../apps/classrooms-ui/use-activity-generation.ts), [API de generación](../../../../apps/classrooms-ui/activity-generation-api.ts), [barril de dominio](../../../../src/core/domain/index.ts).
- Las historias de P7/P8/IA prueban implementación de su checkpoint; los criterios anteriores son pruebas a ejecutar después de implementar este diseño. No se incluyen IA correctora, exportación PDF, soluciones generadas, rúbricas, bancos de preguntas ni temporizador de evaluación.
