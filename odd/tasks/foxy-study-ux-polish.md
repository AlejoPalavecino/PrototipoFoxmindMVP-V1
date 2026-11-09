# Feature: Pulido UX de Foxy AI y Carpetas de estudio

- **Spec:** docs/work-log/2026-11-09-root-ux-polish.md
- **Design:** docs/design/README.md
- **Approval:** approved

El usuario aprobó la propuesta de cinco puntos y autorizó implementar y validar con Ego Lite el 2026-11-09.

## Diseño aprobado y aceptación

Conservar Brújula y Foxy docente como referencia. Animaciones discretas con reduced-motion y mensajes de estado reales, sin porcentajes ficticios. Mostrar inmediatamente el envío y espera de Foxy; conservar texto ante fallo, evitar duplicados y no forzar scroll mientras se lee historia. Compartir presentación de herramientas y selector Activas/Archivadas/Pendientes. Compartir envoltorio visual del asistente de cuatro pasos (datos/documento, método, unidades, revisión) con campos y reglas de dominio independientes. Plan: resumen de unidades/temas, unidades desplegables y avisos relevantes; sin metadatos técnicos innecesarios. Verificar teclado, foco, vacío/error, escritorio y móvil.

## Tasks

### TASK-001 — Chat y feedback de carga coherentes
- **State:** DONE
- **Depends on:** none
- **Owner:** root
- **Acceptance:** Envío visible inmediatamente; espera animada accesible; errores conservan texto; scroll sólo acompaña si se estaba al final; herramientas comparten presentación.
- **Evidence:** 72/72 pruebas focales, tipos/lint/build verdes. Ego Lite: espera, error/recuperación, reconciliación sin duplicados, scroll de historia/salto al final, herramientas a 390 px, foco/Escape y reduced-motion. Recibo docs/verification/foxy-study-ux-polish.json. Capturas fallidas/vacías: no se acredita QA por PNG.
- **Blocker:** none

### TASK-004 — Completar validación visual escritorio y móvil
- **State:** DONE
- **Depends on:** TASK-001, TASK-002, TASK-003
- **Owner:** root
- **Acceptance:** Capturas reales de Ego Lite inspeccionadas en escritorio/móvil para chats/herramientas, colecciones y creación/plan; corregir hallazgos de UX dentro de la dirección aprobada y revalidar el candidato; conservar evidencia visual y límites actuales.
- **Evidence:** 28 capturas nativas Ego Lite inspeccionadas, a 1440×1000/390×844; catálogo con 216 entradas y hashes verificados. Hallazgos corregidos en compositor, cascada móvil/selects, portadas, encabezado con scroll, jerarquía y estados de plan/chat. 74 tests verdes, dos regresiones RED→GREEN; tipos/lint/build correctos. docs:check 77/825/0. Ego finalizado, fixture detenido, app propia READY. Registro docs/work-log/2026-11-09-root-ux-visual.md.
- **Blocker:** none

### TASK-002 — Colecciones y creación coherentes
- **State:** DONE
- **Depends on:** none
- **Owner:** root
- **Acceptance:** Mismo componente de estados y pasos; plan con resumen/unidades desplegables; cargas distinguen archivo, análisis y guardado; conservar creación privada y confirmación explícita.
- **Evidence:** Suites de creación/revisión verdes. Ego Lite: ambas creaciones integradas con cuatro pasos/siete portadas, mismos estilos, sin overflow a 390 px; plan IA sintético pendiente y revisión por unidad, teclado y foco de regreso a Crear carpeta. Recibo de candidato local.
- **Blocker:** none

### TASK-003 — Validación integrada y documentación vigente
- **State:** DONE
- **Depends on:** TASK-001, TASK-002
- **Owner:** root
- **Acceptance:** Pruebas focalizadas y build/lint proporcionales; Ego Lite desktop/móvil, estados y recuperación con datos sintéticos; fuentes canónicas y límites actualizados.
- **Evidence:** 72/72 tests focales; tipos/build/lint e inventario/rutas verdes; docs:check final 76 archivos/788 enlaces/0 problemas. TTP y diff limpios. Ego Lite final: edición no colapsa unidad; sólo se eliminó el borrador vacío creado por QA, Pendientes docente volvió a 0. TaskSpace cerrado y fixture detenido; app local propia encendida. Recibo y fuentes canónicas actualizados, con límites de capturas explícitos.
- **Blocker:** none
