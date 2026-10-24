# Formulario compacto de Agenda — contrato listo para RED

- Agent / role: architect.
- Session or task ID: /root/event_form_design.
- Date: 2026-10-24.
- Branch / worktree: codex/foxmind-agenda; C:/Users/alejo/.codex/worktrees/foxmind-agenda/ProtipoFoxMind.
- Starting commit: 374ef3f748ab63ad262bd2d056b693183779da5a.
- Phase and detailed task/spec links: [Agenda](../../odd/tasks/agenda.md), [propuesta](../agenda-event-ux-proposal.md), [contrato compacto](../../odd/tasks/agenda-compact-event-form.md).
- Status: completed (diseño y contrato, no implementación ni aceptación funcional/visual).

## Request and scope

Convertir la propuesta autorizada en contrato preciso y plan RED del formulario compacto: Qué/Cuándo/Repetición, zona automática y legible, duración, validaciones, conservación de borrador y enfoque del evento guardado. Misma rama/worktree; interfaz y estado local, sin DB/API/dependencias. Esta tarea solo escribe este registro y odd/tasks/agenda-compact-event-form.md. No actualiza roadmap ni publica.

## Work performed

Leídos roadmap, protocolo de registros, docs/agenda.md, propuesta UX, odd/tasks/agenda.md y registro de propuesta; inspeccionados contratos públicos de Agenda y componentes/hook actuales, harness y regresiones de UI existentes. Rama/HEAD reconciliados con árbol inicialmente limpio. Leídas skills sdd-ambiguity-gate, clean-architecture, team-docs-strategy, subagent-minimal-contract y cognitive-doc-design. contratoagenda.md no existe en raíz; se consume odd/tasks/agenda.md como contrato vigente y se informó al coordinador.

Creado contrato compacto con estado LISTO_PARA_TDD_RED: tipos EventDraft/DraftIssue/TemporalChoice/DraftValidation/RepeatPreview/EventEditorOutcome/EventEditor, dieciséis helpers públicos, callback y exports por barril; UI/errores/foco, preservación ALL_DAY y fin manual, zona humana y elección DST solo representable por contrato vigente. Serie futura conflictiva pide ajustar horario/fecha final y no ofrece offsets por ocurrencia. Defaults/decisiones reversibles declarados; sin pregunta bloqueante.

Incorporada instrucción posterior del coordinador: semanal opt-in con +28 días (=5), alta enfoca primer día en zona de vista, edición conserva selección y ofrece Ver inicio de la serie. Alta semanal sin confirmación redundante; edición/eliminación conservan confirmación de toda la serie incluidas fechas pasadas. Hook bloquea por conflict independientemente de botones. ALL_DAY oculta zona y preserva offsets para vuelta a horario si no cambian fechas/horas/zona.

Ownership final reconciliado con coordinador: worker A helpers/hook/index; worker B EventForm/campos/CSS/Agenda/composición (useAgendaView excluido salvo necesidad avisada); coordinador runner/docs/preview; test_runner solo tests. No escribí producción ni tests, no modifiqué trabajo de otros. Contrato disponible y firmas avisadas a /root y /root/event_form_red antes del handoff final. Engram sin escritura por restricción explícita del host sin registro.

## Verification

- git status --short inicial: sin salida. git branch --show-current: codex/foxmind-agenda. git rev-parse HEAD: 374ef3f748ab63ad262bd2d056b693183779da5a.
- Lectura inicial de contratoagenda.md: ruta ausente. Una búsqueda rg con glob pasado como ruta en Windows produjo error 123; corregida usando directorios y -g. No son fallos funcionales del producto.
- Probes read-only con node --input-type=module y loadTsModule del barril de dominio: confirmado INVALID_INPUT con details {local,timeZone,choices:[{offsetMinutes,instant}]} para New York 2026-11-01 01:30; hueco 2026-03-08 02:30 con choices vacío. Fechas futuras de series tienen el mismo shape. scheduleInstants confirmó {startAt,endAt}; 18:00 Buenos Aires resolvió 21:00Z. Fin local anterior se rechazó incluso con offsets de caída estacional. Exit 0 de ambos probes; no escritura ni suite de aceptación.
- Script PowerShell de enlaces relativos con Test-Path y fences: PASS ambos documentos, 5 enlaces en la comprobación previa al cierre; contrato 190 líneas antes del trim final. Comprobación final observada: PASS 6 enlaces existentes, fences balanceadas y sin espacios finales en ambos documentos.
- git diff --check: exit 0. Warning LF→CRLF de propuesta UX modificada por otro agente; archivo ajeno no editado aquí.
- Estado concurrente observado: propuesta UX, registro coordinador y tres suites nuevas y helper de test_runner. Se preservan como trabajo ajeno, sin afirmar resultados propios.
- No ejecuté tests funcionales/builds, Docker ni navegador: esta asignación documental no cambia comportamiento. DoT y comandos pendientes se prescriben en el contrato; probes no sustituyen RED/GREEN ni capturas.

## Commits and outcomes

Sin commit de esta tarea; coordinador conserva control de commits e integración. Resultado de diseño: LISTO_PARA_TDD_RED; no matriz de negocio pendiente, producción o publicación atribuida a este agente.

## Handoff

Primera tarea pendiente: test_runner completa RED observado consumiendo firmas congeladas del contrato; después worker A y worker B ejecutan GREEN en rutas disjuntas. Coordinador registra suites nuevas en scripts/test-agenda.mjs, reconcilia evidencia independiente, actualiza documentación compartida y decide cierre según alcance humano vigente. Este agente no actualiza roadmap ni claim de fase completa. Capturas siguen requisito separado de la prueba DOM/funcional.
