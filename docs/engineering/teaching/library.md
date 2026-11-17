# Biblioteca: archivos, texto y revisiones

El docente agrega un archivo aprobado en dos pasos: elegir el archivo y revisar sus datos y vínculos. El formulario permite definir título, descripción, unidad, tema y actividades relacionadas. Los vínculos son opcionales.

Publicar contenido escrito genera DOCX y lo procesa por el pipeline privado de validación/escaneo antes de crear el material. FILE y TEXT comparten organización académica y lectura, pero no la misma operación de revisión.

Seleccionar un archivo no lo publica. La UI distingue carga, validación y publicación, con errores recuperables. Filtros y contexto del tema se conservan al abrir o cerrar el lector. Ambos roles comparten la lectura; sólo el docente puede abrir el flujo de carga. Escribir, editar y eliminar no son acciones visibles en el interior del aula de UI Lab; los recursos existentes y las operaciones de backend se conservan.

El flujo de carga y el lector también se abren encima del Plan. La carga conserva el tema elegido; al descartar o publicar se vuelve al mismo lugar. La publicación actualiza las asociaciones del Plan.

La validación real admite PDF, DOC, DOCX, PPT y PPTX hasta 20 MB e imágenes JPG/PNG, XLSX y ZIP según la política del servicio. La maqueta simula adicionalmente XLS, OpenDocument, TXT, CSV y WebP: estos formatos no están habilitados por el escáner y la restricción de archivos del producto.

## Cambiar o eliminar

FILE conserva bytes inmutables; sus metadatos admitidos pueden editarse. Para TEXT, cambiar título o cuerpo crea una revisión con material/archivo nuevos. Cambiar organización/uso no exige reemplazar contenido. La versión reemplazada se oculta de la colección corriente; vínculos ya guardados conservan identidad. Revisar no libera cuotas ni sobrescribe bytes históricos.

La operación de eliminación exige confirmación y que el material no esté vinculado a actividades ni comparta archivo. El cupo se libera una vez confirmado el borrado de bytes.

## Contrato de organización

`publish`, `edit` y `organize` admiten `description` de hasta 2000 caracteres y `activityIds` con IDs únicos del aula. Omitir esos campos conserva valores previos al editar. `description: null` elimina la descripción y `activityIds: []` solicita retirar vínculos. Sólo se agregan o quitan vínculos en actividades elegibles sin participaciones. Las asociaciones y los metadatos se confirman juntos bajo la revisión del aula. El listado estudiantil muestra únicamente vínculos a actividades publicadas.

Los archivos legados muestran la descripción guardada originalmente en el cuerpo. Omitir la descripción conserva el texto completo, incluso cuando supera los 2000 caracteres. Para reemplazarlo, usá hasta 2000 caracteres. Vaciar ese campo elimina la descripción. En materiales escritos, descripción y cuerpo conservan sus funciones independientes.

## Leer

Ambos roles autorizados pueden buscar y abrir un recurso. El diálogo muestra su ficha, asociaciones autorizadas y las acciones de lectura o descarga disponibles. Puede abrirse desde Biblioteca o desde Plan.

Fuentes: [UI](../../../apps/web/src/features/materials/catalog/Library.tsx), [lector](../../../apps/web/src/features/materials/reader/MaterialReader.tsx), [servicio](../../../apps/api/src/bootstrap/academic-materials-composition.ts). En el [ensayo actual](../../verification/flows.md) se verificaron TEXT, revisión con otra identidad de archivo, eliminación y lectura estudiantil; los formatos no ensayados no se dan por verificados.
