# Feature: Migración de arquitectura por dominios

- **Spec:** docs/engineering/architecture-migration.md
- **Design:** docs/engineering/architecture-migration.md
- **Approval:** approved

El 2026-11-10 el usuario aprobó el plan y autorizó comenzar por etapas con pruebas y verificaciones. Publicación/despliegue y cambios funcionales/de datos fuera del alcance.

El pedido vigente amplía la autorización a commits locales de cierre Agenda y ejecución del corte de identidad/composición global frontend. Sin push/PR/merge/deploy.

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
- **State:** DONE
- **Depends on:** TASK-003, TASK-008
- **Owner:** root
- **Acceptance:** Feature y módulo por responsabilidades, proyección académica pública acotada, operaciones/recurrencia/zonas/permisos/conflictos/repasos conservados; integración aislada y navegador real.
- **Evidence:** Piloto implementado, verificado y cerrado con commits locales e6d8349, febe948 y 1089678 más recibo documental. Fast reconciliado 322/322 archivos: 1785 PASS/0 FAIL/0 SKIP; integración 85 PASS, DB final 19 PASS, builds/tipos/lint/inventario/docs/TTP PASS. Revisión independiente sin hallazgos pendientes. Ego Lite CRUD/error/conflicto/foco y responsive iframe 390x844; límites y fallos resueltos en docs/work-log/2026-11-10-root-agenda-pilot.md. TASK-009 a TASK-012 DONE.
- **Blocker:** none

### TASK-009 — Dominio neutral de Agenda agrupado con compatibilidad
- **State:** DONE
- **Depends on:** TASK-003, TASK-008
- **Owner:** root
- **Acceptance:** Tipos/reglas/puertos agrupados por dominio; entradas anteriores conservan identidad de errores/funciones y comportamiento. Sin frameworks/Node en dominio ni ciclos nuevos.
- **Evidence:** RED de nueva entrada scoped registrado; 13 pruebas de dominio/barrel/zonas PASS tras agrupar siete archivos. Guard AST PASS, mismas 123 excepciones. Compatibilidad conserva identidad y rechazo DST ambiguo.
- **Blocker:** none

### TASK-010 — Backend Agenda desacoplado con unidad transaccional preservada
- **State:** DONE
- **Depends on:** TASK-009
- **Owner:** root
- **Acceptance:** Aplicación/persistencia/HTTP diferenciados; proyección académica por puerto público inyectado con el mismo tx/actor. Autenticación, locks, revisión, errores y Estudio/Agenda conservados; compatibilidad de consumidores.
- **Evidence:** Backend: RED 4 FAIL por ruta ausente -> 4 PASS; equivalencia mecánica 7/7 con SQL intacto. Bootstrap inyecta proyección pública con mismo tx/actor. Build API PASS; integración inicial 85 PASS y repetición DB final 19 PASS. Revisión independiente sin hallazgos funcionales; registro root-agenda-pilot.
- **Blocker:** none

### TASK-011 — Feature Agenda y composición frontend independientes
- **State:** DONE
- **Depends on:** TASK-009
- **Owner:** root
- **Acceptance:** UI/model/api agrupados, index público, pantalla y adaptadores de identidad/proxy en composición. Sin dependencias hacia internos de Aulas ni ciclos; contratos/UI/estados y compatibilidad conservados.
- **Evidence:** Feature: RED por index ausente -> suite focal 84 PASS; compatibilidad 2 PASS, tipos focales 0 diagnósticos, build web PASS. JSX/CSS equivalentes y ciclos eliminados. Ego Lite: CRUD/conflicto/error/foco y responsive iframe 390x844; límites en registro root-agenda-pilot. Revisión independiente sin hallazgos.
- **Blocker:** none

### TASK-012 — Aceptación integrada e independiente del piloto
- **State:** DONE
- **Depends on:** TASK-010, TASK-011
- **Owner:** root
- **Acceptance:** Suite focal/DB/HTTP/Estudio, build/tipos/lint/CI, QA real y revisión independiente del candidato; documentación/recibos reconciliados y TASK-004 DONE sólo con evidencia completa.
- **Evidence:** Fast final 1785 PASS, 322/322 archivos reconciliados; DB final 19 PASS y selección integrada inicial 85 PASS; build API/web, tipos classrooms/web, lint112, guard18, inventario516, docs/TTP y diff-check PASS. Revisión independiente71 + identidad preload2 PASS, sin hallazgos pendientes. Ego real sintético con CRUD/error/conflicto/foco y frame390x844; retry click no verificado en navegador, sí automatizado. Registro root-agenda-pilot conserva fallos/omisiones y cierre.
- **Blocker:** none

### TASK-005 — Features restantes del frontend
- **State:** IN_PROGRESS
- **Depends on:** TASK-004
- **Owner:** root
- **Acceptance:** Cortes por identidad/global, Foxy/Estudio, Aulas/enseñanza, actividades/entregas/corrección e Inicio/avisos; cada corte conserva roles, estados, responsive, navegación y pruebas. Desglosar antes de ejecutar cada corte.
- **Evidence:** Primer corte TASK-013 a TASK-015 DONE; registro docs/work-log/2026-11-10-root-identity-frontend.md. Resto de features pendiente.
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

### TASK-013 — Identidad pública y pantalla coordinadora
- **State:** DONE
- **Depends on:** TASK-004
- **Owner:** root
- **Acceptance:** Cliente/errores/validación y UI por responsabilidad, entrada pública explícita, screen conserva flujos y elimina ciclo de tipos. Login/registro/confirmación/perfil/contraseña conservan campos, efectos, errores, avatar y permisos.
- **Evidence:** RED entrada ausente 0/2 -> GREEN29 PASS; implementación/JSX/CSS equivalentes8/8 y páginas8/8 sólo imports. API pública pura preserva identidad de errores/funciones. Integración final324/324 archivos1790 PASS; tipos/build y revisión independiente sin hallazgos pendientes. Registro root-identity-frontend.
- **Blocker:** none

### TASK-014 — Composición global y adaptadores de documento/servidor
- **State:** DONE
- **Depends on:** TASK-004
- **Owner:** root
- **Acceptance:** Navbar global y shell en application, proxies/SSR/captura de prueba separados del bundle navegador; shared genérico independiente. Consumidores usan contratos públicos, markup/CSS/orden de tokens y foco conservados.
- **Evidence:** RED shell/puentes2 FAIL -> GREEN2 PASS; proxy/documento18 PASS; composición/feature/navegación/guard35 PASS. `_app` conserva captura/CSS, shell focus/cleanup; bare Node/React/Next rechazados (revisor23 PASS). Build web y tipos PASS; Ego sintético verifica flujos/rol/avatar/foco client-route y viewport390x844, límites en registro. Preview helper adapta marcador sin tocar producción.
- **Blocker:** none

### TASK-015 — Verificación y cierre del corte identidad/global
- **State:** DONE
- **Depends on:** TASK-013, TASK-014
- **Owner:** root
- **Acceptance:** Contratos cliente/proxy/UI/navegación/seguridad de documento, tipos/builds/lint/CI y navegador real sintético pasan; revisión independiente y documentación reconciliadas.
- **Evidence:** Fast reconciliado324/324 archivos:1790 PASS/0 FAIL/0 SKIP. Revisor72 PASS y revalidación23 PASS, P2 guard corregido, sin hallazgos pendientes. Build API (preparación fast)/web, tipos web/classrooms, lint110, inventario518, docs/TTP y diff-check pasan. QA real sintético y artefactos propios en registro root-identity-frontend. Sin DB/proveedor/correo real ni despliegue; evidencia de persistencia limitada a memoria de fixture.
- **Blocker:** none
