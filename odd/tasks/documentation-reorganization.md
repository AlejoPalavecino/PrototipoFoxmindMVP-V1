# Documentación vigente y navegación por dominios

## Alcance autorizado

Aplicar el [plan Astra](../../docs/audits/2026-10-30-astra-documentation-audit.md) sobre la base `d4fdf34`, conservando los cortes del [21 de octubre](../../docs/audits/2026-10-21-docs-audit/README.md) y del [22 de octubre](../../docs/audits/2026-10-22-reorganization-map/checks.json) como antecedentes. Un único mapa actual documentará cada destino y ruta de compatibilidad. Integración y push a main autorizados por el usuario; sin producto ni despliegue.

## Unidades y salida

| Unidad | Estado | Criterio de salida |
|---|---|---|
| Estado y contratos vigentes | Verificado | Extensiones IA, login, diseño y tarea issue #2 reconciliados con evidencia posterior, sin inventar alcance |
| Guías por dominio | Verificado |43rutas canónicas, aliases y228anclas compatibles |
| Arquitectura, operación y verificación | Verificado | Camino de lectura corto y guías actuales separadas de evidencia histórica |
| Historia y diseños | Verificado | Catálogo de550registros por16fechas;1448archivos históricos/procedencia preservados |
| Depuración confirmada | Verificado | Cuerpos de guía concentrados en un destino; cuatro paresPNG conservados por rol/procedencia, sin borrados injustificados |
| Controles y entrega | Controles aprobados; integración pendiente | CLI137/1657/0, FAST794/0/0, revisión y secretos; falta comprobar main/remoto y limpieza finales |

## Límites de compatibilidad

Mantener `docs/foxmind-v1-functional-spec.md`, `docs/implementation-roadmap.md`, `docs/api/accounts-sessions.openapi.json`, `odd/tasks/grading-ai-issue-2.md`, los archivos de work-log y sus artefactos. La existencia de la tarea IA activa controles de CI. Los aliases documentales no pueden ocultar consumidores ejecutables ni reemplazar datos contractuales por redirecciones.

Conservar IDs normativos, 82 flujos, atribuciones, fallos y límites de aceptación. No ejecutar generadores históricos que sobrescriban sus salidas. No tomar fecha o ausencia de enlace como evidencia suficiente para borrar. Los catálogos agrupan fuentes sin inventar estados de producto a partir de nombres.

## Evidencia y siguiente paso

[Mapa activo](../../docs/documentation-map.json), [recibos del corte](../../docs/audits/2026-10-31-documentation-reorganization/), [unidades locales](../../docs/work-log/2026-10-31-documentation-units.md) y [registro coordinador](../../docs/work-log/2026-10-30-root-documentation-reorganization.md). La reorganización y los controles están verificados; queda la integración/sincronización autorizada. No se declara una nueva aceptación funcional de toda la aplicación por esta reorganización.
