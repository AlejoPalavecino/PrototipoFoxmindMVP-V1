# Evidencia y comprobaciones de FoxMind

La implementación local de paridad del 15 de noviembre conserva su [informe y capturas](product-parity/README.md). La auditoría y galería anteriores que siguen abajo corresponden a otra base; no certifican el candidato actual.

La auditoría del 12 de noviembre recorrió `main` (`398cc0b`) con la aplicación local compilada, cuentas de ambos roles y proveedores sintéticos. El registro detalla qué controles se usaron, qué resultados se observaron y qué quedó cubierto por pruebas anteriores. [Registro de auditoría](../work-log/2026-11-12-root-documentation-audit.md) · [Galería](../design/current/README.md) · [Metadatos y hashes](../design/current/catalog.json)

| Área | Evidencia |
|---|---|
| Cuenta, roles, Aulas, Actividades, entregas y calificación | [Matriz de recorridos](flows.md), [inventario de la base del 7 de noviembre](flows.json) y [regresión de Aulas](classrooms-ux-unification.json) |
| Inicio y composición de Aulas | [Inicio docente](teacher-home-polish.json), [Inicio por rol](../work-log/2026-11-12-root-home-visual-audit.md) y [auditoría de Aulas](classrooms-visual-audit.json) |
| Foxy y Carpetas de estudio | [Recorridos E2E](2026-11-12-foxy-study-e2e.md), [suite de Estudio](study-folders.json) y [pulido UX anterior](foxy-study-ux-polish.json) |
| Agenda | [Detalle diario, navegación y formulario](agenda-ux.json) |
| Arquitectura y transporte | [Migración y verificación por grupos](architecture-migration.json) |
| Gemini real | [Ensayo de Foxy](foxy-gemini-real.json) y [arranque local](local-gemini-runtime.json) |
| Reconstrucción documental anterior | [Comprobaciones](baseline-checks.json) y [retiro del 7 de noviembre](documentation-retirement.json) |
| Retiro de maquetas y capturas reemplazadas | [Inventario del 12 de noviembre](documentation-audit-retirement.json) |

Los recibos conservan candidato, entorno y fecha de su ensayo. Las capturas acreditan la presentación y los estados visibles. Permisos, persistencia y custodia se acreditan en las pruebas de API y base de datos que los ejercitaron. Esta auditoría utilizó IA sintética. Los ensayos anteriores con Gemini mantienen su propia evidencia.

La cobertura se limita a los casos registrados. La validación visual en escritorio y móvil no constituye una evaluación WCAG completa, prueba de carga ni verificación de producción.
