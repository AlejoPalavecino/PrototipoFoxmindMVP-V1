# Comprobación del paquete de diseño

Estas comprobaciones validan **artefactos de diseño**, no la implementación futura de FoxMind. La app y sus servicios no se modificaron ni se levantaron para esta entrega; no corresponde afirmar nuevos tests funcionales del producto.

## Recursos y cobertura

[validation.json](validation.json) registra la ejecución de `node docs/design/foxmind-3d/tools/validate-handoff.mjs`: decodificación real de WebP, medidas, bytes, hashes, transparencia, ausencia de metadata, vectores de iconos/wordmark, identidad del logo original y cinco SVG híbridos explícitos, enlaces Markdown, 82 IDs y archivos de las rutas actuales. Los ratios de contraste corresponden a los tokens propuestos, no a toda combinación posible de una futura app.

[Marca](brand-preview.webp) y [hoja de contacto](asset-contact-sheet.webp) fueron inspeccionadas visualmente. Los 16 recursos se generaron y revisaron individualmente antes de exportarse. Los masters no están incluidos en el presupuesto de transferencia.

## Atlas y navegador

Las capturas de `browser-20261025/` son evidencia histórica anterior a la corrección del logo; no definen la marca vigente. El [registro de corrección](../../../work-log/2026-10-25-root-original-logo.md) identifica el original, los exports y la nueva comprobación visual. Los archivos activos del catálogo y atlas usan el logo actualizado.

La [verificación del logo original](original-logo-20261025/browser-results.json) comprobó carga y layout por DOM en Inicio a 1440/320 px y acceso a 390 px, sin imágenes rotas ni desbordes. Las capturas de navegador nuevas no estuvieron disponibles por timeout de `Page.captureScreenshot`; la prueba visual actual es [brand-preview.webp](brand-preview.webp), renderizada con Sharp e inspeccionada por coordinador y reviewer. No se presenta esa imagen como captura del navegador.

El agente del atlas registra su control estructural en [review/validation.json](../review/validation.json): IDs, enlaces, variantes y constructores. Los estados comunes se reutilizan; no se cuentan como diseños independientes ni como casos funcionales pasados.

La inspección real usó ego(lite), Space dedicado `FoxMind 3D design handoff 2026-10-25` (id 7), solo archivos locales, sin backend ni cuentas. El [informe final](browser-20261025/browser-results.json) registra **246 renders: 82 IDs a 1440, 390 y 320 px**, comprobando la identidad real de la pantalla después de navegar; cero pantallas equivocadas, desbordes, imágenes rotas o títulos ausentes. El [catálogo](browser-20261025/catalog-results.json) pasó en los mismos anchos, con filtro de siete portadas y 42 iconos. El Space se finalizó conservando el catálogo para revisión del usuario.

Capturas inspeccionadas: [Inicio](browser-20261025/home-final.webp), [Inicio móvil](browser-20261025/home-mobile-final.webp), [cards de aulas](browser-20261025/classrooms-final.webp), [Muro móvil](browser-20261025/wall-mobile-final.webp), [cuenta](browser-20261025/auth-final.webp), [autoría](browser-20261025/authoring-final.webp), [Plan](browser-20261025/plan-final.webp), [evaluación](browser-20261025/submission-final.webp), [Agenda](browser-20261025/agenda-final.webp), [catálogo](browser-20261025/catalog-final.webp) e [iconos](browser-20261025/icons-final.webp). Las 22 capturas se convirtieron a WebP lossless comprobando igualdad exacta de píxeles RGB.

## Incidencias corregidas y límites

- Un primer script de iconos falló por una clave con guion sin comillas; se corrigió y volvió a ejecutar. No afectó producto.
- El primer control de enlaces encontró el propio `validation.json` aún inexistente antes de escribirlo; el informe quedó creado y la ejecución siguiente verificó los enlaces. No era un recurso gráfico ausente.
- La primera ronda rápida de hashes no esperaba identidad de pantalla y podía repetir un render por throttling del navegador: se invalidó, se conservaron sus datos como `browser-results-superseded.json` y se reemplazó por navegación con espera del ID real. No cuenta como prueba de 246 pantallas correctas.
- La ronda válida posterior encontró cuatro desbordes de Muro a 320 px. Se conservaron en `browser-results-before-wall-fix.json`, se corrigió el wrapping y se volvió a recorrer los 246 casos: cero desbordes. También se corrigió el recorte móvil de Foxy y se fijaron cards verticales de proporción 3:2.
- Una consulta de catálogo esperó imágenes lazy fuera de pantalla y terminó en timeout de 15 s. Se recargó la página para cancelar la evaluación, se cargaron esas imágenes de forma eager solo en la inspección y la comprobación final pasó. No se cambió lazy loading del catálogo guardado.
- La primera vista desktop recortaba las orejas de Foxy en el hero; se cambió el ajuste de imagen para conservar la figura completa y se revisó de nuevo.
- Revisión independiente de los seis contratos: 82 IDs y 72 enlaces iniciales. Se unificó Plan por defecto para ambos roles y tabs móviles horizontales; el coordinador hizo esas correcciones, no el reviewer read-only.
- Revisión final: se eliminaron un cronómetro inexistente y la inferencia de unidad actual en cards; se precisó publicación por intento con detalle por pregunta. El plan queda ajustado a capacidades reales y propuestas nuevas explícitas.
- El atlas permite navegar variantes y examinar campos; sus botones de producto son demostrativos y no autentican, envían, guardan ni publican. Una combinación seleccionable no equivale a validar un endpoint.

Durante la implementación se exigirán las pruebas de permisos, contratos, accesibilidad, teclado y flujos end-to-end del [plan](../implementation-plan.md). No se declara conformidad de accesibilidad completa basándose en una maqueta.
