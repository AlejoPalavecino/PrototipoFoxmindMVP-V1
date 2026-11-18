# Diagramas incorporados a la documentación

- Agente `diagramas`, delegado para diagramas y registro propio. Identificador de sesión individual no expuesto.
- 2026-11-18, checkout principal de `main`, base `2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81`.
- Alcance coordinado. Diagramas de arquitectura, actividad y estudio privado con estilo Brújula en `docs/diagramas/`, más su verificación local. El árbol contenía registros de otros agentes.

## Entrega

- [Arquitectura de FoxMind](../diagramas/arquitectura.html) y [vista previa](../diagramas/arquitectura.png). Sigue la solicitud del navegador al servidor NestJS y agrupa PostgreSQL, almacenamiento y escaneo, correo e IA. El diagrama resume las capacidades del monolito en un nodo. Los módulos y las combinaciones de configuración se desarrollan en la [guía de arquitectura](../engineering/architecture.md).
- [De la actividad a la devolución](../diagramas/actividad.html) y [vista previa](../diagramas/actividad.png). Distingue asignación, entrega confirmada, corrección privada, publicación confirmada y consulta de la calificación. Representa el recorrido principal. La [guía de participación](../engineering/activities/participation.md) y la [guía de corrección](../engineering/grading/README.md) describen reentregas, revisiones y variantes.
- [Estudio privado y repaso en Agenda](../diagramas/estudio.html) y [vista previa](../diagramas/estudio.png). Distingue el vínculo vivo a la Biblioteca y la copia editable del plan, así como los espacios privados y la confirmación de sesiones. La tutoría y el repaso se abren como ramas desde la carpeta porque la tutoría es opcional. [Guía de Estudio](../engineering/study/README.md).
- Los HTML usan SVG de 1280 × 720 en línea, paleta de [`parity-foundation.css`](../../apps/web/src/application/shell/styles/parity-foundation.css) y la fuente variable Nunito del producto incluida con su licencia. Los tamaños de texto se ampliaron para que sigan siendo legibles al reducir la vista previa al ancho habitual de una guía. Las vistas PNG son de 2560 × 1440.

## Evidencia

- Chromium con Playwright del repositorio (`1.64.1`) abrió los tres HTML locales en contexto offline. A 1440 px comprobó tamaño, etiquetas accesibles y fuentes de las secciones. CDP confirmó Nunito como fuente efectiva en títulos, nombres, detalles y rótulos. Los límites de texto quedaron dentro de las cajas. Los conectores son ortogonales y el muestreo de geometría no detectó cruces ni tránsito bajo otros nodos.
- A 390 px el documento conservó su ancho, el foco llegó al contenedor y `ArrowRight` desplazó el SVG completo dentro de su región. La emulación de impresión ajustó el SVG al ancho de página. Las tres cargas registraron cero solicitudes HTTP y cero errores de página o consola.
- La vista previa de cada SVG se generó y revisó con la fuente real. El exportador Python de la skill requiere su propio paquete Playwright, ausente en el entorno. Se usó el aislamiento de la figura y la escala de exportación del mismo procedimiento con el Playwright de Node ya instalado en el repo.
- El cálculo de contraste WCAG de los textos en el diagrama dio al menos 6,11:1 y los enlaces sobre el fondo perla dieron 4,68:1.
- `self_check.py --offline` informó únicamente `non-fragment CSS url() is not allowed` en los originales por la URL `data:font/ttf` embebida. El mismo verificador devolvió `OK` para copias temporales sin ese `@font-face`. La fuente de los originales se decodificó y cotejó byte a byte con [`nunito.ttf`](../../apps/web/public/foxmind/nunito.ttf), SHA-256 `bb55a5ca5c2042335b3991af27c4d0705d0ef41cac6164ac737fd8f2a1e85207`.

Verificación local completa para los tres diagramas. El enlace desde las guías y la comprobación integral de documentación corresponden a coordinación. No se crearon commits.
