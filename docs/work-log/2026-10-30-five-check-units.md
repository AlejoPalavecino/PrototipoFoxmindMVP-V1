# Unidades de cierre de cinco comprobaciones

- Coordinador: `/root`, rama `codex/five-historical-checks`.
- Base: `fd47adf`.
- Alcance: cinco omisiones, sin cambios de producto ni despliegue.
- Evidencia: [coordinación](2026-10-30-root-five-historical-checks.md), [pruebas](2026-10-30-five-pending-tests.md) y [revisión independiente](2026-10-30-five-pending-review.md).

## A — Cuatro casos explícitos en su recorrido real

P3/P5 rápidos conservan doce casos puros. Los cuatro casos de navegador se ejecutan como subtests explícitos de P5, con el mismo origen preparado y presupuesto conjunto90s. Se conserva seguridad del enlace, autorización/invitación explícita, menú móvil y medidas de layout. Las instrucciones activas usan el wrapper existente. P5 completo13/0/0, FAST completo783/0/0 y guard de migraciones lector de P54/0/0. Runtime: Next/proxy/API/servicios efímeros, con cuatro subcasos de transporte controlado separados. Rollback: revertir A devuelve los cuatro casos al esquema opt-in; no cambia producto. Commit pendiente, con DoD funcional aprobado; secretos/blancos se verifican sobre el índice definitivo.
