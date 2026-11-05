# Agenda y Foxy: fidelidad a Brújula

- Agente/tarea: `/root/brujula_agenda_foxy_fidelity`, 2026-11-05.
- Estado: IN_PROGRESS. Fase GREEN visual de BRU-04 reabierta por rechazo visual del usuario.
- Alcance: `apps/agenda-ui`, `apps/web/src/components/foxy-workspace*`, `apps/shared-ui/brujula-agenda.css`.
- Fuentes: HTML aprobado en Downloads y copia de `docs/design/brujula`; roadmap, tarea y protocolo de registros leídos.
- Git inicial: rama `codex/foxmind-brujula`, checkout con implementación previa sin commit y múltiples escritores activos; preservar todo trabajo ajeno.
- Plan: trasladar encabezado y toolbar/calendario Agenda; trasladar chat/rail/bienvenida Foxy; verificar tipos/lint/tests focales y entregar al coordinador para navegador.
- Prohibiciones: backend, secretos, datos demo, commits/publicación y pruebas de aceptación.
- Evidencia inicial: inspección de componentes actuales y CSS/estructura originales; desviaciones identificadas en banner Agenda, controles separados y tres columnas de Foxy.
- Siguiente acción: implementar estructura y valores visuales de referencia conservando controladores, estados y permisos.

## Resultado de implementación y handoff

- Estado: VERIFYING; implementación y controles focales terminados, pendiente QA visual integrado del coordinador. No se declara igualdad pixel a pixel.
- Agenda: encabezado simple de referencia sin banner anterior; Mes/Semana/Día en toolbar del calendario; grilla sin separaciones entre celdas; selección lavanda/naranja, eventos compactos, paneles laterales; Semana en filas y apertura real; Día con eventos en la superficie principal. Retirado el dibujo vacío anterior de Próximas entregas.
- Foxy: dos columnas (chat blanco + herramientas/recientes en rail lavanda); personaje oficial, bienvenida y sugerencia del HTML; composer siempre visible, Nuevo chat prepara una vista local sin escritura. Primer envío crea conversación por los controladores existentes y solo envía después de comprobar conversación nueva, título y contexto. Fallar la creación conserva texto y nunca envía a la conversación anterior. Fuentes, citas, publicación/edición y bloqueos existentes preservados.
- Paths editados por este agente: `apps/agenda-ui/Agenda.tsx`, `AgendaHeader.tsx`, `AgendaMonth.tsx`, `AgendaPeriod.tsx`, `AgendaDay.tsx`, `Upcoming.tsx`; `apps/shared-ui/brujula-agenda.css`; `apps/web/src/components/foxy-workspace.tsx`, `foxy-workspace.module.css`, `foxy-workspace-start.test.mjs`. El cambio anterior de `EventColorFields.tsx` se preservó y no fue escrito por este agente.
- Integración requerida: el coordinador importa `brujula-agenda.css` después de estilos globales y registra el nuevo test focal según el inventario vigente.

### Evidencia observada

- `node --test tests/agenda-ui.test.mjs tests/agenda-view-modes.test.mjs tests/agenda-event-color-view.test.mjs tests/agenda-event-form-view.test.mjs tests/agenda-event-form-result.test.mjs tests/agenda-reference-selection.test.mjs tests/agenda-polish-presentation.test.mjs apps/web/src/components/foxy-workspace.test.mjs`: 46 PASS/0 FAIL antes del ajuste final de primer envío.
- `node --test apps/web/src/components/foxy-workspace-start.test.mjs`: RED 2 FAIL por ausencia del composer inicial, después GREEN 4 PASS/0 FAIL (éxito/fallo, con/sin conversación anterior).
- `node --test apps/web/src/components/foxy-workspace-start.test.mjs apps/web/src/components/foxy-workspace.test.mjs`: 17 PASS/0 FAIL después del ajuste de primer envío y antes de ampliar sus casos de2 a4.
- `npx tsc -p apps/web/tsconfig.json --noEmit --incremental false`: PASS final; primera pasada tuvo errores transitorios ajenos en Home/AppNavbar mientras otros agentes editaban, preservados como experimento fallido y resueltos en las siguientes pasadas.
- `npx eslint apps/agenda-ui apps/web/src/components/foxy-workspace.tsx`: PASS final.
- `git diff --check -- apps/agenda-ui apps/web/src/components/foxy-workspace.tsx apps/web/src/components/foxy-workspace.module.css`: PASS; solo avisos de normalización CRLF.
- Primera selección Agenda31:29 PASS/2 FAIL por helper de pruebas que recorre `children`, corregido trasladando los controles como children sin editar pruebas; selección final46 PASS.

### Límites y siguiente acción exacta

- El calendario conserva42 días, exigidos por contrato de aceptación existente; el HTML muestra4–6 semanas según mes. No se cambió ese contrato.
- Se mantienen los seis propósitos reales del chat. Las herramientas Esquema/Rúbrica de la maqueta no se simulan ni se agregan como contratos nuevos. Contexto de conversación existente sigue siendo inmutable: cambiarlo prepara un nuevo chat.
- No se corrió navegador desde este agente: el coordinador mantiene la sesión global y debe contrastar Agenda/Foxy desktop/móvil, crear evento real sintético, nuevo chat/contexto y recuperación ante errores. Repetir la selección focal si el QA provoca cambios posteriores.
- Sin backend, secretos, proveedores reales, commits, publicación ni despliegue. Commit: no creado.

### Corrección por regresión detectada en Fast serial

El coordinador informó fallo de `foxy-context-view.test.mjs:42`: el nombre activo del aula dependía del selector, sin texto de contexto independiente. Se restituyó un párrafo accesible (visualmente oculto) con `Contexto del aula: <título comprobado>` o `Contexto general`, respetando la nueva composición. `node --test apps/web/src/components/foxy-context-view.test.mjs apps/web/src/components/foxy-workspace-start.test.mjs`:7 PASS/0 FAIL. Código congelado por pedido del coordinador mientras corre build.

Inspección posterior de herramientas, solo lectura: Apuntes/Actividad/Planificación equivalen a STUDY_MATERIAL/ACTIVITY_IDEAS/LESSON_PLAN; Rúbrica admite propuesta textual mediante CHAT+prompt explícito, sin artifact de rúbrica estructurada. Esquema sí tiene pipeline real DIAGRAM en runtime.visual, montado mediante FoxyVisualWorkspaceSession; no se modificó todavía su integración con el rail.

### Rail y composer alineados tras QA visual

Pedido posterior del coordinador autorizó continuar luego del congelamiento. Rail reemplazado por las cinco herramientas del HTML: Crear apuntes, Crear esquema, Crear actividad, Crear planificación y Crear rúbrica. Apuntes/Actividad/Planificación conservan los propósitos existentes y agregan instrucciones explícitas; Rúbrica usa CHAT con pedido explícito de texto editable, criterios/niveles/pesos y aviso de que no se asocia automáticamente a una actividad. No se agregaron contratos ni tipos de artifact.

Crear esquema llama un callback nuevo de FoxyWorkspace a FoxyWorkspaceSession que usa runtime.visual.setKind(DIAGRAM), setPrompt y start existentes; el resultado usa el panel visual real, incluyendo capacidades, bloqueo, errores y reintento. El primer envío conserva creación previa comprobada incluso para esquema. Se limpia el texto solo ante admisión confirmada o pendiente recuperable, y el modo se limpia luego del envío. El panel visual recibe foco visual por scroll al admitir el trabajo.

Composer compacto: retirado selector Tipo de ayuda redundante, tag visible solo con modo activo, acción para quitarlo, textarea47px sin borde interno naranja, borde exterior lila y aviso fuera del campo. Bienvenida/copy/placeholder cambian por herramienta como la referencia. Captura QA previa de1440px inspeccionada, sin afirmar nueva captura.

- Pruebas test-first nuevas: primera corrida de rail/esquema2 FAIL observados; luego GREEN.
- `node --test apps/web/src/components/foxy-workspace-start.test.mjs apps/web/src/components/foxy-workspace.test.mjs apps/web/src/components/foxy-context-view.test.mjs`:24 PASS/0 FAIL final.
- `npx tsc -p apps/web/tsconfig.json --noEmit --incremental false`: PASS antes del último ajuste de bienvenida/scroll; pasada final ejecutada con resultado comunicado al coordinador.
- `npx eslint apps/web/src/components/foxy-workspace.tsx apps/web/src/components/foxy-workspace-session.tsx`: PASS antes del último ajuste de bienvenida/scroll; pasada final ejecutada con resultado comunicado al coordinador.
- Path adicional editado: `apps/web/src/components/foxy-workspace-session.tsx`; test propio ahora6 casos. Aceptación previa sin modificaciones.
- Estado: VERIFYING, código congelado otra vez para build/E2E global del coordinador. La limitación previa de rail de6 propósitos queda superada por esta integración; Mes42 y contexto inmutable persisten como contratos vigentes.

Cierre observado de la sesión27040: tipos web y eslint Workspace+Session terminaron ambos con exit0 después del último ajuste de bienvenida/scroll. Controles finales PASS; QA visual integrado sigue a cargo del coordinador.

### Correcciones de revisión independiente: guard de primer envío y DIAGRAM

Revisor `/root/brujula_review` reprodujo pérdida de intención del primer envío cuando `actions.chat.create` devuelve false al diferir la creación por un recurso sin guardar. Confirmar el guard creaba una conversación sin mandar el primer mensaje; reintentar podía crear otra. Se agregó `creationBlocked` de Session (`ui.leave`) a Workspace: la intención se conserva mientras el guard está abierto y se evalúa la conversación recién al cerrarse/completar la creación. Cancelar conserva texto y desbloquea reintento; guardar/descartar crea y envía una sola vez; fallar creación nunca envía a la conversación anterior.

- Test-first con composición de UI + `createFoxyWorkspaceActions` real en memoria: RED2 FAIL (guardar/descartar solo creaban, no enviaban), GREEN4 PASS incluyendo cancelar y fallar creación. No se alteraron pruebas de aceptación.
- El callback DIAGRAM ahora consulta `runtime.getState()` justo antes de mutar modo/prompt o iniciar. Rechaza workspace cerrado, ausencia de conversación/capacidad, aula sin generación, chat/visual ocupados o pendientes y publicación visual ocupada/pendiente. Se preservan prompt y conversación ante bloqueo.
- Nuevo caso sobre callback real de Session prueba locks vivos busy/pending de publicación visual y posterior admisión sin bloqueo. Primera pasada del test falló por fixture sin imageGeneration; fixture corregido sin cambiar producción.
- Selección final Workspace + Start + Context:29 PASS/0 FAIL. El archivo propio `foxy-workspace-start.test.mjs` contiene11 casos.
- `npx tsc -p apps/web/tsconfig.json --noEmit --incremental false` y `npx eslint apps/web/src/components/foxy-workspace.tsx apps/web/src/components/foxy-workspace-session.tsx`: PASS final.
- Código congelado, coordinador y revisor notificados para nueva build/E2E y revalidación independiente. Sin cambios de backend ni controladores de dominio.

### Ajuste final de encabezado Agenda

QA del coordinador detectó título sin peso700 y falta de breadcrumb respecto al HTML. Se modificaron únicamente AgendaHeader.tsx y brujula-agenda.css: ubicación Inicio > Agenda con enlace real /inicio, dimensiones originales de tipografía/gap/márgenes y título con font-weight700 explícito. No se tocaron API/cliente ni Foxy; el breadcrumb global de la maqueta también aplica a Foxy, informado al coordinador.

`node --test tests/agenda-polish-presentation.test.mjs tests/agenda-reference-selection.test.mjs`:9 PASS/0 FAIL. `npx eslint apps/agenda-ui/AgendaHeader.tsx`: PASS. Tipos web ejecutados en la misma sesión, resultado de cierre comunicado al coordinador. Código nuevamente congelado para build/capturas globales.

### Breadcrumb Foxy autorizado después

El coordinador autorizó también breadcrumb Inicio > Foxy AI en la propia superficie. Agregado con las métricas originales. El enlace delega a `actions.requestNavigate` desde Session para conservar el guard de edición/publicación; atajos de abrir en otra pestaña conservan navegación nativa.

Selección final Foxy29 + Agenda9:38 PASS/0 FAIL. Eslint AgendaHeader/Workspace/Session PASS. Tipos web completados después de estos últimos cambios; código congelado para nueva build y captura del coordinador. La observación anterior de falta de breadcrumb Foxy queda resuelta.

### Cascada final del textarea móvil

Captura real `teacher-foxy-ai-390.png` inspeccionada antes del cambio: placeholder cortado en segunda línea por tipografía/padding legacy. Único cambio de fuente: selector CSS de textarea del composer con contexto fm3d-theme y prioridad explícita de padding0/altura47/line-height1.55/fuente13px (14px hasta440, como HTML). Dos líneas móviles requieren43.4px; el contenedor conserva65px aproximadamente. `git diff --check -- apps/web/src/components/foxy-workspace.module.css`: PASS. Sin TS ni flujos modificados, sin pruebas funcionales adicionales por tratarse de cascada visual acotada; root reconstruye y repite matriz responsive. Código congelado y root notificado.
