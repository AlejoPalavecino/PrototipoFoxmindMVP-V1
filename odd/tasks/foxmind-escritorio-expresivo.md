# Escritorio de FoxMind — rediseño expresivo

Dirección aprobada: Expresiva en ambos mockups (Inicio alumno móvil y Actividades docente escritorio). Ejecución de seis etapas autorizada por el usuario el 2026-11-03. Mantener reglas académicas, permisos por rol y contratos vigentes. Validación local con datos sintéticos.

| ID | Resultado | Depende de | Responsable | Estado | Criterio y evidencia |
|---|---|---|---|---|---|
| UI-01 | Base visual, navegación y cuenta | — | Coordinación | DONE | Identidad común, foco, responsive 320/390 y movimiento reducido. |
| UI-02 | Inicio por rol y Actividades docente | UI-01 | Coordinación y worker | DONE | CTA de primera visita y acceso directo a entregar/corregir. Comparar referencias Expresivas aprobadas. |
| UI-03 | Acceso, registro y recuperación | UI-01 | Worker de cuenta | DONE | Rol primero, errores recuperables y destino de invitación preservado. |
| UI-04 | Colección, creación e interior por rol | UI-01, UI-02 | Worker de aulas | DONE | Portadas, borrador recuperable, cuatro pasos y pestañas por rol con retorno correcto. |
| UI-05 | Agenda y Foxy AI | UI-01 | Worker de herramientas | DONE | Calendario primero, eventos privados diferenciados y publicación docente explícita. |
| UI-06 | Verificación integrada | UI-01 a UI-05 | Coordinación y revisión | DONE | Tipos, lint, pruebas dirigidas y evidencias locales en navegador. |

Base inicial: main ec024bc, árbol limpio. Referencias: sistema vigente en [Diseño](../../docs/design/README.md) y [especificación](../../docs/foxmind-v1-functional-spec.md).

## Evidencia y pendientes
- UI-01/UI-02: Inicio estudiante 320/390, docente 1280 y alta inicial 320 en Playwright con fixture. Actividades 1280 verificó selección de Publicadas y apertura/cierre del diálogo de pendientes. La revisión independiente comprobó en memoria los intentos visibles y el GET existente.
- UI-03: 15 combinaciones de pantalla y ancho con servidor local e interceptación de API. Registro sin rol preseleccionado, selección con teclado y continuación de invitación.
- UI-04: colección, asistente y pestañas de ambos roles a 320/390/1280 en fixture. La prueba integrada de navegación móvil no llegó al navegador por la red Docker. Se añadió posteriormente una vista previa compacta en pasos 2–4.
- UI-05: Agenda y Foxy a 320/390/1280 en navegador con APIs sintéticas, lectura inicial de Agenda única y confirmación de publicación comprobada en pruebas dirigidas. Véase el [registro de herramientas](../../docs/work-log/2026-11-03-id-unavailable-tools-ui-expressive.md).
- Desviación respecto del mockup: la cola con cantidades verificadas está en Inicio docente. Actividades permite abrir pendientes por actividad con el historial existente. Su listado no dispone de cantidades agregadas por actividad.
- UI-06 completada localmente sobre main ecfe55c con correcciones locales. Build web y lint aprobados, 1456 pruebas rápidas sin fallos ni omisiones ejecutadas por lotes, 14 de Agenda con base y sesión, 2 de Foxy con almacenamiento y escáner, y recorridos autenticados con roles actuales. El comando fast en una sola invocación sigue expuesto al límite de compilación en este host. Los recorridos históricos incompatibles con el rol exclusivo quedan identificados en el [registro de cierre](../../docs/work-log/2026-11-03-id-unavailable-ui06-main-validation.md).
