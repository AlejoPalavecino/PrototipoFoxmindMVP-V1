# Estado de FoxMind

La integración de backend por capacidades y frontend por casos de uso está publicada en `main`, única rama local y remota. Builds, lint, 2.879 pruebas rápidas vigentes y 23 E2E críticos pasan; ambos roles se recorrieron con Ego Lite y recursos sintéticos. La consolidación posterior incorporó el E2E pendiente de enseñanza con un nuevo resultado completo verde. Los worktrees auxiliares ysu trabajo único quedaron preservados sin ramas adicionales. El [recibo combinado](verification/refactor-integration.json), la [publicación y consolidación](verification/main-consolidation.json) y el [tablero](../odd/tasks/refactor-integration.md) registran commits, respaldos y límites. No hay despliegue. Los registros individuales siguientes describen sus candidatos de origen.

Refactor de cohesión del frontend verificado localmente en `codex/frontend-cohesion`, desde `dd6f4bc`: organización por dominio y caso de uso, contratos acotados y composición en workflows. Build, lint y1.288 pruebas verdes; QA focalizada de ambos roles con proveedor sintético. [Evidencia y límites](verification/frontend-cohesion.json), [tablero](../odd/tasks/frontend-cohesion-refactor.md) y [distribución](engineering/frontend/README.md). Cambios sin commits ni integración con el backend paralelo; no constituye publicación o despliegue.

La [PR #17 — Refactor UX/UI de FoxMind](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/pull/17) reúne la paridad con UI Lab y conserva la arquitectura de IA publicada previamente en `main` (`69e2c01`). El [registro de integración](work-log/2026-11-16-root-ux-ui-publication.md) distingue los controles sobre la combinación de las verificaciones de pantalla citadas abajo, que corresponden a la rama de paridad.

Interior de aulas de ambos roles alineado con UI Lab. Build local `t5pFKl-x2iaUtLN4Ue4F6`: 56 vistas comparadas y 24 comprobaciones de interacción; datos reales de revisiones, devolución efectiva e identidad propia. [Registro y límites](work-log/2026-11-16-root-classroom-interior-exact.md), TASK-018 a TASK-022. La [segunda revisión](work-log/2026-11-16-root-classroom-interior-reaudit.md) amplía esa evidencia a pestañas, diálogos y estados del interior (TASK-023).

Mis aulas, creación e ingreso refinados el 16 de noviembre contra UI Lab: catálogo de ambos roles, invitaciones, asistente y guardado recuperable; build `SumPNj_fdM4dd4fknQlbZ`. [Evidencia y límites](verification/product-parity/classrooms-collection/README.md), TASK-017. La generación real encontró cuota de Gemini; recuperación manual verificada. No amplía la revisión a los interiores de aula.

Corrección posterior del 16 de noviembre: Inicio y navbar de ambos roles revalidados contra la maqueta en el build `UGTf8RMd24BbwOkYdJufH`. Se corrigieron el ancho de escritorio, los módulos sobrantes y el menú móvil que el barrido anterior no detectó. [Comparación vigente](verification/product-parity/home-exact/README.md), TASK-016 del tablero; no amplía la verificación a las demás pantallas.

La implementación funcional previa tiene su [registro](work-log/2026-11-15-root-product-parity.md). El refinamiento visual posterior quedó verificado localmente con Ego Lite sobre build `QuoiLeFkpez_y5nNmscUm`: ambos roles, 28 vistas y cinco anchos. Su evidencia y límites se conservan en las tareas 011–015 del [tablero](../odd/tasks/foxmind-product-parity.md), el [registro de fidelidad](work-log/2026-11-15-root-visual-fidelity.md) y el [informe](verification/product-parity/README.md). [Agenda](work-log/2026-11-16-root-agenda-exact.md) y [Notificaciones](work-log/2026-11-16-root-notifications-exact.md) tuvieron recorridos comparados adicionales en ambos roles (TASK-024 y TASK-025).

| Área | Candidato de integración | Fuente |
|---|---|---|
| Sistema visual | Nunito local, paleta naranja/pastel, navegación expandida, plegada y móvil, espacios enfocados | [Diseño](design/README.md) |
| Inicio | Bienvenida y acciones integradas, pendientes agrupados, agenda del día y aulas; sin bloques extra ajenos a la maqueta | [Inicio](engineering/home/README.md) |
| Aulas | Catálogo con estados/búsqueda, invitaciones con revisión y aceptación explícita, cuatro pasos y borradores recuperables | [Aulas](engineering/classrooms/README.md) |
| Plan, Biblioteca y Muro | Temas dados, recursos de tema/unidad, descripción y actividades relacionadas, revisiones con custodia | [Enseñanza](engineering/teaching/README.md) |
| Actividades y calificación | Alcance interunidad, idea privada requerida para IA, propuesta/rúbrica editable, entrega enfocada, devolución privada y publicada | [Actividades](engineering/activities/README.md), [calificación](engineering/grading/README.md) |
| Foxy y Mi estudio | Chat amplio, paneles a demanda, contexto vivo y biblioteca privada, cancelación, creaciones a Biblioteca, carpeta desde aula y repasos a Agenda | [Foxy](engineering/ai/foxy.md), [Estudio](engineering/study/README.md) |
| Agenda y notificaciones | Editor con color/anticipación elegida, recurrencia preservada, filtros antes de paginar, lectura reversible y destinos autorizados | [Agenda](engineering/agenda/README.md), [avisos](engineering/home/README.md) |
| Perfil | Vista previa de nombre/avatar, guardar/cancelar y configuración de cuenta conservada | [Identidad](engineering/identity/README.md) |
| Archivos | PDF/DOC/DOCX/PPT/PPTX hasta 20 MB; otros formatos existentes hasta 50 MB donde corresponde; cuotas y permisos preservados | [Archivos](engineering/files/README.md) |
| Arquitectura por dominios | Frontend por features, pantallas y composición. Backend por módulos con puertos y adaptadores. Contratos y lógica neutral en `src/core` | [Arquitectura](engineering/architecture.md), [cierre de migración](verification/architecture-migration.json) |

## Verificación y siguientes decisiones

- El [informe de paridad](verification/product-parity/README.md) distingue pruebas automatizadas, recorridos reales, capturas y límites. Las galerías del 12 de noviembre acreditan su candidato histórico, no este rediseño.
- La [revisión de Agenda del 12 de noviembre](work-log/2026-11-12-root-agenda-publication.md) registró seis hallazgos visuales para su versión. Las conclusiones sobre el rediseño se limitan a la evidencia de sus propios recorridos.
- La PR y la integración a `main` están autorizadas para este refactor, sujetas a la verificación del candidato combinado. La aplicación local del worktree de paridad usa Gemini real por pedido del usuario; los ensayos automatizados aislados conservan proveedores sintéticos. La integración no incluye despliegue ni actualización de datos retenidos.
- Hosting, presupuesto, proveedores cloud, cuota productiva y piloto siguen pendientes de decisión. La conversión DOC/PPT requiere el adaptador aislado documentado; no sustituye un servicio externo en silencio.

## Arquitectura IA integrada — 2026-11-16

La arquitectura IA incorpora SDK oficiales, perfiles persistentes por trabajo en seis tareas y protección de pendientes antiguos. Gemini conserva la configuración inicial; Claude queda preparado para una futura activación explícita. El código ya está publicado en `main`, incluida la corrección de inicialización de política con Prisma. Por autorización posterior independiente, la base local del checkout principal sí recibió la migración IA; esa actualización no modificó la base del worktree de paridad ni constituyó despliegue. El [recibo de publicación y actualización local](work-log/2026-11-16-root-ai-runtime-publication.md) distingue ambos pasos. Ver [especificación](engineering/ai/runtime-proposal.md), [tablero](../odd/tasks/ai-runtime.md) y [evidencia local](work-log/2026-11-16-root-ai-runtime-design.md).

## Backend por capacidades — rama de trabajo

El [plan aprobado](engineering/backend-capabilities-plan.md) quedó implementado y verificado localmente en `codex/backend-capabilities`, base `dd6f4bc`, con worktree propio para preservar el refactor frontend concurrente. Los13 dominios se organizan por capacidades, con repositorios tipados, runtime académico agrupado y ejecución IA neutral. La aceptación del alcance acordado y su revisión independiente constan en [TASK-024](../odd/tasks/backend-capabilities.md). El [registro](work-log/2026-11-16-root-backend-capabilities-execution.md) conserva comandos, fallos, correcciones y límites.

Resultado local:2808 pruebas fast,914 de DB,52 de servicios y75 browser en11 archivos seleccionados, sin fallos ni omitidas en esas tandas;19 rutas wrapper y buildsAPI/web PASS. Los seis E2E anteriores se adaptaron sin cambiar UI. Otros33 archivos browser no se ejecutaron dentro de esta selección y siguen en inventario/CI. La revisión independiente cubre fuente y pruebas sintéticas propias; las corridas funcionales se atribuyen a sus ejecutores.

La entrada global del dominio conserva compatibilidad para los consumidores frontend pendientes de remap; el backend ya importa al dueño y el guard impide nuevas dependencias globales. Esta rama no modifica UI, esquema, datos retenidos ni configuración real de proveedores. Sigue sin commits, integración, push o despliegue de este refactor.
