# Prácticas y revisión docente en las generaciones reales
- Rol: implementación de prácticas, simulacros y revisión de actividad.
- Base: main, 4d057490, worktree principal.
- Alcance: aplicar el flujo aprobado. Las prácticas son privadas. El quiz libera cada clave al confirmar y el simulacro la libera al finalizar.

## Cambios
- Mi Estudio muestra progreso, revisión y devolución por pregunta, y permite volver a los intentos completados de la misma práctica. El quiz guía la confirmación por consigna. El simulacro guarda el resultado completo al finalizar. Se retiró el TXT del lector.
- Foxy AI distingue trabajo práctico y quiz en Crear una actividad. El quiz usa una respuesta estructurada de Gemini validada por cantidad, opciones y clave única, y guarda la devolución de cada opción. El lector docente puede editar consignas, simular una respuesta y preparar el cuestionario en Actividades como borrador privado. Biblioteca rechaza la preparación de ese contenido con clave.
- La confirmación guarda la selección y la devolución revelada a través del mismo contrato privado de Mi Estudio. Las respuestas confirmadas no admiten cambios durante el intento. Los cuestionarios, simulacros y actividades ya guardados conservan sus rutas de lectura.

## Evidencia
- Las pruebas `study-exact-practice.test.mjs`, `study-practice-results.test.mjs` y `conversation-generation.test.ts` pasaron 25 casos, incluido el caso RED/GREEN que confirma el aislamiento de claves entre preguntas.
- `foxy-text-adapter.test.mjs` pasó 19 casos. La prueba de traspaso de quiz pasó 2 casos, con repetición idempotente y rechazo de un recurso incompatible.
- Gemini real, Fotografía. Foxy generó un quiz de dos preguntas en aproximadamente 14,4 s, creó un borrador privado idempotente y devolvió 403 al estudiante. Mi Estudio generó una práctica en 17 s y un simulacro con devolución orientativa completa en 28 s. La prueba verificó claves reservadas y lectura posterior.
- Ego Lite, espacio de QA 14. Capturas de la maqueta de Lucía y Marina en `.test-artifacts/qa-generations-practice/` muestran el pedido, lector docente y confirmación de respuesta estudiantil.
- Gemini real, Biología. Trabajo práctico con objetivo, consignas, entrega y criterio en 8,8 s. Quiz docente contextualizado a fuentes del aula en 17,4 s, con borrador privado de dos preguntas y comprobación del acceso denegado a un estudiante. Simulacro con dos consignas más devolución orientativa completa en 34,6 s. Otro trabajo práctico sobre contraste de luminosidad pasó con las cuatro secciones en 9,8 s.
- Ego Lite verificó el recorrido docente de mitosis hasta revisar opciones y distractores con resultados reales, editar y guardar una consigna y simular la vista del estudiante. Ese primer ensayo abrió en un diálogo. Después de compararlo con la maqueta, el lector docente se integró al chat con portada, barra de herramientas y Volver al chat.
- Ego Lite verificó que el formulario de práctica usa la fuente de Biología y muestra el rechazo diario de la cuenta original sin crear recurso. El límite se aplicó antes de enviar al proveedor.
- Ego Lite con Gemini, quiz de Mitosis. El actor sintético colaborativo con saldo disponible usó la carpeta y el PDF de pruebas. Se generaron dos preguntas desde Herramientas, se confirmó una respuesta y se mostró el mensaje específico del modelo. La selección quedó bloqueada, el progreso quedó en 1 y el resultado reapareció al recargar. La siguiente pregunta conservó su clave hasta la confirmación. Finalizar registró el resultado y Reintentar inició otro intento sin exponer claves previas. En 390 px el ancho visible y de contenido midieron 375 px.
- Ego Lite reabrió el simulacro de Biología y mostró los dos resultados y la orientación de Gemini en escritorio y a 390 px. La pantalla conservó la devolución después de reiniciar la app.
- Tras la comparación visual, el quiz de Mi Estudio se integró al panel del chat. Ejercicios y simulacros conservan el recorrido de foco. `frontend-study-cases.test.mjs` y `study-exact-practice.test.mjs` pasaron 11 casos, incluido el lector inline y la selección del ID exacto devuelto por el nuevo intento.
- La guía técnica de Foxy y Mi Estudio documenta las claves por pregunta, el traspaso privado a Actividades y la relectura de intentos. `npm run docs:check` comprobó 239 archivos y 1052 vínculos con cero errores. Los límites de arquitectura frontend y AST pasaron.
- Ego Lite reabrió el quiz inline de Mitosis en cada rol desde su creación guardada. En escritorio conservó la barra de Foxy. A 390 px el contenido no desbordó. Ver apunte abrió un PDF autorizado, con HTTP 200 y MIME PDF en ambos contextos. El botón Volver al chat recuperó la conversación.
- Con el build final se volvieron a abrir los quizzes guardados a 390 px. En los dos roles, el borde superior de Ver apunte quedó 10 px debajo del título, dentro de la portada. El lector midió 361 px de ancho visible y de contenido. Las capturas son `qa-final-quiz-docente-390.png` y `qa-final-quiz-estudiante-390.png` en el directorio de QA indicado arriba. La reapertura usó los recursos existentes.

## Límites
- Las devoluciones por opción del cuestionario docente se conservan en Foxy. El traspaso a Actividades usa su contrato vigente de preguntas, opciones y clave. La comprobación de desarrollo con Gemini cubrió simulacros. No se probó una generación aparte con Crear ejercicios.
- Las preguntas ensayadas usaron fuentes PDF. Ningún pedido creó una imagen propia de pregunta. La maqueta de mitosis usaba una ilustración de ejemplo fija.

## Crear ejercicios con el caso sintético existente

`node .test-artifacts/qa-generations-practice/exercise-qa.mjs --preflight` pasó en la aplicación local. El comando leyó la sesión de estudiante y su carpeta activa de Mitosis, encontró los temas Metafase y Anafase, el PDF autorizado y una conversación vigente. Validó la forma de un pedido EXERCISE de dos preguntas de dificultad intermedia. La segunda lectura observó la misma revisión, las mismas prácticas y el mismo número de turnos. Se hicieron cero escrituras y cero despachos a Gemini.

Con cupo renovado y autorización vigente, `node .test-artifacts/qa-generations-practice/exercise-qa.mjs --live` envía una sola solicitud de generación. Usa el identificador de solicitud para leer el resultado guardado y comprueba que el chat enlace un ejercicio activo con dos consignas de desarrollo fundamentadas en la revisión del PDF elegido. Comprueba que la respuesta de lectura reserve explicaciones y claves. El comando guarda su recibo por identificador en el directorio ignorado de QA para investigar una respuesta incierta. La sesión usada pertenece al estudiante sintético colaborativo de la misma carpeta.

## Devolución por opción en quizzes nuevos

El contrato de salida de Gemini pide el campo para todas las preguntas del quiz. El adaptador comprueba una devolución no vacía para cada opción y una lista vacía en desarrollo antes de devolver el resultado al motor. La validación vive en el adaptador de producción que recibe el propósito del motor. Las prácticas guardadas y los proveedores inyectados conservan la compatibilidad con la explicación general.

La prueba del adaptador con el transporte Gemini simulado falló inicialmente por aceptar un quiz sin devoluciones y por omitir el campo de los requisitos del esquema. Pasaron los 30 casos de esquema, generación en conversación y lector después del cambio. Cubren la correspondencia entre opciones y devoluciones, el rechazo de campos incompletos, ejercicios y simulacros con explicación general, y el reintento de un quiz anterior sin generar otra vez. El ensayo no realizó solicitudes a Gemini.
