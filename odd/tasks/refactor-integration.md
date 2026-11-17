# Feature: Integración local backend y frontend

- **Spec:** docs/work-log/2026-11-16-root-refactor-integration.md
- **Design:** docs/work-log/2026-11-16-root-refactor-integration.md
- **Approval:** approved

Autorización del usuario para integrar backend y luego frontend, con el orden y verificación propuestos. Sin publicación remota ni despliegue.

## Tasks

### TASK-001 — Candidatos capturados y recuperables
- **State:** DONE
- **Depends on:** none
- **Owner:** root
- **Acceptance:** Snapshots Git completos desde base compartida, originales intactos y mapa de procedencia recuperable.
- **Evidence:** Snapshot backend d79ee909e094b5c7dbbbcccf1eb2bf972908e0c1 y frontend eba381b3f28662daaca366687d34b12cfb30d955 desde dd6f4bc; índices alternativos y status original idéntico antes/después. Recibo local snapshots.json.
- **Blocker:** none

### TASK-002 — Candidato combinado conserva ambos refactors
- **State:** DONE
- **Depends on:** TASK-001
- **Owner:** root
- **Acceptance:** Backend primero, frontend después; conflictos reconciliados, sin pérdida de reglas/tests y compatibilidad conservada.
- **Evidence:** Backend primero, frontend después;14conflictos resueltos. Fuentes932backend/766frontend coinciden con snapshots,0faltantes/diferencias. Revisor confirma unión exacta685tests/57exclusiones/23rutas,CIcorrecto y cuerpos de2tests idénticos a ambos originales salvo imports. Entrada de compatibilidad intacta. Correcciones nuevas de fixtures verificadas enTASK003.
- **Blocker:** none

### TASK-003 — Verificación combinada e independiente
- **State:** IN_PROGRESS
- **Depends on:** TASK-002
- **Owner:** root y quality_reviewer
- **Acceptance:** Builds/tipos/lint/fronteras/suites/docs y flujos críticos verdes, revisión de conflictos, recibos y límites explícitos.
- **Evidence:** BuildsAPI/web ylint/guards EXIT0;revisor138pruebas propias PASS. Barrido474fast ycuatroE2E en curso. Docs205/1118/0 antes del recibo final.
- **Blocker:** none

### TASK-004 — Main actualizado y trabajo previo conservado
- **State:** PLANNED
- **Depends on:** TASK-003
- **Owner:** root
- **Acceptance:** Main contiene ambos snapshots y correcciones verificadas; trabajo ajeno de main preservado y comprobado; sin push/despliegue.
- **Evidence:** none
- **Blocker:** none
