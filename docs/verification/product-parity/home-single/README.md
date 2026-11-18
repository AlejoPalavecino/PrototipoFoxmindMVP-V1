# Tarjeta única del estudiante

Corrección del 16 de noviembre, posterior a [Inicio y navbar](../home-exact/README.md). El usuario rechazó la variante horizontal cuando existe una sola actividad. En escritorio se conserva la tarjeta vertical de una columna, con imagen arriba, cuerpo y pie inferior, independientemente de la cantidad. La adaptación compacta móvil permanece.

Build local `RXJGPgRyO0PeKZcHbgOZx`. Comparación Ego Lite a 1440 px: producto con una tarjeta, producto sintético con dos y maqueta con dos tienen tarjetas de **309.65 × 346.85 px**, con portada de **144 px**. La barra de demostración de la maqueta desplaza su contenido 38 px en vertical. Las portadas, fechas, estado de borrador y cantidades siguen siendo los datos reales del producto.

[Antes](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/blob/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/verification/product-parity/home-single/before-student-1440.png) · [Producto corregido](product-one-1440.png) · [Maqueta](reference-two-1440.png) · [Dos actividades](fixture-two-1440.png) · [Móvil](product-one-390.png) · [Mediciones](measurements.json) · [Manifiesto](manifest.json).

Producto observado a 1920/1440/768/390/320; múltiples tarjetas y maqueta a 1440/390. Sin controles fuera de pantalla ni imágenes rotas. Cuatro pruebas focales existentes PASS informadas por Astra; build local READY y diff-check PASS. Cambio de producción limitado a CSS. No se añadieron datos ficticios al producto ni se modificaron acciones, otras pantallas o el HTML de referencia. [Registro](../../../work-log/2026-11-16-root-home-single-card.md).
