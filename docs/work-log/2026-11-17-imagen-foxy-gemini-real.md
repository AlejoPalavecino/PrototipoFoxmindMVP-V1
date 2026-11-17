# Foxy AI · generación visual con Gemini real

17 de noviembre de 2026. Responsable `/root/imagen`. Rama `main`, checkout principal, base `375a2d75`. El pedido vigente autorizó completar la auditoría visual con Gemini y corregir los hallazgos comprobados. Se reutilizaron una cuenta docente, una cuenta alumna matriculada y un aula sintética de la auditoría previa.

## Configuración y evidencia

- Se habilitó localmente `gemini-3.1-flash-lite-image` con los valores publicados de USD 0,25 para entrada, 1,50 para salida textual y 30 para salida de imagen por millón de tokens. Se ampliaron de forma temporal las cuotas del entorno loopback de QA. [Tarifas oficiales de Gemini](https://ai.google.dev/gemini-api/docs/pricing#gemini-3.1-flash-lite-image)
- En Ego Lite, Herramientas → Imágenes y esquemas → Imagen de ejemplo produjo una ilustración escolar de evaporación. El trabajo quedó `READY`. El lector presentó un JPEG de 1024 × 1024, con 599.297 bytes y firma válida. El esquema del ciclo del agua quedó `READY`, mostró tres conceptos con relaciones y entregó un PNG válido de 34.272 bytes.
- Abrir la ilustración desde Creaciones, editar el título y recargar conservó el cambio. Llevar a Biblioteca preparó una copia privada. La confirmación estaba deshabilitada antes de revisar. Tras revisar y confirmar, la alumna matriculada consultó la Biblioteca y descargó un JPEG idéntico byte a byte al privado. Las URL del archivo privado y de la preparación rechazaron a la alumna con HTTP 403.
- El lector visual base sólo mostraba Descargar TXT. La evidencia del archivo raster se obtuvo desde la URL de la vista previa privada y desde la descarga publicada. El equipo coordinador toma el hallazgo de descarga desde la interfaz.
- Comandos reproducibles en el checkout principal. `npm run local:up`, `ego-browser nodejs` con los guiones `open.mjs`, `visual-baseline.mjs` y `publish.mjs`, y `node .test-artifacts/qa17-image-real/student.mjs`. Los recibos `baseline.json`, `publish.json` y `student.json` y las capturas de ambos lectores quedaron en `.test-artifacts/qa17-image-real/`, ignorado por Git.

## Estado

Generación real de ilustración y esquema, edición del título, publicación de ilustración y lectura autorizada verificadas en la base. No se reprodujo un defecto del adaptador. La prueba usó contexto general y una matrícula sintética. La instancia queda lista para que el coordinador verifique el candidato. Al terminar, el coordinador puede ejecutar `npm run local:stop` y `node .test-artifacts/qa17-image-real/runtime.mjs restore` para recuperar la configuración previa de las ocho variables temporales.
