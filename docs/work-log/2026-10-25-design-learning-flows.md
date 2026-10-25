# Diseño de flujos internos de aula — especificación completa

- Agent / role: `/root/design_learning_flows`, autor de especificación funcional y visual.
- Session or task ID: `/root/design_learning_flows` (identificador real de tarea delegada; sesión de host no expuesta).
- Date: 2026-10-25.
- Branch / worktree: `main`, checkout compartido original.
- Starting commit: `e7f5d6f67520516fe56fe9794ab8d1ac97633bdd`.
- Phase and detailed task/spec links: diseño FoxMind 3D; [especificación V1](../foxmind-v1-functional-spec.md), [actividades IA](../../odd/tasks/classroom-activity-ai.md), [P7](../../odd/tasks/p7-activities.md), [P8](../../odd/tasks/p8-grading.md).
- Status: completed.

## Request and scope

Definir todos los flujos internos de aula antes de implementar: Plan, Biblioteca/archivos, Muro, participantes, autoría manual/IA, resolución/entregas/reentregas, corrección/publicación/corrección de notas y progreso. Dirección 3D seleccionada: Foxy naranja, escritorio con sidebar, superficie blanca/crema, naranja con texto oscuro, colores por materia; unidades a la izquierda y material/actividad a la derecha. Autoría exclusiva sobre tres archivos en `docs/design/foxmind-3d/flows/` y este registro. Sin fuentes de producto, roadmap, memoria, servidores, tests funcionales, commits ni publicación. Otros agentes trabajan en superficies disjuntas; se preservan sus cambios.

## Work performed

- Leídos AGENTS, protocolo de registros, roadmap y registro del sistema visual seleccionado.
- Cargada la skill `cognitive-doc-design`; se aplica estructura por recorrido, estados y aceptación.
- Contrastadas inicialmente las secciones 4–11 de la especificación y guías P6/IA. Rama y HEAD observados; cambios ajenos presentes como archivos sin seguimiento y preservados.
- La búsqueda inicial encontró `apps/web/src/components/private-file-panel.tsx`; la ruta abreviada `src/components` no existe. Se continúa con la ruta real.
- Escritos [espacio del aula](../design/foxmind-3d/flows/classroom-workspace.md) (234 líneas), [autoría manual/IA](../design/foxmind-3d/flows/activity-authoring.md) (202 líneas) y [entregas/corrección/progreso](../design/foxmind-3d/flows/submissions-and-grading.md) (267 líneas).
- Cobertura: 46 flujos únicos — PLAN-01..05, LIB-01..05, WALL-01..04, PEOPLE-01..04, ACT-01..07, AI-01..05, SUB-01..08, GRADE-01..05 y PROG-01..03. Cada flujo incluye entrada/rol, composición desktop/mobile, contrato/campos, transiciones, estados y aceptación, con matriz común de permisos/carga/error/conflicto/archivado.
- Contrastados componentes reales de autoría, generación y hook, biblioteca/muro/plan, sesión/intentos/adjuntos/historial, grading/publicación/rectificación/resultados/progreso; API UI y barril de dominio; guías P6/IA y requisitos/criterios P7/P8. Conservados independencia del Plan, multitema sin duplicación, primera entrega para puntualidad, resultado propio sin claves/audit, elegibilidad/reingreso y fuentes privadas explícitas.
- Separadas las operaciones existentes de composición nueva propuesta: sidebar y entrada curricular, rail de unidades/temas, filtros locales, guards de salida/recarga y modo concentrado responsive. No se inventaron endpoints de página ni funcionalidades fuera de alcance.
- Diferencias existentes documentadas para posterior implementación visual: formulario IA limita subtipos a 10 frente a contrato 30 con total 30; advertencia GROUNDING_REQUIRES_REVIEW sin copia desarrollada; texto heredado de preview con flujo “pendiente”; comprobantes que dicen “pendiente de corrección” sin consultar resultado publicado. No se modificó producto para corregirlas.

## Verification

- `git status --short`, `git branch --show-current`, `git rev-parse HEAD`: rama `main`, HEAD inicial indicado; sin cambios rastreados al comenzar.
- Lecturas PowerShell y búsquedas `rg`: realizadas. La primera búsqueda incluyó dos directorios inexistentes y devolvió exit 1; la ubicación de los archivos se resolvió por inventario posterior.
- Check PowerShell sobre los cuatro archivos asignados: 46 IDs de flujo, 0 duplicados y 0 enlaces locales faltantes; exit 0. Los enlaces al propio encabezado común se conservan como anchors de Markdown.
- Check directo sobre archivos nuevos (sin depender de diff rastreado): 0 líneas con whitespace final, 0 NUL y 0 caracteres de reemplazo; 234/202/267 líneas, 32.970/32.138/40.741 bytes respectivamente. Archivos no vacíos UTF-8.
- `git diff --check -- <cuatro rutas>`: exit 0; por ser archivos nuevos aún untracked, la comprobación directa anterior es la evidencia de whitespace aplicable. `git diff --name-only` vacío al cierre; no fuentes de producto rastreadas modificadas por este agente. HEAD observado al cierre igual al inicial.
- `git status --short -- docs/design/foxmind-3d/flows docs/work-log/2026-10-25-design-learning-flows.md`: archivos nuevos sin seguimiento; archivos ajenos preservados.
- Una búsqueda `rg` de globs pasados como rutas literales produjo error 123 de Windows; no se usó ese resultado como evidencia. Los contratos necesarios se leyeron por sus rutas reales.
- Tests runtime, navegador, servidores y Docker: fuera del alcance documental; no ejecutados.

## Commits and outcomes

No commit, push, despliegue ni implementación de producto.

La especificación asignada quedó completa y comprobada documentalmente. No se declara aceptación visual/browser de una interfaz todavía no implementada ni cierre de fases del producto.

## Handoff

Primer pendiente del coordinador: integrar estos 46 IDs en su índice/cobertura y plan de implementación, conciliar con los flujos de cuentas/aulas y los tokens/assets propios, y revisar el conjunto antes de proponer implementación. No hay decisión crítica de negocio nueva que bloquee estos recorridos; la cuota numérica de producción sigue diferida como contrato previo. Ninguna autorización de implementación/publicación se infiere de completar estos documentos. El coordinador conserva la responsabilidad del índice/roadmap y reconciliación final.
