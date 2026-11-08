# Biblioteca: archivos, texto y revisiones

El docente agrega un archivo aprobado o escribe un material. Título, contenido/descripción, unidad/tema y uso del recurso forman parte del formulario. Los usos admitidos son material de estudio, recomendado y complementario.

Publicar contenido escrito genera DOCX y lo procesa por el pipeline privado de validación/escaneo antes de crear el material. FILE y TEXT comparten organización académica y lectura, pero no la misma operación de revisión.

## Cambiar o eliminar

FILE conserva bytes inmutables; sus metadatos admitidos pueden editarse. Para TEXT, cambiar título o cuerpo crea una revisión con material/archivo nuevos. Cambiar organización/uso no exige reemplazar contenido. La versión reemplazada se oculta de la colección corriente; vínculos ya guardados conservan identidad. Revisar no libera cuotas ni sobrescribe bytes históricos.

Eliminar requiere confirmación y que el material no esté vinculado a actividades ni comparta archivo. La UI explica cuándo dejará de estar disponible y que el cupo sólo se libera al confirmar el borrado de bytes. No tratar un fallo de refresco como permiso de volver a eliminar.

## Leer

Ambos roles autorizados pueden buscar y abrir un recurso. El lector muestra título, asociación, contenido cuando es escrito y descarga; PDF/imágenes ofrecen abrir archivo cuando corresponde. Sólo el docente con permisos dispone de editar/eliminar.

Fuentes: [UI](../../../apps/classrooms-ui/Library.tsx), [lector](../../../apps/classrooms-ui/MaterialReader.tsx), [servicio](../../../apps/api/src/classrooms/library.ts). En el [ensayo actual](../../verification/flows.md) se verificaron TEXT, revisión con otra identidad de archivo, eliminación y lectura estudiantil; los formatos no ensayados no se dan por verificados.
