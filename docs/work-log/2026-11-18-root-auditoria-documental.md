# Auditoría documental de FoxMind

Coordinación en el checkout principal de `main`, base `2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81`. El pedido comprende auditar docs, retirar referencias superadas, capturar la aplicación y explicar su diseño, arquitectura y distribución en el README. La auditoría se realiza en lectura sobre producto y en escritura sobre documentación y sus índices.

El inventario inicial de Git contiene 1.354 archivos en docs. El control inicial `npm run docs:check` recorrió 211 archivos declarados y 1.145 enlaces, con cero incidencias en esa selección. El mapa anterior mezclaba registros de integración antiguos con guías de producto y omitía guías del arnés y de la cuota. La revisión separa las referencias funcionales de la evidencia fechada y preserva contratos y decisiones con consumidores.

El [seguimiento](../../odd/tasks/project-documentation-renewal.md) registra la actualización de noviembre. Las verificaciones de la aplicación se atribuyen a la sesión y entorno donde se ejecutaron.

## Resultado y comprobaciones

- README de entrada, índice y estado renovados. Las guías técnicas cubren la estructura de la rama principal, el arnés, las cuotas, los servicios y las verificaciones por candidato. Se preservaron byte a byte OpenAPI y la tarea contractual de corrección. [Revisión de guías](2026-11-18-guias-docs.md)
- De los 1.354 archivos de la base se retiraron 907, incluidos 512 PNG, 307 JSON auxiliares y 88 registros intermedios. El árbol documental resultante contiene 500 archivos. La revisión original permite recuperar los bytes retirados. [Detalle de históricos](2026-11-18-archivo-docs.md)
- Guía Brújula y 42 capturas de Ego Lite en escritorio y móvil, con API y web compiladas, recursos de prueba propios y proveedores sintéticos. Se cotejaron los SHA-256 del catálogo, el destino de cada captura, su decodificación y la ausencia de desborde horizontal en las mediciones. El entorno descartable cerró sin fallos de limpieza. [Galería y límites](2026-11-18-galeria-docs.md)
- Tres diagramas HTML autónomos y sus PNG se comprobaron sin red en Chromium. El verificador estático de la skill objeta la URL interna que contiene Nunito. Se cotejó la fuente con la original y se verificó el render efectivo en escritorio, móvil e impresión. [Verificación de diagramas](2026-11-18-diagramas-docs.md)
- Se analizaron todos los JSON conservados, los textos como UTF-8 estricto y los PNG con Pillow. Pasaron 45 pruebas focalizadas de documentación, contrato de identidad, CI, inventarios de migraciones y cuota. Pasaron el control documental del repositorio y la comprobación de whitespace. Los enlaces históricos al commit fijo se cotejaron en Git local.
- Esta auditoría actualiza documentación y evidencia visual sobre el producto de la revisión indicada. Las suites completas de producto y las llamadas a IA real corresponden a sus propios recibos. Entrega local, sin commit ni publicación.
