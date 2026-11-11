# Feature: Pulido de Inicio docente

- **Spec:** docs/work-log/2026-11-11-root-teacher-home-polish.md#especificación-y-diseño-aprobados
- **Design:** docs/work-log/2026-11-11-root-teacher-home-polish.md#especificación-y-diseño-aprobados
- **Approval:** approved

Autorizado el 2026-11-11: propuesta de cuatro widgets y ejecución en worktree separado en este chat.

## Tasks

### TASK-001 — Orden completo de entregas y consultas
- **State:** DONE
- **Depends on:** none
- **Owner:** /root + /root/home_order
- **Acceptance:** Select por pestaña con defaults actuales y orden independiente; aplicación a todas las páginas; cursor no reutilizable entre órdenes; sin textos retirados; errores recuperables y sin respuestas tardías que reemplacen selección.
- **Evidence:** RED/GREEN del worker; 16 pruebas de contrato/HTTP/cliente; 6 SQL propias incluyendo keyset 5+2/empates/permiso/cursor cruzado; navegador confirmó orden independiente y paginación bajo StrictMode. Recibo docs/verification/teacher-home-polish.json.
- **Blocker:** none

### TASK-002 — Aula en foco y acciones con destino explícito
- **State:** DONE
- **Depends on:** none
- **Owner:** /root
- **Acceptance:** Cambiar foco entre aulas activas propias, incluidas páginas siguientes; cada acción solicita destino y continúa al destino correcto sin alterar foco; una única aula preseleccionada; vacío/error/cancelación/teclado.
- **Evidence:** 10 regresiones UI/hook; Ego Lite confirmó 6 aulas, cuatro destinos, foco independiente y conservado tras refresh, radios/teclado y Escape/retorno; revisor independiente confirmó recuperación del foco tras 503. Recibo docs/verification/teacher-home-polish.json.
- **Blocker:** none

### TASK-003 — Jerarquía visual docente y validación responsive
- **State:** DONE
- **Depends on:** TASK-001, TASK-002
- **Owner:** /root
- **Acceptance:** Tema durazno destacado, flecha circular derecha y agenda con color/contraste/alineación; navegador escritorio/móvil, sin desbordes; estudiante conserva comportamiento; checks y documentación reconciliados.
- **Evidence:** Cinco capturas inspeccionadas, viewports 1440/768/390 sin overflow; siete muestras de contraste >=6.4:1. 83 pruebas focales PASS; builds API/web, tipos, lint:boundaries (0 excepciones), inventario 533 y docs:check (106 archivos/942 enlaces, 0 problemas) verdes. taskboard.py check: 3 tareas válidas. Recibo docs/verification/teacher-home-polish.json.
- **Blocker:** none

Reabierta por feedback del usuario: alinear título/select y pestañas/Ver todas, ajustar espaciados de agenda y evitar repetir fecha. Corrección verificada: 26 pruebas PASS, tipos PASS y Ego Lite en 1440/768/390 sin overflow; controles de pestañas y Ver todas con idéntico eje Y/altura 44 px. Capturas finales y geometría en el recibo; evidencia anterior atribuida a la primera revisión.
