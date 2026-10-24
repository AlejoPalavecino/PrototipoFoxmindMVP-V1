# Agenda — diseño previo a RED

- Agent / role: design_agenda / arquitecto.
- Session or task ID: `/root/design_agenda` (identificador de tarea expuesto por el runtime).
- Date: 2026-10-23.
- Branch / worktree: `codex/foxmind-agenda`, `C:/Users/alejo/.codex/worktrees/foxmind-agenda/ProtipoFoxMind`.
- Starting commit: `ed06f88` (`docs(ui): confirm folder main publication without deployment`).
- Phase and detailed task/spec links: ampliación Agenda; [tarea](../../odd/tasks/agenda.md), [especificación](../foxmind-v1-functional-spec.md), [roadmap](../implementation-roadmap.md).
- Status: completed.

## Request and scope

Diseñar la sección global Agenda junto a Inicio/Mis aulas: próximas entregas reales y eventos privados por usuario para clases, actividades y evaluaciones. El coordinador transmite autorización humana de implementación en worktree separado e integración posterior a main. Esta subasignación solo permite editar `odd/tasks/agenda.md` y este registro; no implementar código, tests ni modificar el roadmap.

El coordinador consultó repetición semanal o eventos únicos y luego transmitió respuesta humana: eventos únicos y repetición semanal desde la primera versión. No inferir publicación ni despliegue de la autorización de integración.

## Work performed

- Leídos AGENTS, roadmap y protocolo de registros del worktree; reconciliados main P0–P9/folder y HEAD real, sin reutilizar el límite histórico P3 del checkout original.
- Cargadas skills `sdd-ambiguity-gate`, `clean-architecture`, `team-docs-strategy`, `cognitive-doc-design` y memoria Engram.
- Inspeccionados esquema Prisma, contratos y composición de aulas/identidad, interfaces públicas UI, Inicio, navegación y límites de compilación.
- Engram identificó `prototipofoxmindmvp-v1`; contexto y búsqueda de agenda sin decisión funcional previa aplicable.
- Hallazgo: los plazos vigentes de estudiantes dependen de elegibilidad, último intento y plazo general/individual; no derivar próximas entregas solo de `activities.deadline_at`.
- Creado `odd/tasks/agenda.md` con contrato común puro, puertos ligados al dueño/transacción, CRUD privado idempotente/CAS, series semanales acotadas, próxima entrega académica por rol, deep link seguro de entregas, archivos por slice y DoT unitario/Docker/UI. Los eventos personales no tienen enlace/FK a aula; se quitó esa extensión por indicación del coordinador.
- D1 fue confirmada por mensaje del coordinador durante el diseño. Estado de diseño final `LISTO_PARA_TDD_RED`; no hace falta otra aclaración humana para esta fase.
- Congeladas firmas públicas `parseAgendaEvent`, `parseAgendaRange`, `validateAgendaSeries`, `expandAgendaEvent`, `AgendaError` y `createAgendaService`; informadas al agente `/root/agenda_red` antes de RED. Coordinador informado de cierre.

## Verification

- `git status --short`: salida vacía al inicio; árbol inicial limpio.
- `git log -4 --oneline`: HEAD `ed06f88`, sobre publicación folder `30ea2ab`/`0d838a0`.
- Lecturas y `rg` locales realizadas; algunas búsquedas exploratorias de rutas inexistentes (`packages`, raíz `tsconfig.json`, `apps/api/tests`, `apps/api/package.json`, `apps/classrooms-ui/types.ts`, `src/core/domain`) devolvieron ausencia. Se localizaron las rutas reales; no es fallo de producto.
- Tests funcionales y servicios: no ejecutados; esta asignación solo cambia documentación.
- Script PowerShell de enlaces relativos con `Test-Path` y conteo de fences: PASS ambos documentos, 6 enlaces existentes y fences balanceadas; task de 205 líneas al comprobarlo.
- `git diff --check`: exit 0. Como ambos documentos son nuevos no rastreados, se comprobó también su contenido directamente con el script anterior.
- El estado final observó logs y pruebas nuevas de otros agentes en el worktree; este agente no los modificó.
- Intentos `mem_save` de `slice/agenda` y `mem_session_summary`: ambos bloqueados por hook `Codex host session is not registered; start a new Codex session to register it`. La especificación y este registro son la copia durable; no se afirma memoria persistida.

## Commits and outcomes

Sin commit propio; el coordinador conserva el control de commits e integración.

## Handoff

Entregado al coordinador y `/root/agenda_red`: `odd/tasks/agenda.md`, estado listo y firmas congeladas. Primer trabajo pendiente: RED independiente de A0/A1, luego implementación/verificación. Serie semanal completa, sin excepciones por ocurrencia; no hay otra decisión bloqueante. Este agente solo diseñó y escribió sus dos documentos; no hay commit propio ni publicación.
