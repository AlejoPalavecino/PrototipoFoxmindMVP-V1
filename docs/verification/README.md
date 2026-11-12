# Evidencia vigente de FoxMind

El pulido UX/UI del 2026-11-09 tiene 28 capturas nativas Ego Lite inspeccionadas y 74 pruebas focalizadas aprobadas en el candidato registrado. Su [recibo](foxy-study-ux-polish.json) identifica archivos, comandos, viewports y límites; la [galería por flujo](../design/current/README.md#referencias-vigentes-del-pulido--2026-11-09) distingue app integrada de respuestas sintéticas controladas.

| Necesitás comprobar | Fuente |
|---|---|
| Dirección visual y reglas de interacción | [UX/UI vigente](../design/README.md) |
| Migración por dominios y ciclo de rechazo HTTP | [Recibo de arquitectura](architecture-migration.json), [registro de cierre](../work-log/2026-11-10-root-architecture-completion.md) |
| Chat, herramientas, colecciones y creación/plan | [Recibo del pulido](foxy-study-ux-polish.json), [registro visual](../work-log/2026-11-09-root-ux-visual.md) |
| Imágenes, viewport, desplazamiento y procedencia | [Galería](../design/current/README.md), [catálogo con hashes](../design/current/catalog.json) |
| Validación E2E de Foxy AI y Carpetas de estudio | [Informe del 2026-11-12](2026-11-12-foxy-study-e2e.md) |
| Recorridos funcionales por rol y cobertura pendiente | [Matriz](flows.md), [datos de la base](flows.json) |
| Comprobaciones de la reconstrucción inicial | [Checks de base](baseline-checks.json), [registro coordinador](../work-log/2026-11-07-root-current-baseline.md) |
| Retiro de documentación anterior | [Recibo de retiro](documentation-retirement.json) |

## Cómo interpretar la evidencia

La app integrada usa cuentas/contenido sintéticos y recursos locales propios. Las capturas de espera, error y propuesta de plan del pulido usan componentes reales con respuestas sintéticas; acreditan presentación e interacción, no persistencia ni una nueva respuesta exitosa del proveedor. Los ensayos Gemini previos tienen sus [recibos específicos](local-gemini-runtime.json).

La matriz de la base inicial contiene 37 entradas PASS, 2 de referencia, 3 limitadas y 4 no ensayadas. Esos números describen ese recorrido, no una ejecución nueva ni toda la cobertura de la plataforma. Las comprobaciones posteriores se enlazan por capacidad y conservan sus propios límites.

Una captura no prueba permisos, custodia de archivos, datos guardados, accesibilidad universal o despliegue. El pulido verificó visualmente 1440×1000 y 390×844; no es una auditoría WCAG completa ni una prueba con todos los dispositivos físicos. Implementado/verificado localmente, integrado/publicado y desplegado siguen siendo estados separados.
