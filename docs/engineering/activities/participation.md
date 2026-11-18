# Resolver, guardar y confirmar una entrega

El estudiante accede sólo a sus actividades e intentos autorizados. TP admite comentario/archivos según consigna; cuestionario y evaluación usan respuestas de desarrollo, selección simple o múltiple.

## Recorrido actual

Abrir actividad permite consultar su ficha. En TP, Ver consigna abre las instrucciones explícitamente en el mismo espacio; puede establecer el intento/contexto de participación. Preparar entrega o Continuar borrador abre edición. Cuestionario y evaluación se abren con Empezar actividad.

La ficha muestra el plazo aplicable en la zona horaria del aula y si se aceptan entregas tardías. El docente habilita la primera entrega desde la ficha de una actividad publicada. Si habilita otro intento desde una entrega recibida, la fila indica que la reentrega sigue pendiente hasta que el estudiante confirme su envío.

El cuestionario y la evaluación muestran una pregunta a la vez, permiten navegar entre preguntas y muestran cuántas están respondidas. Las respuestas muestran autoguardado y confirmación. Consigna y criterios, y Materiales, se consultan desde la sesión sin perder la pregunta actual. En TP, seleccionar archivo es local; Subir archivo privado valida/escanea y confirma el adjunto del borrador. Hasta cinco archivos sujetos al cupo del aula. PDF, Word y PowerPoint admiten hasta 20 MB por archivo. XLSX, JPG, PNG y ZIP admiten hasta 50 MB por archivo. Un archivo confirmado no es una entrega.

Revisar entrega muestra qué se enviará. Las preguntas vacías se advierten con su cantidad y cero puntos; el estudiante puede volver a editar o confirmar incompleta. Sólo la confirmación crea recepción inmutable y bloquea el intento.

El borrador permanece montado al alternar pestañas del aula para consultar materiales o el Muro. Si falla el guardado de respuestas, Reintentar guardado conserva abierta la pregunta al confirmar el borrador. Guardar y salir permite volver a las actividades. Salir del editor pide decisión si quedan cambios locales o archivos seleccionados sin subir. La revisión permite recorrer las respuestas o consultar los adjuntos y la respuesta escrita, con regreso a edición y una confirmación final. Escape cierra la revisión y devuelve el foco a la edición. Abrir la ficha permite consultar la actividad antes de iniciar un intento.

## Recepción e historial

La recepción completa del servidor determina puntualidad, no el inicio de la carga ni el reloj del navegador. La primera entrega confirmada define a tiempo/tarde; reentregas conservan historia y requieren habilitación docente. El comprobante muestra la fecha de recepción en la zona del aula, el número de intento, el contenido y el plazo aplicado. Sigue disponible en el historial después de publicarse la devolución. Guardar no publica calificaciones.

Los intentos usan un único editor con capacidad/revisión; transferir edición requiere confirmación y no transporta cambios no guardados. Confirmados, adjuntos y respuestas se recuperan según sus permisos. No prometer recuperación de cambios locales o de la capacidad tras cerrar/recargar.

La consulta histórica y las notas publicadas están separadas de correcciones privadas. Salida/remoción revoca acceso del alumno sin destruir historia docente; una invitación nueva permite readmisión conforme al aula.

Fuentes: [sesión de intento](../../../apps/web/src/application/workflows/activity-session/AttemptSession.tsx), [historial](../../../apps/web/src/application/workflows/activity-session/AttemptHistory.tsx), [servicios](../../../apps/api/src/modules/participation/). [Evidencia actual](../../verification/flows.md).
