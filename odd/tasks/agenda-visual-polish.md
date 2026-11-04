# Feature: Pulido visual de Agenda

- **Spec:** ../../docs/design/agenda-polish/proposal.md
- **Design:** ../../docs/design/agenda-polish/banner-proposal-v4.png
- **Approval:** approved — usuario 2026-11-04; pedido original de implementación y aprobación del banner v4. Sin integración ni publicación.

## Tasks
### TASK-001 — Cabecera y paneles integrados
- **State:** DONE
- **Depends on:** none
- **Owner:** root
- **Acceptance:** Banner v4 completo con Foxy izquierdo siempre visible y CTA derecho sin superposición; quitar título superior y zona de cabecera. Paneles laterales próximos, Foxy de entregas sin recorte. Móvil sin desbordamiento.
- **Evidence:** [Capturas y mediciones](../../docs/work-log/evidence/2026-11-04-agenda-polish/README.md), cuatro anchos sin recorte ni overflow.
- **Blocker:** none

### TASK-002 — Formulario limpio y color reconocible
- **State:** DONE
- **Depends on:** none
- **Owner:** root
- **Acceptance:** Sin Más opciones ni resumen automático; observaciones último campo. Preservar controles de fecha final/zona antes de observaciones, acciones y validación existentes. Radios de color con muestra amplia, nombre y selección visible por teclado.
- **Evidence:** 60 pruebas focales PASS; teclado y guardado/edición sintéticos en [evidencia](../../docs/work-log/evidence/2026-11-04-agenda-polish/README.md).
- **Blocker:** none

### TASK-003 — Verificación y entrega local
- **State:** DONE
- **Depends on:** TASK-001, TASK-002
- **Owner:** root; revisión independiente separada
- **Acceptance:** Pruebas focales, tipos/build, QA sintética a 1440/768/390/320 y revisión independiente con límites explícitos. Sin datos reales ni modificaciones API/DB.
- **Evidence:** [Registro](../../docs/work-log/2026-11-04-id-unavailable-agenda-polish.md): tipos/build aislado/boundaries/documentación PASS; [revisión independiente](../../docs/work-log/2026-11-04-agenda-review-attributed.md) sin hallazgos.
- **Blocker:** none





Seguimiento R1 solicitado por el usuario: TASK-001 y TASK-003 reabiertas y cerradas con evidencia en docs/work-log/evidence/2026-11-04-agenda-polish/responsive-followup. Banner sin extensión crema en320–1440px, tipografía Segoe, CTA como Mis aulas y miniilustración156x104. TASK-002 permanece cerrada con sus pruebas anteriores;15focales reejecutadas PASS.

## Entrega local
-789cbd2: presentación de Agenda con pruebas, arte y evidencia.
-3423d1b: merge con main actual, conservando Inicio7b2b83d y Mis aulas9fb6422.
-Integrados en main local el2026-11-04 por autorización explícita;86pruebas del candidato combinadoPASS y66blobs previos idénticos. Sin push ni deploy.
-Registro vigente: docs/work-log/2026-11-04-id-unavailable-agenda-main-integration.md. Los límites históricos de publicación de esta tarea quedan sustituidos solo para commit e integración local.
