# Esquemas interactivos e imágenes con Gemini

Fecha 2026-11-19. Agente maps, rama main, worktree principal, revisión inicial 4d057490. Identidad de sesión sin publicar.

Alcance autorizado en la etapa de recursos visuales. Persistir el esquema creado por Gemini en Mi Estudio y Foxy docente y dar un lector interactivo común. Preservar recursos históricos y la publicación privada a Biblioteca. La maqueta vigente es la referencia del lector.

## Cambios y evidencia local

- Gemini docente usa el perfil de esquemas V3 para obtener el grafo interactivo V2. Los perfiles previos y los esquemas guardados conservan lectura. El estudiante conserva sus fuentes, chat y Creaciones, con salida estructurada de Conectar ideas y texto histórico como respaldo.
- El lector común muestra conceptos, flechas, detalle y pregunta. Docente puede proyectar y abrir el archivo visual. Los lectores abren la preparación de otra versión con el pedido conservado. El lector estudiante enlaza los materiales de carpeta citados que siguen disponibles y reutiliza la vista previa DOCX y las rutas existentes.
- Los conteos de las comparaciones de aperturas se conservan en el perfil V5. Gemini redacta la leyenda con una salida textual y FoxMind liquida su consumo y usa el mismo PNG que en V4.
- Pasaron 105 pruebas focalizadas de validación, adaptadores, persistencia, worker y lectores. Pasaron los chequeos de tipos API/web. El test de interacción del lector valida cambios en el detalle y el estado de la pregunta.
- Apuntes de QA visual en Ego Lite espacio 14, página p3. La maqueta usa una portada durazno, botones de conceptos y flechas, un detalle verde y un bloque de pregunta. Las primeras capturas reales confirmaron esa estructura e identificaron el ancho reducido y palabras cortadas en flechas. Se amplió el lector y se ajustó la cascada de sus controles. Los diagramas generados muestran conceptos y relaciones para cualquier tema.
- Con Gemini real, se abrió un esquema docente con tres conceptos y dos flechas sobre la luz. Se comprobó selección de flecha, explicación, pregunta, proyección con cierre por Escape y acceso desde Creaciones. Se abrió una ilustración docente de 1024 × 1024 con acceso a descarga privada. Las capturas están en el directorio local ignorado `.test-artifacts/gemini-visual-parity/`.
- El primer pedido de estudiante coincidió con otra generación y devolvió AI_BUSY. El reintento usó Gemini y devolvió AI_UNAVAILABLE. Se redujo el esquema de respuesta OUTLINE para quitar estructuras ajenas. Una comprobación por API del candidato siguiente quedó pendiente por el límite de solicitudes de autenticación. Queda probar el OUTLINE actualizado y la leyenda V5 con Gemini desde la aplicación.

## Muestreo real posterior

La versión reducida del esquema de respuesta completó un OUTLINE de Gemini sobre mitosis. La carpeta devolvió el esquema V2 tras reconsultar con cuatro conceptos y tres relaciones. En Ego Lite se abrió desde el chat, se seleccionó Metafase y la flecha hacia Anafase, se mostró la explicación específica y se reveló la respuesta. El recurso volvió a abrir desde Creaciones. En móvil de 390 px, el panel midió 358 px y el carrusel quedó dentro de sus límites. Una segunda creación produjo una ilustración de 1024 × 1024 y volvió a abrirse con su descarga autorizada.

La captura móvil reveló que algunas etiquetas largas ocupaban demasiado alto. Se ajustó su presentación a dos líneas y el pedido a Gemini pide flechas de hasta cuatro palabras. La explicación y la etiqueta íntegra siguen disponibles al seleccionar el vínculo.

La inspección visual de estudiante está registrada en `estudiante-esquema-mitosis-gemini.png`, `estudiante-esquema-mitosis-390.png` y `estudiante-imagen-gemini.png`. Queda capturar la revisión final de los lectores y medir la comparación V5 usando el proveedor real tras compilar este candidato.

## Matriz de temas y paridad

| Rol | Herramienta | Tema contrastado con Gemini real | Pruebas sintéticas | Pendiente real |
| --- | --- | --- | --- | --- |
| Estudiante | Conectar ideas | Mitosis, cuatro fases y tres relaciones | Ciclo del agua en el lector y en persistencia | Segundo tema |
| Estudiante | Crear una imagen | Célula vegetal recién dividida, 1024 × 1024 | Entrega privada y reproducción idempotente | Segundo tema |
| Docente | Imágenes y esquemas · Esquema | Fotografía, recorrido luz desde diafragma hasta exposición | Agua, grafo lineal, ramificado y cíclico | Segundo tema |
| Docente | Imágenes y esquemas · Imagen | Fotografía. Cámara analógica y haz de luz, 1024 × 1024. Comparación exacta de aperturas con leyenda V5 y 2/6 flechas, 1600 × 1600 | Adaptador de imagen y autorizaciones. Comparación exacta con la misma salida gráfica de V4 | Segunda materia |

El primer ensayo V5 quedó rechazado antes del despacho por el límite operativo diario de la cuenta docente de fotografía, después de cinco operaciones de los recorridos locales. El saldo mensual seguía disponible. Los límites permanecieron vigentes. Se priorizó volver a abrir las creaciones ya generadas.

El esquema usa ahora el cuerpo del espacio de Foxy como el quiz de la maqueta, con navegación superior y conversación conservada. En Mi Estudio, abrir desde Creaciones selecciona el chat original. La vista de proyección, la consulta de fuentes, la edición y la publicación conservan sus diálogos. React y las pruebas de navegación verificaron el montaje inline. Falta compararlo en Ego Lite después de compilar este candidato.

## Confirmación de la leyenda exacta con proveedor real

Con la cuenta docente de Fotografía prevista para este ensayo y cupo vigente, el trabajo V5 terminó READY en el supervisor local reconstruido. Gemini generó la leyenda sobre diámetro y entrada de luz, guardada aparte de la figura. La inspección del PNG privado de 1600 × 1600 contó dos flechas en la primera comparación y seis en la segunda. La cuota imputó 106 microdólares y las reservas activas volvieron a cero. Se usó una generación. El PNG está en `.test-artifacts/gemini-visual-parity/docente-apertura-exacta-gemini.png`.

La comprobación V5 suma una variante de Fotografía al ensayo docente de imágenes. La matriz conserva como pendiente una segunda materia real en cada combinación de rol y herramienta.

## Lectura dentro del espacio de Foxy

En el build con la vista integrada, Ego Lite volvió a abrir los mismos esquemas reales desde Creaciones. En escritorio y a 390 px se conservó visible la navegación de Foxy y el lector principal apareció en el cuerpo del espacio. En Mi Estudio se enfocó Volver al chat, se abrió la explicación de la flecha hacia Anafase y la consulta de fuentes mostró los dos materiales autorizados. En Foxy docente se activó una flecha con Enter, se abrió Proyectar y Escape cerró sólo la proyección. En los dos roles se volvió al chat original y se mantuvo el carrusel dentro del ancho del lector.

La captura de estudiante a 390 px mostró que el botón de fuentes estrechaba la columna de texto. Se movió ese botón debajo del texto en la rejilla móvil. El candidato servido confirmó en Ego Lite que el título ocupa dos líneas sobre 268 px de ancho. El botón queda debajo de la descripción y el lector se mantiene dentro de la pantalla. Se volvieron a abrir las dos fuentes y el chat. La evidencia está en `estudiante-esquema-inline-final-390.png` y `docente-esquema-inline*.png`.

## Segundo tema · Reanudación individual

Desde la raíz, cada comando revisa el caso indicado sin realizar una generación.

```powershell
node .test-artifacts/gemini-visual-parity/segundo-tema.mjs estudiante-esquema --check
node .test-artifacts/gemini-visual-parity/segundo-tema.mjs estudiante-imagen --check
node .test-artifacts/gemini-visual-parity/segundo-tema.mjs docente-esquema --check
node .test-artifacts/gemini-visual-parity/segundo-tema.mjs docente-imagen --check
```

- **Estudiante, ciclo del agua.** La carpeta de Dalia y su conversación original están disponibles. El esquema selecciona el tema y el Cuaderno de ciencias sintético propio. La herramienta de imagen recibe en el pedido los hechos de evaporación, condensación y precipitación comprobados en ese PDF. Su contrato genera por descripción.
- **Docente, mitosis.** Ambos casos usan el chat general de Lucía que contiene el apunte de mitosis en estado READY. El esquema pide las cuatro fases y sus conexiones. La imagen propone una célula en telofase. Se verificaron el chat y las dos capacidades visuales.
- Si venció la sesión de una cuenta sintética, ejecutá el mismo comando con `--login` y volvé a comprobar el caso. Si la app devuelve un límite de autenticación, respetá su plazo. El chequeo muestra saldo mensual. El servidor comprueba también el cupo diario al admitir la generación.
- Con la próxima ventana de cuota, usá `--run` en un caso a la vez. Antes del pedido queda el recibo local con su identidad. Usá `--status` para consultar el mismo resultado, con el tamaño del archivo privado o la estructura del esquema. El comando protege contra una segunda solicitud automática. Si el resultado es incierto, revisá ese chat y el recibo antes de resolverlo.
- En Ego Lite, reabrí la creación desde la tarjeta del chat y desde Creaciones. En el esquema probá un concepto, una flecha y la vuelta al chat. En la imagen revisá que la ilustración visible corresponda al pedido. Usá el recurso guardado para ambas comprobaciones.

Se ejecutaron `node --check` y los cuatro `--check` contra el supervisor local. Pasaron las cuatro precondiciones. Se leyó el PDF sintético autorizado para comprobar la consigna de la imagen. Quedaron cero solicitudes nuevas de generación y cero recibos de segundo tema.

## Contrato de nuevas generaciones de esquema

Dos pruebas RED reprodujeron la aceptación de una salida sólo textual en el motor y su guardado por un puerto sintético directo. El adaptador Gemini ya rechazaba un COMPLETE sin el campo de esquema. La validación del motor y el guardado comparten ahora la regla que exige un grafo V2 válido al completar OUTLINE. Una insuficiencia conserva sus faltantes. Los esquemas históricos siguen abriendo con su versión textual guardada.

La pregunta de repaso se mantiene opcional. La validación del grafo acepta su ausencia y comprueba la estructura cuando está presente. El proveedor aislado de vista previa y los fixtures que simulan nuevos esquemas devuelven el formato interactivo.

Pasaron 106 pruebas de motor, protocolo, persistencia, adaptadores y validación visual. También pasaron TypeScript de API, `git diff --check` focalizado y una ejecución de OUTLINE con el proveedor sintético de vista previa que devolvió tres conceptos y dos relaciones. Esta corrección se comprobó sin solicitar generaciones a Gemini.
