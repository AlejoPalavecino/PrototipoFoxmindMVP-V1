# Inicio y navbar: comparación corregida

Alcance: Inicio docente/estudiante y navegación compartida. Implementación Astra en `codex/foxmind-product-parity`, sin commit ni integración a main. Referencia: HTML iteración 17, conservado en foxmind-ui-lab. [Registro y límites](../../../work-log/2026-11-15-root-home-exact-parity.md).

## Cambios y medidas

Se retiraron de Inicio borradores, últimas devoluciones, ordenar entregas y Abrir tema. Se conservan sus capacidades dentro de las aulas. El contenido tiene el ancho y las columnas de referencia; las filas docentes escasas conservan altura compacta. Navbar expandido de 232 px, plegado de 76 px y menú móvil de 272 px desde debajo del encabezado de 60 px.

| Medida a 1920 px | Producto anterior | Producto corregido | Maqueta |
|---|---:|---:|---:|
| Contenido |1474|1200|1200|
| Banner, altura |309.6|309.6|309.6|
| Tarjeta de aula, ancho |478|386.66|386.66|
| Columnas principales |902.8 /547.2|732.2 /443.8|732.2 /443.8|

La miniagenda lee el día local mediante el cliente de Agenda, incluyendo horarios pasados del día. Las consultas muestran autor público y título real; no se modifican permisos. Los estados vacío/error/carga y las filas paginadas se mantienen reales.

## Evidencia visual

| Vista | Producto | Referencia |
|---|---|---|
| Docente 1920, inicio |[captura](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/blob/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/verification/product-parity/home-exact/app-teacher-1920-top.png)|[captura](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/blob/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/verification/product-parity/home-exact/reference-teacher-1920-top.png)|
| Docente 1920, final |[captura](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/blob/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/verification/product-parity/home-exact/app-teacher-1920-bottom.png)|[captura](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/blob/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/verification/product-parity/home-exact/reference-teacher-1920-bottom.png)|
| Estudiante 1920, inicio |[captura](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/blob/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/verification/product-parity/home-exact/app-student-1920-top.png)|[captura](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/blob/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/verification/product-parity/home-exact/reference-student-1920-top.png)|
| Estudiante 1920, final |[captura](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/blob/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/verification/product-parity/home-exact/app-student-1920-bottom.png)|[captura](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/blob/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/verification/product-parity/home-exact/reference-student-1920-bottom.png)|
| Docente 390 |[captura](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/blob/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/verification/product-parity/home-exact/app-teacher-390-top.png)|[captura](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/blob/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/verification/product-parity/home-exact/reference-teacher-390-top.png)|
| Estudiante 390 |[captura](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/blob/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/verification/product-parity/home-exact/app-student-390-top.png)|[captura](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/blob/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/verification/product-parity/home-exact/reference-student-390-top.png)|

[Menú móvil docente](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/blob/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/verification/product-parity/home-exact/app-teacher-mobile-menu-final.png) · [Menú móvil estudiante](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/blob/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/verification/product-parity/home-exact/app-student-mobile-menu-final.png) · [Navegación plegada](app-teacher-collapsed-final.png) · [Consulta con autor/título reales](app-teacher-query-final.png) · [Dos actividades sintéticas](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/blob/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/verification/product-parity/home-exact/fixture-student-1920-top.png) · [Tres entregas sintéticas](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/blob/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/verification/product-parity/home-exact/fixture-teacher-1920-top.png) · [Manifiesto](candidate-manifest.json).

Las cuentas de prueba tienen un aula y una actividad pendiente; no se agregan aulas o actividades ficticias al producto para igualar los números del HTML. Este corte conservó la variante horizontal de tarjeta única presente en el HTML; el usuario la rechazó después y la [corrección vigente](../home-single/README.md) conserva una tarjeta vertical en escritorio aunque haya una sola actividad. Las capturas de este informe son históricas respecto de esa variante. Los avatares/portadas guardados se conservan. La barra de demostración de 38 px/64 px pertenece sólo a la maqueta y explica el desplazamiento vertical de sus capturas.

## Verificación y límites

Se compararon ambos roles a 1920/1440/390, arriba y abajo de la página, más escenarios sintéticos múltiples. Navegación real comprobada: actividad del aula, continuar borrador, revisar entrega, consulta a su publicación, abrir/plegar navbar y Escape con retorno de foco. Las transiciones de botones y tarjetas coinciden con la referencia; se comprobó la preferencia de movimiento reducido. Build `UGTf8RMd24BbwOkYdJufH` READY y 41 pruebas focales finales aprobadas. Los resultados de tipos, fronteras de arquitectura, documentación y diff se registran en el work-log y manifiesto.

No equivale a una afirmación de igualdad de datos, a una auditoría WCAG completa ni a una nueva revisión de todos los interiores del aula. No se ejecutaron generaciones IA de pago en esta corrección; Gemini sigue configurado en el entorno local existente.
