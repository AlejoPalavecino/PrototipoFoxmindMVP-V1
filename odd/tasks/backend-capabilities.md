# Feature: Backend organizado por capacidades

- **Spec:** docs/engineering/backend-capabilities-plan.md
- **Design:** docs/engineering/backend-capabilities-plan.md
- **Approval:** approved

Aprobación de diseño y ejecución del usuario el 2026-11-16: «Bien comenza con el plan hacelo en un branch distinto ya que otro agente va a estar haciendo un refactor del frontend.» Rama `codex/backend-capabilities`; worktree `C:/Users/alejo/.codex/worktrees/069c/ProtipoFoxMind`; base `dd6f4bc92b959cce0e2c68343291614270c4a17e`. Commits, push, merge, PR y despliegue no autorizados por este pedido. El orquestador es el único escritor del tablero.

Frontend concurrente: no modificar apps/web, apps/shared-ui ni diseño. Los cambios imprescindibles de imports al núcleo se coordinarán al llegar a TASK-022. Backend, scripts y pruebas compartidas se verifican en este worktree. Dependencias instaladas compartidas por junction de sólo uso; no ejecutar instalaciones o generación dentro de node_modules.

Decisión explícita posterior del usuario para TASK-022: «Conservar compatibilidad; el agente frontend migra sus imports». El retiro de la entrada global corresponde al cierre coordinado posterior, una vez sin consumidores. Para QA web se copió la instalación sin modificarla a un node_modules físico propio del worktree; la junction original se conservó en artefactos ignorados. No se instalaron ni cambiaron versiones.

Ampliación de aceptación autorizada por el usuario: «Adaptá también esos E2E en la rama backend, sin cambiar la UI». TASK-026–028 adaptan seis recorridos a las fuentes UI vigentes conservando reglas, controles y pruebas negativas. No habilita cambios de UI, producto, contratos, cuotas ni publicación.

## Tasks

### TASK-001 — Base aislada e inventario verificable
- **State:** DONE
- **Depends on:** none
- **Owner:** /root
- **Acceptance:** Worktree y rama propios; mapa por archivo, consumidores y pruebas; build, límites e inventario de partida registrados.
- **Evidence:** Worktree y rama confirmados; mapa inicial de 487 archivos API/13 dominios en docs/verification/backend-capabilities-map.json. Build fresco PASS (segundo intento, budget 120 s); límites 0 excepciones; inventario 636 entradas/54 exclusiones/23 rutas; suite pure 413/413 y transport 88/88 PASS. Docker apagado, integración aún no ejecutada.
- **Blocker:** none

### TASK-002 — Controles para capacidades sin perder aislamiento
- **State:** DONE
- **Depends on:** TASK-001
- **Owner:** /root
- **Acceptance:** Pruebas negativas RED/GREEN para capas y capacidades; ambas estructuras admitidas temporalmente sin nuevas excepciones; reglas frontend preservadas.
- **Evidence:** Worker: RED 26 PASS/3 FAIL; GREEN 29/29. Coordinador repite 29/29 y guard global PASS/0 excepciones. Reglas frontend y layouts legacy conservados. Registro worker-backend-capability-guards.
- **Blocker:** none

### TASK-003 — Piloto estructural de Plan
- **State:** DONE
- **Depends on:** TASK-002
- **Owner:** /root
- **Acceptance:** Plan y su adaptador/pruebas bajo curriculum/plan; misma tx, autorización, revisión y HTTP; consumidores e inventarios remapeados.
- **Evidence:** 4 archivos reubicados, API nombrada plan/public.ts, imports y 3 inventarios remapeados. Compilación en .build/backend-capabilities/plan PASS; pruebas de Plan/arquitectura 10/10; límites PASS/0 excepciones e inventario 636/54/23 sin pérdida. SQL y caso de uso conservados.
- **Blocker:** none

### TASK-004 — Autoría organizada por capacidad
- **State:** DONE
- **Depends on:** TASK-003
- **Owner:** chuli_worker
- **Acceptance:** Capacidad authoring con puertos, reglas y adaptadores localizables; imports, wrappers y pruebas remapeados sin cambio de comportamiento.
- **Evidence:** 5 archivos de aplicación/repositorio movidos, authoring/public.ts nombrado y 12 consumidores remapeados. Compilación nueva PASS; arquitectura/rúbrica 15/15 PASS; límites e inventario sin pérdida. Helpers SQL compartidos con generación quedan en ubicación legacy hasta TASK-008, sin puentes duplicados ni imports privados.
- **Blocker:** none

### TASK-005 — Repositorios de Autoría expresivos y tipados
- **State:** DONE
- **Depends on:** TASK-004
- **Owner:** chuli_worker
- **Acceptance:** Operaciones de negocio con comandos/resultados concretos; sin métodos numerados ni SQL en aplicación; locks y parámetros conservados; negativos de tipos/adaptador.
- **Evidence:** 15 operaciones con comandos/resultados concretos y lock acotado. RED 16/16 fallos esperados; GREEN worker y coordinador 18/18 (SQL exacto, argumentos, tx, 6 negativos de tipos y campos omitidos/null/vacíos). Tipos globales noEmit PASS tras integrar movimientos independientes. Nuevo test registrado en CI/inventarios.
- **Blocker:** none

### TASK-006 — Aulas: ajustes y borradores con decisiones en aplicación
- **State:** DONE
- **Depends on:** TASK-005
- **Owner:** chuli_worker
- **Acceptance:** Settings/drafts separan reglas de SQL, preservando promoción, pertenencia, revisión y transacción.
- **Evidence:** Aulas worker 72/72 y SQL77/77 idéntico; root build global PASS y tanda académica 389/391 inicial, dos fallos de referencias/identidad de fixture corregidos y 13/13 repetidos. Publicación/settings y negativos de tipos preservan tx/revisión.
- **Blocker:** none

### TASK-007 — Aulas: pertenencia, invitaciones y catálogo
- **State:** DONE
- **Depends on:** TASK-005
- **Owner:** chuli_worker
- **Acceptance:** Capacidades delimitadas; puertos tipados; permisos, cuotas, códigos, replay y consultas conservados.
- **Evidence:** Capacidades access/catalog/memberships/invitations y proyección, mapa34; SQL77 preservado, negativos de tipos y comportamiento72/72. Integración root/build PASS y regresiones académicas conciliadas; integración completa final en024.
- **Blocker:** none

### TASK-008 — Currículo y Biblioteca por capacidades
- **State:** DONE
- **Depends on:** TASK-005
- **Owner:** chuli_worker
- **Acceptance:** Plan, generación, biblioteca/publicación/versiones con decisiones en aplicación y tx compartida.
- **Evidence:** 49 movimientos, decisiones IA/apply en application y Library15 operaciones tipadas. Worker40/40; root build global PASS y nuevos casos en tanda académica conciliada. Wrappers constructores y SQL/tx preservados.
- **Blocker:** none

### TASK-009 — Muro separado de la bandeja
- **State:** DONE
- **Depends on:** TASK-005
- **Owner:** /root
- **Acceptance:** Communication gobierna posts/replies/moderación; inserción de avisos permanece atómica; contrato de bandeja preparado para Home.
- **Evidence:** Wall e Inbox separados; repo8+5 operaciones tipadas, productor atómico. Worker29/29 y SQL31 preservado/16 casos exactos; root build global y regresiones académicas PASS tras remap de fixture.
- **Blocker:** none

### TASK-010 — Participación por capacidades
- **State:** DONE
- **Depends on:** TASK-005
- **Owner:** chuli_worker
- **Acceptance:** Intentos, editor, cuestionarios, prácticas e historial conservan acceso, recepción, revisión y adjuntos.
- **Evidence:** 27 movimientos; contratos por objetos, SQL/locks sin cambio. Worker107 contratos compartidos con Grading; root tanda académica valida SQL/firma/tx y 35 casos existentes remapeados sin pérdida. Build global y negativos TS PASS.
- **Blocker:** none

### TASK-011 — Calificación por capacidades
- **State:** DONE
- **Depends on:** TASK-005
- **Owner:** chuli_worker
- **Acceptance:** Review/publicación/correcciones/progreso/asistencia conservan cálculo exacto, auditoría, privacidad y snapshots.
- **Evidence:** 21 movimientos; revisión/publicación/correcciones/progreso/asistencia/análisis, RevisionPort de Classroom. Worker107 contratos; root regresiones existentes y nuevas en tanda académica, build global/negativos TS PASS. Revisión SQL real global en024.
- **Blocker:** none

### TASK-012 — HTTP académico por capacidad y retiro de fachada
- **State:** DONE
- **Depends on:** TASK-006, TASK-007, TASK-008, TASK-009, TASK-010, TASK-011, TASK-025
- **Owner:** /root
- **Acceptance:** Handlers en presentation y contratos mínimos; admisión compartida, errores y límites preservados; fachada retirada sólo sin consumidores.
- **Evidence:** Runtime agrupado productivo sin ClassroomService; 17 servicios y un Core. Worker90/90 y root176/176 con build estricto fresco, HTTP/DI/IA/compatibilidad. Revisor independiente90/90 más dos probes de identidad register/integrated; fixture reutiliza factory real y queda sólo en tests. Aceptación global en024.
- **Blocker:** none

### TASK-013 — Identidad y ciclo de vida
- **State:** DONE
- **Depends on:** TASK-003
- **Owner:** chuli_worker
- **Acceptance:** Cohesión de cuenta/sesión/perfil/correo preservada; lifecycle en bootstrap; reglas y permisos conservados.
- **Evidence:** 24 movimientos/remaps, build Foundation y focalizadas conjuntas 57/57; lifecycle SMTP/host 10/10. Revisión independiente: 12/12 source, cuerpos de cuenta preservados y hooks movidos al host. Ningún bloqueo de permisos/lifecycle. Suites globales finales en TASK-024.
- **Blocker:** none

### TASK-014 — Archivos: custodia y recepción detrás de puertos
- **State:** DONE
- **Depends on:** TASK-003
- **Owner:** chuli_worker
- **Acceptance:** Uploads/downloads/custody/attachments organizados; HTTP no conoce store/filas; autorización previa, revalidación, cuotas y escaneo intactos.
- **Evidence:** authorizeReceive detrás de puerto, HTTP sin store/filas; build/focalizadas Foundation PASS. FileService real + PostgreSQL descartable 11/11 y startup-close repetido PASS. Revisión independiente 12/12 sin bloqueo crítico; P3 Uint8Array/Buffer corregido con RED 2/3 → GREEN 6/6 y contrato estrechado. Aceptación global en TASK-024.
- **Blocker:** none

### TASK-015 — Agenda por capacidades
- **State:** DONE
- **Depends on:** TASK-003
- **Owner:** chuli_worker
- **Acceptance:** Eventos y proyección académica conservan recurrencia compartida, revisiones, propiedad y UoW.
- **Evidence:** UoW preservada por comparación base/actual independiente; focalizadas Foundation y revisión source PASS; PostgreSQL propio 12/12 (persistencia, aislamiento, restricciones, recurrencia, color/CAS). Sin esquema cambiado. Suites globales finales en TASK-024.
- **Blocker:** none

### TASK-016 — Inicio y bandeja unificada
- **State:** DONE
- **Depends on:** TASK-009, TASK-013, TASK-015
- **Owner:** chuli_worker
- **Acceptance:** Home/notifications gobierna lectura/apertura/estado sin cambiar URLs, filtros, cursores, permisos o productores.
- **Evidence:** Home dashboard/notifications con Inbox y destino reautorizado; mapa24. Worker29/29 con Muro; root build PASS, nuevos tests de proyecciones/cursores/permisos y 13/13 repetidos tras actualizar entrada pública en prueba estructural.
- **Blocker:** none

### TASK-017 — Estudio: capacidades y contratos precisos
- **State:** DONE
- **Depends on:** TASK-014, TASK-015
- **Owner:** chuli_worker
- **Acceptance:** Estado y proveedor tipados, contexto estructurado para schema y compatibilidad con JSON previo; capacidades con dueño claro.
- **Evidence:** 38 mapas, estado v1 conocido tipado y schema contextual separado del prompt. Worker 77/77; root 78/78 caracterización sobre build nuevo capabilities más 2/2 schema. TypeScript global emit PASS y guard 0 excepciones. Protocolo sentinela aún intacto para corte siguiente.
- **Blocker:** none

### TASK-018 — Estudio: preparar, validar y aplicar generación
- **State:** DONE
- **Depends on:** TASK-017
- **Owner:** chuli_worker
- **Acceptance:** Protocolo explícito sin sentinela/replay del dispatcher; cancelación, revocación, recibos y resultados tardíos verificados.
- **Evidence:** Worker RED3→GREEN90/90 y tipos/guard PASS. Root build nuevo policies PASS, 99/99 de políticas+Study y 6/6 protocolo: tx por fase, proveedor afuera, PENDING/replay/cancelación/late conservados. Sin sentinela/captured de producción.
- **Blocker:** none

### TASK-019 — Foxy organizado por capacidades
- **State:** DONE
- **Depends on:** TASK-014
- **Owner:** chuli_worker
- **Acceptance:** Conversaciones/turnos/recursos/citas/assets/visuales/publicaciones con imports y consumidores remapeados.
- **Evidence:** 206 movimientos (103 fuentes/tests), SQL278 preservado y secuencia2823 asserts conservada. Worker 27/27 +57/57 proveedores sintéticos; root repite27/27 y revisa composición. Build global capabilities PASS y guard0; wrappers host integrados y URLs de módulo corregidas. Política editorial/citas queda para020.
- **Blocker:** none

### TASK-020 — Foxy: políticas y citas detrás de puertos
- **State:** DONE
- **Depends on:** TASK-019
- **Owner:** chuli_worker
- **Acceptance:** Reglas editoriales comprobables fuera de repositorio; aplicación sin SQL; atomicidad, CAS, leases y custodia conservados.
- **Evidence:** 19 nuevos casos de política/citas RED→GREEN y totalworker103/103; SQL278 hashidéntico/asserts2823 conservados. Root build policies PASS y 99/99 conjunto con19 casosFoxy. Application sin SQL de adjuntos; locks/CAS/recibos en adaptadores.
- **Blocker:** none

### TASK-021 — Integración IA neutral sin protocolos superpuestos
- **State:** DONE
- **Depends on:** TASK-008, TASK-011, TASK-018, TASK-020
- **Owner:** chuli_worker
- **Acceptance:** Consumidores migrados de a uno; conteo/reserva/liquidación/deadline y snapshots conservados; compatibilidad retirada sin consumidores; ningún proveedor activado.
- **Evidence:** Worker136/136 antes del remap core y63/63 tras último borde SDK bound-preflight;10 casos nuevos. Root build fresco y176/176 conjunto runtime/IA/contracts PASS. Revisor64/64 source y dos probes de despacho/cancelación; presupuesto/admisión/snapshots/política idénticos al snapshot anterior salvo imports. SDK clásico conserva auto-count; SDK con countForGeneration exige preflight. Aceptación global en024.
- **Blocker:** none

### TASK-022 — Núcleo por dueño y retiro de puentes
- **State:** DONE
- **Depends on:** TASK-012, TASK-016, TASK-018, TASK-020, TASK-021
- **Owner:** /root
- **Acceptance:** Backend sin consumidores del barrel global ni puentes innecesarios. Retirar compatibilidad sólo al no tener consumidores; coordinar imports frontend preservando su rama concurrente.
- **Evidence:** 142 archivos/155 declaraciones backend remapeadas a los dueños de248 exports/40 archivos; cero referencias productivas a entrada global. Guard negativo RED por ausencia de regla→GREEN30/30; build estricto y176/176 PASS, identidad de errores/exports preservada. Entrada global conservada para52 consumidores web y pruebas de compatibilidad; frontend no modificado. Retiro final depende de migrar esos consumidores en coordinación frontend, no está realizado.
- **Blocker:** none

### TASK-023 — Controles definitivos y documentación vigente
- **State:** DONE
- **Depends on:** TASK-022
- **Owner:** /root
- **Acceptance:** Estructura antigua retirada, cero excepciones nuevas y contratos públicos explícitos; inventarios, loaders, guías y mapa consistentes.
- **Evidence:** Mapa reconciliado487 orígenes/368 movimientos/128 altas/615 fuentes actuales; todo destino existe. Inventario673/57/23 sin pérdida, loader rechaza artefactos sin fuente, guard30/30 y0 excepciones. Lint global, docs184/1103/0, diff-check y validadorTTP25 PASS. Arquitectura y guías describen contratos compartidos/transporte común y compatibilidad frontend conservada. Huellas se regeneran al cerrar024 si cambia código.
- **Blocker:** none

### TASK-024 — Aceptación y revisión independiente
- **State:** DONE
- **Depends on:** TASK-023, TASK-026, TASK-027, TASK-028
- **Owner:** quality_reviewer
- **Acceptance:** Build/tipos/límites, suites aplicables y rutas críticas verificadas con recursos propios; revisión independiente, límites y pendientes registrados; ninguna publicación implícita.
- **Evidence:** Fast462/2808, DB148/914, servicios9/52,19wrappers y buildsAPI/web PASS. Browser11/75 PASS,0 FAIL/0 SKIP;33 archivos no seleccionados conservados. Revisor final8/8 BASE/actual,23unitarias propias y probes path/fase/UI sin hallazgos pendientes; E2E funcionales atribuidos a ejecutores. Huellas615/134/37/248 y ledgers PASS; lint/0excepciones, inventario673/57/23, docs186/1106/0, diff-check yTTP28 PASS. Sin UI/esquema/dependencias ni publicación; límites en registro/mapa.
- **Blocker:** none

### TASK-025 — Despacho HTTP incremental y contratos por consumidor
- **State:** DONE
- **Depends on:** TASK-003
- **Owner:** chuli_worker
- **Acceptance:** Handlers por capacidad con puertos acotados y mismo orden de rutas/validación/errores/admisión. Bootstrap coordina despacho; los módulos no acceden al host ni a repositorios. Inicio incremental de P07; TASK-012 conserva el cierre tras los dominios.
- **Evidence:** 8 pares de contratos/handlers y despacho en bootstrap199 líneas. Worker83/83, AST54/54 ramas en14 segmentos sin diferencias. Root build global y pruebas de rutas/transportes en tanda académica, errores bool de contrato corregidos antes del build.
- **Blocker:** none

### TASK-026 — Cuestionarios, corrección y publicación E2E con UI vigente
- **State:** DONE
- **Depends on:** TASK-023
- **Owner:** /root/backend_identity_capabilities
- **Acceptance:** Tres recorridos completos y helper de inicio alineados con la UI actual; mismo gesto único, CAS, admisión, privacidad, publicación y persistencia; no cambiar UI ni omitir casos.
- **Evidence:** Candidato final:23 unitarias+8 cuestionarios+5 corrección+5 publicación PASS,0 FAIL/0 SKIP,cleanup0. Logs read-guard-e2es-01 y publication-phase-final; publicación final177344ms conserva destino/ID/readstate/otroactor403/restart/revocación. Root e independiente23/23; Dewey negativos path/fase/UI/listeners y fuente sin pendientes. Seis casos unitarios nuevos; helper compartido sin cambio de implementación.
- **Blocker:** none

### TASK-027 — Progreso e Inicio E2E con UI vigente
- **State:** DONE
- **Depends on:** TASK-023
- **Owner:** /root/backend_capability_guards
- **Acceptance:** Ambos recorridos completos; medidas, scopes, ausencia de datos, roles, permisos, responsive, reinicio y recuperación reales conservados; sin UI modificada ni asserts vacuos.
- **Evidence:** Progreso7/7 PASS en subárbol completo combinado03 y Home09 exit0,13/13 PASS,0 FAIL/0 SKIP,175509ms,cleanup0. Incluye seis geometrías/teclado, wizard/foco, signin/revocación y cuenta. Dewey verifica guards/stacking/reducedmotion; excepción de summary por foreground del diseño actual explícita, sin afirmar disjunción. Hashes e intentos fallidos en registro propio; ninguna UI cambiada.
- **Blocker:** none

### TASK-028 — Entrega práctica E2E y recuperación de admisión
- **State:** DONE
- **Depends on:** TASK-023
- **Owner:** /root
- **Acceptance:** Todos los subcasos completos: custodia, reinicio, transferencia durante scanner pausado, recibo y descarga privada. Recuperación sólo con evidencia real de admisión; preservar cuotas, ausencia de repetición de mutaciones, CAS y aislamiento.
- **Evidence:** Root e2e028-practical-05.log:5/5 PASS,0 FAIL/0 SKIP,cleanup0,111293ms. WeakSet por gesto rechaza CSRF anterior: Dewey negativo propio oldEligible=false/newEligible=true sobre SHA19705f1134408c2d6f9f2f59dd4d6d75dcb1bf1edcb0ba8136b523ccad0afe2a. Retry-After51s real y una sola retirada; recibo/revisión conservan intento/adjuntos, nota nula, countSQL0 posterior, hashes,403/409 y ausencia de tokens. E2E independiente bloqueado antes deNode, sin PASS propio.
- **Blocker:** none

## Riesgos y verificación

Conservar actor/tx, orden de locks, revisiones, idempotencia, custodia, snapshots IA y liquidación. Cambios de transacciones/concurrencia exigen pruebas y revisión independiente. Las tareas de movimiento preservan tests; las nuevas restricciones/regresiones ejecutan RED/GREEN. Fuentes y logs de comprobación: docs/work-log/2026-11-16-root-backend-capabilities-execution.md. El diseño aprobado conserva esquema, datos y HTTP; cualquier divergencia se presenta antes de modificarlo.
