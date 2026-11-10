# Feature: Migración de arquitectura por dominios

- **Spec:** docs/engineering/architecture-migration.md
- **Design:** docs/engineering/architecture-migration.md
- **Approval:** approved

El 2026-11-10 el usuario aprobó el plan y autorizó comenzar por etapas con pruebas y verificaciones. Publicación/despliegue y cambios funcionales/de datos fuera del alcance.

Ese mismo día autorizó la integración DB sobre recursos propios y los commits locales del primer corte. No autorizó push ni despliegue. La entrega se realiza en `codex/architecture-foundation`.

## Tasks

### TASK-001 — Base de responsabilidades, garantías y pruebas
- **State:** DONE
- **Depends on:** none
- **Owner:** root
- **Acceptance:** Mapa de origen/destino, dueños, transacciones y consumidores de CI; base de lint, inventario, pruebas rápidas y compilación con fallos previos identificados.
- **Evidence:** Mapa en docs/engineering/architecture-migration.md; registro de base: lint/inventario/builds PASS, selección focal 60 PASS; suite rápida 35 PASS/2 FAIL previos identificados y resto no ejecutado. DONE corresponde a caracterización, no a suite integral verde.
- **Blocker:** none

### TASK-002 — Guard de nuevas fronteras y componentes genéricos independientes
- **State:** DONE
- **Depends on:** TASK-001
- **Owner:** root
- **Acceptance:** Guard rechaza dependencias prohibidas en módulos/features nuevos; Notice/Dialog compartidos sin dependencia de Aulas, con contrato de comportamiento preservado y consumidores actualizados.
- **Evidence:** RED registrado; guard y Agenda compartida: 32 PASS, lint PASS con 123 excepciones previas. Ego Lite en fixture sintética: abrir/cerrar/Escape/restaurar foco y error de título con foco correctos, viewport efectivo 1536x706. Registro detalla límites de responsive/fixture.
- **Blocker:** none

### TASK-003 — Navegación global separada del cliente de Aulas
- **State:** DONE
- **Depends on:** TASK-002
- **Owner:** root
- **Acceptance:** Destinos y continuaciones seguros conservan aceptación/rechazo y enlaces; consumidores globales usan application/navigation. Compatibilidad sin duplicar reglas; tipos/build y contratos verdes.
- **Evidence:** 67 pruebas focales PASS, 84 de componentes/chat PASS, guard final 17 PASS, build web y tipos classrooms/web PASS. Revisor independiente: 39 focales + 17 guard PASS y comparación literal sin hallazgos pendientes. Registro conserva fallos previos y limitación Docker, sin declarar suite completa verde.
- **Blocker:** none

### TASK-004 — Piloto Agenda completo y validado
- **State:** READY
- **Depends on:** TASK-003, TASK-008
- **Owner:** root
- **Acceptance:** Feature y módulo por responsabilidades, proyección académica pública acotada, operaciones/recurrencia/zonas/permisos/conflictos/repasos conservados; integración aislada y navegador real.
- **Evidence:** none
- **Blocker:** none

### TASK-005 — Features restantes del frontend
- **State:** PLANNED
- **Depends on:** TASK-004
- **Owner:** root
- **Acceptance:** Cortes por identidad/global, Foxy/Estudio, Aulas/enseñanza, actividades/entregas/corrección e Inicio/avisos; cada corte conserva roles, estados, responsive, navegación y pruebas. Desglosar antes de ejecutar cada corte.
- **Evidence:** none
- **Blocker:** none

### TASK-006 — Dominios restantes del backend
- **State:** PLANNED
- **Depends on:** TASK-004
- **Owner:** root
- **Acceptance:** Cortes por contratos identidad/files, aulas/pertenencia, enseñanza, actividades/participación/calificación y Foxy/Estudio/Inicio/host; APIs públicas y garantías transaccionales preservadas. Desglosar antes de ejecutar.
- **Evidence:** none
- **Blocker:** none

### TASK-007 — Retiro de compatibilidad y aceptación integral
- **State:** PLANNED
- **Depends on:** TASK-005, TASK-006
- **Owner:** root
- **Acceptance:** Sin puentes temporales sin consumidores, excepciones restantes justificadas, documentación/CI actualizadas, suite completa aplicable y revisión independiente de rutas críticas. Distinguir local, integrado, publicado y desplegado.
- **Evidence:** none
- **Blocker:** none

### TASK-008 — Cierre del primer corte con integración DB y commits
- **State:** DONE
- **Depends on:** TASK-003
- **Owner:** root
- **Acceptance:** Integración PostgreSQL propia y controles de deriva/verificación del corte observados; fallos previos resueltos o delimitados, sin cambiar SQL histórico ni debilitar aceptación. Commits locales por unidad, registro actualizado y árbol limpio para iniciar TASK-004.
- **Evidence:** PostgreSQL propio: grupo owned-db reconciliado 131/131 archivos, 847 PASS/0 FAIL/0 SKIP; fast 320/320 archivos, 1777 PASS/0 FAIL/0 SKIP. Base DB 38 PASS + smoke, deriva exit0, selección Agenda/Estudio/concurrencia 17 PASS, pure 179 PASS. Build/tipos/lint/docs/TTP/inventario pasan; cero contenedores descartables restantes. Correcciones de expectativas revisadas y permisos/privacidad preservados. Commits 1edf09c, 906b4e8, 5a22424, 59855ee y d70a658; recibo final en docs/work-log/2026-11-10-root-architecture-migration.md y commit de cierre. Sin push/merge/deploy.
- **Blocker:** none
