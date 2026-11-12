# Estudio privado del estudiante

Carpetas de estudio es una capacidad independiente de las aulas docentes, aprobada el 2026-11-08. La [especificación aprobada](../../product/study-folders-proposal.md) define reglas y UX; la [tarea](../../../odd/tasks/study-folders.md) y la [evidencia](../../verification/study-folders.json) distinguen implementación y comprobaciones.

## Crear y estudiar

Rutas `/carpetas-de-estudio` y `/carpetas-de-estudio/[id]`, exclusivas de estudiantes verificados y del dueño. Colección con banners predefinidos, búsqueda, año, vínculo y Activas/Archivadas/Pendientes. Crear reúne nombre/año/banner/plan PDF-DOCX aprobado, organización IA o manual, unidades/temas y revisión. El borrador admite datos incompletos; activar exige documento y estructura válida. Subir no dispara IA.

Chat, conversaciones, Herramientas/Creaciones y Materiales/Plan conservan el estilo Foxy. Apuntes y esquemas son recursos textuales editables, sin generación de imágenes. Quizzes, ejercicios y simulacros se responden dentro de FoxMind; no modifican notas o entregas del aula. Selección se corrige de forma determinista; desarrollo recibe devolución IA orientativa. Finalizar conserva respuestas; otro intento no sobrescribe el anterior. Soluciones y explicaciones privadas quedan fuera del intento activo. Un fallo de devolución permite reintentar.

Desde Creaciones se pueden leer apuntes y esquemas y descargar su versión guardada en Word. Las prácticas ofrecen un TXT con consignas y opciones; no incluye respuestas, soluciones ni devolución, y descargar no finaliza el intento. Todos estos recursos permanecen privados.

Quitar un material propio, eliminar una carpeta y agregar sesiones a Agenda abren un diálogo de confirmación de FoxMind. Cancelar queda enfocado al abrir. Cancelar o Escape vuelve al control que abrió el diálogo y conserva la vista anterior. La acción confirmada bloquea envíos repetidos mientras guarda. [Capturas de Estudio](../../design/current/README.md#foxy-y-carpetas-de-estudio) · [Pruebas de confirmación](../../work-log/2026-11-12-root-study-confirmations.md)

La devolución envía consignas y respuestas de desarrollo completas como datos separados del mensaje de chat y de las fuentes académicas. Conserva el máximo de 20.000 caracteres por respuesta; el chat mantiene su límite de 5.000 puntos de código. El contenido completo, incluidas las respuestas y las fuentes, cuenta dentro del presupuesto contextual de 350.000 caracteres serializados: excederlo rechaza la solicitud antes del proveedor, sin truncar respuestas. La devolución revalida fuentes y salida; un fallo conserva las respuestas para reintentar.

La adaptación usa evidencia de preguntas practicadas/errores por tema de esta carpeta, sin diagnósticos ni mezcla entre alumnos/carpetas. El motor valida referencias exactas, entrada e historial. Insuficiencia de fuentes no produce una creación completa. Se guarda la conversación, pero se contextualizan sólo turnos recientes con procedencia autorizada.

Preferencias por carpeta: dificultad, cantidad de preguntas, temas aún existentes y última herramienta se conservan tras una generación completa y se restauran al retomar. Finalizar una práctica conserva esas preferencias al actualizar la evidencia. Pedir una práctica sin temas se bloquea en UI, comando y motor antes de reservar o gastar IA.

## Experiencia de chat, herramientas y plan

La presentación comparte con Foxy docente las tarjetas de herramientas y el seguimiento de mensajes. El envío pendiente se muestra de inmediato, bloquea duplicados y conserva el texto ante fallo. El chat acompaña el final sólo mientras se está leyendo allí; el indicador de mensajes nuevos permite volver explícitamente. La colección usa el mismo selector de estados que Aulas. El asistente comparte diálogo, pasos y portadas; distingue subida, análisis y guardado, bloquea navegación durante upload y resume el plan por unidades desplegables. No cambia comandos, persistencia, proveedores ni reglas de activación. [Evidencia del pulido UX](../../verification/foxy-study-ux-polish.json).

La bienvenida cede lugar al primer envío. Enter envía; Shift + Enter agrega una línea y la composición IME se conserva. Cambiar el alto del chat acompaña el final sólo si se lo estaba siguiendo. Las fuentes se abren desde un desplegable secundario, sin UUIDs de versión en el texto principal.

En móvil, herramientas/creaciones/conversaciones se mantienen en una fila y el campo con Enviar queda visible en el viewport de 390×844 comprobado. Crear carpeta comparte con Crear aula el diálogo con scroll interno, los pasos, la carga por selección o arrastre, las tarjetas de método, el editor y el resumen. El archivo aprobado se exige en Cargar plan, después de completar datos y portada. Guardar borrador conserva datos y archivo asociado; volver desde Pendientes consulta su estado. El método IA sólo se ejecuta al solicitarlo, permite revisar unidades y, si falla, reintentar o seguir manualmente. La colección queda detrás del diálogo para devolver el foco al disparador.

Agregar sesiones a Agenda, quitar un material y eliminar una carpeta abren el diálogo de confirmación de FoxMind. La acción se envía al confirmar. Cancelar y Escape dejan abierta la vista anterior y devuelven el foco al control que abrió el diálogo. Una solicitud en curso bloquea otro envío. [Comprobación en navegador](../../work-log/2026-11-12-root-study-confirmations.md).

[Chat escritorio](../../design/current/ux-study-chat-desktop.png) · [móvil](../../design/current/ux-study-chat-mobile.png) · [herramientas](../../design/current/ux-study-tools-mobile.png) · [plan en espera](../../design/current/ux-plan-loading-mobile.png) · [revisión](../../design/current/ux-plan-review-mobile.png). Las dos últimas referencias usan respuestas sintéticas en componentes reales; no acreditan una nueva generación Gemini ni persistencia.

## Materiales y autoridad

El panel Materiales y Plan separa consulta de materiales, unidades y configuración. Materiales permite filtrar por título y procedencia y distingue disponibilidad para Foxy. Agregar material usa la subida privada existente y permite reintentar la asociación del archivo aprobado a la carpeta. En Plan, Estudiar selecciona el tema y prepara el borrador en el chat.

Adjuntar en el chat incorpora PDF/DOCX aprobados sólo a esa conversación. El estudiante puede elegir «Guardar también en esta carpeta», inicialmente desmarcado; ese material pasa a la colección privada y se puede usar en otros chats de la carpeta. Ambas referencias comparten los bytes aprobados y Foxy evita duplicar el mismo documento en el contexto. Quitar del chat conserva el material guardado. Sin esa elección, el archivo no aparece en Materiales. Adjuntar no publica en el aula ni modifica el plan.

Planes PDF/DOCX hasta 20.000.000 bytes; materiales propios PDF/DOCX/PPTX/XLSX/JPG/JPEG/PNG/ZIP hasta 50.000.000 bytes. PDF e imágenes compatibles se abren en el navegador. En Materiales y Plan, abrir un DOCX propio o de un aula vinculada muestra una vista previa de texto dentro de FoxMind. El original descargado conserva el formato y las imágenes. Desde la carpeta se llega a cada acción en tres pasos, abriendo el panel, la fila o pestaña del plan y la acción. Otros formatos mantienen la descarga como alternativa.

Abrir y descargar revalidan el acceso. La vista previa DOCX comprueba el tamaño y digest del archivo aprobado y la disponibilidad de la fuente antes y después de la extracción. Lee sólo el XML principal en un worker acotado y muestra el texto sin interpretar marcado ni resolver recursos externos. El límite de la vista previa es de 200.000 puntos de código. Transferencia, validación y escaneo deben corresponder al mismo digest. La extracción IA actual lee PDF/DOCX y cuerpos escritos de Biblioteca; otros formatos se conservan descargables y se identifican como no extraíbles.

El estudiante edita título/temas o quita sus materiales; no administra Biblioteca docente. Una carpeta puede vincular una sola aula con pertenencia vigente. Biblioteca aporta referencias vivas a las versiones disponibles, sin copiar bytes a propiedad estudiantil ni importar notas/compañeros/entregas/plan docente. La lista se consulta nuevamente y se revalida antes de enviar contenido al proveedor y al aplicar el resultado. Aula archivada mantiene consulta autorizada; salir/remover/desvincular revoca contexto.

El contexto admite hasta veinte fuentes candidatas legibles y los límites de documentos/tokens del motor. Superar ese presupuesto informa AI_INPUT_LIMIT antes de generar; no trunca silenciosamente la Biblioteca ni promete selección individual de fuentes o recuperación semántica que esta versión no expone.

Fuentes retiradas no se descargan ni alimentan nuevas respuestas mediante historia/caché. Creaciones anteriores permanecen privadas con aviso. Revisar material no reescribe intentos previos. Quitar materiales no promete liberar bytes de custodia automáticamente; las cuotas también cuentan archivos conservados.

## Examen, Agenda y avisos

Fecha/zona, temas y disponibilidad producen sesiones editables con advertencias de tiempo insuficiente/solapamiento. El estudiante confirma qué incorporar a Agenda. La zona elegida gobierna la conversión; horas inexistentes/ambiguas se rechazan. Confirmar es idempotente por sesión. Editar desde Agenda invalida el aviso anterior y no permite sobrescribir esa revisión silenciosamente.

Avisos dentro de FoxMind: sin aviso, al comenzar, 15 minutos, 1 hora o 1 día antes. Procesamiento durable cada 30 segundos y al consultar Notificaciones, una sola emisión, con evento/revisión vigentes, carpeta activa y sesión sin terminar. Con app cerrada quedan disponibles al volver; no son push, correo ni SMS. Archivar/eliminar carpeta cancela avisos y conserva eventos ya confirmados. Baja lógica confirmada, sin promesa de purga física.

## Contratos y operación

API `/api/v1/study-folders`: colección/creación, detalle/edición con revisión, `commands`, `uploads`/descarga privada, `reminders`/lectura. `GET /:folderId/docx-preview/:sourceId` devuelve el texto del DOCX asociado y disponible. UUIDs y comandos cerrados; sesión/propiedad revalidadas en transacción; escrituras con Origin/CSRF/admisión. Respuestas privadas `no-store`, proxy con rutas/métodos/tamaños/formatos limitados.

PostgreSQL conserva estado versionado, recibos idempotentes, cargas privadas, sesiones de Agenda y admisión IA. Generación reserva duraderamente, sale de la transacción, revalida antes de contar tokens/generar y antes de aplicar. Un pendiente interrumpido no se reenvía automáticamente; tras diez minutos se presenta fallido y requiere nuevo intento explícito. No equivale a una cola con reejecución automática.

El estado serializado de una carpeta tiene un presupuesto operacional de 3.000.000 bytes UTF-8 incluidos los recibos. Excederlo rechaza la mutación con QUOTA_EXCEEDED y conserva el estado legible; no trunca creaciones. La colección devuelve resúmenes y el detalle se obtiene al abrir. La ventana contextual puede omitir o recortar explícitamente turnos extensos; el historial guardado permanece íntegro. Estos controles protegen el contrato HTTP y no definen una cuota comercial.

Gemini usa configuración backend autorizada. El preflight de Developer API cuenta las instrucciones como contenido adicional: el SDK no admite `config.systemInstruction` en `countTokens`; la generación conserva su instrucción de sistema. La prueba de integración ejecuta el serializador del SDK instalado con transporte sintético para cubrir esta compatibilidad. `STUDY_STORAGE_QUOTA_BYTES` configura espacio por estudiante; default local de implementación 250.000.000 bytes, sin cuota productiva aprobada. Presupuesto/admisión comparten `ai_usage_daily` con otras familias; resultado externo desconocido consume conservadoramente la reserva. No se expone la clave.

Fuentes: [servicio](../../../apps/api/src/modules/study/application/service.ts), [motor](../../../src/core/domain/study/engine.ts), [archivos](../../../apps/api/src/bootstrap/study-file-integration.ts), [Agenda](../../../apps/api/src/bootstrap/study-agenda-integration.ts), [avisos](../../../apps/api/src/modules/study/infrastructure/folders/reminders/runtime.ts), [UI](../../../apps/web/src/screens/study-screen.tsx). `npm run test:study` construye y ejecuta las suites admitidas; el recibo distingue proveedor sintético y real.
