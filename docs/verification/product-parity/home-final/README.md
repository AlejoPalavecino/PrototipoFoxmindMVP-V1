# Repaso final de Inicio

Build local `eU402ssoRgFJBGYgK9vxr`, rama separada `codex/foxmind-product-parity`, sin commit/integración. Se compararon Inicio docente y estudiante con la maqueta en Ego Lite a 1920, 1440 y 390 px, incluyendo el final de la página. Continúa vigente la [tarjeta única vertical](../home-single/README.md).

El ancho principal coincide (1200, 1120.8 y 343.2 px respectivamente), al igual que los colores, tamaños de texto, radios y espaciados muestreados. No aparecen los módulos retirados. Nunito está cargada en ambas versiones. Las diferencias de fechas, cantidades, portadas, nombres y estados provienen de los datos; el HTML incluye su barra de demostración de 38/64 px.

Se encontró y corrigió el navbar móvil de Inicio: antes desaparecía al bajar; ahora permanece visible, como en la maqueta. Se comprobó en ambos roles a 390 y 768 px: top 0, alturas 60/64 px, menú accesible desde el final, cierre con Escape, foco devuelto y scroll conservado. El selector sólo afecta a `.entry-home`.

| Vista | Producto | Maqueta |
|---|---|---|
| Docente, escritorio | [inicio](app-teacher-1920-top.png) · [final](app-teacher-1920-bottom.png) | [inicio](reference-teacher-1920-top.png) · [final](reference-teacher-1920-bottom.png) |
| Estudiante, escritorio | [inicio](app-student-1920-top.png) · [final](app-student-1920-bottom.png) | [inicio](reference-student-1920-top.png) · [final](reference-student-1920-bottom.png) |
| Docente, celular | [inicio](app-teacher-390-top.png) · [final](app-teacher-390-bottom.png) | [inicio](reference-teacher-390-top.png) · [final](reference-teacher-390-bottom.png) |
| Estudiante, celular | [inicio](app-student-390-top.png) · [final](app-student-390-bottom.png) | [inicio](reference-student-390-top.png) · [final](reference-student-390-bottom.png) |

Sin overflow horizontal, controles fuera ni imágenes rotas en las vistas recorridas. La muestra de contraste de 38 textos opacos del producto (21 docente + 17 estudiante) dio mínimo 5.35:1. No equivale a auditoría WCAG completa. Astra informó 9/9 pruebas de navegación PASS; build y diff-check PASS del coordinador. No se repitieron generaciones IA ni flujos internos de entrega/corrección en este repaso.

[Menú desde el final con contador cargado](student-scrolled-menu-390.png) · [Manifiesto y mediciones](manifest.json) · [Registro](../../../work-log/2026-11-16-root-home-final-review.md).
