# Study Workspace — presentación por responsabilidad

Agente /root/frontend_study, cierre de cohesión TASK-006. Fecha 2026-11-16.
Worktree C:/Users/alejo/.codex/worktrees/frontend-cohesion/ProtipoFoxMind, rama codex/frontend-cohesion. Autorización: extracción de presentación sin UX nueva, preservando controladores y sus estados.

Superficie: entrada ui/study-workspace.tsx y nuevos presenters bajo workspace, conversations/presentation, creations/presentation, tools; test nuevo frontend-study-workspace-views y este registro. Sin cambios a hooks/model/api/index/CSS ni otros escritores.

Estado inicial: StudyWorkspace de 1259 líneas, presentación y coordinación en una función. Extraídos quince presenters puros; lista exacta enviada al coordinador y a /root/frontend_regression_tests para expansión explícita de fixtures shallow. No se modificaron fixtures compartidos ni aceptación existente.

Reversión: revertir sólo diff de ui/study-workspace.tsx y retirar nuevos presenters/test de esta unidad, conservando controladores, otras extracciones y cambios concurrentes. Sin commits propios.


## Responsabilidades y mapa de extracción
La entrada pública ui/study-workspace.tsx se conserva; no hay cambios de index. Antes: archivo 1259 líneas, función 1219. Después: archivo 570 líneas, función 532. La entrada conserva coordinación de hooks, validación y callbacks de las operaciones; ya no renderiza listas de mensajes, compositor, historial, colecciones ni contenido de los diálogos extraídos.

Todos los componentes siguientes son funciones de presentación sin hooks, propietarios de estado ni clientes concretos. Sus props son datos y callbacks tipados. Los tipos compartidos de proyección del chat viven en workspace/study-chat-presentation.ts (19 líneas, import type).

| Ruta bajo features/study | Export | Líneas archivo |
| --- | --- | --- |
| tools/study-tools-panel.tsx | StudyToolsPanel | 76 |
| tools/study-tool-dialog.tsx | StudyToolDialog | 112 |
| creations/presentation/study-creations-panel.tsx | StudyCreationsPanel | 127 |
| creations/presentation/study-practice-preview.tsx | StudyPracticePreview | 56 |
| conversations/presentation/study-history-panel.tsx | StudyHistoryPanel | 76 |
| conversations/presentation/study-conversation.tsx | StudyConversation | 127 |
| conversations/presentation/study-chat-welcome.tsx | StudyChatWelcome | 30 |
| conversations/presentation/study-message-list.tsx | StudyMessageList | 108 |
| conversations/presentation/study-chat-progress.tsx | StudyChatProgress | 106 |
| conversations/presentation/study-chat-composer.tsx | StudyChatComposer | 90 |
| conversations/presentation/study-sources-dialog.tsx | StudySourcesDialog | 31 |
| conversations/presentation/study-rename-dialog.tsx | StudyRenameDialog | 53 |
| workspace/study-context-dialog.tsx | StudyContextDialog | 62 |
| workspace/study-library-dialog.tsx | StudyLibraryDialog | 68 |
| workspace/study-folder-options.tsx | StudyFolderOptions | 55 |

Contratos: historial recibe resultados filtrados, selección y callbacks; colecciones reciben arrays filtrados y operaciones de apertura; conversación compone mensajes/progreso/compositor sobre snapshots proyectados de chat/generación; fuentes resuelve títulos por ID y versión con fallback a adjuntos; formularios emiten cambios y submit; contexto/biblioteca/opciones delegan en las operaciones existentes. La shell de conversación sólo organiza viewport, seguimiento, compositor y aviso.

DOM: no se agregan contenedores; componentes y Fragment no generan nodos adicionales. Se conservan orden, clases, textos, labels, eventos de foco y el control de la biblioteca que abrió el panel. No se editó CSS ni sus selectores. Las nuevas vistas importan el mismo ui/study.module.css.

## Conservación de controladores
Sin escritura en hooks conversations/creations/practice, model, api, folders, index o CSS. Se mantienen: borrador por chat; identidades de reintento; locks de envío/contexto; guard generation/context; cancelación por requestId; recibos; selección del intento real; selección de temas; validación y estado del formulario de herramientas; renombrado; panelDirty; restore-focus por panelLauncher; confirmaciones de eliminación; edición de creación; práctica y preparación de repaso. Los callbacks con escrituras siguen en el workspace, no en nuevos presenters.

## Evidencia
Baseline antes de extraer: `node --test tests/frontend-study-cases.test.mjs tests/frontend-study-context.test.mjs tests/foxy-study-demand-panels.test.mjs tests/study-exact-generation-ui.test.mjs`: 24/24 GREEN.

La primera comprobación de extracción encontró referencias al scope anterior en la shell de conversación/bienvenida. Se corrigieron mediante composición explícita de los presenters y callbacks del padre; no se cambiaron reglas ni aceptación.

No se introdujo comportamiento nuevo: pruebas existentes antes/después y caracterización de callbacks para una extracción pura. No se atribuye un RED de negocio a esta unidad.

Pruebas propias: `node --test tests/frontend-study-workspace-views.test.mjs`: 5/5 GREEN. Cubren Enter/Shift+Enter/IME, draft y disparador Biblioteca; selección del recurso exacto y referencias; versión de fuentes/fallback de adjunto; cancelación con requestId; orden viewport/unread/compositor/aviso.
`node --test tests/frontend-study-workspace-views.test.mjs tests/frontend-study-context.test.mjs`: 14/14 GREEN, incluidos los nueve escenarios del guard.

`npx tsc --noEmit -p apps/web/tsconfig.json --incremental false`: GREEN en candidato posterior a extracción.
`npx eslint apps/web/src/features/study/ui/study-workspace.tsx apps/web/src/features/study/workspace apps/web/src/features/study/conversations/presentation apps/web/src/features/study/creations/presentation apps/web/src/features/study/tools`: GREEN.
Escaneo AST focalizado: 15 componentes exportados, 0 llamadas a hooks en presenters.

## Fixtures y límites
Las suites shallow requieren expandir exactamente los quince nombres listados (incluyendo slots history/tools/creations/context de FoxyChatLayout) sin autoexpandir componentes con estado. Se informó al test engineer; no se alteraron asserts ni fixtures compartidos por este worker. Suites afectadas informadas: frontend-study-cases, foxy-study-demand-panels, study-exact-generation-ui, study-exact-persistence-ui, study-exact-practice y study-exact-repaso. Las dos suites propias a registrar por root son frontend-study-cases.test.mjs (anterior) y frontend-study-workspace-views.test.mjs (esta unidad).

Pendiente de coordinador/verificador: reconciliar expansión shallow, ejecutar suites ampliadas y verificar build/browser final. No se ejecutaron servicios, DB, proveedores ni commits. No se escribió tablero ni se declaró DONE.
