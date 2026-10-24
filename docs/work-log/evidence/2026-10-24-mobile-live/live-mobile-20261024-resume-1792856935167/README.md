# Capturas reales antes de crear el aula

Run: live-mobile-20261024-resume-1792856935167. Ego(lite), Space3, aplicación local y Gemini real; datos sintéticos. Chromium táctil emulado375×812/320×812. Son capturas originales de la aplicación, sin SSR, modificación del DOM ni reconstrucción visual. Cada editor se capturó antes de aplicar; cada revisión antes de crear. El coordinador inspeccionó y liberó cada transición después de archivar sus imágenes.

| Formato / estado | 375px | 320px | Manifiesto completo |
|---|---|---|---|
| PDF editor | [Unidad editada](pdf-editor-375-2.png) | [Aplicar](pdf-editor-320-5.png) | [10 capturas](pdf-editor.json) |
| PDF revisión | [Resumen](pdf-review-375-1.png) | [Crear aula](pdf-review-320-4.png) | [8 capturas](pdf-review.json) |
| Word editor | [Unidad editada](word-editor-375-2.png) | [Aplicar](word-editor-320-5.png) | [10 capturas](word-editor.json) |
| Word revisión | [Resumen](word-review-375-1.png) | [Crear aula](word-review-320-4.png) | [8 capturas](word-review.json) |

Cada manifiesto conserva job, archivo, nombres editados, timestamps y SHA256 de cada PNG. Los controles del coordinador son QA interno, sin representar aprobación humana o nativa. No hubo desbordamiento horizontal ni solapamiento observado; document/body coinciden con375/320 y touchPoints1. Los campos de una línea desplazan su texto largo dentro del input.

Después de cada revisión se creó el aula y se recargó; la consulta autenticada de detalle devolvió200 y coincidencia exacta con las dos unidades/cinco temas editados: [PDF](pdf-persisted.json), [Word](word-persisted.json). La evidencia complementa los recorridos anteriores y cierra específicamente sus capturas live faltantes; no certifica dispositivos físicos, Safari ni teclado nativo.
