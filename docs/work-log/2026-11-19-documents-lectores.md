# Lector, edición y exportación de creaciones

Alcance autorizado en el plan de implementación Gemini. Adaptación de los lectores de texto privados de Mi Estudio y Foxy AI a la maqueta aprobada, con editor visual y descargas PDF/Word desde la revisión guardada. Mantener revisiones publicadas de Biblioteca y estado de guardado.

Responsable: documents. Worktree compartido ProtipoFoxMind en main. Base 4d057490. Sesión registrada sin identificador expuesto. Se preservan los cambios previos de la maqueta.

## Verificación


- Los lectores de ambos roles recuperan el documento guardado, interpretan sus bloques, ofrecen edición visual y llevan PDF y Word en el mismo pie. Mi Estudio vuelve a lectura al guardar la revisión. La explicación puede revelar la respuesta bajo demanda.
- El PDF privado incrusta Nunito Regular y ExtraBold, usa el logo con su proporción y numera las páginas. Una ilustración de la carpeta o del mismo chat docente puede elegirse al descargar. La selección aplica a ese PDF y el archivo sigue sujeto al permiso de lectura. La preparación de PDF para Biblioteca usa su renderizador versionado.
- `npm run --prefix apps/web typecheck` y chequeo focal de ESLint en los componentes compartidos pasaron. Se verificó `npm run docs:check`.
- Ego Lite, espacio 14, comprobó los componentes reales con un fixture aislado. Se revisaron la revelación de respuesta, el guardado de negrita y color, el subtítulo docente y su reapertura a 390 px. Se descargaron PDF y Word. Poppler renderizó una página con logo e ilustración sintética. pypdf encontró ambas tipografías incrustadas y texto recuperable. El documento Word conservó encabezados, negrita y color. Archivos en `.test-artifacts/documents-qa/`.
- Gemini real devolvió READY para un apunte docente sobre el ciclo del agua en una cuenta sintética. La nueva autenticación desde Ego recibió HTTP 429 con Retry-After de 516 segundos. Pendiente retomar la auditoría autenticada en ambos roles tras el límite.
- En la aplicación local, Ego Lite verificó el recorrido docente con Gemini real sobre mitosis. La tarjeta apareció tras preparar la propuesta, se abrió desde el chat, conservó un subtítulo editado, descargó PDF/Word y reabrió esa revisión desde Creaciones tras recargar. La captura y las descargas están en `.test-artifacts/documents-qa/`.
- El actor sintético docente alcanzó el límite diario al pedir una ilustración para el mismo apunte. La conversación mostró el estado terminal, conservó el apunte y mantuvo la descarga sin ilustración. El selector con incrustación de una imagen ya se ejecutó en el fixture aislado.
- La explicación estudiantil con Gemini real primero conservó el aviso de información insuficiente al usar el plan breve. Después de cargar un cuaderno autorizado con la transición de metafase a anafase, Gemini guardó una explicación de 1168 caracteres, con secciones Ponete a prueba y Respuesta. Se preparó el recorrido de reapertura en Ego con la misma cuenta de prueba.
- El lote vigente de contratos de documentos y lectura docente pasó 33 pruebas. Los verificadores de ownership del frontend y de límites de arquitectura pasaron.
- En Ego Lite, Dalia abrió una explicación real de mitosis, reveló su comprobación a 390 px y descargó el Word. La reabrió desde Creaciones y eligió la ilustración real obtenida con Gemini. El PDF ilustrado contiene dos páginas, tres imágenes (dos logos y la ilustración), Nunito incrustada y texto extraíble. Poppler confirmó la composición de ambas páginas.
- La edición estudiantil por Ego guardó la revisión 2 con el subtítulo Para seguir estudiando. El lector acepta secciones posteriores a Respuesta sin ocultarlas junto a la comprobación. La regresión pasa en Node; queda reabrirla en Ego tras recompilar Next.
- Matriz real de documentos. Docente, apunte de mitosis con Ego y ciclo del agua por API. Estudiante, explicación de mitosis con Ego. El intento de apunte del ciclo del agua para la cuenta sintética compartida devolvió HTTP 429 AI_BUDGET_EXCEEDED; se conservó el alcance de las cuotas.
- Con una segunda cuenta estudiantil sintética, Herramientas → Preparar un apunte produjo un apunte real de mitosis en Ego. Se editó el título, se descargaron PDF y Word y se recuperó el mismo título editado desde Creaciones tras recargar. Poppler y pypdf verificaron el PDF de una página y el texto exacto de la revisión.
- En la carpeta Fotografía, Gemini produjo una explicación sobre contraste a partir del material sintético cargado. El reto y la respuesta se abrieron desde el lector en Ego. El intento adicional de Apunte de fotografía terminó en AI_UNAVAILABLE después de la fase de generación de Gemini. La solicitud quedó visible y ofreció reintentar. Los logs de etapas acreditan el rechazo antes de guardar y no detallan la regla específica que invalidó esa salida.
- La reapertura de revisión 2 de explicación de mitosis se corroboró en Ego con el lector recompilado y el registro real autenticado. Se mostraron el nuevo subtítulo y la pregunta con respuesta inicialmente oculta. Otro estudiante recibió denegación al abrir la carpeta privada de esa revisión.
- Pruebas finales de documentos y flujos relacionados, 28 de 28. Typecheck web, verificador de fronteras y documentación correctos.

## Reproducción del segundo apunte estudiantil

- Diagnóstico sin generación: `node .test-artifacts/documents-qa/retry-fotografia-note.mjs --status`. Confirmó PREPARED en la cuenta sintética original, con carpeta activa, chat original, fuente propia legible y los dos temas disponibles.
- Con autorización y cupo: `node .test-artifacts/documents-qa/retry-fotografia-note.mjs --dispatch`. Usa la revisión actual de la carpeta y selecciona sólo el PDF propio Exposición y contraste de la luz. Conserva el mismo identificador en el recibo local y deja que la API aplique sus límites. El resultado sólo muestra identificadores del ensayo, estado, código seguro y Retry-After cuando está disponible. Un timeout se verifica con `--status` antes de decidir otro intento.
- Se ejecutaron `node --check` y el diagnóstico de lectura. El comando quedó preparado sin despachar generación.

## Fixture de Fotografía en entorno QA aislado

- `node .test-artifacts/qa-eight/documents/seed.mjs http://localhost:49464 http://127.0.0.1:50664` registró una cuenta estudiantil sintética, verificó su correo en Mailpit y creó la carpeta, el chat y los archivos propios mediante la API de la aplicación. El material legible incluye un ejemplo con una taza junto a una ventana. No se despachó Gemini.
- `node .test-artifacts/qa-eight/documents/status.mjs` comprobó PREPARED y la disponibilidad de la fuente propia. Se verificó sintaxis de los guiones de Ego, separados en apertura del formulario, despacho de una sola acción con ticket y comprobación de lectura, referencia propia, PDF y Word. La ejecución de ese recorrido depende del ticket coordinado.
- Ticket 1 del entorno aislado. Ego Lite p4 envió una vez el apunte estudiantil de Fotografía. El guard registró slot 1, generateContent HTTP 200. Solicitud 7735a880-c233-40b6-a42e-ffea6547366f, creación baa4ff86-1559-4d75-a71c-2236c483d6ef, READY. La creación citó el PDF propio y explicó exposición y contraste con el ejemplo de la taza.
- El lector abrió sin desborde horizontal y descargó PDF y Word. Poppler renderizó dos páginas y pypdf confirmó texto extraíble, Nunito Regular y ExtraBold. El Word conserva ambos conceptos. Evidencia en `.test-artifacts/qa-eight/documents/`. Se liberó Ego a maps. La primera página mostró dos veces el título porque Gemini también lo incluyó como primer encabezado del cuerpo.

## Encabezado repetido en los lectores y las descargas

- Las pruebas focalizadas reprodujeron la duplicación en el lector y Word. La corrección omite únicamente el primer encabezado del cuerpo cuando su texto coincide con el título de portada. El título guardado, las secciones distintas y la revisión original se conservan.
- Pasaron las cinco pruebas de `tests/foxy-exact-resource.test.mjs` y la prueba de ambos lectores privados en `foxy-resource-workspace.test.mjs`. Typecheck y fronteras pasaron.
- Se leyó por API el apunte real de Fotografía, revisión 1. Ego Lite abrió dos montajes aislados de los lectores de producción con esa misma revisión y descargó PDF y Word de ambos roles. El PDF inicial contenía dos apariciones exactas del título. pypdf y el XML de Word confirmaron una aparición por archivo corregido y la primera sección distinta visible. Poppler confirmó el resultado visual. El ensayo regeneró archivos locales a partir del contenido guardado y la revisión siguió en 1.
- En el build Next `JavtZPbHgeAAA8fO1Zy8H` del entorno QA, Ego abrió el mismo apunte estudiantil, revisión 1, y descargó de nuevo PDF y Word. En el lector y ambos archivos aparece un título y se conserva la sección «Exposición: registro global de luz». Se usó el contenido guardado con el gate de Gemini cerrado.
