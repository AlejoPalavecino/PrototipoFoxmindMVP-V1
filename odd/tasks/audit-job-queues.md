# Feature: Una primitiva común para las colas durables de la API (D4)

- **Spec:** #especificacion
- **Design:** #diseno
- **Approval:** approved
- **Evidence mode:** candidate-v1
- **Trace mode:** requirements-v1

El 2026-11-28 el usuario eligió la opción A de D4 de la [auditoría](../../docs/work-log/2026-11-26-root-full-stack-audit.md): una primitiva de colas propia, sin dependencias como pg-boss o graphile-worker. El mismo día autorizó commit y push a `main` corte por corte con `fast`, `owned-db` y `wrappers` en verde, y eligió hacer D3 antes que D4 ([registro](../../docs/work-log/2026-11-28-root-audit-transport-queues.md)). No concede despliegue.

## Seguimiento Git

Base `main` en `8f4d860`. Un commit por corte, si el usuario autoriza la publicación.

## Especificacion

- **REQ-001:** Sin migraciones ni cambios de datos: la primitiva trabaja sobre las tablas y columnas que ya usa cada cola. Los datos retenidos no se tocan.
- **REQ-002:** La primitiva reclama con `FOR UPDATE SKIP LOCKED`, renueva el *lease*, recupera los vencidos y completa o falla un trabajo con el reloj de la base, como hacen hoy las colas.
- **REQ-003:** Los nombres de tabla y columna que recibe son constantes del código, validadas contra un patrón de identificador; ningún valor de usuario entra en el SQL (relacionado con B7).
- **REQ-004:** Cada cola migrada conserva su orden, su concurrencia, sus reintentos y sus estados visibles; sus pruebas actuales siguen en verde sin cambios de expectativa.

## Diseno

Inventario del 2026-11-28 (`SKIP LOCKED` en 14 archivos de `apps/api/src`): unas 9 colas con reclamo y *lease* (correo, invitaciones, generación de actividades, extracción curricular, turnos de Foxy, escritura docente, análisis del alumno, IA de calificación y adjuntos) y 5 purgas o recuperaciones (purga de identidad, retención, recuperación de turnos, recuperación de generaciones y avance de repasos). La auditoría había contado 12 archivos. Las purgas y recuperaciones quedan fuera de alcance salvo que encajen sin esfuerzo; se indicará en su corte.

Orden: la primitiva sola contra una tabla sintética; después las dos colas casi iguales (generación y extracción); después los trabajadores de calificación y análisis; invitaciones y adjuntos; y al final correo (con `wrappers` y la seguridad de identidad) y turnos de Foxy (liquidación de presupuesto y recuperación).

## Tasks

### TASK-001 — Primitiva de cola probada contra una tabla sintética
- **State:** PLANNED
- **Depends on:** none
- **Owner:** orchestrator
- **Requirements:** REQ-002, REQ-003
- **Verification:** prueba owned-db con concurrencia real: dos consumidores no toman el mismo trabajo; un *lease* vencido se recupera; identificadores inválidos se rechazan
- **Acceptance:** La primitiva existe y no la usa todavía ninguna cola.
- **Scope:** ["apps/api/src/platform/database/"]
- **Evidence:** none
- **Blocker:** none

### TASK-002 — Generación de actividades y extracción curricular
- **State:** PLANNED
- **Depends on:** TASK-001
- **Owner:** orchestrator
- **Requirements:** REQ-001, REQ-004
- **Verification:** pruebas actuales de ambas colas sin cambios
- **Acceptance:** Las dos colas usan la primitiva.
- **Scope:** ["apps/api/src/modules/activities/generation/infrastructure/activity-ai/queue.ts", "apps/api/src/modules/curriculum/generation/infrastructure/ai/queue.ts"]
- **Evidence:** none
- **Blocker:** none

### TASK-003 — IA de calificación, análisis del alumno y escritura docente
- **State:** PLANNED
- **Depends on:** TASK-002
- **Owner:** orchestrator
- **Requirements:** REQ-001, REQ-004
- **Verification:** pruebas actuales de los tres trabajadores sin cambios
- **Acceptance:** Los tres usan la primitiva.
- **Scope:** ["apps/api/src/modules/grading/"]
- **Evidence:** none
- **Blocker:** none

### TASK-004 — Invitaciones y adjuntos
- **State:** PLANNED
- **Depends on:** TASK-003
- **Owner:** orchestrator
- **Requirements:** REQ-001, REQ-004
- **Verification:** pruebas actuales sin cambios
- **Acceptance:** Las dos colas usan la primitiva.
- **Scope:** ["apps/api/src/modules/classrooms/invitations/infrastructure/delivery.ts", "apps/api/src/modules/files/custody/infrastructure/chat-attachment-service.ts"]
- **Evidence:** none
- **Blocker:** none

### TASK-005 — Correo y turnos de Foxy
- **State:** PLANNED
- **Depends on:** TASK-004
- **Owner:** orchestrator
- **Requirements:** REQ-001, REQ-004
- **Verification:** pruebas actuales sin cambios, incluidas `wrappers` (correo e identidad) y la liquidación de presupuesto de Foxy
- **Acceptance:** Las dos colas usan la primitiva; la recuperación de turnos queda documentada (dentro o fuera).
- **Scope:** ["apps/api/src/modules/identity/mail-delivery/", "apps/api/src/modules/foxy/turns/infrastructure/"]
- **Evidence:** none
- **Blocker:** none
