# Especificación funcional vigente de FoxMind

Base documental del 2026-11-07. Describe el alcance implementado y las reglas que deben conservarse, contrastadas con código y recorridos actuales. No concede permisos de implementación, publicación o despliegue. Las [funciones por rol](product/features-by-role.md), [guías de ingeniería](engineering/README.md) y [matriz de comprobaciones](verification/flows.md) detallan capacidades, implementación y evidencia respectivamente.

## 1. Cuenta, identidad y permisos

Cada cuenta selecciona un rol global exclusivo durante el registro: docente o estudiante. No se cambia desde perfil. El docente crea aulas propias sin aprobación administrativa; el estudiante ingresa a aulas mediante código/invitación. Propiedad y membresía son condiciones adicionales al rol. No hay co-docencia o transferencia de titularidad en este alcance.

Correo verificado es necesario para usar aulas y capacidades privadas. Quitar botones no sustituye autorización en servidor. Un alumno no puede consultar intentos/notas de un compañero ni operaciones administrativas; el docente no administra aulas ajenas.

Registro y recuperación responden genéricamente sin revelar existencia de cuenta. Aceptar una solicitud de correo no demuestra entrega, inicia sesión o inscribe. Login verificado ordinario lleva a Inicio; una continuación explícita permitida conserva validación. La verificación del enlace requiere confirmación y ofrece Ir a Inicio.

Contraseñas 16–128 puntos de código Unicode; nombres 1–80 cada uno. Sesión: 30 minutos de inactividad y 12 horas absolutas. Verificación 1 hora, recuperación 15 minutos, enlaces de un uso y mínimo 60 segundos de reenvío con controles de abuso. Cambiar contraseña conserva/renueva la sesión actual sin extender su vida absoluta y revoca otras; recuperar revoca anteriores sin login automático.

Dominios de correo deben venir en minúsculas; conservar local part válido, incluidos entrecomillados/internacionales, sin normalización silenciosa o reglas de alias de proveedores. [OpenAPI y políticas](api/accounts-sessions.openapi.json).

Mi perfil permite editar nombres y seleccionar Foxy clásico, lector, explorador o creativo, o conservar/restaurar iniciales. Seleccionar muestra vista previa; Guardar cambios persiste nombres y avatar para la cuenta, visible en perfil y Mi cuenta. Disponible para docentes y estudiantes verificados. Correo es sólo lectura. Configuración permite contraseña y cierre de sesión. No se infieren avatar subido, cambio de email, eliminación de cuenta, preferencias nuevas o cambio de rol.

## 2. Navegación y experiencia por rol

Brújula usa sidebar desde 1024 px y menú compacto en tamaños menores. Global: Inicio, Mis aulas, Agenda, avisos/búsqueda/Mi cuenta; Foxy pertenece al docente. Contadores Enseño/Estudio pueden aparecer como compatibilidad de proyección, sin selector de rol dual.

El estudiante dispone además de Carpetas de estudio: espacios privados propios con plan, materiales, Foxy estudiantil, prácticas y repasos. No concede acceso al espacio Foxy del docente.

Docente dentro del aula: Plan, Muro, Biblioteca, Actividades, Progreso, Alumnos, Historial, Configuración. Estudiante: Plan, Muro, Biblioteca, Actividades, Mi progreso, Compañeros.

Inicio docente prioriza entregas/consultas y acciones del aula; Inicio estudiante muestra pendientes y resultados publicados propios. Abrir avisos usa un destino reautorizado en servidor; identificadores de UI no conceden acceso. La búsqueda sólo muestra el espacio autorizado. [UX/UI vigente](design/README.md).

Seguimiento docente permite ordenar Entregas por recepción y Consultas por última actividad, en ambas direcciones y con elección independiente para todo el listado paginado. Aula en foco permite elegir un aula activa propia y revalida esa elección al actualizar. Cada acción del aula solicita su destino antes de continuar; ese destino no altera el foco. Las elecciones pertenecen a la vista, sin nueva preferencia persistente. [Reglas y recuperación](engineering/home/README.md#inicio-docente-orden-y-selección-de-aulas).

## 3. Aulas, borradores e ingreso

Crear aula tiene cuatro pasos:
1. Datos del aula: nombre, materia, división, ciclo lectivo, zona y portada predefinida.
2. Subir el documento del plan, esperar aprobación y elegir IA o manual; subir archivo no inicia IA.
3. Revisar/editar unidades y temas.
4. Revisión editable y Confirmar y crear aula.

Al confirmar se publica y vuelve a Mis aulas. Guardar borrador conserva una creación privada recuperable, sin crear aula visible a alumnos. El auxiliar manual de texto prepara estructura editable; no es una llamada al proveedor.

Aulas y Carpetas de estudio comparten presentación de cuatro pasos, selector de portadas y estados de colección. Conservan sus campos y reglas independientes. El plan se revisa mediante resumen de unidades/temas y unidades desplegables; la extracción IA mantiene feedback de espera y un único editor de propuesta antes de aplicarla. [Dirección UX/UI vigente](design/README.md#dirección-vigente-de-foxy-y-estudio).

Mis aulas docente separa Activas, Archivadas y Pendientes con contador. Cada borrador sin publicar aparece en Pendientes con banner automático «Pendiente de creación», incluso sin nombre. Permite continuar o eliminar con confirmación de pérdida de datos. Sólo el dueño puede eliminar; una revisión desactualizada o un borrador ya publicado impide la operación. La baja lógica retira el acceso y conserva referencias internas, sin restauración disponible. Las invitaciones permanecen separadas. Al confirmar creación, pasa a Activas.

El asistente exige documento PDF/DOCX aprobado en ambos métodos y al menos una unidad con un tema. La API admite currículos manuales completos sin archivo por compatibilidad; no convierte esa compatibilidad en un bypass de UI. Materia/división son texto libre; ciclo lectivo es año académico. Portada es predefinida, sin subida de imagen. La zona del aula queda fija tras crear.

Código: Ver aula presenta el destino y Confirmar inscripción incorpora/abre. Los nuevos códigos tienen seis dígitos, incluidos ceros iniciales, y siguen vigentes hasta regeneración. Se aceptan códigos anteriores hasta que el docente los regenere; una reserva fallida conserva el vigente. La revocación no permite reutilización histórica. Un error conserva formulario con respuesta genérica. Invitación: correo/cuenta correspondiente y aceptación explícita; vigencia7días. El docente puede invitar hasta 50 destinatarios únicos por lote recuperable, con resultados individuales y reintento sin duplicar emisiones confirmadas. Entregar correo o abrir un enlace no confirma membresía. [Contrato, protección y límites](engineering/classrooms/README.md).

Salida voluntaria o remoción revoca acceso actual, conserva registros y requiere invitación nueva para reingresar. Código no readmite a quien salió/fue removido. El docente ve historia de exalumnos separada de alumnos actuales; reingreso no duplica obligaciones por períodos anteriores.

Archivar conserva datos y bloquea inscripciones/mutaciones académicas; mantiene consulta autorizada. El estudiante puede confirmar salida aún archivada. Reactivar no borra historia ni extiende plazos; readmitir exige invitación nueva. No hay eliminación permanente del aula.

## 4. Plan, materiales y conversaciones

Plan organiza unidades/temas y recursos asociados. El docente marca dado/pendiente y puede deshacer; el estudiante consulta. Estados internos PENDING/NEXT/TAUGHT no prometen botones o reestructuración del plan publicado que la UI actual no expone.

Biblioteca admite archivos aprobados y recursos escritos. Ambos tienen título, organización unidad/tema y uso estudio/recomendado/complementario. TEXT genera DOCX validado/escaneado; revisar título/cuerpo crea material y archivo nuevos, conservando identidad anterior y vínculos guardados. FILE mantiene bytes inmutables. Cambiar sólo organización/uso no reemplaza contenido.

La colección oculta versiones reemplazadas. Eliminar exige confirmación, ausencia de vínculos/compartición impeditivos y borrado confirmado de bytes para liberar espacio. El estudiante lee y descarga recursos disponibles; no administra materiales.

Muro: avisos docentes, consultas estudiantiles y respuestas autorizadas. Son conversaciones de aula, no mensajería privada. Autoría/moderación controlan editar/eliminar y conservación; archivo de aula restringe mutaciones. Avisos y consultas alimentan Inicio/notificaciones.

## 5. Archivos, límites y conservación

Planes e instrucciones: PDF/DOCX hasta20MB. Materiales y adjuntos: PDF, DOCX, PPTX, XLSX, JPG/JPEG, PNG o ZIP, hasta 50 MB por archivo según propósito. Un TP admite hasta cinco adjuntos y espacio disponible; no imponer otro cap agregado que anule esa regla.

Los chats privados de Foxy docente y Carpetas de estudio admiten hasta seis PDF/DOCX aprobados y 20 MB totales por conversación. Sólo el dueño puede adjuntarlos o quitarlos. El estudiante puede optar por guardarlos además como material de la carpeta; un chat nuevo no hereda adjuntos privados. Las reglas de archivos de aula y de TP se mantienen independientes.

Selección local, subida, aprobación y asociación son estados distintos. Publicar/entregar requiere validación estructural y escaneo limpio de los mismos bytes. Un archivo no listo/cuarentenado no puede descargarse o vincularse como aprobado.

PDF e imágenes pueden ofrecer vista previa del navegador; Office/ZIP son descarga. Ambas rutas requieren permiso actual. No hay bucket público, enlace presigned de usuario o claves de almacenamiento en cliente.

Cupo por aula es configurable y suma planes, materiales, borradores confirmados e historia de intentos. Cupo agotado bloquea cargas nuevas, no borra historia ni deniega consulta autorizada. La cifra productiva queda pendiente de presupuesto/hosting.

Sólo uploads incompletos abandonados pueden limpiarse tras 24 horas de inactividad. No expirar adjuntos de borradores confirmados o historia con ese mecanismo. Quitar del borrador no libera automáticamente bytes.

## 6. Actividades: autoría y compatibilidad

Tipos: TP, cuestionario y evaluación. Los dos últimos admiten desarrollo, selección simple y múltiple. Opciones: al menos dos; simple una correcta; múltiple al menos dos correctas y regla EXACT/PARTIAL admitida.

Manual tiene dos etapas: Preparar actividad → Revisar y asignar. El editor actual exige tipo, unidad/temas, título, objetivo, consignas y rúbrica válida con pesos enteros que suman100%; preguntas cuando corresponda. Permite comentario, materiales y plazo/configuración de entrega. Guardar borrador no asigna; Asignar al aula es explícito.

La generación IA configura tres pasos, propone contenido editable y sólo crea un borrador privado al aplicar. Claves/puntos y evidencia se revisan antes de asignar. No publica notas ni soluciones automáticamente.

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

Familias actuales: extracción de plan, generación de actividad, análisis individual, corrección asistida y Foxy. No compartir reglas de privacidad sólo por compartir proveedor.

Análisis individual: métricas anónimas, orientación docente; no corrección de respuestas ni diagnóstico/predicción personal. Corrección asistida: entrega/archivos autorizados y rúbrica opcional; minimizar datos no garantiza texto libre anónimo. Propuesta privada, docente usa/edita/descarta y publica por separado; motor objetivo permanece determinista.

Foxy es privado del docente verificado, con contexto/fuentes explícitos. Conversación/recursos preparados no son material público. Texto/imagen/esquema necesitan destino, preparación, revisión y confirmación para Biblioteca. Traspaso actual a Actividades crea un TP privado. Fallo/cuota/obsolescencia no debe duplicar publicación ni sustituir cambios docentes.

Conversaciones admite título editable y búsqueda/filtro por contexto general o aula propia sobre el conjunto autorizado. Elegir aula prepara contexto sin IA antes del primer envío y cambiarlo inicia otra conversación. El widget alterna Herramientas/Creaciones; su catálogo privado reúne resultados listos de todas las conversaciones (excluye avisos de información insuficiente), buscables por título, tipo, contexto y estado, con apertura directa. Distingue contexto de origen y destinos efectivos: privado, preparación, borrador de actividad o publicado/asignado. Encontrar y abrir elementos comunes requiere hasta tres acciones de navegación; publicar conserva revisiones explícitas. Planificaciones y rúbricas son textos revisables, sin modificación automática del Plan o conversión automática a criterios estructurados.

Foxy docente y el espacio de estudio comparten presentación de herramientas y espera. El mensaje saliente se muestra de inmediato; la bienvenida se retira y el historial conserva la posición de lectura. El chat acompaña mensajes y cambios de tamaño sólo si se estaba al final; permite volver explícitamente a mensajes nuevos. La carga distingue operación/cola/procesamiento, respeta movimiento reducido y no simula una respuesta parcial. Error estudiantil conserva la entrada; envío docente incierto conserva la solicitud para reintento explícito sin duplicación. Esto no agrega streaming al contrato ni publicación automática.

Configuración, presupuesto, límites y claves permanecen en backend. [Guías](engineering/ai/README.md) y [contrato de corrección](../odd/tasks/grading-ai-issue-2.md). El ensayo de esta base usa proveedores sintéticos; no hereda prueba externa de historia retirada.

## 10. Agenda

Carpetas de estudio puede proponer y, tras revisión explícita, crear sesiones personales de repaso con avisos privados configurables. Un evento modificado independientemente no se sobrescribe; archivo/eliminación de carpeta cancela avisos y conserva eventos confirmados. [Reglas de estudio](engineering/study/README.md).

Eventos personales privados, consultables en mes/semana/día, con tipo, fecha, horario o día completo, color, notas y repetición. No asignan actividades ni cambian plazos/notas de aula.

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

Carpetas de estudio agrega creación con documento aprobado y estructura revisada, materiales propios y vínculo opcional a una sola Biblioteca autorizada, conversaciones/creaciones privadas, quizzes/ejercicios/simulacros respondibles, devolución orientativa y adaptación por evidencia de la propia carpeta. Revocar una fuente impide usarla en nuevas respuestas, incluso mediante historia derivada; conserva creaciones previas con aviso. No publica resultados académicos. [Contrato funcional aprobado](product/study-folders-proposal.md), [guía](engineering/study/README.md) y [evidencia con límites](verification/study-folders.json).

Hosting, proveedores cloud, presupuesto, cuota productiva y piloto real requieren decisión humana. Una guía o estado implementado no autoriza su ejecución sobre datos retenidos, credenciales o servicios pagos.

La [matriz de flujos](verification/flows.md) explicita PASS, alcance limitado y no ensayado. No es una certificación de seguridad/rendimiento o cobertura exhaustiva de todas las combinaciones.
