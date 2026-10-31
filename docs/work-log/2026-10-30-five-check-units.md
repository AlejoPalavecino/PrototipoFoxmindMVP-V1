# Unidades de cierre de cinco comprobaciones

- Coordinador: `/root`, rama `codex/five-historical-checks`.
- Base: `fd47adf`.
- Alcance: cinco omisiones, sin cambios de producto ni despliegue.
- Evidencia: [coordinación](2026-10-30-root-five-historical-checks.md), [pruebas](2026-10-30-five-pending-tests.md) y [revisión independiente](2026-10-30-five-pending-review.md).

## A — Cuatro casos explícitos en su recorrido real

P3/P5 rápidos conservan doce casos puros. Los cuatro casos de navegador se ejecutan como subtests explícitos de P5, con el mismo origen preparado y presupuesto conjunto90s. Se conserva seguridad del enlace, autorización/invitación explícita, menú móvil y medidas de layout. Las instrucciones activas usan el wrapper existente. P5 completo13/0/0, FAST completo783/0/0 y guard de migraciones lector de P54/0/0. Runtime: Next/proxy/API/servicios efímeros, con cuatro subcasos de transporte controlado separados. Rollback: revertir A devuelve los cuatro casos al esquema opt-in; no cambia producto. Commit observado69a73d8:6archivos,148inserciones/152eliminaciones; Gitleaks y diff-check del índice exit0, sin hallazgos.

## B — Resumen automático y fixture de alcance limitado

El placeholder manual se reemplaza por navegador real:894x486, desplazamiento efectivo, visibilidad/hit-test, teclado hasta30Tab y ausencia de recentrado tras actualización diferida. Se reutiliza el preview existente con lifecycle importable, sin arranque al importar, cache propia y propagación de fallos de cierre. Solo el escenario sintético incorpora controles de remoción; no se toca producto ni se usa Reactfiber/remount. Entrada resumen pasa de FAST a owned-browser:305/51/23, FAST180/browser42.

Resumen final1/0/0 y Ego visual observado; FAST783/0/0, fronteras y metadata exit0. P5 completo13/0/0 y servicios propios limpios. Advisory: cache del preview CLI cancelado sin propiedad identificada, sin borrado arbitrario; callback normal sí cierra. Rollback: revertir B devuelve el resumen a condición manual/FAST y retira el lifecycle sintético, sin afectar A ni producto. Commit pendiente del escaneo y guardado; unidad menor de400líneas.
