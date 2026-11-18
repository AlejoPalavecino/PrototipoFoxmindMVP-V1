# Exportaciones de recursos pedagógicos
Agente `/root/exportacion`. Rama `feature/latencia-ia`, base `6e9c1312`, 2026-11-18. Sesión runtime sin identificador confirmado.

Alcance autorizado. Revisar Word, TXT y PDF de los flujos existentes de Foxy y Mi Estudio. Usar recursos sintéticos. Conservar los digests históricos de Biblioteca y los contratos de preparación del PDF. Verificar lectura y exportación de expresiones matemáticas del caso sintético de los planes de viaje.

El DOCX de carga de Biblioteca también se usa para comprobar identidad de bytes en servidor. El PDF de Foxy guarda digest y versión de renderizado para reintentos. Se capturará la salida actual de ambos exportadores antes de editar.

## Implementación

- El lector interpreta las expresiones matemáticas básicas de un apunte guardado y respeta importes, contenido de código y notación fuera del subconjunto cubierto. DOCX y TXT usan la misma representación de texto que el lector. DOCX incluye título, encabezados jerárquicos, listas numeradas o con viñetas y énfasis. La generación DOCX usada para cargar texto en Biblioteca conserva su paquete previo.
- Las preparaciones de texto nuevas producen PDF v2 por el worker de siempre. El archivo incorpora título, idioma, árbol de estructura, orden de lectura y roles de párrafos, encabezados y listas. El worker reproduce v1 para una reserva existente y coteja versión, digest, tamaño y páginas antes de enviar los bytes a custodia.
- La migración `202611180001_foxy_tagged_pdf` amplía el CHECK. La vista previa, confirmación, escaneo y descarga conservan las mismas comprobaciones de custodia y publicación. El cambio de esquema se probó exclusivamente en PostgreSQL descartable. [Operación y reversión](../engineering/ai/foxy.md#publicar-material).

## Evidencia

- RED del lector y descargas. El caso de planes de viaje mostraba la notación LaTeX literal. RED del PDF. El generador previo daba v1 con marcas de Markdown y sin título, idioma o árbol de estructura. El PDF v1 anterior conserva el SHA-256 `85aa3980145f0849240e32b3d880203e42f455b3500e857edc381e9632832fa0` del fixture de regresión.
- Una comprobación PostgreSQL creada justo antes de la migración reservó un v1. Tras migrar, el worker reprodujo los bytes, el ID de archivo y el digest. Un PDF v2 nuevo pasó por el worker y la custodia reales con escáner sintético. Se descargaron los mismos bytes en vista previa y en descarga privada. El estudiante no pudo acceder durante la preparación. Después de confirmar, pudo descargar esos bytes desde la Biblioteca.
- Se abrieron los documentos de planes de viaje con Python DOCX, pypdf y Microsoft Word, y se inspeccionaron las dos páginas rasterizadas con PDFium. Word abrió una página sin reparación. La representación conservó títulos, viñetas, acentos e importes escritos con signo monetario. Las tres salidas mostraron `50 × 5 = 250`. La comparación del DOCX histórico usado para Biblioteca dio el mismo SHA-256 antes y después.
- El comando empaquetado `render_docx.py` no pudo ejecutarse porque LibreOffice no estaba instalado. La verificación visual se hizo con la salida de Word y PDFium. Los artefactos sintéticos de QA quedaron en `.test-artifacts/exportacion-pedagogica/`.

- Los siete archivos focalizados terminaron en 81/81. Después se añadió y ejecutó la comprobación que acciona Descarga Word y TXT desde ambos lectores y obtiene bytes iguales, 1/1. Compilar API, lint de límites, revisión documental y comprobación del diff pasaron. La primera corrida paralela agotó el plazo de render para la muestra de 4000 líneas. Se repitió con el plazo ampliado solamente en la prueba de trabajo largo. La comprobación separada de timeout del worker siguió activa.
- La corrida amplia de custodia, reintento, inspección y limpieza de publicaciones pasó 34/34 con PostgreSQL descartable. Incluye el caso de migración y lectura de los dos PDF.

Las expresiones fuera del subconjunto permanecen en texto. La estructura se comprobó en los archivos y su renderizado. Quedan fuera de esta verificación la certificación PDF/UA y una prueba manual con lectores de pantalla. La aplicación y la migración se mantienen locales.
