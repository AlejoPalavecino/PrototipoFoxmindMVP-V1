# Feature: Migración de arquitectura por dominios

- **Spec:** docs/engineering/architecture-migration.md
- **Design:** docs/engineering/architecture-migration.md
- **Approval:** approved

El 2026-11-10 el usuario aprobó el plan y autorizó comenzar por etapas con pruebas y verificaciones. Publicación/despliegue y cambios funcionales/de datos fuera del alcance.

El usuario autorizó posteriormente terminar las cinco tareas restantes y sus commits locales, conservando contratos y verificaciones. No push/PR/merge/deploy ni acceso a datos retenidos/proveedores reales.

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
- **State:** DONE
- **Depends on:** TASK-004
- **Owner:** root
- **Acceptance:** Cortes por identidad/global, Foxy/Estudio, Aulas/enseñanza, actividades/entregas/corrección e Inicio/avisos; cada corte conserva roles, estados, responsive, navegación y pruebas. Desglosar antes de ejecutar cada corte.
- **Evidence:** Features completas, composición en screens/application y transporte puro;843PASS revisadas y fast334/334=1859PASS, tipos/buildPASS. QA independiente31recibos/9capturas ambosroles/estados/foco y TASK026corrige2CSS con5capturasactuales. Aceptaciónbrowserintegrada completa se cierra enTASK023.
- **Blocker:** none

### TASK-006 — Dominios restantes del backend
- **State:** DONE
- **Depends on:** TASK-004
- **Owner:** root
- **Acceptance:** Cortes por contratos identidad/files, aulas/pertenencia, enseñanza, actividades/participación/calificación y Foxy/Estudio/Inicio/host; APIs públicas y garantías transaccionales preservadas. Desglosar antes de ejecutar.
- **Evidence:** Módulos y puertos completos, revisión independiente SQL/tx/actor/locks/DI. OwnedDB131/131archivos847PASS/0FAIL/0SKIP reconciliados porúltima ejecución canónica exitosa; servicios9/9archivos52PASS. Fuente backend estable entre checkpoints; sólo fixtures de nuevos puertos se completaron sin cambiar asserts.
- **Blocker:** none

### TASK-007 — Retiro de compatibilidad y aceptación integral
- **State:** DONE
- **Depends on:** TASK-005, TASK-006
- **Owner:** root
- **Acceptance:** Sin puentes temporales sin consumidores, excepciones restantes justificadas, documentación/CI actualizadas, suite completa aplicable y revisión independiente de rutas críticas. Distinguir local, integrado, publicado y desplegado.
- **Evidence:** Migración y retiro originales verificados: AST con cero excepciones; fast actual reconciliado 1904 PASS/335 archivos, DB 847 PASS/131 archivos, servicios 52 PASS/9 archivos, wrappers 153 PASS/19 rutas y navegador 174 PASS/44 archivos, sin fallos/omisiones en últimas ejecuciones completas seleccionadas. Revisiones independientes y QA real documentadas. TASK-028 es la corrección HTTP adicional autorizada después; TASK-023/024 conservan su verificación y entrega pendientes.
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

### TASK-016 — Foxy y Estudio frontend por features
- **State:** DONE
- **Depends on:** TASK-015
- **Owner:** root
- **Acceptance:** UI/model/API propias con entradas públicas, screens y adaptadores de composición separados; roles/navegación/estados/abortos/recursos preservados, pruebas existentes sin debilitar.
- **Evidence:** Features Foxy/Estudio congeladas; revisión independiente frontend843PASS/148archivos, tipos webPASS, declaraciones388 y3220aserciones conservadas salvo rutas/compat temporal explícitas. Evidencia frontend-review; aceptación globalTASK023 pendiente.
- **Blocker:** none

### TASK-017 — Frontend académico, Inicio y avisos por responsabilidades
- **State:** DONE
- **Depends on:** TASK-015
- **Owner:** root
- **Acceptance:** Aulas/pertenencia, curriculum, materiales, comunicación, autoría/participación/calificación e Inicio/avisos con propietarios y contratos públicos; composición global fuera de features, JSX/CSS/roles y pruebas conservados.
- **Evidence:** Frontend académico128fuentes;62archivos243PASS y revisión independiente frontend843PASS, JSX/CSS/roles y1283aserciones del corte conservados; composiciones en application/screens. Evidencia academic-features/frontend-review.
- **Blocker:** none

### TASK-018 — Backend técnico identidad/files y composición de infraestructura
- **State:** DONE
- **Depends on:** TASK-004
- **Owner:** root
- **Acceptance:** Identidad/seguridad/correo/files por responsabilidad, contratos públicos y adaptadores/bootstrap; sesiones/tokens/custodia/cierre y SQL preservados.
- **Evidence:** Módulos técnicos extraídos con68SQL y288aserciones exactas; revisión independiente44PASS. Regresión NestDI RED/GREEN conserva tokenhost; ruta crítica revisada, integración globalTASK023 pendiente.
- **Blocker:** none

### TASK-019 — Backend académico por capacidades y puertos transaccionales
- **State:** DONE
- **Depends on:** TASK-004
- **Owner:** root
- **Acceptance:** Aulas/curriculum/materials/communication/activities/participation/grading separados por responsabilidad con contratos pequeños; tx/locks/autorización/recepción/publicación precisas preservados.
- **Evidence:** Puertos/aplicación académicos con154consultas delegadas exactas (SQL/args/orden) en20unidades; revisión independiente85PASS y focales35nuevas+20regresiones+14contratos. Tx/actor/locks/correcciones conservados; academic-review.
- **Blocker:** none

### TASK-020 — Backend Foxy/Estudio/Inicio y proveedores
- **State:** DONE
- **Depends on:** TASK-004
- **Owner:** root
- **Acceptance:** Módulos y capas propias, puertos explícitos a dominios académicos/files, proveedores en infraestructura/composición; colas/presupuestos/reautorización y privacidad preservadas.
- **Evidence:** Foxy/Estudio/Inicio y proveedores por dueño; revisión independiente85PASS y equivalencia167fuentes. Hallazgo workerentry corregido,21testsPDF/diagramaPASS; sin proveedor real.
- **Blocker:** none

### TASK-021 — Reglas y contratos neutrales agrupados por dominio
- **State:** DONE
- **Depends on:** TASK-015
- **Owner:** root
- **Acceptance:** Core puro por dominio, identidad de errores conservada y consumidores actualizados, sin dependencias de frameworks o SQL accidental.
- **Evidence:** 53puentes retirados;44reglas agrupadas+7Agenda, contratosSQL/diagnóstico fuera dominio;6tests movidos. REDausencia/GREEN31PASS, tiposAPI/webPASS; mapa core-retirement-result. Dominio sin excepciones.
- **Blocker:** none

### TASK-022 — Retirar compatibilidad y cerrar fronteras
- **State:** DONE
- **Depends on:** TASK-016, TASK-017, TASK-018, TASK-019, TASK-020, TASK-021, TASK-025
- **Owner:** root
- **Acceptance:** Puentes sin consumidores retirados y consumidores/tests/CI/docs a sus dueños; todas las excepciones auditadas y resueltas o justificadas concretamente, sin whitelist de nuevas violaciones.
- **Evidence:** Retirados368puentesbackend/232frontend/53core; tests/CI/inventario528remapeados. ASTglobal0excepciones, guard24PASS, lintPASS y documentación99archivos/910enlaces0issues; entradas raíz permanentes delimitadas. Ajustes de fixtures en aceptaciónTASK023.
- **Blocker:** none

### TASK-023 — Aceptación integral de la migración
- **State:** DONE
- **Depends on:** TASK-022, TASK-028
- **Owner:** root
- **Acceptance:** Builds/tipos/lint/docs/inventario, suites completas aplicables con recursos propios, revisión independiente de rutas críticas y QA real de flujos integrados; fallos/omisiones identificados.
- **Evidence:** Fast completo posterior al cierre HTTP: 336/336 archivos y 1918 PASS. PostgreSQL reconciliado: 131/131 archivos y 847 PASS; servicios: 9/9 y 52 PASS; navegador: 44/44 y 174 PASS; wrappers: 19/19 rutas y 153 PASS. Cero fallos/omisiones en las últimas ejecuciones completas seleccionadas; cohortes mixtas y fallos previos explícitos en docs/verification/architecture-migration.json. Tipos API/web/preview, builds, lint/AST cero excepciones, inventario 530/53 exclusiones/23 rutas, docs 101 archivos/916 enlaces y 19 pruebas documentales/discovery PASS. Revisiones independientes y QA real registradas; TASK-028 DONE.
- **Blocker:** none

### TASK-028 — Entregar el rechazo HTTP sin cierre prematuro en la frontera JSON
- **State:** DONE
- **Depends on:** TASK-022
- **Owner:** root
- **Acceptance:** Corrección adicional autorizada explícitamente por el usuario. Ambos proxies conservan tamaños JSON aceptados, validación, permisos, headers y cero llamadas upstream ante rechazo. Respuesta 413 completa en los tamaños de frontera que reproducen ECONNRESET; descarte sin buffering con presupuesto adicional acotado y ventana metadata absoluta de 10 s, sin renovarla después del parseo. Exceso de descarte, plazo o cancelación cierra transporte y libera listeners/timers; no se garantiza respuesta completa para cuerpos arbitrariamente grandes. RED/GREEN de aceptación con escritor separado, contratos existentes y revisión independiente, tipos/build/lint.
- **Evidence:** RED protegido 14 FAIL antes de producción. Candidato congelado: 14 nuevas +22 originales PASS de implementador y revisor, 48/48 fronteras reales independientes con 413 completo/upstream cero, cap adicional/deadline absoluto/cancelación/cleanup y equivalencia AST de rutas/esquemas/headers. Tipos API/web/preview, build web y lint con cero excepciones PASS por root. Nueva prueba registrada en fast/transport; inventario 530/53 exclusiones/23 rutas. Suite rápida completa posterior: 336 archivos y 1918 PASS, sin fallos ni omisiones, en complete-fast-after-rejection-fix.log.
- **Blocker:** none

### TASK-024 — Entrega local completa y commits de cierre
- **State:** DONE
- **Depends on:** TASK-023, TASK-026, TASK-027
- **Owner:** root
- **Acceptance:** Commits por unidad y recibos reales, tablero/roadmap reconciliados, árbol limpio y límites local/publicado/desplegado explícitos.
- **Evidence:** Commits de código d09fc24701296a61542ab8e877dfda082e7f808b y 2b6ff79a3e52de16d3c767facb22a8d833eb6794, además de los cortes anteriores. Recibo, roadmap y registro final versionados en b26c026cf5d07b603c383d1f3ecbe0794690b424; git status --porcelain vacío comprobado después de ese commit. Este cierre del tablero se entrega en commit propio y se vuelve a comprobar el árbol. 28 tareas validadas; sólo entrega local, sin push/merge/despliegue.
- **Blocker:** none

### TASK-025 — Cliente y pantalla de archivos frontend
- **State:** DONE
- **Depends on:** TASK-015
- **Owner:** root
- **Acceptance:** Transporte puro de archivos en feature propia, UI que coordina sesión en screens y proxy servidor en application; contratos/custodia/contextos y markup conservados, pruebas/types/build.
- **Evidence:** Cliente files puro, pantalla coordina identidad y proxy en application;11contratosPASS, revisión frontend843PASS y tiposPASS, markup conservado.
- **Blocker:** none

### TASK-026 — Ajustes mínimos de accesibilidad autorizados durante aceptación
- **State:** DONE
- **Depends on:** TASK-022
- **Owner:** root
- **Acceptance:** Bordes de controles auth afectados con contraste al menos 3:1 sobre su fondo; Inicio sin desborde horizontal a 320/390 px. Conservar diseño, acciones, textos y áreas de interacción; pruebas reales tras compilación web fresca.
- **Evidence:** Dos reglas CSS acotadas.12focalesPASS; QAindependiente5capturas: inputs3,097:1/botones5,255:1, sinoverflow320/390/768/1440,8clics/8destinos, tecladofocovisible. Comparación mismaDOM390antes405→candidata390; altura32px conservada y anchoacciónampliado. CSS actual también usadoenbuildprivadoP3GREEN10; buildraíz final correspondeTASK023.
- **Blocker:** none

### TASK-027 — Evitar que navegación tape controles en ancho intermedio
- **State:** DONE
- **Depends on:** TASK-022
- **Owner:** root
- **Acceptance:** A 894 px el resumen de alumno permanece visible, recibe clic y foco por teclado y no se recentra al actualizar alumnos. La navegación conserva sus destinos y disposición actual; comprobar también anchos a ambos lados del intervalo 801–1023 px. Dentro de la autorización vigente de ajustes mínimos de accesibilidad y desbordes.
- **Evidence:** RED real conservado; GREEN final 1/1 con SHA antes/después iguales: summary-static-final-results/extra-receipt. A 894 px elementFromPoint devuelve BUTTON, teclado alcanza ficha y actualización no recentra. Navegación Plan→Alumnos y foco sin oclusión a 800/801/1023/1024; cuatro capturas. CSSOM y geometría idénticos al quitar/restaurar las dos propiedades a 768/1280. Build web raíz actual PASS en web-build-final-navigation.log. CSS SHA a81c0cc426fc0618ea353bb476e2c3fe0bf3b850ab4c01ebfab7cbba39c0c2b6.
- **Blocker:** none
