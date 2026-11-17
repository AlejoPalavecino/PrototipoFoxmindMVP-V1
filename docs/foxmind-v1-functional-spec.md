# Especificación funcional vigente de FoxMind

Describe las reglas del candidato de paridad del 2026-11-15. El [registro de verificación](work-log/2026-11-15-root-product-parity.md) documenta la evidencia y lo que sigue en revisión. Las [funciones por rol](product/features-by-role.md), [guías de ingeniería](engineering/README.md) y [matriz de comprobaciones](verification/flows.md) detallan capacidades, implementación y evidencia.

## 1. Cuenta, identidad y permisos

Cada cuenta selecciona un rol global exclusivo durante el registro: docente o estudiante. No se cambia desde perfil. El docente crea aulas propias sin aprobación administrativa; el estudiante ingresa a aulas mediante código/invitación. Propiedad y membresía son condiciones adicionales al rol. No hay co-docencia o transferencia de titularidad en este alcance.

Correo verificado es necesario para usar aulas y capacidades privadas. Quitar botones no sustituye autorización en servidor. Un alumno no puede consultar intentos/notas de un compañero ni operaciones administrativas; el docente no administra aulas ajenas.

Registro y recuperación responden genéricamente sin revelar existencia de cuenta. Aceptar una solicitud de correo no demuestra entrega, inicia sesión o inscribe. Login verificado ordinario lleva a Inicio; una continuación explícita permitida conserva validación. La verificación del enlace requiere confirmación y ofrece Ir a Inicio.

Contraseñas 16–128 puntos de código Unicode; nombres 1–80 cada uno. Sesión: 30 minutos de inactividad y 12 horas absolutas. Verificación 1 hora, recuperación 15 minutos, enlaces de un uso y mínimo 60 segundos de reenvío con controles de abuso. Cambiar contraseña conserva/renueva la sesión actual sin extender su vida absoluta y revoca otras; recuperar revoca anteriores sin login automático.

Dominios de correo deben venir en minúsculas; conservar local part válido, incluidos entrecomillados/internacionales, sin normalización silenciosa o reglas de alias de proveedores. [OpenAPI y políticas](api/accounts-sessions.openapi.json).

Mi perfil permite editar nombres y seleccionar Foxy clásico, lector, explorador o creativo, o conservar/restaurar iniciales. Seleccionar muestra vista previa; Guardar cambios persiste nombres y avatar para la cuenta, visible en perfil y Mi cuenta. Disponible para docentes y estudiantes verificados. Correo es sólo lectura. Configuración permite contraseña y cierre de sesión. No se infieren avatar subido, cambio de email, eliminación de cuenta, preferencias nuevas o cambio de rol.

## 2. Navegación y experiencia por rol

La navegación privada muestra una barra lateral plegable por encima de 1000 px y un menú compacto en anchos menores. El plegado se guarda en el navegador; los accesos rápidos a aulas sólo se muestran al expandir. Ambos roles tienen Inicio, Mis aulas, Agenda, Notificaciones, búsqueda y acceso directo a Mi perfil. Foxy AI es el espacio privado docente y Mi estudio, el del estudiante. Los contadores de las colecciones reflejan sus recursos autorizados.

El estudiante dispone además de Carpetas de estudio: espacios privados propios con plan, materiales, Foxy estudiantil, prácticas y repasos. No concede acceso al espacio Foxy del docente.

Docente dentro del aula: Plan, Muro, Biblioteca, Actividades, Progreso, Estudiantes, Historial, Ajustes. Estudiante: Plan, Muro, Biblioteca, Actividades, Mi progreso, Compañeros.

Inicio saluda por nombre y fecha local y ofrece acciones por rol. El docente ve entregas agrupadas por actividad con acceso al intento y consultas. El estudiante ve sus pendientes. Los borradores y las devoluciones publicadas se consultan dentro de las aulas, sin bloques adicionales en Inicio. La búsqueda y los destinos de notificaciones se autorizan en servidor. La bandeja filtra por origen y estado de lectura, con conteos globales de la cuenta, marcado reversible y opción de marcar todas como leídas. [UX/UI vigente](design/README.md) · [Reglas de la bandeja](engineering/home/README.md#bandeja-unificada).

Seguimiento docente permite ordenar Entregas por recepción y Consultas por última actividad, en ambas direcciones y con elección independiente para todo el listado paginado. Tus aulas reúne una muestra de aulas activas y enlaza al catálogo. Crear actividad abre un selector paginado de aulas activas propias y requiere confirmar el destino, incluso cuando hay una sola preseleccionada. [Reglas y recuperación](engineering/home/README.md#inicio-docente-orden-y-selección-de-aulas).

Ambos roles comparten la presentación de la mini agenda del día local, con horarios, duración, color y acceso a Agenda. La lectura diaria incluye eventos del día aunque su horario ya haya pasado. En móvil, las próximas entregas estudiantiles ubican el plazo debajo del título. [Guía de Inicio](engineering/home/README.md)

## 3. Aulas, borradores e ingreso

Crear aula tiene cuatro pasos:
1. Datos del aula: nombre, materia, división, ciclo lectivo, zona y portada predefinida.
2. Subir el documento del plan, esperar aprobación y elegir IA o manual; subir archivo no inicia IA.
3. Revisar/editar unidades y temas.
4. Revisión editable y Confirmar y crear aula.

Al confirmar se publica y vuelve a Mis aulas. Guardar borrador conserva una creación privada recuperable, sin crear aula visible a alumnos. El auxiliar manual de texto prepara estructura editable; no es una llamada al proveedor.

Aulas y Carpetas de estudio comparten presentación de cuatro pasos, selector de portadas y estados de colección. Conservan sus campos y reglas independientes. El plan se edita en tarjetas visibles de unidades y temas y la revisión presenta el resumen antes de confirmar. La extracción IA muestra la espera y presenta un único editor de propuesta antes de aplicarla. [Asistentes vigentes](design/README.md#crear-y-entrar)

Mis aulas docente separa Activas, Archivadas y Borradores con contador. Cada borrador sin publicar aparece en Borradores, incluso sin nombre. Permite continuar o eliminar con confirmación de pérdida de datos. Sólo el dueño puede eliminar; una revisión desactualizada o un borrador ya publicado impide la operación. La baja lógica retira el acceso y conserva referencias internas, sin restauración disponible. Las invitaciones permanecen separadas. Al confirmar creación, pasa a Activas.

El asistente exige un documento aprobado PDF, DOC, DOCX, PPT o PPTX de hasta 20 MB en ambos métodos y al menos una unidad con un tema. La API conserva la compatibilidad con currículos manuales completos sin archivo. Materia/división son texto libre; ciclo lectivo es año académico. Portada es predefinida, sin subida de imagen. La zona del aula queda fija tras crear.

Código: Ver aula presenta el destino y Confirmar inscripción incorpora/abre. Los nuevos códigos tienen seis dígitos, incluidos ceros iniciales, y siguen vigentes hasta regeneración. Se aceptan códigos anteriores hasta que el docente los regenere; una reserva fallida conserva el vigente. La revocación no permite reutilización histórica. Un error conserva formulario con respuesta genérica. La invitación vence a los siete días y la cuenta destinataria verificada decide si acepta o rechaza. Rechazar conserva la decisión en el historial docente y retira la invitación pendiente y su aviso, sin crear ni reabrir una inscripción. El docente puede invitar hasta 50 destinatarios únicos por lote recuperable, con resultados individuales y reintento sin duplicar emisiones confirmadas. Entregar correo o abrir un enlace no confirma membresía. [Contrato, protección y límites](engineering/classrooms/README.md).

Salida voluntaria o remoción revoca acceso actual, conserva registros y requiere invitación nueva para reingresar. Código no readmite a quien salió/fue removido. El docente ve historia de exalumnos separada de alumnos actuales; reingreso no duplica obligaciones por períodos anteriores.

Archivar conserva datos y bloquea inscripciones/mutaciones académicas; mantiene consulta autorizada. El estudiante puede confirmar salida aún archivada. Reactivar no borra historia ni extiende plazos; readmitir exige invitación nueva. No hay eliminación permanente del aula.

## 4. Plan, materiales y conversaciones

Plan organiza unidades y temas, con acceso a sus recursos y actividades autorizados. El docente marca dado o pendiente y puede deshacer. El estudiante consulta. Estados internos PENDING/NEXT/TAUGHT no prometen botones o reestructuración del plan publicado que la UI actual no expone.

Biblioteca admite archivos aprobados y recursos escritos. Ambos tienen título, descripción opcional, organización por unidad o tema, uso y vínculos opcionales (`activityIds`) a actividades elegibles de la misma aula. El estudiante sólo ve vínculos a actividades publicadas. Los cambios de metadatos y vínculos comparten la revisión del aula.

TEXT genera un DOCX validado y escaneado. Revisar título o cuerpo crea material y archivo nuevos. Una actividad con participación iniciada conserva su vínculo al material original y rechaza pedidos de quitar o agregar ese vínculo. Al enviar una selección de actividades, los vínculos elegibles pueden pasar a la nueva revisión. FILE conserva los bytes y admite edición de metadatos. [Reglas de Biblioteca](engineering/teaching/library.md).

La colección oculta versiones reemplazadas. Eliminar exige confirmación, ausencia de vínculos/compartición impeditivos y borrado confirmado de bytes para liberar espacio. El estudiante lee y descarga recursos disponibles; no administra materiales.

Muro: avisos docentes, consultas estudiantiles y respuestas autorizadas. Son conversaciones de aula, no mensajería privada. Autoría/moderación controlan editar/eliminar y conservación; archivo de aula restringe mutaciones. Avisos y consultas alimentan Inicio/notificaciones.

## 5. Archivos, límites y conservación

PDF, DOC, DOCX, PPT y PPTX admiten hasta 20 MB por archivo en planes, instrucciones, materiales y adjuntos de TP. Materiales y adjuntos de TP también admiten XLSX, JPG/JPEG, PNG y ZIP de hasta 50 MB por archivo. El TP admite hasta cinco adjuntos dentro del espacio disponible, sin un límite agregado adicional.

Los chats privados de Foxy docente y Carpetas de estudio admiten hasta seis PDF, DOC, DOCX, PPT o PPTX aprobados. El límite individual y el acumulado por conversación son de 20 MB. Sólo el dueño puede adjuntarlos o quitarlos. El estudiante puede optar por guardarlos además como material de la carpeta. Nuevo chat comienza sin adjuntos; cambiar el contexto de Foxy docente conserva sus adjuntos privados mediante vínculos al mismo archivo, sin duplicar bytes. Quitar un vínculo no elimina el archivo mientras otra conversación autorizada lo conserve. El docente puede abrir PDF o descargar Office mediante una ruta privada con permisos revalidados. Las reglas de archivos de aula y de TP se mantienen independientes.

Selección local, subida, aprobación y asociación son estados distintos. Publicar/entregar requiere validación estructural y escaneo limpio de los mismos bytes. Un archivo no listo/cuarentenado no puede descargarse o vincularse como aprobado.

PDF e imágenes pueden ofrecer vista previa del navegador. En Carpetas de estudio, abrir un DOCX aprobado muestra una vista previa de texto y descargar entrega el original. Los archivos sin visor se descargan. Ambas acciones requieren permiso actual. No hay bucket público, enlace presigned de usuario o claves de almacenamiento en cliente.

Cupo por aula es configurable y suma planes, materiales, borradores confirmados e historia de intentos. Cupo agotado bloquea cargas nuevas, no borra historia ni deniega consulta autorizada. La cifra productiva queda pendiente de presupuesto/hosting.

Sólo uploads incompletos abandonados pueden limpiarse tras 24 horas de inactividad. No expirar adjuntos de borradores confirmados o historia con ese mecanismo. Quitar del borrador no libera automáticamente bytes.

## 6. Actividades: autoría y compatibilidad

Tipos: TP, cuestionario y evaluación. Los dos últimos admiten desarrollo, selección simple y múltiple. Opciones: al menos dos; simple una correcta; múltiple al menos dos correctas y regla EXACT/PARTIAL admitida.

Manual tiene dos etapas: Preparar actividad → Revisar y asignar. El editor actual exige tipo, temas de una o más unidades de la misma aula, título, objetivo, consignas y rúbrica válida con pesos enteros que suman 100 %. Pide preguntas cuando corresponda. Permite comentario, materiales y plazo/configuración de entrega. Guardar borrador no asigna; Asignar al aula es explícito.

La generación con IA parte de una idea docente privada y del contexto temático elegido. La propuesta es editable y sólo crea un borrador privado al aplicarla. El docente revisa claves, puntajes y evidencia antes de asignar. La idea se conserva en la autoría docente y queda fuera de las vistas del estudiante.

La API conserva compatibilidad con topicId/topicIds, actividades anteriores sin objetivo/rúbrica y TP con consigna escrita o archivo aprobado. No endurecer esos contratos por documentar el editor actual. [Guía y fuentes](engineering/activities/authoring.md).

Antes de la primera participación, el contenido admite edición/retirada conforme a reglas. Después se bloquean consignas, preguntas y recursos; cambios admitidos de metadatos/plazos no reconstruyen contenido ni borran historia. Mantener material/archivo e identidades vinculadas.

## 7. Participación, recepción y plazos

El estudiante trabaja sobre su obligación e intento. TP permite comentario/adjuntos según consigna; cuestionario/evaluación respuestas por pregunta con autoguardado y confirmación visible. Ver consigna en TP abre instrucciones explícitamente y puede establecer contexto/intento; no asumir consulta sin efectos académicos sólo por el nombre de un botón.

Guardar o subir no entrega. Revisar entrega muestra respuestas/archivos; confirmar crea recepción y bloquea el intento. Preguntas vacías requieren advertencia de cantidad/cero puntos y confirmación de incompleta; cancelar conserva edición. Una actividad nunca entregada no se convierte en cero para promedios.

Recepción completa del servidor define plazo, no inicio de upload ni reloj de navegador. La primera confirmada fija a tiempo/tarde; los intentos posteriores conservan historia. Reentrega requiere habilitación docente, con plazo individual cuando corresponda.

Usar zona horaria del aula; huecos DST se rechazan y horas ambiguas requieren ocurrencia. Después del bloqueo no acortar/quitar plazo existente; extensión/permisividad no reescriben puntualidad previa. Actividad inicialmente sin fecha conserva esa condición según contrato.

Hay un único editor autorizado por intento. Transferir edición exige confirmación y rota capacidad/revisión sin crear otro intento; no traslada cambios locales no guardados. Consulta, propiedad de edición y entrega son capacidades distintas.

Las obligaciones se determinan por publicación/ingreso y reglas de elegibilidad, no por un polling que reclasifique desde el reloj actual. Reingreso conserva obligaciones y calificaciones; las actividades ya vencidas durante ausencia pueden requerir habilitación expresa para primera entrega.

## 8. Calificación, publicación y progreso

El docente corrige privadamente. Rúbrica orienta nota sugerida; Usar nota sugerida y editar nota final son decisiones independientes. Guardar no publica ni notifica. Publicar requiere confirmar la versión guardada y reemplaza la calificación efectiva, incluso si es menor.

El estudiante sólo ve resultados propios publicados, criterios/devolución autorizados y archivos entregados. No accede a propuestas IA, correcciones/auditoría privadas, claves de selección ni reglas privadas de puntuación. La proyección publicada sí conserva el cálculo y la rúbrica autorizados, incluidos suggestedGrade, finalGradeOverride y calculatedGrade; la UI no los presenta como una propuesta IA. Publicación y lectura revalidan estado y permisos.

Puntos disponibles positivos; cero ganado o nota final cero válidos. Entradas manuales admiten como máximo dos decimales. Conservar fracciones exactas y redondear half-up sólo al resultado/presentación final; no validar entradas redondeándolas. Notas numéricas0–10, sin umbral automático aprobado de aprobación/reprobación.

Rectificación publicada exige motivo y auditoría; no borra respuestas, recepción o historia. Reentrega publicada puede reemplazar la nota efectiva sin borrar anteriores.

Tres medidas independientes: cumplimiento de entregas, rendimiento y avance de temas. Promedio individual: igual peso de actividades con nota efectiva publicada. Promedio de clase: media de promedios individuales exactos de alumnos actuales con nota. Pendiente/privado/ausente se excluye, no es cero. No promediar cifras ya redondeadas ni mezclar intentos como actividades distintas. Sin denominador, informar ausencia.

## 9. Asistencias con IA

Las familias son extracción de plan, generación de actividad, análisis individual, corrección asistida, Foxy docente y Estudio privado. Cada familia conserva sus reglas de privacidad, contexto y autorización.

Análisis individual: métricas anónimas, orientación docente; no corrección de respuestas ni diagnóstico/predicción personal. Corrección asistida: entrega/archivos autorizados y rúbrica opcional; minimizar datos no garantiza texto libre anónimo. Propuesta privada, docente usa/edita/descarta y publica por separado; motor objetivo permanece determinista.

Foxy es privado del docente verificado, con contexto/fuentes explícitos. Conversación/recursos preparados no son material público. Texto/imagen/esquema necesitan destino, preparación, revisión y confirmación para Biblioteca. Traspaso actual a Actividades crea un TP privado. Fallo/cuota/obsolescencia no debe duplicar publicación ni sustituir cambios docentes.

En el lector privado de un visual listo, el docente puede guardar un título y un texto revisados, descargar ese contenido como TXT, descargar el archivo visual privado o iniciar una publicación a Biblioteca. Los esquemas ofrecen además un TXT con conceptos y relaciones. El archivo generado y las publicaciones anteriores se conservan. Cada nueva publicación requiere confirmar explícitamente la versión que se preparó.

La tarjeta Imágenes y esquemas permite iniciar un trabajo visual desde un chat nuevo. El botón Generar guarda la conversación en el contexto elegido y encola el visual. Los turnos de texto activan el procesador al confirmarse y se despachan cuando hay capacidad global y por docente. [Reglas de Foxy](engineering/ai/foxy.md)

Abrir una creación lista muestra primero su contenido. El docente puede descargar Word o el archivo visual privado sin compartirlo. El estudiante puede descargar apuntes y esquemas en Word y consignas de práctica en TXT sin respuestas ni soluciones. Materiales y Plan ofrecen apertura cuando el formato lo admite y descarga. Para recursos recientes, Creaciones → recurso → descarga son tres acciones; Compartir conserva preparación, revisión y confirmación.

Conversaciones admite título editable y búsqueda/filtro por contexto general o aula propia sobre el conjunto autorizado. Elegir aula prepara contexto sin IA antes del primer envío y cambiarlo inicia otra conversación. El widget alterna Herramientas/Creaciones; su catálogo privado reúne resultados listos de todas las conversaciones (excluye avisos de información insuficiente), buscables por título, tipo, contexto y estado, con apertura directa. Distingue contexto de origen y destinos efectivos: privado, preparación, borrador de actividad o publicado/asignado. Encontrar y abrir elementos comunes requiere hasta tres acciones de navegación; publicar conserva revisiones explícitas. Planificaciones y rúbricas son textos revisables, sin modificación automática del Plan o conversión automática a criterios estructurados.

Foxy docente y el espacio de estudio comparten una barra compacta de contexto, historial, herramientas, creaciones, biblioteca y Nuevo chat. Abrir esos paneles conserva el borrador. En un aula propia, el docente puede usar el contexto completo o acotar temas y fuentes. El servidor guarda la revisión y el conjunto autorizado para cada generación. Si excede las cuotas, solicita una selección menor. El mensaje saliente se muestra de inmediato; la bienvenida se retira y el historial conserva la posición de lectura. El chat acompaña mensajes y cambios de tamaño sólo si se estaba al final; permite volver explícitamente a mensajes nuevos. La carga distingue envío, cola y procesamiento. Detener registra la cancelación por dueño y descarta las respuestas tardías. El estado respeta movimiento reducido. Error estudiantil conserva la entrada; envío docente incierto conserva la solicitud para reintento explícito sin duplicación. Esto no agrega streaming al contrato ni publicación automática.

Configuración, presupuesto, límites y claves permanecen en backend. [Guías](engineering/ai/README.md) y [contrato de corrección](../odd/tasks/grading-ai-issue-2.md). El ensayo de esta base usa proveedores sintéticos; no hereda prueba externa de historia retirada.

## 10. Agenda

Carpetas de estudio puede proponer y, tras revisión explícita, crear sesiones personales de repaso con avisos privados configurables. La propuesta indica coincidencias con ocurrencias propias de Agenda. El evento de repaso lleva a la carpeta y al examen exactos. Un evento modificado independientemente no se sobrescribe; archivo/eliminación de carpeta cancela avisos y conserva eventos confirmados. [Reglas de estudio](engineering/study/README.md).

Los eventos personales son privados y admiten tipo, fecha, horario o día completo, color, notas y repetición. Al crearlos o editarlos se puede dejar Sin aviso o elegir uno al momento o 5, 15, 30, 60 o 1440 minutos antes. En un evento de día completo se toma la medianoche en la zona indicada. El aviso aparece en Notificaciones y abre la ocurrencia autorizada. Los eventos personales no asignan actividades ni cambian plazos o notas de aula.

Mes, Semana y Día conservan la fecha al cambiar de vista. Al elegir un día, Agenda muestra sus eventos en el panel lateral de escritorio o en un panel inferior en pantallas angostas. Crear desde ese panel usa la fecha elegida. [Diseño y límites](engineering/agenda/README.md)

Series diarias/semanales/mensuales con final y máximo 53 ocurrencias. La mensual conserva día original y omite meses sin ese día. Editar serie explicita alcance, incluidas fechas pasadas. Eliminar permite ocurrencia o serie; el modelo conserva excepciones. La evidencia actual ensayó repetición semanal y borrado de serie, no todas las variantes de calendario.

## 11. Validación y límites transversales

| Campo | Máximo |
|---|---|
| Nombre/apellido |80cada uno |
| Aula/materia/unidad/tema |120cada uno |
| División |60 |
| Título actividad/material |200 |
| Objetivo del editor manual |1400 |
| Comentario docente, feedback, cuerpo Muro/respuesta |5000 |
| Desarrollo de respuesta |20000 |

Rechazar errores, texto vacío requerido y exceso sin truncamiento silencioso. Los límites por contrato pueden ser más específicos que esta tabla; consultar validadores del dominio. No normalizar datos privados por una regla visual.

Carga, vacío, permisos, conflictos y errores tienen feedback y recuperación adecuados. Comprobar responsive, etiquetas, foco/teclado, contraste y movimiento según pantalla; no afirmar accesibilidad universal a partir de capturas.

## 12. Frontera vigente

Sin administración institucional, pagos, ranking, certificados, Google login, tutores estudiantiles generales fuera del contexto privado de Carpetas de estudio, cambio de rol/email o personalización fuera del catálogo de avatares aprobado. Rúbrica por criterios no autoriza ponderaciones globales por tipo de actividad o umbrales de aprobación.

Carpetas de estudio admite una estructura revisada con documento aprobado o una copia editable del plan de un aula vinculada. Cambiar el vínculo conserva el plan, los materiales propios y el historial. La biblioteca combina materiales privados con referencias vivas de una única aula autorizada, incluida la consulta de un aula archivada mientras la pertenencia siga vigente. Conversaciones, creaciones y prácticas permanecen privadas. La devolución es orientativa y usa evidencia de la propia carpeta. Revocar una fuente impide usarla en nuevas respuestas, incluso mediante historia derivada; conserva creaciones previas con aviso. No publica resultados académicos. [Contrato funcional aprobado](product/study-folders-proposal.md), [guía](engineering/study/README.md) y [evidencia con límites](verification/study-folders.json).

Crear carpeta sigue cuatro pasos con datos propios de Estudio y la misma estructura visual que Crear aula. Se eligen nombre, materia, año y portada; en El programa se elige un aula opcional y su plan o se carga un documento aprobado. Después se editan unidades y temas y se confirma la revisión. La copia del plan de un aula permite continuar sin otro archivo. Al elegir la ruta documental, el asistente requiere un archivo aprobado. Confirmar activa una carpeta privada. Guardar y salir conserva el paso y permite retomarla desde Borradores. Las carpetas anteriores sin materia o paso explícito siguen siendo compatibles. Renombrar una conversación propia conserva su contenido y requiere revisión e idempotencia.

Las propuestas de apunte, esquema, práctica y simulacro pueden quedar asociadas a una conversación propia. Al recargar, el chat recupera la indicación real, el estado confirmado y el recurso exacto creado. Cancelar conserva la solicitud sin aplicar respuestas tardías; un reintento terminal usa una identidad nueva y una entrega incierta reutiliza la identidad original. Las tarjetas no exponen claves de corrección ni inventan respuestas o etapas de procesamiento. La extracción del plan conserva su flujo de creación de carpeta.

Quitar material, eliminar carpeta y agregar repasos a Agenda requieren confirmación en un diálogo de FoxMind. Cancelar o pulsar Escape conserva el estado anterior. Eliminar una carpeta cancela sus avisos futuros y conserva las sesiones ya incorporadas a Agenda. [Guía de Estudio](engineering/study/README.md)

Hosting, proveedores cloud, presupuesto, cuota productiva y piloto real requieren decisión humana. Una guía o estado implementado no autoriza su ejecución sobre datos retenidos, credenciales o servicios pagos.

La [matriz de flujos](verification/flows.md) explicita PASS, alcance limitado y no ensayado. No es una certificación de seguridad/rendimiento o cobertura exhaustiva de todas las combinaciones.
