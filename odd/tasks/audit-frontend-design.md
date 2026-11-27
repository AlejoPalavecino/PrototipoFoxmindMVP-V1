# Feature: Diseño del frontend (F3–F11 de la auditoría)

- **Spec:** #especificacion
- **Design:** #diseno
- **Approval:** approved
- **Evidence mode:** candidate-v1
- **Trace mode:** requirements-v1

El 2026-11-26 el usuario aprobó atender los hallazgos de diseño del frontend de la [auditoría](../../docs/work-log/2026-11-26-root-full-stack-audit.md), salvo F1 y F2 (otra sesión), en cortes de unas 400 líneas con las opciones recomendadas: el formateador sólo sobre los archivos con líneas largas y fuera de `application/server/`; F8 se difiere hasta integrar F1, en coordinación con la sesión principal; el token CSRF se reutiliza sólo si la API lo acepta más de una vez. Sin cambios visibles de producto. Commits sólo en la rama propia; push, PR o merge requieren autorización aparte.

## Seguimiento Git

Base `main` en `a06c9214`. Rama `claude/audit-frontend-71cf98`, un commit por corte.

## Especificacion

- **REQ-001:** (F4) `lint:boundaries` aplica `react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps` y `react-hooks/set-state-in-effect` como error en `apps/web` y `apps/shared-ui`, y pasa.
- **REQ-002:** (F7) Ninguna línea de producción de `apps/web` ni `apps/shared-ui` supera el largo máximo, salvo `application/server/` (de F1).
- **REQ-003:** (F10, F11) No quedan módulos de producción alcanzados sólo por pruebas, ni carpetas con sólo pruebas que cargan código ajeno por ruta.
- **REQ-004:** (F6) No hay ciclo entre `application/clients` y `application/transport`; `application/navigation` no hace pedidos HTTP.
- **REQ-005:** (F9) La regla de arquitectura falla ante archivos o componentes nuevos que superan largo de línea, tamaño o cantidad de `useState`; las excepciones vigentes están listadas y sólo pueden achicarse.
- **REQ-006:** (F5) Los clientes HTTP del navegador comparten un helper de pedido y una clase de error base.
- **REQ-007:** (F3) `ActivityAuthoring`, `Activities` y `foxy-workspace` separan carga y reglas del render, con la misma UI.

## Diseno

Cortes en el orden de las tareas. Cada uno se verifica con `npx tsc --noEmit -p apps/web/tsconfig.json`, `npm run web:build`, `npm run lint:boundaries`, `npm run test:complete -- --group fast` y `npm run docs:check`; los que tocan pantallas, además en el navegador con un entorno propio y cuentas sintéticas.

## Tasks

### TASK-001 — Reglas de hooks activas (F4)
- **State:** IN_PROGRESS
- **Depends on:** none
- **Owner:** orchestrator
- **Requirements:** REQ-001
- **Verification:** npm run lint:boundaries
- **Acceptance:** Con las tres reglas como error, `lint:boundaries` pasa; un efecto que sólo reinicia estado hace fallar la regla.
- **Scope:** ["package.json", "package-lock.json", "eslint.config.mjs", "eslint-suppressions.json", "apps/web/src", "apps/shared-ui"]
- **Evidence:** {"command":"npx tsc --noEmit -p apps/web/tsconfig.json; npm run web:build; npm run lint:boundaries; npm run test:complete -- --group fast; npm run docs:check","result":"Corte 1a: reglas activas, 31 exhaustive-deps corregidos, 83 set-state-in-effect suprimidos; tsc ok, build ok, lint ok, fast 3224/3224, docs 0 issues. Falta bajar las supresiones."}
- **Blocker:** none

### TASK-002 — Líneas de producción acotadas (F7)
- **State:** PLANNED
- **Depends on:** TASK-001
- **Owner:** orchestrator
- **Requirements:** REQ-002
- **Verification:** scripts/check-frontend-architecture.mjs
- **Acceptance:** Ninguna línea fuera de `application/server/` supera el máximo; build y pruebas sin cambios.
- **Scope:** ["apps/web/src", "apps/shared-ui"]
- **Evidence:** none
- **Blocker:** none

### TASK-003 — Sin código alcanzado sólo por pruebas (F10, F11)
- **State:** PLANNED
- **Depends on:** TASK-002
- **Owner:** orchestrator
- **Requirements:** REQ-003
- **Verification:** npm run test:complete -- --group fast
- **Acceptance:** La copia de `PlanWorkspace` en `workflows` no existe y sus pruebas cargan el componente real; `features/foxy/model/` y `features/foxy/ui/` no contienen sólo pruebas.
- **Scope:** ["apps/web/src", "tests"]
- **Evidence:** none
- **Blocker:** none

### TASK-004 — Capas de aplicación sin ciclo (F6)
- **State:** PLANNED
- **Depends on:** TASK-003
- **Owner:** orchestrator
- **Requirements:** REQ-004
- **Verification:** npm run lint:boundaries
- **Acceptance:** Ningún módulo de `transport` importa de `clients`; `navigation` no llama a `fetch`.
- **Scope:** ["apps/web/src/application"]
- **Evidence:** none
- **Blocker:** none

### TASK-005 — La regla de arquitectura controla tamaño (F9)
- **State:** PLANNED
- **Depends on:** TASK-004
- **Owner:** orchestrator
- **Requirements:** REQ-005
- **Verification:** tests de scripts/check-frontend-architecture.mjs
- **Acceptance:** Un archivo nuevo con una línea larga, demasiadas líneas o demasiados `useState` hace fallar la regla; las excepciones actuales pasan.
- **Scope:** ["scripts/check-frontend-architecture.mjs", "tests"]
- **Evidence:** none
- **Blocker:** none

### TASK-006 — Capa HTTP común del navegador (F5)
- **State:** PLANNED
- **Depends on:** TASK-005
- **Owner:** orchestrator
- **Requirements:** REQ-006
- **Verification:** npm run test:complete -- --group fast
- **Acceptance:** Los clientes usan el helper común y sus errores extienden la clase base; las pruebas de clientes siguen verdes.
- **Scope:** ["apps/web/src/shared", "apps/web/src/features/*/api", "apps/web/src/application"]
- **Evidence:** none
- **Blocker:** none

### TASK-007 — Componentes grandes separados (F3)
- **State:** PLANNED
- **Depends on:** TASK-006
- **Owner:** orchestrator
- **Requirements:** REQ-007
- **Verification:** pruebas de cada componente y navegador
- **Acceptance:** Cada componente baja su cantidad de `useState` y la UI se comporta igual en el navegador.
- **Scope:** ["apps/web/src/features/activity-authoring", "apps/web/src/application/workflows/activity-session", "apps/web/src/features/foxy/workspace"]
- **Evidence:** none
- **Blocker:** none

### TASK-008 — Plazo de subida en la API (F8)
- **State:** BLOCKED
- **Depends on:** none
- **Owner:** orchestrator
- **Requirements:** none
- **Verification:** none
- **Acceptance:** Se define junto con el proxy de F1.
- **Scope:** ["apps/api/src/modules/files/uploads/presentation/http.ts"]
- **Evidence:** none
- **Blocker:** Diferido por decisión del usuario hasta integrar F1, en coordinación con la sesión principal.
