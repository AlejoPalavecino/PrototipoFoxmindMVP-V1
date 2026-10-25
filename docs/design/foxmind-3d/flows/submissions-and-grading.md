# Resolver, entregar, corregir y consultar progreso

El estudiante siempre distingue trabajo en curso, entrega recibida y resultado publicado. El docente corrige en privado y publica explícitamente. Una reentrega conserva la anterior; el progreso de entregas, el rendimiento y el avance del Plan siguen siendo indicadores diferentes. Este documento completa [el espacio del aula](classroom-workspace.md) y [la autoría](activity-authoring.md).

## Estado, rutas y anatomía común

P7/P8 están implementados según el [roadmap](../../../implementation-roadmap.md), la [tarea P7](../../../../odd/tasks/p7-activities.md) y la [tarea P8](../../../../odd/tasks/p8-grading.md). Esta es la especificación de presentación 3D y estados completos para implementación posterior; no constituye una nueva ejecución de pruebas ni implementación de producto.

La entrada real es `/mis-aulas` → aula → Actividades, con paneles/diálogos de React. Agenda puede abrir `/mis-aulas?aula=<uuid>&actividad=<uuid>`; notificaciones académicas abren el objeto autorizado mediante su endpoint real. No se inventan URLs públicas de intentos, soluciones o calificaciones. Todos los endpoints abreviados aquí tienen prefijo `/api/v1/classrooms`; `:id` es classroomId.

| Superficie | Desktop propuesto | Mobile propuesto |
| --- | --- | --- |
| Consulta de actividad | Panel principal con tipo, unidad/temas, recursos, plazo/zona y situación propia; contexto curricular a izquierda cuando corresponde | Una columna; recursos y acción principal antes del historial; texto completo sin reducción artificial |
| TP | Consigna y recursos arriba/lateral; archivos propios y estado abajo; confirmación aparte | Pantalla de detalle, archivos en filas apiladas y CTA de envío con espacio reservado |
| Cuestionario | Índice accesible de preguntas y pregunta enfocada; estado de guardado y envío | Una pregunta por área visible, índice plegable y Anterior/Siguiente sin depender de swipe |
| Evaluación | Cabecera reducida con Volver al aula, título, intento, plazo/zona y guardado; sin ruido del shell global | Mismo modo concentrado a ancho completo; salida explícita, nunca botón ambiguo “Salir” |
| Corrección | Identidad/actividad/intento fijos, respuesta y puntos/devolución por pregunta, resumen y publicación separados | Datos en secuencia; pregunta/archivo → puntuación → feedback; resumen final antes de publicar |
| Progreso | Tres bloques separados y lista/tabla accesible según rol | Tres bloques apilados; tabla convertida en filas con labels |

Se heredan los [estados comunes del aula](classroom-workspace.md#estados-que-heredan-todos-los-flujos): cargas honestas, errores sin descartar entradas, permisos actuales, 409 sin sobrescritura, archivo de solo lectura y respuesta perdida consultada antes de repetir. Todos los flujos contemplan teclado, foco de retorno, 320 px, errores con texto y estados no dependientes del color. Botones primarios naranja con label oscuro; iconos SVG distinguen tipos. No otra imagen decorativa grande por actividad.

### Modelo visible de estados

| Término | Significado y límites |
| --- | --- |
| Solo consulta | La actividad se ve pero no es obligación habilitada, o el contexto es histórico/cerrado/archivado; mostrar causa real, no un cero |
| Sin comenzar | Cuestionario/evaluación habilitado todavía sin Comenzar; consultar no abre intento |
| Borrador | Intento abierto con cambios confirmados y/o locales; no entregado |
| Editando aquí | Esta pestaña posee capacidad vigente; las demás consultan hasta transferencia explícita |
| Guardando / Guardado / Error | Estado por confirmación real del servidor; “en pantalla” no equivale a persistido |
| Entregada | Existe envío confirmado con comprobante inmutable; contenido bloqueado para estudiante |
| Pendiente de publicación | No hay resultado propio publicado de ese intento; no revela corrección privada |
| Calificación vigente | Una sola nota publicada efectiva para la actividad; puede provenir de un intento anterior |
| Reentrega pendiente | Nuevo borrador habilitado; entrega/nota vigentes previas se conservan |
| Resultado histórico | Nota publicada de intento que ya no es efectivo; se consulta sin volver a contar |

No asignar Aprobado/Desaprobado, insignias, dominio, asistencia o porcentaje de aprendizaje a partir de estos estados. No existe umbral universal de aprobación ni corrección IA.

## SUB-01 — Abrir una actividad y comenzar cuando corresponde

**Entrada/rol/contrato.** Estudiante actual → actividad publicada; `GET /:id/activities/:activityId/session` devuelve expected/eligibilityReason, recepción, serverTime, intento/capacidades y contenido seguro. Docente usa preview, no el camino de estudiante. Inicio explícito: `POST /:id/activities/:activityId/start {}`.

**Anatomía.** Consulta desktop/mobile muestra tipo, título, unidad y todos los temas, consigna, recursos autorizados, plazo efectivo y zona, política tardía y estado propio. TP explica antes de apertura “Abrir instrucciones inicia tu intento y fija su contenido; no entrega trabajo”. Cuestionario/evaluación muestran `Comenzar` y aclaran que consultar no inicia. No confundir comenzar con enviar ni presentar un temporizador por la duración pedagógica de IA.

**Transición.** TP: la primera apertura deliberada del detalle de instrucciones inicia el intento y activa el bloqueo académico; abrir/descargar instrucciones no cuenta como entrega. Cuestionario/evaluación: consultar sin empezar; `Comenzar` crea/recupera intento y bloquea contenido. Inicio autorizado devuelve estado confirmado y capacidad de edición cuando corresponde; no crear otro intento al reabrir. Vista previa docente nunca activa bloqueo. Recepción cerrada no suprime por sí sola la consulta de contenido autorizado; las capacidades del servidor determinan si existe borrador consultable/editable y si puede empezar/enviar.

**Estados.** Sin permiso o actividad retirada no permite detalle estudiante. Si no expected, banner de solo consulta y explicación SUB-02; no CTA Comenzar/Enviar por inferencia de fecha general. Aula archivada consulta sin inicio/escritura. Si otro dispositivo ya controla intento: cargar último borrador solo lectura, ofrecer SUB-05. Error de inicio mantiene detalle/no comprobante y obliga consultar estado antes de repetir; no contabilizar entregada.

**Aceptación.** Diferenciar abrir TP, consultar cuestionario y Comenzar evaluación; sin falso recibido ni nota. Todos los temas visibles sin duplicar actividad. Archivos de instrucciones no aprobados carecen de enlaces; keys nunca están en DTO de estudiante.

## SUB-02 — Elegibilidad, primera matrícula y reingreso

**Entrada/rol.** Consulta de actividad o Mi progreso; estudiante actual; docente ve elegibilidad en `GET /:id/activities/:activityId/eligibility` para habilitar primera entrega, no por mirar una nota faltante.

**Anatomía.** Banner junto al estado propio, igual en desktop/mobile: `Pendiente de entrega`, `Solo consulta: venció antes de tu ingreso` o causa autorizada equivalente del contrato. No convertir solo consulta en vencida/incumplida. Fecha efectiva con zona se muestra aunque difiera de la general; no revelar plazos individuales de compañeros.

| Situación | Resultado de presentación/negocio preservado |
| --- | --- |
| Primera matrícula, actividad previa sin plazo o futura al ingresar | Cuenta como trabajo esperado hasta envío confirmado |
| Primera matrícula, actividad ya vencida al ingresar | Consulta por defecto; ni obligación ni falta, aun si permite tardías en general |
| Docente autoriza primera entrega con plazo individual futuro | Se convierte en obligación de ese estudiante; no crea envío ni intento adicional ficticio |
| Reingreso formal tras salida/remoción | Conserva obligaciones/entregas/notas previas; no empieza la historia de cero |
| Actividad creada durante ausencia, abierta o sin fecha al reingresar | Se vuelve esperada |
| Actividad creada durante ausencia ya vencida al reingresar | Consulta hasta autorización docente y plazo individual futuro |
| Días sin iniciar sesión con matrícula intacta | No se trata como salida/reingreso ni borra obligaciones |

**Concurrencia/estados.** Elegibilidad se consulta al abrir/actuar, nunca se deduce de comparar fecha contra reloj local. Invitación permite reingreso, código no lo elude. Pérdida de membresía retira acceso y edición; regreso reutiliza identidad académica. Si el docente habilita mientras la vista está abierta, `Actualizar estado` muestra nueva autorización. Archivado impide habilitar. Vacío de obligaciones usa PROG-01 y no invita a “entregar” actividades de consulta.

**Aceptación.** Casos de primera matrícula/reingreso producen denominadores distintos sin duplicar student/activity; actividad solo consulta no produce cero ni retraso automático. El flujo no incluye autoinscripción, co-docente ni rol global.

## SUB-03 — Resolver preguntas con guardado verificable

**Entrada/rol/contrato.** Intento DRAFT de cuestionario/evaluación con editor vigente. `POST /:id/attempts/:attemptId/answer` con revisión de intento y respuesta de la pregunta, encabezados de editor/epoch gestionados por cliente existente. Sin editor la consulta solo muestra respuestas confirmadas.

**Anatomía/campos.** Consigna, puntos disponibles y número de pregunta; Desarrollo textarea hasta 20.000; Selección única radios; múltiple checkboxes; `Limpiar selección` para volver a no respondida. Texto de opciones completo sin claves correctas. Índice muestra posición y estado respondida/sin responder con label; no marcar respuesta correcta. Desktop índice lateral; mobile lista plegable/botones Anterior/Siguiente, índice no oculta status de guardado.

**Transiciones.** Editar conserva valor local → tras dos segundos sin cambios intenta autosave; cambiar pregunta intenta flush de pendientes. “Guardando…” solo mientras request; “Guardado confirmado” solo respuesta persistida. Navegar conserva respuestas locales aunque falle save. `Reintentar guardado` vuelve a guardar con la revisión/autoridad actual confirmada; no entrega. El último valor confirmado se restaura al reabrir. No prometer almacenamiento offline de valores no confirmados al cerrar/recargar.

**Estados.** Error mantiene respuestas en pantalla con “Cambios sin confirmar”; pregunta siguiente no borra la anterior. Sin red no publicar un check de guardado. Cambio de epoch invalida editor y sigue SUB-05; no flush tardío tras pérdida de control. Archivo/aula cerrada/acceso revocado deshabilita acciones por estado real; respuesta del servidor resuelve conflicto. Blank no es cero de actividad: solo preguntas vacías de un intento explícitamente enviado obtendrán cero.

**Aceptación.** Guardado a los 2 s, al cambiar, fallo/reintento y recuperación última persistencia; ningún guardado genera submittedAt, notificación de entrega o resultado. Múltiple permite elección incompleta sin autocorregirla y respeta límite de respuesta/texto sin cortar.

## SUB-04 — Preparar archivos de un TP

**Entrada/rol/contrato.** Intento TP DRAFT con editor vigente. Carga P4 privada: `POST /api/v1/files` con scope aula, purpose `attachment`, targetId de intento; `PUT /files/:fileId/content` con editor/epoch; estado recuperado en sesión. Quitar selección persistida: `POST /:id/attempts/:attemptId/attachments-remove {revision,fileId}`.

**Anatomía.** Bloque `Archivos del borrador` separado de instrucciones del docente; cada fila muestra nombre, formato/tamaño disponibles, estado y acción propia. Mobile apila nombre/estado/acciones, sin tabla de celdas pequeñas. Selector no reemplaza toda la lista. Límite visible: hasta 5 archivos, 50 MB cada uno, condicionado al espacio; hasta 250 MB total sin otro cap agregado.

**Tipos y recorrido.** PDF/DOCX/PPTX/XLSX/JPG/JPEG/PNG/ZIP; rechazar legacy/macros y otros no admitidos. Selección local → “Archivo seleccionado · todavía no cargado” → `Subir archivo privado` → carga/revisión → confirmado aprobado y seleccionado en borrador. Pending/error/rechazado no es adjunto utilizable. Consultar estado cuando se perdió respuesta antes de intentar un duplicado; no inventar porcentaje. Selección local se puede descartar; carga confirmada se puede quitar/reemplazar antes de envío y bajo control de editor. Reemplazar = quitar del borrador y agregar nuevo, no sobreescribir bytes.

**Conservación.** Reabrir recupera uploads confirmados; no meramente seleccionados/incompletos. Quitar vínculo de borrador no garantiza borrado físico ni libera cuota, y nunca borra archivos de intentos previos. Drafts confirmados no caducan automáticamente. Preview PDF/imágenes, resto descarga, siempre con permisos y ready.

**Estados y aceptación.** Sin archivos confirmado muestra ese texto, no “entregado”. Si attachmentsRequired, pedir mínimo uno aprobado; si opcional, puede enviar cero con confirmación. Cualquier adjunto incluido pendiente/rechazado/carga en curso bloquea enviar; selector local sin subir exige subir o descartar antes. Cuota agotada permite consultar existentes sin limpiar historia. Archivado/transferencia/submitted bloquea subir/quitar/reemplazar. Probar cinco válidos, sexto, tamaños, scan caído y recuperación sin revelar archivo ajeno.

## SUB-05 — Consultar otro dispositivo y transferir edición

**Entrada/rol/contrato.** Mismo estudiante abre intento DRAFT en otra pestaña/dispositivo; sesión inicialmente de solo consulta. `POST /:id/attempts/:attemptId/transfer {revision}` devuelve capacidad/epoch nueva. Token/epoch son privados de memoria de la pestaña; no URL, cookie ni storage compartido.

**Anatomía.** Banner “Solo consulta en esta pestaña/dispositivo”, botón `Transferir edición a esta pestaña`. Confirmación desktop/hoja mobile explica que la anterior perderá permiso para guardar/subir/enviar y que cambios no confirmados no se transfieren. Opción Cancelar inequívoca. No botón “crear copia”.

**Transición.** Confirmar → servidor invalida autoridad previa → nueva pestaña carga último borrador confirmado → edición habilitada aquí → anterior ve solo consulta al refrescar/foco/rechazo de request. No fusionar valores ni seguir autosave con token viejo; respuestas de lecturas iniciadas antes de transferencia no pueden revertir el epoch nuevo. Con transferencia no se crea intento ni entrega.

**Estados/aceptación.** Error de transferencia no anuncia control adquirido; recargar sesión confirmada. Si submitted, recepción cerrada para acciones o archivado, servidor no concede permiso por aceptar diálogo. Nueva pestaña no ve valores locales no guardados de anterior. Probar save/upload/submit rechazados desde control antiguo y recarga segura en nuevo, sin duplicar entrega ni perder historial.

## SUB-06 — Confirmar envío y recibir comprobante

**Entrada/rol/contratos.** Estudiante con intento abierto, expected y editor vigente. TP: `POST /:id/attempts/:attemptId/submit-practical {revision,confirm:true}`. Preguntas: `POST /:id/attempts/:attemptId/submit-answers {revision,confirm:true,confirmIncomplete}`. El cliente primero confirma respuestas pendientes; ninguna escritura de borrador entrega sola.

**Anatomía.** CTA `Enviar trabajo práctico` o `Enviar respuestas`; confirmación separada de botones de guardado. Desktop panel/dialog enfocado; mobile hoja con resumen legible antes del botón final. TP: número/lista de archivos aprobados o “Entrega sin archivos” si permitido. Preguntas: cantidad sin responder; aviso “Obtendrán cero puntos en este intento”; si incompleto, CTA exacto `Confirmar entrega incompleta`. Siempre aviso de bloqueo y revisión/publicación docente posterior.

**Transiciones.** Revisar → cancelar mantiene borrador editable sin submittedAt → confirmar valida capacidades, revisión, recepción y readiness → SUBMITTED con hora/fecha servidor, plazo aplicado/zona y puntualidad persistida → solo consulta. Preguntas no confirmadas/saving bloquean confirmación; cambiar respuesta invalida confirmación anterior. Error no limpia respuestas/archivos ni muestra comprobante de éxito. Tras resultado incierto consultar sesión/historial: si está SUBMITTED, mostrar comprobante, no volver a enviar para producir otro intento.

**Frontera temporal.** Solo recepción completa anterior al instante límite es puntual. Exactamente al vencimiento: tarde si permite, rechazo si cierra. Inicio de upload/click previo no reserva plazo; reloj del dispositivo no decide. Sin fecha, no etiquetar tarde. Si hay individual, usar plazo efectivo servidor según SUB-07/08. No recalcular comprobante viejo al extender general.

**Comprobante.** Actividad, número de intento, fecha/hora y zona de recepción, plazo aplicado o sin plazo, a tiempo/tarde, adjuntos/answers confirmados y estado “Entregada”. El resultado propio se consulta aparte GRADE-04; no afirmar siempre “pendiente de corrección” si una nota ya publicada existe. Un envío confirmado notifica al docente, no publica nota automáticamente.

**Estados/aceptación.** Recepción cerrada, archivado, transferencia o no elegible rechazan sin crear entrega. Envío incompleto cancelado conserva edición; confirmado admite ceros por preguntas vacías y espera revisión/publicación. Required TP sin archivo no llega a confirmación válida; optional sin archivo sí. Verificar doble click/response loss leyendo estado para no duplicar; no prometer una nueva entrega después de submitted sin reapertura docente.

## SUB-07 — Consultar historial y habilitar reentrega

**Entrada/rol/contratos.** Estudiante `Ver mis intentos`: `GET /:id/activities/:activityId/history`. Docente `Ver entregas recibidas`: `/history-submissions`. Detalle `GET /:id/attempts/:attemptId/history`. Reabrir: `POST /:id/activities/:activityId/reopen {revision,studentId,deadline,confirm:true}` solo docente activo.

**Anatomía.** Desktop historial con actividad, intentos de mayor a menor, estado, recepción/plazo/puntualidad, nota vigente/histórica cuando publicada, y reentrega pendiente aparte. Mobile tarjetas apiladas. Docente ve nombre y etiqueta Estudiante anterior cuando corresponde; student solo sus filas. Docente puede identificar un borrador en el historial para saber que hay pendiente, pero no leer respuestas/adjuntos privados no enviados mediante consulta de entrega.

**Consulta.** Intento SUBMITTED es inmutable para estudiante. Abrir muestra respuestas/adjuntos propios autorizados y resultado publicado o pendiente. DRAFT propio → `Continuar borrador`, inicialmente consulta si necesita transferir editor. No se presenta un borrador como recibido. No usar cantidad de intentos como entregas ni escoger mejor nota histórica.

**Reapertura.** Acción solo sobre última entrega de estudiante actual, sin otro intento posterior o draft pendiente. Confirmación identifica estudiante, intento base y plazo individual opcional. Nuevo DRAFT numerado conserva respuestas/archivos de la última entrega para revisar, no su corrección/nota. Original y nota efectiva permanecen; estudiante recibe notificación y debe tomar edición/confirmar nuevo envío. Sin fecha individual usa general vigente/política. Si recepción ya cerró exige individual futuro. Hora local/DST según ACT-05, no autoajustes.

**Plazo efectivo.** Individual no altera resto del aula. Si extensión general posterior supera individual, se usa el general posterior; si no, se preserva individual más largo. Nunca acortar tiempo ni reescribir puntualidades anteriores. Cada envío nuevo conserva su snapshot.

**Estados/aceptación.** No miembro/archivado impide reabrir; historial docente sigue disponible. Reapertura concurrente se rechaza/recupera draft real, sin duplicar intentos. Pending reentrega no elimina delivered ni nota vigente; publicar nueva nota la reemplaza aunque menor. Vacío = no intentos registrados; primer envío no se habilita por “reabrir” una entrega inexistente, usa SUB-08.

## SUB-08 — Habilitar primera entrega fuera de la obligación original

**Entrada/rol/contratos.** Docente de aula activa → actividad publicada → Habilitar primera entrega. `GET /:id/activities/:activityId/eligibility` → estudiantes actuales con no expected y motivo; `POST /:id/activities/:activityId/authorize-first {revision,studentId,deadline}`.

**Anatomía/campos.** Diálogo desktop/hoja mobile con actividad, estudiante de lista elegible y plazo individual futuro obligatorio con zona del aula. Fecha/hora minuto, comprobar DST y elegir ocurrencia cuando sea ambigua. Aviso “Se habilita una primera obligación; no se crea una entrega ni otro intento recibido”. No lista de correos o estudiantes de otra aula.

**Transición/estados.** Elegir alumno/plazo → verificar → confirmar → esperado para ese alumno y notificación existente. Sin elegibles: explicación y cerrar, sin botón vacío. No publicado/archivado/membresía revocada/revisión cambiada rechaza. Plazo pasado/hora inexistente exige corregir, no desplazar automáticamente. Repetir autorización no duplica expected ni intento. Para reentregas reales usar SUB-07.

**Aceptación.** Actividad vencida antes de matrícula pasa de consulta a obligación solo por esta acción; alumnos restantes conservan estado/fechas. Reingreso conserva registros anteriores. Autorización no pone submittedAt ni cero numérico.

## GRADE-01 — Abrir y guardar corrección privada

**Entrada/rol/contrato.** Docente → entregas/historial → `Corregir intento N`. `GET /:id/attempts/:attemptId/grading`; `POST` misma ruta con `{revision,overallGrade,overallFeedback,questions:[{questionId,points,feedback}]}`. Solo intentos confirmados, nunca borrador privado estudiante. Docente puede consultar historia de antiguo miembro; escribir depende de capacidades actuales servidor/aula.

**Anatomía.** Cabecera con actividad, estudiante, número de intento, recepción/plazo/puntualidad; banner `Corrección privada: guardar no publica`. Archivos recibidos con descarga/preview permitida. TP muestra nota general y devolución; cuestionario/evaluación cada pregunta, respuesta recibida, puntos disponibles, automático/manual, feedback por pregunta; debajo devolución general y resumen. Desktop mantiene contexto al recorrer; mobile secuencia sin esconder respuesta al introducir puntos.

| Caso | Entrada y validación |
| --- | --- |
| TP | Nota global 0–10, máximo dos decimales; vacío/null = pendiente; feedback general opcional hasta 5.000 |
| Desarrollo respondido | Puntos manuales 0..disponibles con máximo dos decimales; vacío pendiente; feedback por pregunta hasta 5.000 |
| Selección | Cálculo automático según clave/regla congeladas; mostrar racional/valor exacto; no campo que reescriba clave o puntos ganados |
| Pregunta sin responder en envío incompleto confirmado | Cero puntos para esa pregunta, sin tratar toda actividad no enviada como cero |
| Feedback | General y por pregunta separados de Observaciones de la actividad; opcionales, texto plano |

**Transición.** Editar → Cambios sin guardar → `Guardar corrección privada` → respuesta confirmada/pending/final calculada. Guardar corrección incompleta es permitido; publicación espera todas las puntuaciones requeridas. Cero escrito explícitamente es válido y distinto de vacío. No notificar estudiante, no cambiar grade efectiva y no mostrar privado en resumen estudiante. `Recargar corrección` con dirty exige decisión de descartar local antes de reemplazar, guard de presentación pendiente de implementar.

**Estados/aceptación.** Red/409 conserva campos locales y exige recargar revisión antes de nuevo write. Guardado no confirmado no habilita Publicar. Published ya no usa este editor para reescribir puntos/feedback; GRADE-03 solo final. Archived consulta sin guardar. Sin envío el endpoint no crea nota. Se acepta persistir manual pendiente con feedback sin convertirlo en cero y volver a abrir privado sin exposición al estudiante.

## GRADE-02 — Calcular y publicar calificación

**Entrada/rol/contrato.** Corrección guardada completa → `Publicar calificación`, solo docente activo. `POST /:id/attempts/:attemptId/publish-grade {revision,confirm:true}`. Acción separada de guardar; usa estado guardado, no campos locales sin confirmar.

**Cálculo.** Selección EXACT exige todas y ninguna incorrecta; PARTIAL aplica fracción de correctas sin incorrectas; desarrollo usa puntos manuales o cero de blank confirmado. Sumar sin redondear cada fracción, convertir a 0–10 y redondear solo final half-up a dos decimales. Ejemplo 2/3 de 6 = 4 puntos; 6,666… final se publica 6,67; 8,345 se publica 8,35. No limitar total de puntos a 10. TP publica su nota manual válida. Formato visible final `8,50`, también `0,00`; no Aprobado/Desaprobado.

**Anatomía/confirmación.** Desktop diálogo con estudiante/intento, nota guardada, devolución presente o sin devolución y advertencia sobre reemplazo. Mobile hoja muestra estos datos antes de CTA `Confirmar publicación`. Si existe nota efectiva anterior, mostrarla con su intento y explicar que nueva será vigente incluso si menor; no comparar con “mejor resultado”. Cancelar mantiene corrección privada.

**Transición.** Confirmar → publicación atómica de nota/devolución, puntero efectivo y notificación → resultado público propio GRADE-04; promedios PROG se actualizan. Notas/puntos aún pendientes impiden publicar; no rellenar cero para destrabar. Actividad cuenta a lo sumo una nota vigente. Mientras una reentrega está sin publicar, anterior sigue vigente. Una publicación nueva reemplaza al anterior incluso si 8,00 → 6,00.

**Estados/aceptación.** Dirty, ausencia de corrección guardada, incompleta, sesión/capacidad perdida, archivo de aula o CAS viejo bloquean. Respuesta incierta se recupera leyendo grading/result y no publicando una segunda nota. Publicación no modifica respuestas/consignas. Se acepta TP con feedback opcional/nota cero, cuestionario mixto, evaluación de puntos distintos de 10 y no filtración de claves/audit.

## GRADE-03 — Rectificar nota publicada con motivo y auditoría privada

**Entrada/rol/contrato.** Docente → corrección de intento ya publicado → `Rectificar calificación publicada`. `GET /:id/attempts/:attemptId/grade-corrections`; `POST {revision,newGrade,reason,confirm:true}`.

**Anatomía/campos.** Nota actual, input nueva nota 0–10 con hasta dos decimales, motivo obligatorio no blanco hasta 5.000 y aviso de alcance. Desktop historial debajo en orden devuelto; mobile cada entrada con anterior→nueva, motivo, actor y fecha sin tablas anchas. Estudiante no tiene esta pantalla. Confirmación nombra estudiante/intento y anterior/nueva/motivo; editar después de confirmar invalida confirmación previa.

**Transición.** Confirmar → cambiar solo finalGrade del mismo intento + auditoría anterior/nueva/momento/actor + notificación al estudiante. No editar puntos por pregunta, feedback, respuestas, adjuntos, publishedAt ni criterios congelados. El resultado puede distinguir una calificación final rectificada del cálculo de puntos original sin exponer motivo/auditoría al estudiante. Si es nota vigente, actualiza promedio; si histórica, sigue histórica y no se vuelve efectiva.

**Estados/aceptación.** Motivo ausente, más de dos decimales o nota fuera de escala se rechaza sin audit ni cambio. Conflicto muestra nota actual al recargar; no corregir sobre anterior obsoleta. Error de respuesta consulta historial antes de reenviar. Archivado solo consulta. Aceptar que alumno ve nueva nota y notificación, sin motivo privado; notas históricas no se cuentan otra vez y preguntas originales permanecen exactas.

## GRADE-04 — Ver resultado propio y devolución publicada

**Entrada/rol/contrato.** Estudiante → historial → intento SUBMITTED, notificación GRADE_PUBLISHED/GRADE_CORRECTED o actividad propia → `GET /:id/attempts/:attemptId/result`. Solo propio y con acceso actual; docente consulta bajo sus permisos, no desde identidad estudiante.

**Anatomía.** Desktop resultado en panel amplio; mobile una columna con nota `N,NN`, vigente/histórica, fecha de publicación y devolución general. Cuestionario/evaluación añaden pregunta, propia respuesta enviada, puntos ganados de disponibles y devolución por pregunta; TP propios archivos y feedback general. No puntaje de compañero ni escalafón. Botón `Actualizar resultado` consulta, nunca corrige/publica.

**Privacidad.** `status:pending` solo devuelve espera, sin nota/feedback privado ni indicios de clave. Publicado muestra texto propio y únicamente opciones elegidas, sin opción correcta no seleccionada, flags correctos, clave completa, prompt/contexto IA ni auditoría de rectificaciones. Feedback docente puede explicar solución; no se promete censurarlo automáticamente. No nuevo ajuste “revelar respuestas” de V1.

**Estados/aceptación.** Pending = “Resultado pendiente de publicación”, no 0. Si hay nota efectiva anterior y reentrega pendiente, mostrarla con label anterior vigente sin confundirla con resultado del draft. Histórica tiene label “No es la calificación vigente”. Error descarga/preview deja consulta segura y alternativa cuando autorizada; acceso revocado deniega resultados aun con notificación vieja. Se acepta devolución no vacía por pregunta visible tras publicación, nota rectificada visible sin audit y actualización sin falsos guardados.

## GRADE-05 — Llegar desde notificación académica al objeto correcto

**Entrada/contratos.** Centro de notificaciones global o `/mis-aulas?notificacion=<uuid>`; `POST /api/v1/classrooms/notifications/:id/open {}` valida destinatario/membresía/target y marca leído. Destino académico tiene kind activity/attempt/submission/grade, classroomId/activityId/attemptId y gradeId cuando aplica.

**Transiciones por evento.** ACTIVITY_PUBLISHED/ACTIVITY_DEADLINE_CHANGED/FIRST_SUBMISSION_ENABLED llevan a actividad propia y estado actual; ATTEMPT_REOPENED al historial/intento propio pendiente; SUBMISSION_RECEIVED al docente y envío confirmado; GRADE_PUBLISHED/GRADE_CORRECTED al resultado propio del intento señalado, no a la nota de otro intento de la misma actividad. No reconstruir un destino solo desde título o IDs visuales.

**Anatomía/estados.** Desktop cierra centro y enfoca título de destino; mobile cambia a la pantalla sin superponer modal anterior. Notificación leída conserva orden/contexto. Target eliminado/retirado/revocado produce “Ya no disponible para tu cuenta” y volver al aula/Mis aulas según permiso; nunca restaura acceso ni reabre intento por sí sola. En archivado puede marcar leída/consultar, no escribir contenido. Error de transporte ofrece reintentar lectura, no ejecutar otra entrega/publicación.

**Aceptación.** Cuenta mixta recibe eventos por rol de aula; un evento docente en A no habilita corregir en B. Lectura idempotente no crea evento repetido ni altera contenido. No email para cada evento académico ni preferencias nuevas.

## PROG-01 — Mi progreso: entregas, notas y Plan separados

**Entrada/rol/contrato.** Estudiante → Mi progreso; `GET /:id/progress` scope self. Solo datos propios y estado global no personal del Plan.

**Anatomía.** Tres bloques, desktop en fila si hay espacio/mobile apilados: `Cumplimiento de entregas`, `Rendimiento académico`, `Avance del plan de estudio`. Lista de actividades debajo con expected/consulta, primera entrega/puntualidad, reentrega pendiente y calificación vigente o sin publicada. Ningún gráfico sin denominador/label, ni anillo conjunto que convierta notas en avance.

**Reglas.** Cumplimiento = entregadas esperadas / actividades esperadas; contar activityId una vez aun con varios temas/intentos. Entregada desde primera confirmación, no desde corrección. Puntualidad se toma de **primera entrega confirmada** y su plazo aplicado, no de la última reentrega ni de fecha general actual. Pending resubmissions se muestra aparte, sin restar delivered. Esperadas=0 → `Sin actividades pendientes de seguimiento`, sin porcentaje; esperadas>0 y todas entregadas → 100%, no vacío.

**Rendimiento.** Media aritmética de notas publicadas vigentes, igual peso TP/cuestionario/evaluación. Pendiente/no corregida/no publicada no es cero; cero publicado sí. Una nota vigente por actividad; nueva publicación sustituye aunque menor; rectificación vigente actualiza. Sin publicadas → `Sin calificaciones publicadas`. Mostrar promedio con coma/dos decimales; no umbral de aprobación.

**Plan.** Temas Dado/total y porcentaje cuando existe denominador; no inferir que el alumno dominó esos temas o entregó. No estado editable de Plan en esta pantalla estudiante.

**Estados/aceptación.** Carga no muestra 0 provisional; error ofrece reintentar sin fórmulas inventadas en cliente. Solo consulta listada no entra en pendientes. Ejemplo 2 esperadas, 3 intentos en una → 1/2, 50%; reabrir mantiene 50%. Calificaciones 8 y 6 con otra pendiente → 7,00. No datos de compañeros. Cambio de matrícula se resuelve con permiso actual.

## PROG-02 — Progreso del aula y cálculo de promedio actual

**Entrada/rol/contrato.** Docente → Progreso; `GET /:id/progress` scope classroom. No endpoint de exportación ni ranking nuevo.

**Anatomía.** Tres bloques como PROG-01 con labels de aula; estudiantes actuales con nombre, entregadas/esperadas/porcentaje o emptyLabel y promedio publicado. Desktop tabla accesible/lista, mobile cada fila con labels. Abrir nombre lleva al resumen individual existente PEOPLE-02/PROG-03; ese enlace es presentación propuesta de una operación ya existente. No exponer esa lista a estudiantes. Historial de antiguos como acceso separado, no mezclado en el total.

**Reglas.** Denominador = pares student/activity esperados solo de matrículas actuales y elegibilidad real. Numerador = pares con al menos una entrega confirmada; no attempts ni filas de activity_topics. A tiempo/tarde clasifica primera recepción de cada par. Reentregas pendientes se cuentan aparte. Promedio de aula = media de promedios individuales de alumnos actuales que tengan notas publicadas, no promedio agrupado de todas las notas. No convertir alumno sin notas en cero ni ponderar por cantidad de notas de cada uno. Cálculo conserva precisión interna y redondea solo el resultado final mostrado a dos decimales, sin promediar valores visualmente redondeados.

**Ejemplos/estados.** A tiene 10 y 10 → 10; B tiene 4 → 4; promedio aula 7,00, no 8,00. Sin alumnos muestra lista vacía y no rendimiento 0; sin notas muestra estado sin publicadas. Aula archivada consulta mismos datos; archivar no publica pendientes ni resetea métricas. Salida excluye alumno/totales actuales conservando histórico; reingreso reincorpora mismos registros sin duplicar. Actualizar usa respuesta confirmada, no recomputación parcial desde cache de otra sección.

**Aceptación.** Probar multitema, varias reentregas, no notas y cero real, salida/reingreso, elegibles distintos por alumno, primera tardía seguida de puntual y viceversa. La clasificación agregada conserva primera recepción en ambos casos. Avance del Plan nunca cambia por nota o entrega.

## PROG-03 — Seguimiento individual docente e historial

**Entrada/rol/contrato.** Alumnos/Historial → Ver resumen; solo docente. `GET /:id/members/:studentId/progress` scope member y resumen de entregas. La consulta de otro estudiante por un estudiante se deniega.

**Anatomía.** Panel desktop/pantalla mobile con nombre, condición Actual o Registro histórico, tres bloques separados y lista de actividades, primeras entregas, reentregas pendientes y nota efectiva. Registro histórico muestra “No se incluye en indicadores actuales del aula”. Periodos/salida se ven en PEOPLE-02 cuando disponibles, no se inventan fechas del DTO de progreso.

**Transiciones/estados.** Cerrar vuelve a lista origen; actividad/entrega concreta usa historial/corrección con permiso docente. No modificar expected, nota o estado Plan desde un porcentaje. Antiguo miembro se consulta pero no se habilita entrega mientras no reingrese. Sin esperadas/sin notas/sin actividades siguen reglas distintas de PROG-01. Archivado permite consulta sin corrección/reapertura. Red/409 en otra acción refresca datos; no afirmar cambio de promedio hasta confirmación.

**Aceptación.** Antiguo conserva notas/intentos, no contribuye a actual; vuelve por nueva invitación y se incluye la misma persona sin duplicados. Corrección histórica no se vuelve efectiva; primera recepción no se recalcula. Docente ve histórico sin dar al estudiante una vista de audit privada.

## Casos transversales de aceptación para la futura implementación

Estos casos son objetivos de pruebas, no resultados ejecutados por esta tarea documental.

| Grupo | Caso indispensable y resultado esperado |
| --- | --- |
| Inicio | TP abre intento al detalle; consultar cuestionario/evaluación no inicia; preview docente nunca inicia |
| Elegibilidad | Nuevo ingreso con actividad ya vencida sigue consulta aunque permita tardías; autorización futura individual cambia solo su obligación |
| Guardado | Error de autosave mantiene respuesta visible con error; reabrir restaura solo confirmado; refresh no envía |
| Editor | Segunda pestaña consulta; transferencia explícita invalida save/upload/submit anterior y conserva último guardado |
| Archivos | Selección≠upload≠aprobación≠envío; pending/rejected bloquean; cinco de 50 MB permitidos si cuota; sexto rechazado |
| Tiempo | Antes/igual/después del minuto límite, zona distinta del dispositivo, hora DST inexistente/repetida; servidor decide |
| Confirmación | Preguntas vacías requieren conteo+aviso+confirmIncomplete; cancelar no entrega; TP opcional sin archivos sí con confirmación |
| Concurrencia | Doble click, response loss, cambio de revisión y archivo de aula no duplican entidad ni anuncian éxito sin comprobante |
| Historia | Reabrir conserva original/nota; pendiente no resta delivered; nueva nota menor se vuelve vigente; histórico no cuenta otra vez |
| Corrección | Guardar manual pending con feedback no crea cero; elección automática racional sin redondeo intermedio; feedback privado hasta publicar |
| Publicación | Todas las manuales completas y guardadas; cero válido; publicación y notificación atómicas; own result sin claves no seleccionadas |
| Rectificación | Motivo obligatorio, audit solo docente, final-only; histórica no vuelve vigente; alumno recibe nueva nota, no audit |
| Métricas | Una actividad por alumno, varios temas/intentos no duplican; primera recepción fija puntualidad; media de medias actual; sin notas publicadas no implica cero |
| Privacidad | Estudiante no lee borradores/notas/archivos de otros; revocado no usa link/notificación vieja; archivado consulta sin escribir |
| Responsive | Evaluación con cabecera reducida; foco, error inline, teclado, 320 px y pie sin tapar pregunta/confirmación |

## Fuentes contrastadas y diferencias conocidas

- [Especificación V1, §§8–11 y §15](../../../foxmind-v1-functional-spec.md), [P7](../../../../odd/tasks/p7-activities.md), [P8](../../../../odd/tasks/p8-grading.md) y [extensión multitema/IA](../../../../odd/tasks/classroom-activity-ai.md).
- [Contratos UI/API](../../../../apps/classrooms-ui/api.ts), [AttemptSession](../../../../apps/classrooms-ui/AttemptSession.tsx), [QuestionnaireAttempt](../../../../apps/classrooms-ui/QuestionnaireAttempt.tsx), [PracticalAttempt](../../../../apps/classrooms-ui/PracticalAttempt.tsx), [AttemptHistory](../../../../apps/classrooms-ui/AttemptHistory.tsx), [AssignmentSubmissions](../../../../apps/classrooms-ui/AssignmentSubmissions.tsx).
- [GradingEditor](../../../../apps/classrooms-ui/GradingEditor.tsx), [PublishedGradeCorrection](../../../../apps/classrooms-ui/PublishedGradeCorrection.tsx), [PublishedResult](../../../../apps/classrooms-ui/PublishedResult.tsx), [Progress](../../../../apps/classrooms-ui/Progress.tsx).

La UI actual de comprobantes tiene la etiqueta heredada “pendiente de corrección” aun al reconsultar un envío que podría tener nota publicada; el diseño usa la respuesta propia de resultado para mostrar estado verdadero. Los guards de salida/recarga y el modo concentrado responsive especificado requieren implementación visual posterior. No se agregan intentos configurables al inicio, notas de aprobación, rúbricas, corrección IA, chat privado, exportación ni entrega de texto TP fuera del contrato existente.
