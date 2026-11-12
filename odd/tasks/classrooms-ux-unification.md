# Feature: Mis aulas docente y estudiante — traslado de maqueta al frontend

- **Spec:** docs/design/classroom-teacher-redesign.md
- **Design:** docs/design/classroom-teacher-redesign.md
- **Approval:** approved

2026-11-11: el usuario autoriza pulido completo y posterior implementación frontend en worktree separado; merge sólo tras validación posterior.

Ampliación explícita posterior: incluir backend de códigos de seis dígitos e invitaciones múltiples recuperables. Mantener compatibilidad, permisos y recursos aislados; no autoriza despliegue.

## Tasks

### TASK-001 — Maqueta integral consistente y referencia cerrada
- **State:** DONE
- **Depends on:** none
- **Owner:** root
- **Acceptance:** Recorrer creación, plan, muro, materiales, actividades, entregas/corrección y miembros desde ambos roles; corregir inconsistencias dentro de la dirección aprobada; identificar diferencias de contratos reales sin simularlas en producto.
- **Evidence:** Ego TaskSpace 10; prototype-audit/resume y prototype-activities/resume PASS creación/recuperación, plan/deshacer/filtro vacío, muro/respuesta, materiales, invitaciones parciales, archivo, autoría manual/IA, recepción, corrección privada/publicada y feedback estudiantil. Error de guion por lectura antes de completar carga y selector de diálogo cerrado corregidos; no fueron fugas de producto.
- **Blocker:** none

### TASK-002 — Aula compartida y contenidos con UI de la referencia
- **State:** DONE
- **Depends on:** TASK-001
- **Owner:** root
- **Acceptance:** Catálogo, shell, creación, Plan, Muro, Biblioteca y miembros coherentes en docente/estudiante; filtros legibles, edición completa del plan, feedback/carga/error, teclado y responsive; contratos de servidor conservados.
- **Evidence:** Componentes reales recorridos en Ego TaskSpace 10, desktop y 375/390 px; teclado, foco, carga, filtros y deshacer. Regresión integrada 157/157; corrección del bloqueo durante escaneo de Biblioteca incluida. Capturas catalogadas en docs/design/current/README.md; detalle en docs/work-log/2026-11-11-content-ui.md.
- **Blocker:** none

### TASK-003 — Autoría y participación simples y coherentes
- **State:** DONE
- **Depends on:** TASK-001
- **Owner:** root
- **Acceptance:** Manual/IA comparten superficies y revisión; consignas claras; estudiante distingue borrador/archivo/recepción, conserva respuestas y confirma una vez; sin exposición de claves privadas.
- **Evidence:** 35 pruebas focales delegadas y reconciliación integrada 157/157; autoría manual/IA, conservación de borrador, confirmación única y recepción TP/cuestionario recorridas con componentes reales y adaptador sintético. Desktop/móvil y teclado verificados. docs/work-log/2026-11-11-activities-ui.md y docs/verification/classrooms-ux-unification.json. E2E con servicios Docker completado en TASK-005.
- **Blocker:** none

### TASK-004 — Corrección y devolución comprensibles
- **State:** DONE
- **Depends on:** TASK-001
- **Owner:** root
- **Acceptance:** Respuesta/puntos, rúbrica, nota orientativa editable, sugerencia IA privada y publicación explícita preservadas; devolución legible y progreso propio con acciones por estado; compatibilidad con devoluciones existentes.
- **Evidence:** 29 pruebas focales delegadas y regresión integrada 157/157; devolución estructurada compatible con comentarios existentes, bloqueo de publicación de cambios sin guardar y vista compartida docente/estudiante. Vista previa de publicación y progreso estudiantil inspeccionados en navegador. docs/work-log/2026-11-11-grading-ui.md y capturas catalogadas.
- **Blocker:** none

### TASK-005 — Frontend verificado y listo para revisión humana
- **State:** DONE
- **Depends on:** TASK-002, TASK-003, TASK-004, TASK-006
- **Owner:** root
- **Acceptance:** Build/tipos/lint y pruebas focales pasan; navegador sobre componentes reales compara referencia y desktop/móvil con roles/estados; registrar límites de integración; candidato en worktree, sin merge/push/deploy.
- **Evidence:** Cierre ampliado con Docker: 106/106 pruebas integradas Next/API/PostgreSQL/S3/ClamAV/Mailpit, cero fallos/skips (P5 17, P6 14, P7 45, P8 30). Suite pure completa 278/278; controles adicionales DB/migraciones 11/11 y códigos/lotes 6/6. Build web/API, tipos y lint/boundaries PASS; ajuste final de autoría/devolución 25/25 focal y autoría E2E 6/6 en build final 3lPKN7ICF5X1reosoaMrq. App completa READY en puerto 3000, ambos roles recorridos en Ego TaskSpace 11; persistencia compartida, lote y móvil verificados. 19 capturas y 91 hashes en docs/verification/classrooms-ux-unification.json. Fixtures nuevos limpiados; recursos propios de la app conservados. Integración autorizada posteriormente por el usuario; seguimiento en TASK-007.
- **Blocker:** none

Reapertura 2026-11-11: el usuario solicita levantar la aplicación completa desde el worktree y terminar las pruebas pendientes con Docker antes de integrar. Se autoriza el entorno propio y la reutilización de Gemini ya configurado según la preferencia vigente; las suites siguen sintéticas. Integración a main pendiente de validación humana.

### TASK-006 — Códigos cortos e invitaciones múltiples recuperables
- **State:** DONE
- **Depends on:** TASK-001
- **Owner:** root
- **Acceptance:** Nuevos códigos de seis dígitos (ceros iniciales), permanentes hasta regeneración, compatibles con legacy y revocación; lote con resultados independientes/idempotencia y recuperación, invitaciones conservan vencimiento/espera/permisos. Pruebas negativas y concurrencia proporcionadas, sin datos retenidos.
- **Evidence:** Ampliación explícita autorizada; 39/39 P5, 6/6 migraciones y revisión independiente SQL/HTTP con sesiones sintéticas y CSRF. Proxy de arrays/UUID, recuperación 503→404, idempotencia y límites por cuenta verificados; 6/6 pruebas UI del lote. docs/work-log/2026-11-11-codes-batch.md y docs/verification/classrooms-ux-unification.json. Sin vencimiento automático del código; legacy compatible hasta rotación. No se certifica monitoreo distribuido de enumeración ni carga productiva.
- **Blocker:** none

### TASK-007 — Integración autorizada y main como única rama
- **State:** DONE
- **Depends on:** TASK-005
- **Owner:** root
- **Acceptance:** Preservar los cambios posteriores de Inicio; publicar el candidato verificado en main; comprobar main como única rama local y remota sin eliminar archivos, datos ni entornos de worktrees.
- **Evidence:** Autorización explícita 2026-11-11. Commits f5377e2, a6d1d94 y f16538e; merge de e35e1a3 con tres conflictos documentales resueltos conservando ambos contenidos. Trabajo inicial de main preservado en stash. Build/API/web y aplicación READY; pure 292/292, PostgreSQL Docker Inicio 1/1, lint/boundaries PASS. Inventario corregido: 541 pruebas y 23 rutas. E2E integrado 19/19 y focal UI/CI 27/27, sin fallos/skips. Merge 122daaa, fast-forward a main y push exitoso. HEAD/origin/main/ls-remote coinciden en 122daaa; branch --list y ls-remote --heads muestran sólo main. Worktrees conservados detached, stash inicial preservado. Sin despliegue.
- **Blocker:** none
