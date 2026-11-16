# Tarjeta única de «Tu próximo paso»

- Coordinador: root, identidad runtime registrada no disponible. Implementador: astra_frontend_parity, Astra.
- Rama/worktree: codex/foxmind-product-parity en C:/Users/alejo/.codex/worktrees/foxmind-product-parity/ProtipoFoxMind; HEAD ef6828b96084b0fcaf9a883e4afb95e0871cf1d6. Trabajo previo conservado.
- Ruta: R1, corrección visual acotada dentro de TASK-016.
- Autorización: el usuario rechaza la disposición horizontal de la tarjeta única del estudiante y pide el diseño vertical que mostró en la maqueta con varias actividades. Esta decisión reemplaza la aceptación previa de la variante `:only-child`.
- Alcance: CSS de Inicio estudiante; imagen arriba, cuerpo debajo y pie inferior, ocupando una columna aun con una actividad. Mantener adaptación móvil y datos/acciones reales. No modificar HTML de referencia ni agregar actividades ficticias.
- Hallazgo: `parity-home.css` reproduce reglas de la maqueta que cambian la única tarjeta a fila de 140 px + contenido. El problema no depende de caché. También se excluía la tarjeta única de la altura de portada de 144 px.
- Estado: DONE, verificado localmente. Astra retiró cuatro reglas globales `:only-child` y aplicó la portada de 144 px también a una única tarjeta. Las reglas compactas por ancho de contenedor permanecen.
- Build `RXJGPgRyO0PeKZcHbgOZx` READY con `npm run local:restart`; configuración y datos locales existentes conservados, sin generación IA.
- Ego Lite: producto de una tarjeta a 1920/1440/768/390/320; referencia de dos y fixture aislado de dos a 1440/390. A 1440 las tres variantes tienen tarjetas de 309.65 × 346.85 px, portada de 144 px, cuerpo debajo y footer inferior. Sin controles fuera ni imágenes rotas. Se inspeccionaron capturas de escritorio y móvil; no se añadieron datos al producto.
- Astra informó `home-parity-navigation` 4/4 PASS. Coordinador: build READY y diff-check PASS. [Evidencia](../verification/product-parity/home-single/README.md).
- Siguiente paso: revisión del usuario sobre Inicio actualizado; no se ampliaron cambios a otras pantallas.
- Sin commits, integración, publicación ni cambios de datos/proveedor.
