# Feature: Agenda — selección diaria, navegación y formulario



- **Spec:** docs/engineering/agenda/README.md; criterios de este registro.

- **Design:** docs/design/README.md; dirección aprobada detallada abajo.

- **Approval:** approved

Usuario «Si apruebo», 2026-11-12: autoriza diseño, implementación y verificación en worktree separado. No publicación.



## Criterios y dirección aprobados



Ambos roles conservan eventos privados y entregas académicas autorizadas. Seleccionar un día muestra todos sus eventos, horario, título y color, con acceso al detalle y creación para esa fecha. Escritorio conserva panel lateral destacado; móvil abre panel inferior con cierre, Escape y retorno de foco. Día vacío ofrece crear. Carga/error no muestran resultados de otra fecha.



Mes/Semana/Día conservan selección y controles estables. Navegación mensual conserva número de día, limitado al último día del mes destino; no vuelve arbitrariamente al primero. Transiciones breves sin bloquear interacción, con movimiento reducido. Calendario mensual de seis filas estables. Cambio de vista conserva teclado y no remonta controles enfocados.



Crear/editar conserva campos, validación, repetición y alcance actuales. Un formulario con columnas equilibradas, controles uniformes y acciones accesibles; móvil en una columna. Identidad Brújula vigente. Sin cambios backend, datos, proveedores o permisos. Riesgos: foco en modal móvil, respuestas tardías, CSS heredado, fechas de fin de mes.



## Tasks

### TASK-004 — Tarjetas compactas del detalle diario
- **State:** DONE
- **Depends on:** TASK-001
- **Owner:** root
- **Acceptance:** Iteración aprobada «Si me gusta»: encabezado compacto, tarjetas de color tenue con título/horario/tipo y acceso completo; agregar evento discreto con +; misma presentación en móvil.
- **Evidence:** 16/16 tests focales, tipos/lint PASS; Ego Lite 1440x1000 y 390x844 con interacción y capturas inspeccionadas; docs/verification/agenda-ux.json dailyCardsIteration.
- **Blocker:** none



### TASK-001 — Selección diaria y navegación coherente

- **State:** DONE

- **Depends on:** none

- **Owner:** root

- **Acceptance:** Selección, panel móvil, abrir/crear y navegación cumplen criterios; regresiones de fecha y respuestas tardías cubiertas.

- **Evidence:** 59/59 pruebas focales y QA Ego Lite 1440×1000/390×844; docs/verification/agenda-ux.json.

- **Blocker:** none



### TASK-002 — Formulario equilibrado

- **State:** DONE

- **Depends on:** none

- **Owner:** root

- **Acceptance:** Campos alineados; una columna móvil; acciones visibles; errores, día completo y repetición utilizables.

- **Evidence:** 59/59 pruebas focales y QA Ego Lite 1440×1000/390×844; docs/verification/agenda-ux.json.

- **Blocker:** none



### TASK-003 — Verificación y documentación

- **State:** DONE

- **Depends on:** TASK-001, TASK-002

- **Owner:** root

- **Acceptance:** Pruebas focales, tipos, lint y revisión real de interacción/responsive; documentación y límites reconciliados.

- **Evidence:** 59/59 tests, tipos, lint y build PASS; QA y capturas en docs/verification/agenda-ux.json; docs:check y taskboard check finales PASS.

- **Blocker:** none


## Publicación autorizada y auditoría posterior

Usuario autorizó publicar el estado actual el 2026-11-12, preservando ramas activas Aulas/Inicio. Seis ajustes visuales pendientes en docs/work-log/2026-11-12-root-agenda-publication.md; los DONE anteriores acreditan los criterios ensayados, no ausencia de defectos visuales exhaustiva.
