# Rediseño 3D — cuenta, navegación, aulas y Agenda

- Agent / role: design_account_classrooms / architect documental.
- Session or task ID: `/root/design_account_classrooms`.
- Date: 2026-10-25.
- Branch / worktree: `main`, checkout canónico `ProtipoFoxMind`.
- Starting commit: `e7f5d6f67520516fe56fe9794ab8d1ac97633bdd`.
- Phase and detailed task/spec links: [roadmap](../implementation-roadmap.md), [V1](../foxmind-v1-functional-spec.md), rediseño 3D autorizado al coordinador.
- Status: completed.

## Request and scope

Especificar el diseño completo de acceso/cuenta, shell/Inicio adaptable, aulas/membresías/asistente y Agenda. Solo documentación en los tres flujos asignados y este registro. Foxy naranja 3D, crema/blanco, lateral persistente desktop, tarjetas ordenadas y perfil/configuración separados. Roles por aula; preservar contratos actuales. Sin implementación, Engram, commits, publicación ni cambios al roadmap compartido. No hay subagentes propios.

## Work performed

- Leídos `AGENTS.md`, el roadmap y el protocolo de registros; cargada `cognitive-doc-design`.
- Observados rama y HEAD reales; existen `.taste-skill/` y documentos de diseño ajenos sin seguimiento, que se preservan.
- Contrastados V1 §§2–6/10–13, `docs/agenda.md`, `odd/tasks/{classroom-ai-extraction,agenda,agenda-compact-event-form,agenda-event-color}.md`, las dos selecciones 3D asignadas y el código de rutas/cuenta/aulas/asistente/Agenda. Se priorizaron los cierres actuales del roadmap sobre las restricciones históricas de rama.
- Escrito [acceso/navegación](../design/foxmind-3d/flows/account-and-navigation.md): 128 líneas, 11 IDs AUTH/NAV/HOME/ACC; acceso completo, perfil V1, separación de seguridad y adaptación por membresías.
- Escrito [aulas/membresías](../design/foxmind-3d/flows/classrooms-and-membership.md): 161 líneas, CLASS-01..15; directorio, cuatro pasos, IA PDF/DOCX privada/revisada/aplicada, ingreso, invitaciones, miembros, archivo/historia y mantenimiento de plan.
- Escrito [Agenda](../design/foxmind-3d/flows/agenda.md): 119 líneas, AGENDA-01..10; calendario privado, plazos autorizados, formulario, semana completa, zonas/DST, conflictos y recuperación.
- Distinguido producto actual/propuesta: `/settings` no existe hoy; sidebar reemplaza visualmente topbar histórica; Home no dispone hoy del agregado de colas/miniagenda; tres coverKey actuales se mapean visualmente sin fabricar siete nuevos valores persistibles. La entrada de aula hoy es Alumnos/Compañeros y la prioridad de Plan estudiante es propuesta.
- Cada familia documenta rutas reales, permisos por aula, desktop/móvil, campos/límites, transiciones, vacíos/carga/error/conflicto/sesión/archivado, assets lógicos y aceptación futura. No se declararon pruebas de UI a partir de imágenes conceptuales.

## Verification

- `git status --short`, `git branch --show-current`, `git rev-parse HEAD`: completados; estado inicial preservado.
- Script PowerShell sobre los tres archivos: `Get-Content` contó 128/161/119 líneas; `[regex]::Matches` para enlaces Markdown + `Test-Path -LiteralPath` resolvió todos los destinos; regex `(?m)^## ((?:AUTH|NAV|HOME|ACC|CLASS|AGENDA)-\d+)` produjo 36 IDs únicos por archivo; comprobación de límites de 200 líneas, whitespace final y marcadores de conflicto PASS, exit 0.
- `git diff --check`: exit 0. Como los archivos propios están sin seguimiento, el control directo de contenido anterior es la comprobación relevante para ellos; no se atribuye a Git una revisión del diff no añadido.
- `git status --short -- <cuatro archivos propios>`: solo los cuatro archivos previstos sin seguimiento. `git rev-parse HEAD`: sigue `e7f5d6f67520516fe56fe9794ab8d1ac97633bdd` al cierre de las comprobaciones.
- RED/GREEN, builds y pruebas funcionales/ego(lite) no ejecutados: no se modificaron comportamiento, código, contratos ni runtime; las aceptaciones escritas son requisitos futuros, no PASS funcionales.

## Commits and outcomes

Unidad documental completada y estructuralmente verificada. Sin commit propio, publicación, escritura Engram ni implementación. Ninguna fase completa del roadmap se marca desde este agente.

## Handoff

Coordinador `/root`: integrar estos tres flujos en el índice/guía general del paquete 3D y contrastar nombres de assets con el manifiesto que gestiona. Primera acción pendiente del paquete: reconciliar los otros flujos y revisar coherencia conjunta. La implementación futura debe definir el agregado de Home, agregar `/settings` y su política de retorno, y mantener o ampliar explícitamente coverKey; esta entrega no autoriza esos cambios. No hay bloqueo para revisar la especificación; las diferencias del producto actual están declaradas.
