# FoxMind implementation roadmap

## Estado actual

Este resumen distingue lo integrado, lo verificado y los límites de las pruebas. Los checkpoints anteriores se conservan debajo como historia; sus títulos «Current» o «Resume here» no son instrucciones actuales.

| Unidad | Estado y alcance | Fuente para retomar |
|---|---|---|
| V1 local P0–P9 | Implementada, aceptada localmente e integrada; sin despliegue ni piloto real | [Cierre independiente P9](work-log/2026-10-20-p9-final-independent-verify.md), [producto](product/README.md) |
| Extracción y generación con IA | Implementadas; fuentes, cuotas y confirmación docente tienen límites propios | [Guías de IA](engineering/ai/README.md), [verificación real](work-log/2026-10-25-gemini_real_verify.md) |
| Análisis individual | Implementado con métricas anónimas y alcance docente, separado de calificación | [Guía](engineering/ai/student-analysis.md), [verificación](work-log/2026-10-28-root-student-ai-verification.md) |
| Corrección asistida | Integrada en main; propuesta privada y publicación docente independiente. Pruebas reales limitadas a casos documentados | [Contrato issue #2](../odd/tasks/grading-ai-issue-2.md), [guía](engineering/ai/grading-assistance.md) |
| Sistema visual | FoxMind3D aplicado e integrado; las exploraciones anteriores son antecedentes | [Sistema y familias](design/README.md), [guía técnica](engineering/frontend/foxmind-3d.md) |
| Seis correcciones de auditoría | Implementadas y publicadas, con limitaciones y pruebas atribuidas | [Tarea](../odd/tasks/audit-remediation.md), [cierre](work-log/2026-10-30-root-audit-completion.md) |
| Cinco comprobaciones históricas | Cerradas: FAST783/0/0 y P5/resumen14/0/0. No se repitió toda la selección de42archivos de navegador | [Cierre de los casos](work-log/2026-10-30-root-five-historical-checks.md) |
| Reorganización documental | Aplicada y publicada en main166cf77:43guías canónicas, compatibilidad e historia preservadas; control documental y FAST794/0/0aprobados | [Plan único y evidencia](../odd/tasks/documentation-reorganization.md) |
| Rol exclusivo por cuenta | Implementado y verificado localmente; registro, permisos y UI por rol. La base de desarrollo se reinició con dos cuentas sintéticas; migración para datos existentes no diseñada. Menú móvil verificado para ambos roles | [Implementación](work-log/2026-10-31-root-exclusive-role-implementation.md), [validación visual](work-log/2026-10-31-root-role-visual-final.md), [menú móvil](work-log/2026-10-31-root-mobile-menu.md) |
| Foxy AI: materiales y publicación | Implementación local de texto, imágenes y esquemas con publicación confirmada y destino unidad/tema. Imagen y esquema validados en navegador con Gemini y backend reales, aulas y servicios temporales; integrada y sincronizada en main | [Validación en navegador](work-log/2026-11-01-browser-live-handoff.md), [propuesta](../odd/tasks/foxy-ai-proposal.md) |
| Consolidación del monolito modular | ARQ-01 completada y alcance aprobado; ARQ-02 completada localmente el 2026-11-02: inventario/rutas recuperados, fast1432/0/0 y selecciones DB/servicios aprobadas con límites documentados. ARQ-03 completada el 2026-11-02: diseño aprobado por el usuario con alternativa B, contrato de extracción y excepciones. ARQ-04 completada localmente el 2026-11-02 con guard estático, 336 entradas de línea base, 18/18 pruebas focales y revisión independiente. ARQ-05 completada localmente el 2026-11-02. Puente de adjuntos extraído con paridad de permisos y atomicidad en PostgreSQL/Prisma, 13/13 antes y después. ARQ-06 completada localmente el 2026-11-02. Operaciones compartidas y consumidores de Classrooms acotados, token compatible y paridad local de permisos y contratos. ARQ-07 completada localmente el 2026-11-02. Contrato común de generación, respuestas tardías descartadas y navegación validada en el navegador. ARQ-08 completada localmente el 2026-11-02. Admisión de seis colas consolidada, recuperación y gasto verificados, mediciones de fixture registradas. ARQ-09 completada localmente el 2026-11-02. Regresión rápida 1449 PASS, selecciones SQL/servicios y recorridos integrados de publicación, navegación y recuperación aprobados con límites registrados. Features y PD abiertas. Entrega sin despliegue | [Plan único](../odd/tasks/architecture-consolidation.md), [matriz aprobada](../odd/tasks/architecture-consolidation-arq01-matrix.md), [evidencia ARQ-02](work-log/2026-11-02-id-unavailable-arq02-verification.md), [diseño aprobado ARQ-03](../odd/tasks/architecture-consolidation-arq03-design.md), [registro ARQ-03](work-log/2026-11-02-id-unavailable-arq03-design.md), [evidencia ARQ-04](work-log/2026-11-02-id-unavailable-arq04-boundaries.md), [evidencia ARQ-05](work-log/2026-11-02-id-unavailable-arq05-attachments.md), [evidencia ARQ-06](work-log/2026-11-02-id-unavailable-arq06-capabilities.md), [evidencia ARQ-07](work-log/2026-11-02-id-unavailable-arq07-contracts.md), [evidencia ARQ-08](work-log/2026-11-02-id-unavailable-arq08-execution.md), [registro ARQ-09](work-log/2026-11-02-id-unavailable-arq09-verification.md), [integración y publicación](work-log/2026-11-02-id-unavailable-architecture-publication.md) |
| Salida voluntaria de aulas archivadas | Implementada y verificada localmente el 2026-11-02. Revocación y conservación comprobadas. Readmisión por reactivación e invitación nueva aceptada. | [Criterios](../odd/tasks/archived-classroom-voluntary-leave.md), [evidencia](work-log/2026-11-02-id-unavailable-archived-classroom-leave-implementation.md) |

## Cómo retomar

Inicio incorpora Taller Cálido con liquid glass, aprobado y verificado localmente el 2026-11-04 para ambos roles. P9 completo cerró con 13 pruebas aprobadas, incluyendo navegación móvil y notificaciones anidadas. [Alcance y tareas](../odd/tasks/home-by-role.md) · [Evidencia actual](work-log/2026-11-04-id-unavailable-home-warm-glass.md). El cierre del 2026-11-03 conserva la evidencia del rediseño anterior.

1. Elegir la unidad y leer su contrato/tarea, sin reconstruir todo el historial.
2. Usar [arquitectura](engineering/architecture.md), [operación local](engineering/local-development/README.md) y [verificación](engineering/testing/README.md) para el procedimiento vigente.
3. Consultar el [catálogo de registros](work-log/INDEX.md) solo para decisiones y resultados relevantes.

La publicación del repositorio no es despliegue ni autorización para usar datos reales. Esta entrega documental no implementa funciones nuevas; el siguiente trabajo de producto parte del alcance que indique el usuario.

## Historial de checkpoints conservados

Los textos siguientes describen su fecha, candidato y autorización originales. La evidencia posterior se enlaza desde el resumen actual; no se reescriben resultados ni consentimientos antiguos.


## Auditoría y seis correcciones — integradas en main, 2026-10-30

La [tarea de remediación](../odd/tasks/audit-remediation.md) y el [registro del coordinador](work-log/2026-10-30-root-audit-completion.md) reúnen alcance, cambios y evidencia. Las seis correcciones están implementadas, revisadas y verificadas localmente: Muro acotado, capacidades por composición, contratos críticos compartidos, secciones independientes, controles completos y mejoras de escala/diagnóstico. [Unidades de entrega](work-log/2026-10-30-local-remediation-units.md). Por autorización posterior explícita del usuario se integraron y publicaron en main: implementación9ec038a confirmada en remoto. El [registro de sincronización](work-log/2026-10-30-root-audit-main-sync.md) documenta respaldo de pendientes, limpieza y comprobación de fuentes. Sin despliegue.

Checkpoint original de la auditoría:305entrypoints/51exclusiones/23rutas, FAST181783/0/5 y navegador41completo169/0/0 sobre4aeae017; DB65394/0/0, servicios850/0/0 y wrappers19152/0/0 sobre sus mismas entradas verificadas. Total histórico1548PASS/0FAIL/5omisiones, sin NOTRUN inesperados. Build/tipos/fronteras/dependencias aprobados; se preservan exclusiones justificadas, límites de paginación/contratos y medición local. Los rechazos anteriores, incluido503de causa SQL no demostrada, permanecen documentados.

**Las cinco omisiones quedaron cerradas después**, por petición del usuario: FAST180completo783/0/0 y P5/resumen afectados completos14/0/0, con los cinco casos explícitamente ejecutados. Ruta actual:305/51/23, navegador42; no se afirma otra pasada integral de42archivos. Producto, dependencias y runners son idénticos al checkpoint anterior; solo cambiaron pruebas, fixture y ubicación del resumen. Fronteras/metadata y revisión independiente aprobadas, recursos propios cerrados. Implementación937c6cf confirmada en main remoto; [evidencia y límites de cierre](work-log/2026-10-30-root-five-historical-checks.md). Sin despliegue ni prueba de carga productiva. Ningún permiso, aserción ni plazo se relajó.

## Corrección asistida por IA — issue #2, integrada en main

El aula puede habilitar sugerencias automáticas privadas para entregas; el docente revisa y publica la corrección. La [especificación](../odd/tasks/grading-ai-issue-2.md) y el [registro inicial](work-log/2026-10-29-root-issue2-correccion-ia.md) conservan antecedentes. Implementación y correcciones integradas en main, incluida PR #16 (eee511e); [verificación real de TP con PDF](work-log/2026-10-29-root-gemini-grading.md) y [cuestionario/evaluación con Gemini real](work-log/2026-10-29-root-gemini-questionnaire-evaluation.md): propuesta, edición/aplicación privada, privacidad previa y publicación docente observadas. Q/E verifican desarrollo manual y opción única EXACT; no acreditan todos los formatos ni casos límite. Sin despliegue. Estos registros posteriores permanecen locales.

## Selected Agenda reference — locally verified, 2026-10-29

Agenda and new-event form now follow the selected warm FoxMind direction with responsive WebP artwork, compact monthly toolbar and selected-day rail. Selecting a date keeps the monthly grid visible; existing timezone, recurrence, privacy and event operations are preserved. [Coordinator](work-log/2026-10-29-root-agenda-reference.md), [visual evidence](work-log/evidence/2026-10-29-agenda-reference/README.md):48 focused PASS, strict types and isolated build PASS, bounded synthetic desktop/mobile form and calendar QA, independent source review. No authenticated backend E2E, real event change, remote publication or deployment.

## Classroom interior visual follow-up — 2026-10-29

Following the user's request to improve resemblance without implementing missing functions, the eight existing tabs received a final typography, icon, card and layout pass; real data and actions remain. [Work record](work-log/2026-10-29-root-interior-fidelity.md), [visual QA](../design-qa.md): eight desktop and16 mobile synthetic states inspected,11 focused PASS, strict types and isolated build PASS, independent source review without findings. Differences from mock content/controls and artwork remain; no pixel-perfect or authenticated-backend claim. Local isolated branch only.

## Classroom interior references — locally verified, 2026-10-29

The eight existing classroom sections now use the selected warm visual direction with responsive shell, cards and real data. Library supports local title search and preserves deep links. [Coordinator and verification](work-log/2026-10-29-root-classroom-interior-reference.md): focused3 PASS, types/build PASS, bounded synthetic desktop/mobile QA and independent review; populated history and authenticated/backend acceptance were not verified. Local isolated branch only, no publication or deployment.

## Selected Crear aula references — verified locally, 2026-10-29

The four-step creation wizard now follows the selected general-data, study-plan, units/topics and review references. Scoped cream/orange styling, seven existing covers and lightweight ambient WebP accompany guarded file drop, collapsible units with invalid-field focus, direct review editing and preserved proposal edits. Existing draft/save/revision/conflict/upload/extraction/publication contracts remain. [Coordinator/local units](work-log/2026-10-28-root-wizard-reference.md), [independent review](work-log/2026-10-29-wizard_review_finish.md), [visual/flow proof](work-log/evidence/2026-10-28-wizard-reference/README.md):17 focused PASS, strict types and final production build PASS;12 final viewport states and synthetic error/busy/keyboard journeys passed. Initial visual failures were corrected and retained as history. No remaining requested wizard work; preview uses in-memory ports. Local isolated branch only, without real backend/provider acceptance or remote publication/deployment. Earlier product-phase boundaries remain unchanged.

## Selected Mis aulas reference — verified locally, 2026-10-28

The collection now follows the selected warm panoramic composition with responsive WebP art, horizontal cards, teacher search, combined state/cycle/division filters and grid/list views. Existing creation, joining, invitations, drafts and entry handlers remain. Only actual classroom metadata and pending items are shown. [Coordinator and local units](work-log/2026-10-28-root-classrooms-reference.md), [independent review](work-log/2026-10-28-reviewer-classrooms-reference.md), [visual/interaction evidence](work-log/evidence/2026-10-28-classrooms-reference/README.md): 13 focused PASS, strict types and final isolated production build PASS; seven responsive/layout observations and keyboard/synthetic flows passed. Prior visual/focus defects were corrected. An accidentally executed temporary-DB baseline is recorded and excluded from acceptance. Preview uses in-memory data; authenticated backend E2E is not claimed. Local isolated branch only; no publication or deployment.

## Selected login and registration references — verified locally, 2026-10-28

Both account entry screens now follow the supplied cream/orange split-panel references, with separate responsive WebP illustrations, functional cross-navigation preserving invitation destinations and mobile form layouts. Existing authentication contracts remain: no new OAuth/remember-me/legal controls, and passwords retain the 16–128-character policy. [Coordinator](work-log/2026-10-28-root-auth-reference.md), [independent review](work-log/2026-10-28-reviewer-auth-reference.md), [visual and interaction evidence](work-log/evidence/2026-10-28-auth-reference/README.md): 21 focused PASS, 2 existing opt-in skips, strict types and isolated production build PASS. Synthetic real-component QA passed desktop/mobile and loading/error/cooldown states; real backend authentication is not claimed. Local isolated branch only; no publication or deployment.

## Selected Inicio reference — verified locally, 2026-10-28

The requested isolated ASTRA session implements the supplied warm fox dashboard in `codex/inicio-reference-astra`: responsive WebP hero, functional shortcuts, classroom covers, learning/teaching groups and real agenda/activity summaries. Unsupported percentage/achievement figures are not invented. [Coordinator and local commits](work-log/2026-10-28-root-inicio-reference-astra.md), [independent review](work-log/2026-10-28-reviewer-inicio-reference.md), [visual/interaction evidence](work-log/evidence/2026-10-28-inicio-reference/README.md):37 focused PASS, production build and strict types PASS, five responsive widths and keyboard/retry/pagination checks PASS. Synthetic component preview only; authenticated E2E is not claimed. Seven legacy test failures were reproduced at the starting commit. Automatic approval review blocked the separate production-server launch; no bypass, remote publication or deployment occurred. Prior acceptance boundaries remain.

User-requested follow-up removes the expandable Herramientas del aula from Inicio while retaining the four shortcuts and teaching activity. [Removal record](work-log/2026-10-28-root-inicio-remove-tools.md): 16 focused PASS, independent review and synthetic desktop/mobile visual QA passed; local change only.

## Student summary button — published on main, 2026-10-28

The roster keeps the student summary button visible when entering Alumnos, without jumping back when the roster changes. [Delivery record](work-log/2026-10-28-root-student-scroll-publication.md) documents authenticated pointer/keyboard verification, focused regression and main publication. The prior demo credential rotation and local migration records were included; no deployment.

## Individual student AI — integrated and published on main, 2026-10-28

User authorized integration and publication. Merge `067c4a37a484b052f914584177a3ffba47b22530` preserves the published student journey and adds verified individual AI. [Delivery record](work-log/2026-10-28-root-student-ai-publication.md): API/web builds and types, independent synthetic tests, expanded AI regression and secret scan passed; remote main matched the merge after push. The earlier real Gemini synthetic journey and isolated migrations remain documented below. No deployment or retained-data migration.

## Student journey — integrated and published on main, 2026-10-28

Current human authorization explicitly includes main integration/push while preserving parallel student-AI work. Main fast-forwarded to the reviewed `0f3407d`; the isolated verification added a bounded Windows/Docker clock wait only in test fixtures. [Delivery record](work-log/2026-10-28-root-student-main-publication.md):78 PASS/0 FAIL/0 SKIP, API/web builds and strict types PASS, preview smoke200 and secret checks clean. Normal push and exact remote ref `5ab9dbaa91c965aef45651863d355b217cce73ab` confirmed; passive documentation closure follows. Main's dedicated checkout is clean, while the original AI checkout/branch retains its pending work. This supersedes only the student journey's earlier local-only delivery status below. No deployment or new academic/provider operation.

## Individual student AI — verified locally, 2026-10-28

Teacher classroom cards open an individual analysis based on anonymous academic evidence. Activity references are resolved to current titles through a private, snapshot-checked server mapping; titles and identifiers are not sent to the provider. The [verification record](work-log/2026-10-28-root-student-ai-verification.md) documents 14 focused tests and an authenticated synthetic student/teacher journey with a real Gemini response, reload and cleanup. The two new migrations were tested only on an isolated database. No deployment or remote publication was performed.

## Student submission and feedback journey — verified locally, 2026-10-28

Current user-requested student audit closes the bounded authenticated journey: Biología evaluation autosave/resume→delivery→teacher private correction/publication→student notification/result/progress; Literatura PDF upload/recovery→delivery→published feedback/file after reload. The UI prioritizes feedback, removes duplicate answers and false pending labels, and preserves confirmed receipts after refresh failure. [Coordinator and limits](work-log/2026-10-28-root-student-journey.md), [visual proof](work-log/evidence/2026-10-28-student-journey/README.md):27 focused PASS, strict web types and production build PASS;1440/390/320px checked. Local only; concurrent student-AI work is separate and preserved. This supersedes the earlier missing-proof statements only for these tested journeys, not every P8/P9 case or physical-device/Safari acceptance.

## UX refinement and real AI fixes — integrated and published on main, 2026-10-28

The user authorized main integration/publication of the reviewed UX branch. Main fast-forwarded from `2b58fbe` to `c2236f0`; the GitHub main ref was verified equal after push. [Delivery record](work-log/2026-10-28-root-warm-main-publication.md):139 PASS/0 FAIL/0 SKIP on main, API/strict web/production buildsPASS, read-only preview readiness and asset smokePASS,15-commit secret scan clean. Product tree exactly matches the reviewed branch. This supersedes only the earlier local-only publication statuses below; historical acceptance limits remain. No deployment or retained-data operation. A passive documentation closure follows the verified product push.

## Warm fox refinement and Agenda views — local, 2026-10-28

The user's latest refinement keeps the approved learning composition and replaces its blue palette with orange/cream/brown pastels. Home drops draft/refresh-time clutter, classrooms retain drafts, teaching progress and conversation/notification/form presentation are clearer, and shared motion respects reduced-motion preferences. A transparent generated fox ships in three WebP sizes; original logo/covers remain. Agenda adds month/week/day navigation plus bounded daily/weekly/monthly recurrence and visible notes. [Coordinator](work-log/2026-10-28-root-warm-product-polish.md) and [visual proof](work-log/evidence/2026-10-28-warm-product/README.md):86 focusedPASS plus1 city-catalogPASS, API/web build and strict typesPASS, authenticated responsive checks and real monthly create→reload→future occurrence→cleanupPASS. Schema-only preview migration preserved all prior event rows. Local branch only; historical grading/submission and physical-device/Safari gaps remain unchanged.

## Real activity AI generation and application — local, 2026-10-28

The subsequent user request closes the pending real-provider activity journey for the permanent demo account. Two real Gemini requests succeeded: context-only (two prompts, reviewed title, applied once as a private draft, verified after reload/reentry) and PDF plus context (one-page source read and cited, saved proposal recovered). Named teacher evidence now reaches generation/token preflight explicitly; review displays understandable source names/statuses. [Coordinator](work-log/2026-10-28-root-real-ai-completion.md) and [actual evidence](work-log/evidence/2026-10-28-real-ai/README.md):58PASS/0FAIL/0SKIP, API build, strict web types, isolated production build and desktop/mobile checks PASS. Historical failures retained; original PDF failure cause is not proven and limits are unchanged. Submission/grading persistence and physical-device/Safari gaps below remain. No remote integration/publication/deployment.

## Selected sky learning concept — local, 2026-10-28

The user's new screenshot supersedes the prior warm/green art direction. Shared sky/blue styling now spans navigation, Home, classrooms, Agenda, accounts, forms, wizard and AI/grading states; existing functions, fox/logo and covers remain. A generated fox welcome has three production WebP variants. [Coordinator](work-log/2026-10-28-root-sky-reference.md), [comparison evidence](work-log/evidence/2026-10-28-sky-reference/README.md) and [current visual QA](../design-qa.md) record 50 authenticated route/tab width observations, focused 22 PASS, strict types and production build PASS. No existing academic data was edited in this visual follow-up. Local branch only; whole-product real-provider/persistence and physical-device/Safari gaps below are unchanged.

## Educational direction and guided workflows — local, 2026-10-28

Follow-up request authorizes a distinct visual direction and testing with the permanent demo account. Local units `f425fa1` (warm educational shell, compact Inicio/aulas/Agenda, styled native selects) and `78e4125` (guided workflows) introduce three-step AI setup, actual-state waiting, focused editing/correction and grouped secondary actions. Original fox/graphics and business contracts are preserved. See [current coordinator](work-log/2026-10-28-root-education-experience.md) and [selected authenticated evidence](work-log/evidence/2026-10-28-education-experience/README.md).

Actual runtime 52171 was restored and authenticated; 39 route/tab viewport observations had no document overflow. Regression: 103 PASS / 0 FAIL / 2 optional SKIP; strict types and production build PASS. Two bounded AI jobs failed recoverably (file reading limit, insufficient source information); no activity or grade was published. Successful real provider/application, submission/grading persistence and physical-device/Safari acceptance remain unverified. This supersedes only the earlier unavailable-runtime observation, not historical acceptance boundaries. No main merge, push, PR or deployment.

## Platform UX/UI redesign — local implementation verified, 2026-10-28

Current redesign lives on `codex/foxmind-ux-redesign`, starting from clean main `2b58fbe`. It introduces a compact shared shell, account/Agenda styling, classroom and academic-work surfaces, Home resource disclosure, teacher-only Plan administration disclosure and mobile topic selection. Original fox/logo and graphic assets are preserved. [Coordinator record](work-log/2026-10-28-root-platform-redesign.md) and [visual QA](work-log/evidence/2026-10-28-platform-redesign/README.md) record 69 PASS / 0 FAIL / 2 optional SKIP, strict types and production build PASS, plus synthetic component-browser evidence at 320/390/768/1366/1440px.

Local implementation is verified; whole-product authenticated acceptance remains unfinished. Next: teacher/student end-to-end journeys on an available authorized disposable runtime, including uploads, submissions and grading. The usual runtime at 52171 was unavailable; fixture screenshots do not replace authenticated proof. This session uses no subagents and makes no independent/native-review claim. No main integration, push, PR or deployment. Historical milestones below remain historical and retain their original scope.

## Inicio visual work — published 2026-10-28

The miniagenda and Inicio refinement commits were pushed through `827d3a1` at the user's request. [Delivery record](work-log/2026-10-28-root-inicio-final-publication.md) records remote verification and preservation of the generated development type file; no deployment or retained-data operation.

## Inicio typography and visual refinement — 2026-10-28

Home-only CSS refines type hierarchy, surfaces and controls while preserving FoxMind branding and the selected miniagenda. [Work record](work-log/2026-10-28-root-inicio-refined-design.md) records responsive synthetic visual evidence, focused tests and the separate legacy test failures. Local delivery only.

## Miniagenda reference alignment — 2026-10-28

Inicio miniagenda now uses date tiles, classroom labels, time and a right-hand arrow following the supplied reference. Month and time-zone context remain available. [Work record](work-log/2026-10-28-root-miniagenda-reference.md) documents fixture visual comparison, focused tests and limits; local delivery only.

## Inicio refinements — published 2026-10-28

Compact mobile greeting and agenda, quieter setup notice and corrected count inflection were committed as `6d1a0f526e6c88ce69f4d5cde0696e0f01a46c07` and pushed to main at the user's request. [Implementation evidence](work-log/2026-10-28-root-inicio-refinements.md) records focused tests, types and synthetic responsive checks; [publication record](work-log/2026-10-28-root-inicio-publication.md) distinguishes the running local server from unverified authenticated rendering. No deployment or retained-data operation.

## Platform visual polish — integrated locally into main, 2026-10-28

User authorized integration and a clean branch. Main fast-forwarded from `fa3ce749` to verified visual candidate `e884341`; product tree matched exactly. [Integration record](work-log/2026-10-28-root-visual-integration.md) preserves the outcome and backup of prior untracked preparation documents. This supersedes the earlier no-main-integration boundary for this local integration only; no push or deployment was requested.

## Platform visual polish — verified in isolated copy, 2026-10-28

User-authorized branch `codex/foxmind-visual-polish` unifies shared typography/palette/navigation, Home/classroom learning surfaces, Agenda and account/files presentation while preserving existing images, layout, states and contracts. One duplicate Wizard heading and empty auxiliary auth decoration were removed. [Coordinator](work-log/2026-10-28-root-platform-visual-polish.md), [design contract](work-log/2026-10-28-astra_visual_design.md) and [integrated-browser evidence](work-log/evidence/2026-10-28-platform-polish/design-qa.md) distinguish observed responsive/keyboard/component-fixture checks from unperformed authenticated E2E, native zoom and real upload/provider journeys. Final production buildPASS;46focusedPASS/0FAIL/2historical optionalSKIP; independent dual review and final delta review0findings. All execution delegates Astra/high or xhigh per session preference. Local commit identities follow in coordinator record; no main integration, push, PR or deployment. Original52171/52170runtime and retained data remain intact; preview53181 uses synthetic data.

## Permanent local demo accounts — created, 2026-10-26

Two verified synthetic accounts and three retained classrooms now support teaching/learning flows, with PDFs, published activities, one submission awaiting review and two private events. [Reuse/access guide](local-demo-account.md), [coordinator](work-log/2026-10-26-root-permanent-demo.md) and [worker](work-log/2026-10-26-permanent-demo-worker.md) distinguish successful fresh-session API checks from unavailable graphical/reboot acceptance and an extra login rerun limited by HTTP429 (unknown Retry-After). Credentials are locally DPAPI protected; no product/schema change, reset, provider request or remote publication. Reuse these accounts; do not rerun disposable seeds.

## Authentication notebook responsiveness — implemented locally, 2026-10-26

User requested preserving the approved auth style while correcting oversized notebook presentation. Scoped CSS now adapts to both available width/height, removes the878px minimum and nowrap, compacts controls/type/padding and preserves large-screen/mobile behavior. No JSX/auth/navigation/data change. [Coordinator](work-log/2026-10-26-root-auth-responsive.md) and [native QA](work-log/evidence/2026-10-26-auth-responsive/design-qa.md) record28observations(26exact+2observed902rather than requested901), visible notebook primary CTAs, no horizontal overflow, existing8PASS, strict types/isolated build PASS and0open review findings after password-padding correction. Natural vertical scroll and inline-link/zoom/hardware limits stay explicit. Live52171unchanged; local main delivery only.

## Agenda reference matching with frozen navbar — implemented locally, 2026-10-25

Agenda now follows the approved3D reference with balanced calendar/day/upcoming columns, local rounded typography, monthly Today toolbar, date tiles/privacy/legend and wide Foxy artwork. The newly approved navbar's four files/hashes are exactly unchanged; no Agenda override affects it. Calendar42cells, hooks, event forms/CRUD, timezone/auth/data policies remain. [Coordinator](work-log/2026-10-25-root-agenda-screen-polish.md) and [native fixture QA](work-log/evidence/2026-10-25-agenda-polish/design-qa.md) record meaningful RED→53focusedPASS, strict types, isolated web buildPASS, eleven stable views, in-memory action/contrast checks and0review findings. Component-fixture evidence is not authenticated E2E;320px day-cell fit exception and42versus5-row mock difference are explicit. User52171/API52170untouched; local main delivery only, no new push/deployment/event-data operation.

Local delivery:32c3214(date/presentation/test unit277authored lines),692f0ac(style/checkpoint190lines), with passive fixture QA closure following. No unfinished implementation in this bounded Agenda request; frozen navbar is the current shared baseline.

## Navbar palette and Home Create/Join polish — implemented locally, 2026-10-25

Private navigation/drawer now use restrained slate text, warm selected state, consistent icon/label weights and visible lavender focus. Home Create/Join have52px targets,16px corners, strong labels and orange/lavender hierarchy. Three CSS leaves only; no auth/navigation/data logic changes. [Coordinator](work-log/2026-10-25-root-nav-cta-polish.md) and [native fixture QA](work-log/evidence/2026-10-25-nav-cta/design-qa.md) record PostCSS3/3, focused Home4PASS, isolated web build PASS, contrast/mobile/keyboard/callback checks and0review findings. Fixture-only visual scope/disabled and public-header limits remain explicit. Live52171unchanged, local main delivery only; no new push/deployment.

Local implementation/evidence commit:e167c85 (138authored changed lines); passive documentary closure follows. No pending implementation for this bounded visual request.

## Inicio reference matching — implemented locally, 2026-10-25

User requested matching the approved teacher/student3D mockups after seeing the actual none-account dashboard. Current main now has aligned left greeting/right miniagenda, scoped rounded typography/navy styling, larger actionable rows/date tiles and honest first-use composition. The tested visibility gate hides only ready-empty nonagenda shelves under none; errors, populated archived rows and applicable active-role empty states remain. Teacher tools precede materials; actual targets and all authorization/backend contracts are unchanged. [Coordinator](work-log/2026-10-25-root-home-screen-polish.md) and [native fixture QA](work-log/evidence/2026-10-25-home-polish/design-qa.md) record RED→GREEN, focused tests, strict types, final isolated web build PASS,13state/viewport captures,14actions and0review findings. Fixture pixels are not authenticated E2E; live52171/52170 remain running unchanged. Local commits follow in coordinator record; no new push/deployment/data operation.

Local delivery:9b046fa(state/date/composition tests,243authored lines),e99643e(reference styling/checkpoint,312lines), with passive fixture/native QA closure following. No requested implementation remains pending; current-state user screenshot is not stored as test data.

## Approved sign-in and registration polish — implemented locally, 2026-10-25

User authorized editing current main and viewing live changes. The two approved authentication mockups are implemented using original ZorroH, existing auth WebP, locally served Fredoka, scoped split layout and form-first mobile presentation. [Coordinator](work-log/2026-10-25-root-auth-screen-polish.md) and [native visual QA](work-log/evidence/2026-10-25-auth-polish/design-qa.md) record independent checks: final isolated Next build PASS, focused16PASS/0FAIL/2historical opt-inSKIP, six accepted desktop/mobile views and0new review findings. Prior legacy entry-glass failures remain documented, not hidden. Same local52171URL now has development HMR; no account/data/provider operation or new push/deployment. Local commit identities follow in coordinator record.

Local delivery:37f330f prepares licensed local typography,1ca8520 implements the scoped screens (160/368authored lines respectively). Passive QA closure follows. Both routes remain available on52171; no further implementation step is pending for this bounded request.

## FoxMind 3D main publication — completed, 2026-10-25

User explicitly authorized preserving loose changes and pushing main. [Current publication record](work-log/2026-10-25-root-visual-main-publication.md) controls this delivery: preserve13direction JSON and14historical design records, integrate the verified3D implementation by fast-forward and ordinary non-force push. Earlier local-only/no-publication text below is historical for its stage. No deployment or retained-data operation is requested. Actual push/ref confirmation is recorded in the current publication record after observation.

Observed publication succeeded at330ffd9fa9efe5a27efaecf3cdb4e851488dad4d: local HEAD/main/origin-main and live remote main exactly matched; full working tree clean. Pending history was saved in10bounded commits (maximum345lines); reviewer found0new issues. Product bytes preserve the already verified visual migration, with no new runtime replay. Passive documentary closure follows separately.

## FoxMind 3D visual migration — implemented and locally verified, 2026-10-25

Local delivery is complete at `526337636d1ce2b2c99e30509e3e584ef64e79ce` on `codex/foxmind-3d-migration`:44semantic commits, maximum393authored changed lines, no exceptions; final tree72e03f5d6d49f0772219d296094ed69642b70264 exactly matched the frozen candidate. [Commit/check manifest](work-log/evidence/2026-10-25-foxmind-3d/delivery.json) and coordinator closing section supersede earlier pending-delivery text. Passive documentary closure follows; no push, PR or deployment occurred.

The current user authorized local implementation of the selected3D references, original ZorroH and membership-driven Inicio. D1–D9 code is implemented on `codex/foxmind-3d-migration` from `eecb769`; [guide](foxmind-3d.md), [execution contract](../odd/tasks/foxmind-3d-migration.md), [82-ID evidence map](foxmind-3d-verification.md) and [coordinator](work-log/2026-10-25-root-visual-migration.md) distinguish implementation from observed proof. Fresh API/Next builds pass;122legacy tests pass and final new/affected180tests yield176PASS/0FAIL/4historical optionalSKIP. Five owned runtimes and one ego Space verify crossed real account/Agenda/teaching/submission/grading/controlled-AI journeys. Real-page PDF-screen exports were rendered and inspected; no native screenshot claim. Blind dual review approved tree9ad34da620d1336700a88dccf5fabeb78f3689d9 after two bounded rounds; the separate12line motion leaf passed CSS/AST and fresh Next build. Native200%zoom, LCP/INP and physical/Safari acceptance remain explicit advisories, not PASS;27IDs have a direct ego step and55 rely on preserved/adapted code and related regression/type evidence, not82newUIE2Es. Local commit delivery is recorded separately after identities exist. Earlier design-only restrictions are historical. No remote publication, deployment, real participants, retained-data mutation or secret reads occurred or are authorized here.

## Main source publication — completed 2026-10-25

User explicitly authorized pushing main to GitHub without deployment. [Publication record](work-log/2026-10-25-root-main-activity-push.md) reconciles the verified activity/API history with remote login PR1 merge8619cd0 and concurrent local main9322d57, preserving both histories and roadmap sections. Combined production web build and16focused checks passed; original API122PASS source is unchanged. Normal push succeeded and live remote/local main/origin-main matched b6ddbd1312d956b4e473ef1b05dd94e561500ec5; GitHub deployments remained0. Passive documentary closure follows separately. Earlier no-push statements remain historical for their own stages. No deployment or retained-data change performed.

## Login merged to main — 2026-10-25

User authorized merging PR1 and updating the local project without deployment. [Merge/local delivery record](work-log/2026-10-25-root-login-main-merge.md): GitHub main8619cd0 contains the scoped login PR; local integration preserves the26unpublished AI commits from3058def and both roadmap contributions. Fresh combined API/Next/types and28focused client checks passed. Earlier publication-only boundaries below are historical; no deployment or publication of local AI work is inferred.

## Default login destination — 2026-10-25

Later user-authorized publication: [remote-based delivery](work-log/2026-10-25-root-login-publication.md) isolates login changes from unpublished activity AI work. Fresh remote-base API/Next/types/client checks and all five functional browser groups passed. Ego real login reached Inicio; a capture-selector failure was corrected and the retained screen was inspected without replaying the fixture. The combined opt-in run remains recorded as FAIL; no merge or deployment is authorized.

User-requested navigation correction: ordinary verified sign-in now opens `/inicio`, as do default existing-session and verified-email continuations. Explicit allowed classroom/invitation destinations and unverified-email gates are preserved. [Coordinator record](work-log/2026-10-25-root-login-inicio.md), [independent verification](work-log/2026-10-25-login_verify.md), [structural review](work-log/2026-10-25-login_review.md). Fresh API/Next/types and focused clients passed; all five real functional browser groups passed. Optional ego capture timed out; visual acceptance is unavailable and the combined opt-in run is not reported as wholly passing. Local branch delivery only; existing phase acceptance stays historical.
## API build preparation — verified, 2026-10-25

The requested follow-up closed the API build proof without changing code or the shared30s policy. Fresh `npm run api:build` on exact main577445c passed;22files/122tests passed with640unchanged inputs, compiled HTTP host and owned PostgreSQL/private-document fixtures. The canonical checkout's API also compiled (Prisma1319ms/TypeScript3908ms); it belongs to concurrent codex/login-inicio, so that observation is distinguished from exact-main proof. [Current coordinator/delivery](work-log/2026-10-25-root-api-build-main.md), [independent verification](work-log/2026-10-25-api_build_verify.md), [evidence](work-log/evidence/2026-10-25-api-main-build/summary.json). Earlier timeout remains history with cause unproved; no speculative patch, deadline expansion, new Google calls or remote publication.

## Activity Gemini real verification and main integration — current request, 2026-10-25

After the controlled-provider delivery below, the user explicitly requested complete verification using the configured Gemini API key and local commits/main integration if it passes. [Current coordinator record](work-log/2026-10-25-root-activity-gemini-main.md) owns delivery. [Independent real verification](work-log/2026-10-25-gemini_real_verify.md): PASS for TP/regeneration/quiz/evaluation, publication/student/manual grading/unique metrics and110fresh checks,640inputs unchanged. SDK count compatibility and format-local parser imports were corrected test-first;40post-fix parsing checks passed under the unchanged3000ms bound. Historical failures and their unproved exact cause remain explicit in [evidence](work-log/evidence/2026-10-25-activity-gemini-real/README.md). Local commits/main delivery follows separately in the coordinator record. Authorized key use stays inside the backend, with synthetic data and owned disposable services; no retained-data changes, push/PR or deployment inferred. The earlier local-only integration restriction below is historical and superseded only by this local-main request.

Local main fast-forwarded to577445c with exact candidate tree and unrelated untracked files preserved. [Historical canonical delivery](work-log/2026-10-25-root-activity-main-delivery.md): web build PASS; API then exhausted its shared30s budget (Prisma succeeded, TypeScript ETIMEDOUT without diagnostics). The follow-up above supersedes that missing API build proof with actual PASS; original failures remain attributed. Passive documentary closure is separate from product verification, without remote publication.

## Activity AI and multiple topics — implemented and verified locally, 2026-10-25

The user-approved local extension is implemented on `codex/classroom-activity-ai`: manual or generated TP/questionnaire/evaluation, multiple topics within one unit, explicit PDF/DOCX/teacher-context sources, private reviewed proposals and explicit draft/publication. [Feature/contract](../odd/tasks/classroom-activity-ai.md), [teacher guide](activity-ai.md), [coordinator/delivery](work-log/2026-10-25-root-activity-ai-implementation.md), [independent Sol6.1/xhigh proof](work-log/2026-10-25-activity_independent_verify.md) and [selected live captures](work-log/evidence/2026-10-25-activity-ai/README.md) own evidence. Frozen baseline104PASS plus final hook-delta20PASS, fresh API/Next builds, all nine DoT groups and both scoped rejudgments passed. Final product tree7d47529b560902f82411a53e2f7fc4ebe90ef94e; no product changes after acceptance. Three-type real API/data/browser journeys used a controlled provider, not real Gemini. Initial failures and one inherited submission-label advisory remain attributed; no new feature blocker remains. Local delivery/commit identities belong to the coordinator record. Existing P0–P9 acceptance stays historical; no main integration, remote publication or deployment is authorized.

## Repository consolidation — 2026-10-24

All current product work, including Agenda/Gemini and the verified folder tabs, is integrated and published through main `f4f9519`. The later [publication record](work-log/2026-10-24-root-tabs-main-publication.md) supersedes earlier local-only publication statements below. The [repository consolidation record](work-log/2026-10-24-root-repo-consolidation.md) reconciles remaining historical logs, duplicate design snapshots and obsolete branch/worktree registrations. Older dated handoffs remain historical, not current blockers or new feature authority. After the user-authorized [canonical local restart](work-log/2026-10-24-root-local-restart.md) and manual testing, the user requested [closing FoxMind again](work-log/2026-10-24-root-local-stop.md): API/Next and all four main support containers are now stopped, preserving current data/configuration and all40retained volumes. Historical URLs below are unavailable until a new requested restart. No deployment.

Canonical development now uses the original project directory on the sole local branch `main`; all35other branch refs and every extra registered worktree are retired after verified history preservation. Fresh canonical API/Next builds pass. After the user moved this chat to Local, the final detached checkout was removed normally with Git; its generated residual cache links were unlinked without following their targets. Recovery data stays outside the repo and is not published. The consolidation record closes the prior app-location hold and records synchronized delivery; no cleanup action remains.

## Folder tabs — integrated into local main, 2026-10-24

User authorized local integration only. Main fast-forwarded from `b00b6fb` to the exact independently verified candidate `a6fe079`, with identical committed trees before documentary closure. [Integration and preservation evidence](work-log/2026-10-24-root-tabs-main-integration.md). Other worktrees and their pending changes are preserved. No push, deployment or runtime restart. The candidate preparation below remains attributed historical evidence; its no-main-integration boundary is superseded only for this local delivery.

The selected shoulder/slope correction is complete on `codex/folder-tabs-ready`, based on main `b00b6fb`. Fresh builds/types, actual Next/Vite SVG loading, real desktop/390/320 screenshots, native focus/navigation and final scoped independent review passed. Account/header and wizard/stepper overlaps, normal frame fallback and forced-color global selection were corrected. [Coordinator and exact handoff](work-log/2026-10-24-root-folder-tabs-ready.md), [independent proof](work-log/2026-10-24-tabs-live-verify.md), [review](work-log/2026-10-24-tabs-final-review.md), [selected PNGs](work-log/evidence/2026-10-24-folder-tabs/README.md). Native browser200percent zoom was unavailable; equivalent reflow was observed. Wizard proof covers steps1/2without a new provider/upload journey. Original dirty tab worktree remains untouched. This is a locally committed integration candidate, not a main merge, push or deployment; existing phase checkpoints below are unchanged.

Historical shutdown state (2026-10-24, superseded by the explicitly authorized canonical restart above): user requested stopping all FoxMind processes/containers. Both API/Next supervisors ended cleanly and all five active containers stopped with exit0. At that checkpoint zero FoxMind process/listener/container remained; all40retained named volumes and private key/configuration/backups remained. [Shutdown evidence](work-log/2026-10-24-root-foxmind-shutdown.md). That shutdown itself performed no automatic restart, push or deployment.

## Classroom AI + Agenda — integrated into local main, 2026-10-24

Current manual-test runtime (2026-10-24): main Agenda+Gemini is running at http://127.0.0.1:52171, inbox http://127.0.0.1:52169, on an explicitly authorized independent data clone. The prior Gemini dataset was also recovered at60061/inbox49493 after a Docker interruption; logical databases and buckets are separate on persistent infrastructure. Original37business tables/four objects verified exact, main12/source10migration histories and31independent readiness checks passed. Original Google key loads internally from its existing private file; no startup Google calls. [Operational record and restart handoff](work-log/2026-10-24-root-main-gemini-runtime.md). Apps left running; no product changes, push or deployment.

User explicitly authorized merging classroom-gemini into local main while preserving Agenda and all unrelated changes, without push. Merge1472fa1 combines both parents and preserves both feature histories. Final API/Next builds,174combined tests, isolated P5 journeys and both scoped rejudgments passed; a direct Node24 domain-import incompatibility was fixed test-first without changing the error contract. Both historical feature checkpoints below remain attributed. [Integration record](work-log/2026-10-24-root-classroom-ai-main-integration.md). main was advanced locally with expected-old CAS; original checkout and other branches/source worktree are preserved. No push, PR, deployment or retained-database changes.

## Agenda — published to GitHub main, 2026-10-24

After separately authorizing publication without deployment, the user-approved Agenda history was pushed normally to origin/main. Live remote readback matched d09c5941102bbdae6922e013d91ce48e719808ab; GitHub deployments remained0. [Publication evidence](work-log/2026-10-24-root-agenda-github-publication.md) records preflight and delivery. This supersedes the local-only boundary immediately below for source publication only. No deployment, PR, force-push or retained-data operation. A passive documentary closure follows under the same push authorization.

### Local integration checkpoint

The user manually tested and accepted event colors, then explicitly authorized integrating all Agenda work into main. Local main fast-forwarded from ed06f885 to32fecce3 with exact ref/tree equality: calendar, academic deadlines, private unique/weekly events, compact form and persisted colors. Fresh final-source Agenda suite93PASS/0FAIL/0SKIP and strict web types passed. [Integration evidence](work-log/2026-10-24-root-agenda-main-integration.md) owns the local delivery and documentary closure. Current preview http://127.0.0.1:49642/agenda remains available; retained data and unrelated checkouts are preserved. No push, PR or deployment. Automated screenshot limitations remain historical evidence; user manual acceptance does not invent automated captures.

### Historical Agenda preparation checkpoints

2026-10-24 event color: optional persisted palette with Automático/legacy omission, accessible selector, month/day colors and mobile indicators implemented and functionally verified on codex/foxmind-agenda. [Color task](../odd/tasks/agenda-event-color.md), [independent live proof](work-log/2026-10-24-event-color-verify.md), [coordinator/local commits](work-log/2026-10-24-root-agenda-event-color.md). Current preview http://127.0.0.1:63122/agenda; previous database/data retained separately, old web listener stopped. Migration deploy/diff/history11,91full tests and47final UI/regressions passed. One capture failed because window minimized; geometry measured, no pixel acceptance. No main integration/publication.

2026-10-24 compact event form: implemented and functionally verified locally in the same worktree. Automatic calendar zone with human city choices, duration/manual timing, preserved all-day hours, weekly summary, inline focus/recovery and visible saved result. [Compact task](../odd/tasks/agenda-compact-event-form.md), [independent live evidence](work-log/2026-10-24-compact-form-verify.md), [coordinator/commits](work-log/2026-10-24-root-compact-event-form.md). Its earlier preview58411 is superseded by the color checkpoint above; retained data remains separate. No main integration/publication. Historical capture timed out; DOM geometry passed desktop/mobile, no pixel acceptance claimed.

The user requested a new Agenda section with upcoming academic deadlines and private events, and confirmed weekly recurrence alongside single events. Work is isolated on `codex/foxmind-agenda` from main `ed06f88`; the historical P3 checkout remains untouched. [Agenda task and contract](../odd/tasks/agenda.md), [user guide](agenda.md), and [coordinator evidence](work-log/2026-10-23-root-agenda.md) own the current scope. Status: **implemented and functionally verified locally**; private events, weekly recurrence and real academic journeys passed. The final month-navigation regression and fresh web checks are recorded in the [2026-10-24 closure](work-log/2026-10-24-root-agenda-closure.md). Local reviewable commits are prepared; pixel acceptance remains unavailable (zero captures), explicitly separate from functional proof. No main integration or publication has occurred for Agenda.

## Classroom AI extraction — functional checks 2026-10-24

Latest scoped visual closure (2026-10-24): the user-requested missing LIVE editor and pre-creation review screenshots are now captured for both PDF and Word at375×812/320×812, using real Gemini and touch emulation. All36 original PNGs were inspected by the tester; coordinator inspected each state/width before releasing four apply/create gates. Both new classrooms persisted exactly two edited units/five topics after reload and authenticated API200. No product defect or source change was demonstrated. [Live evidence index](work-log/evidence/2026-10-24-mobile-live/live-mobile-20261024-resume-1792856935167/README.md), [coordinator](work-log/2026-10-24-root-live-mobile-captures.md), [attributed browser report](work-log/2026-10-24-live-mobile-browser.md). This closes that specific prior live-photo gap; historical failures/static evidence and physical-device/Safari/native-keyboard limits remain explicit. Space3 handed off after clearing emulation/touch; platform60061/inbox57642 runtime preserved. Local commits only; no publication or deployment.

The user requested Gemini extraction of units/topics from the uploaded study plan, teacher editing and confirmation before classroom creation, and a separate worktree. The [feature](../odd/tasks/classroom-ai-extraction.md) and [coordinator record](work-log/2026-10-23-root-classroom-ai.md) own this new scope on `codex/classroom-gemini`, based on main `ed06f885`. The user accepted D1:A PostgreSQL background jobs and authorized implementation; the L3 design gate is satisfied. Implementation and functional local controlled-provider verification are complete:110 automated checks, approved scoped dual review, fresh API/Next builds, full P5 integration and independent PDF/DOCX browser journeys. See the [final coordinator](work-log/2026-10-24-root-classroom-ai-final.md) and its linked evidence. The initial real smoke failed with HTTP400; its [historical record](work-log/2026-10-24-root-gemini-real-smoke.md) remains unchanged. The schema repair is now committed locally as 0c6b4df: same-request real differential confirmed removal of maxItems sufficient, regression was observed RED then GREEN, fresh API/Next builds and76independent AI tests passed with cleanup0. The corrected real flow automatically extracted two units/four topics, then teacher editing, explicit application and classroom creation persisted two units/five topics across reauthentication/reload and authenticated API200. See [repair acceptance](work-log/2026-10-24-root-gemini400-fix.md) and [browser evidence](work-log/2026-10-24-fix400-real-browser.md). PDF desktop reviewed-editor pixels were captured and inspected; that PDF final Plan capture was unavailable with the window minimized and mobile was not run, so the broader historical visual exit condition remains pending. One earlier401/reload redirect has no confirmed cause; fresh login/reload and persistence passed without authentication-policy changes. Historical V1 AI exclusions remain applicable to other AI capabilities; existing P0–P9 acceptance is unchanged. No publication or deployment is authorized by this scope.

The requested real DOCX extension also passed on2026-10-24, recorded locally in 1a22fe2: paragraphs and table topics survived Word parsing, automatic Gemini extraction returned two units/four topics, teacher edits/application and explicit creation saved two units/five topics, and immediate reload/reopening plus authenticated detail API200 confirmed persistence without relogin, fallback or retry. Six targeted document regressions passed; no additional product correction was needed. See [DOCX acceptance](work-log/2026-10-24-root-docx-real.md) and [browser record](work-log/2026-10-24-docx-real-browser.md). Word final-review and reopened-Plan desktop pixels show both units/five topics and were inspected; mobile/broader historical visual acceptance is not claimed. Current disposable preview: http://127.0.0.1:58175, inbox http://127.0.0.1:49710, Space2 handed off. No remote publication.

Mobile PDF and DOCX creation was then verified with real Gemini at375/320px, committed locally as a3f6b08. Each format automatically extracted two units/four topics; touch edits/application and explicit creation persisted two units/five topics, confirmed by reload and authenticated API200. Real editor/review/Plan geometry stayed within the viewport; Tab/reduced320×480 interaction and a PDF vertical touch swipe passed. Real final-Plan pixels for both formats were inspected at375/320. Missing original live pre-creation screenshots were complemented by explicitly static SSR visual checks of the real editor/component/CSS with the verified data (zero extra provider calls), not mislabeled as live E2E captures. No demonstrated product issue required a code patch. See [mobile coordinator](work-log/2026-10-24-root-mobile-ai.md) and [browser/visual scope](work-log/2026-10-24-mobile-ai-browser.md) for original capture gaps, incomplete Word-specific swipe, user-authorized synthetic account recovery and exact handoff limits. Physical-device/Safari/native-keyboard acceptance is not claimed; it is outside this emulation scope. Current preview/inbox respond200 at http://127.0.0.1:60061 and http://127.0.0.1:57642; Space3 handed off. Sandbox EACCES probes are not evidence of service outage. No remote publication.

## Folder publication scope — 2026-10-22

The verified folder presentation was fast-forwarded into main and pushed to GitHub under the user's explicit instruction, without deployment. Candidate0d838a0 and integration record30ea2ab are included; exact live remote readback matched30ea2ab5f1cfccf0e263fd0586aeb9adcb823a59. Fresh97PASS/4optionalSKIP, production build, strict TypeScript and structural checks passed. [Publication evidence](work-log/2026-10-22-root-folder-publication.md) owns delivery details; this passive closure changes no product bytes. The earlier local-only boundary below is historical and superseded only for this delivery. GitHub deployments remained0; no deployment or retained-data operation occurred.

## Current locally verified folder presentation — 2026-10-22

The selected24folder-style mockups now guide the existing V1 throughout accounts, classroom navigation and academic flows, with generated Foxy artwork. Work is isolated on `codex/folder-style-platform` from complete main0bcb7d4; the original P3 checkout remains untouched. See [folder-theme guide](folder-theme.md), [coordinator evidence](work-log/2026-10-22-root-folder-implementation.md), [live verification](work-log/2026-10-22-folder-live-verify.md) and [visual QA](../design-qa.md). Local97PASS/4optionalSKIP, strict builds, real delivery/grading/publication journeys and bounded desktop/mobile comparison are recorded. Preview: http://127.0.0.1:57492 with disposable data. This is locally verified presentation work; no remote integration or deployment is included. Historical P0–P9 acceptance below stays scoped to its recorded candidates.

**Resume here (2026-10-20): P9 is complete, independently verified locally and merged/pushed to main viae3a5e72, exact remote readback confirmed. No deployment was performed or authorized.** Read [final Sol/xhigh proof](work-log/2026-10-20-p9-final-independent-verify.md), [exact170-row ledger](p9-final-row-ledger.json), [publication record](work-log/2026-10-20-p9-main-publication.md) and [completed tasks](../odd/tasks/p9-local-validation.md). Hosting/numerical productionquota remain explicitly deferred; historical partial states below are not current blockers.

P3's accepted twelve account/session operations, initial Next.js screens and real browser/API/SQL/captured-email journeys remain documented in [final verification](work-log/2026-10-17-p3-verify-final.md), [coordinator](work-log/2026-10-17-id-unavailable-p3-completion.md), [tasks](../odd/tasks/p3-completion.md) and [web guide](p3-web.md). Historical backend99/control39/browser10/live web16 and strict builds/audit0/cleanup0 are evidence for that accepted checkpoint, not fresh results for this documentation change or later candidates.

## Current integration checkpoint — 2026-10-22

The user explicitly authorized committing all safe pending work, integrating glass and its corrections into main, preserving both documentary contributions and ongoing record statuses, re-verifying and pushing main without deployment or sensitive data. This later delivery scope supersedes the earlier documentation-only publication restriction, not its history or product rules. [Publication record](work-log/2026-10-22-root-main-ui-publication.md) owns the current checks and exact delivery result.

Main now contains documentation snapshot26d423d, historical documentation/proposals1156e8c (cherry-picked only from original4395484, not the old P3 branch history), glass merge419482e and ongoing-proposal snapshot6df71ce. The documentation section below and the entry-glass checkpoints at the end are both retained. Historical in_progress records remain in_progress; publishing a proposal does not select or implement it. Integrated80PASS/4SKIP, contracts9PASS, strict typecheck and production build passed; normal main push/readback confirmedbddf191a4b319c37dcbdea0814eecae6afb91359. This passive documentary closure preserves those product bytes. No deployment or retained-data operation was performed or authorized.

## Current documentation scope

This section records the earlier documentation stage. Its scope and findings remain attributed to that stage; the later integration authorization is recorded immediately above.

**Base reconciled on 2026-10-22: `main`, starting HEAD `1eb57002eec7200192fd8efa2c8b65e306554826`.** The user selected this base for documentation indexing and contradictory-status corrections only. Read the [documentation index](README.md) and [stage record](work-log/2026-10-22-root-docs-stage1.md). Original local designs and historical records remain in place; no file migration, new product implementation, service execution, commit or publication is authorized by this stage.

| View | Recorded state / next decision |
|---|---|
| Completed product | P0–P9 local V1, at the dated accepted candidates below; P9 publication is historical evidence, not a fresh remote check by this edit |
| Documentation maintenance | Index and state reconciliation in this stage; observed outcome and handoff belong to its work record |
| Design follow-up | Local proposals and separate glass worktree retain their own selection/verification state; consult the [design registry](design/README.md), not a phase-completion assumption |
| Deferred / not authorized here | File reorganization, further implementation, hosting/deployment, real pilot/data operations and new publication require a later explicit scope |

The dated P3–P9 scope notes below explain past execution. They are not today's instructions or reusable consent. No old failed check is converted to PASS. Historical test counts and native dispositions stay candidate-scoped.

## Historical checkpoints (superseded execution status)

The following dated preparation failures and decision holds remain historical evidence. They are not current permission gates: the latest full P3 completion authorization supersedes their proposed next actions. No failed run is converted to PASS.

Last reconciled:2026-10-16. T3-V parent actual build/72PASS and independent fresh build/41PASS with reported actual cleanup0, no blocker. Local F404a94a, proofc81b810, core2fecee9 and orchestration769db2f; checkpoint metadata closure is being recorded. Native assessment unavailable/package-local-binary-missing, not approved or waived. Historical T2 closure2c1b4df parent56/independent33 and its human-selected natively-unreviewed disposition retain their own scope; no RDD switch change/future waiver. Earlier foundation/P3.1/P3.2 dispositions unchanged.

**Historical P3 blocker (subsequently resolved):** recovery candidate passed parent88/actual build0, but its independent verifier stopped at preparation exit1 on an invented minimum declaration-file assertion. All five assigned checks remain unrun; no application failure or independent acceptance was established. [Attributed partial report](work-log/2026-10-16-mvbovr28-p33-recovery-verification.md), [current coordinator/handoff](work-log/2026-10-16-01a14539-p33-recovery.md). Await explicit human disposition before any preflight correction/verification; accepted checkpoint stays nine, P3 is not complete, source/tests remain frozen.

**2026-10-17 superseding handoff:** user authorized correcting preparation and closing P3 only, without integrating P4/P5. Preparation now passed88-file inventory/hash equality, including zero actual declaration files. First independent pure check failed14PASS/1FAIL on a synthetic child null exit with a2000ms helper timeout; real build and three recovery groups remain unrun. [Current attributed report](work-log/2026-10-17-recovery-verify.md), [current coordinator](work-log/2026-10-17-id-unavailable-p3-completion.md). Await bounded synthetic-deadline correction disposition under the newly supplied AGENTS failure policy. Accepted checkpoint remains nine; no runtime recovery acceptance or P3 closure. The earlier preparation failure above is historical and resolved by the new preparation, not erased.

**Historical 2026-10-17 update:** user approved synthetic2000→5000ms only. Fresh90-file snapshot passed and targeted synthetic recheck1PASS. The following real build failed during Prisma generation (exit1/30156ms, `Prisma generation: exit unavailable`, no stderr or TypeScript); recovery groups remain unrun. [Latest independent report](work-log/2026-10-17-recovery-recheck.md). P3 remains blocked on unavailable build proof pending a bounded diagnostic decision; no automatic retry/budget increase. Native review is now observed off/global, disabled/unmanaged. No P4/P5 integration.

Authorized diagnostic subsequently confirmed ETIMEDOUT/SIGTERM at30035ms, within the unchanged configured30s ceiling. Trace stops while loading the Prisma config module; underlying cause is unproven. [Diagnostic/handoff](work-log/2026-10-17-prisma-startup-diagnostic.md). No source fix, new timeout or runtime acceptance; next proposed diagnostic isolates module loading without generation.

The historical objective for that P3 session was **close P3 and stop** (user: "Bueno tu nuevo objetivo es cerrar P3 y terminar ahi"). P4 is outside this task. Necessary safe P3 decisions remain limited to session01a14539-ab7b-77dc-8eee-546a8c3dd168: [scope/tasks](../odd/tasks/p3-completion.md). No future-session, publication, destructive-data, sensitive-file or native-consent authority is inferred. Original P3.3 feature/coordinator records remain unchanged under separate historical document-only authority; use the linked current companion records rather than their older T2 state.

## Read and reconcile before continuing

1. Read [AGENTS.md](../AGENTS.md) and this roadmap.
2. Inspect the current branch, commit and working-tree changes. Compare them with the checkpoints below; never discard existing work to match a document.
3. Read the applicable [work records](work-log/README.md), linked feature task document and relevant functional-spec sections.
4. Continue the first unfinished authorized task. If status/proof conflicts, record the discrepancy before proceeding; do not silently assume a phase is complete.

### Sources of truth

| Source | Owns |
|---|---|
| [Functional specification](foxmind-v1-functional-spec.md) | Confirmed product rules, boundaries and acceptance examples. |
| [Visual reference index](visual-reference-index.md) | Supplied29screenshots, visual direction and functional overrides. Screenshots are not implementation evidence. |
| This roadmap | Phase order, current checkpoint, next work and links to detailed evidence. |
| `odd/tasks/` | Detailed specifications/tasks/checks for tracked implementation units, when applicable. |
| [Per-agent work records](work-log/README.md) | Who did what, scope, observed checks, commits, blockers and exact handoff. |

The specification's original "completion boundary" describes its earlier documentation-only milestone. It is not the current implementation status. Later authorized work is evidenced below; product rules still come from that specification. A work record or old consent note does not grant current permission to publish, perform destructive work or change scope.

## Phase overview

| ID | Phase | Status | Outcome / dependency |
|---|---|---|---|
| P0 | Product and visual definition | completed | V1 rules and22decisions closed;29local visual references reviewed. |
| P1 | Architecture and data model | completed | Next.js/React/TypeScript UI, modular NestJS backend, PostgreSQL/Prisma, private S3-compatible files; relational dictionary agreed. |
| P2 | Technical foundations | completed |33-table schema,3migrations, local PostgreSQL definition, minimal NestJS/Prisma server, health/lifecycle tests and dependency remediation. Not all supporting services or product APIs. |
| P3 | Identity/access and initial web foundation | completed | Accepted baseline`5e86d1e`: twelve operations, actual Next screens and independent account/browser evidence; retained as the integrated baseline for later phases. |
| P4 | Private file infrastructure | completed | Real P3 session/CSRF and web binary connections, private S3/validation/scan/quarantine/quotas, authorized retrieval and persistent restart independently verified; [proof](work-log/2026-10-18-p4-verify-final.md). |
| P5 | Classrooms and enrollment | completed | Creation/drafts, required plan/units/topics, invitations/codes, classroom-scoped roles, membership history and archive lifecycle. Requires P3/P4. |
| P6 | Teaching plan, Library and Muro | completed | Actual scoped Plan/Library/Muro and notifications, durable files/restarts, populated migration upgrade and independent mobile correction verified and published to main (merge8eee463). |
| P7 | Activities, attempts and submissions | completed | Independent whole-feature and bounded B1 evidence accepted; source0ec37c7/final fixtured9cdf06; published to main via remotely confirmed merge8e4fd2e. |
| P8 | Grading and follow-up | completed | Exact private scoring, publication/results, audited correction and current/historical progress independently accepted on8cb4ee3 plus targeted feedback1; published via remotely confirmed merge d2a7909. Later P9 acceptance is recorded separately. |
| P9 | Integrated local validation | completed | Complete local V1 independently verified over53a7986; productcandidate98fd12d, exact170rowledger, bounded correction/recheck consumed. No deployment; mergee3a5e72 pushed to main with exact remote readback. |

Statuses: `not_started`, `in_progress`, `blocked`, `completed`. A blocked phase names the external decision/proof it awaits. Dropped or superseded tasks remain recorded as such; they never count as completed.

### Completed checkpoints: P0–P2

| Deliverable | Evidence |
|---|---|
| Product scope and visual direction | [Functional spec](foxmind-v1-functional-spec.md), [visual index](visual-reference-index.md). |
| Database model/migrations and isolated contracts | [Database task record](../odd/tasks/database-foundation.md), [operations](database.md), [verification](database-verification.md); implementation`5910345`, forward correction`489cce1`, evidence`373c56a`. |
| Minimal NestJS backend | [Backend task record](../odd/tasks/backend-foundation.md), [operations](backend.md), [verification](backend-verification.md); implementation`766f342`, evidence`3da7bde`. |
| Dependency alert remediation | [Security evidence](dependency-security.md); implementation`917bb39`, evidence`1c08fa3`. |

Historical foundation baseline: full npm audit0known vulnerabilities;8dependency regressions,7HTTP/backend contracts and38database contracts PASS, plus build, migration replay/status/drift and Prisma smoke. These are previously observed results, not checks rerun by this documentation change. Dependency remediation also received independent verification and acknowledged native approval; earlier foundation review dispositions remain recorded separately, not retrospectively changed.

### Historical P5 checkpoint boundaries (superseded by completed phase table)

- P5 classroom creation/enrollment/publication is now integrated and locally independently accepted; Merge677f1c8 is published and remotely confirmed; see the current P5 record.
- P6 plan/Library/Muro and P7–P9 activities/submissions/grading/full pilot journeys are not implemented by this P5 integration.
- P4 `/files` now connects to actual P5 draft/publication/custody and membership authorization. SQL upgrade fixtures are migration proof, separate from actual browser/session acceptance.
- No production deployment or persistent development API/database service was established by disposable verification fixtures.
- Standalone logo/illustration/cover assets still need preparation; screenshots are not reusable brand assets.

Do not equate tables with working features, healthy connectivity with migration/domain correctness, or a clean audit with exhaustive security/production readiness. Framework close is tested; Windows signal-driven graceful shutdown remains unproven. Other non-blocking coverage limits are retained in the verification documents.

## Execution approach

The following phase descriptions preserve requirements and exit conditions. Their current completion status comes from the phase table and linked acceptance records, not from their original future-tense wording.

Implement vertical slices where applicable: API contract and server behavior, matching web screens, then public-interface tests. Do not defer all UI work until the whole backend is finished. Start the Next.js shell during P3; evolve it with each module and the approved visual references.

Tests accompany every phase. P9 integrates complete journeys; it is not the first verification step. Notifications and durable processing are wired into the modules that generate events, rather than postponed entirely to P8/P9. Keep academic email notifications within the approved scope; not every academic event sends email.

<a id="p3--seven-backend-identity-operations-verified-t3-and-web-remain"></a>

### P3 — Identity backend and initial web

P3.1 contracts and P3.2 local email were completed at their attributed checkpoints. P3.3 now provides all twelve independently verified operations, including recovery and authenticated password change. P3.4 provides the actual Next/React/TypeScript/Tailwind account screens and bounded same-origin proxy; P3.5 proves the complete local browser/SQL/captured-mail journey. [Final independent proof](work-log/2026-10-17-p3-verify-final.md) retains old failed checks and one bounded correction for stream cancellation and same-document proof reopening. No whole-phase acceptance is inferred from tables or screenshots alone.

- [x] P3.1 — Account/session API contracts and security/abuse configuration against specification sections2,3and12: [guide](api/accounts-sessions.md), [OpenAPI](api/accounts-sessions.openapi.json), [coordinator evidence](work-log/2026-10-15-01a13fc3-p31-contracts.md), [independent review](work-log/2026-10-15-mva0p514-p31-contract-review.md).8offline contract checks and independent R1–R6 PASS at the contract-only checkpoint; seven endpoints were subsequently implemented and independently verified at T2.
- [x] P3.2 — Completed local inbox and real verification/recovery SMTP message capture without external delivery provider: [tasks](../odd/tasks/p32-local-email.md), [coordinator](work-log/2026-10-15-01a13fc3-p32-local-email.md). Captured messages retain trusted-origin fragments/lifetimes, recipient spelling and explicit uppercase-domain rejection; restart refresh/persistence/isolation verified. Development inbox http://127.0.0.1:8025, SMTP127.0.0.1:1025; stop with npm run mail:stop, preserve its volume. P3.2 itself implemented no account/token issuance/consumption or encrypted outbox; later T2 implements registration issuance/outbox, not token consumption.
- [x] P3.3 — All twelve identity/account operations independently verified, including token issuance/consumption, recovery, password change, session revocation, rejection and concurrent operations. [Detailed tasks](../odd/tasks/p33-token-flows.md).
- [x] P3.4 — Actual Next.js account shell/screens, truthful loading/errors, same-origin Nest proxy, memory-only proof capture and explicit confirmation. [Guide](p3-web.md), [tasks](../odd/tasks/p34-web.md).
- [x] P3.5 — Real registration → captured email → verification → sign-in → profile → sign-out and recovery/reuse/expiry/revocation/restart journeys; responsive320/375/1280px, keyboard focus and failure retry. [Independent10PASS and narrow correction proof](work-log/2026-10-17-p3-verify-final.md).

Exit condition: a person can actually create and verify an account, enter/leave a session and recover access through the local web/API/email flow, with server-enforced boundaries and applicable checks. Tables, mocked email or hidden navigation alone do not satisfy it.

### P4 — Private files

- Implement private S3-compatible storage and real inspection/scanning, with separate upload/validation/scan states.
- Enforce approved formats/limits, quarantine until checks succeed, authorized preview/download and classroom quota accounting.
- Verify failed/unavailable scanning stays blocked; clean only incomplete abandoned uploads, never confirmed drafts/history.

Exit condition: allowed files can be securely stored/retrieved by authorized users; unsafe/pending files remain inaccessible. Concrete tools and operational limits must be selected and verified before use, not inferred as already installed.

### P5 — Classrooms and enrollment

- Build the classroom wizard/private drafts with its required plan file and units/topics, cover catalog and fixed timezone.
- Implement classroom-scoped teacher/student permissions, invitations/codes and membership periods/re-entry history.
- Implement archive/reactivation, departure/removal and correct loss of access without deleting academic history.

Exit condition: a verified creator can publish a valid classroom and a different verified user can join through the approved flow; forbidden and archived operations are rejected without changing stored records.

### P6 — Teaching organization and communication

- Maintain units/topics and their manual states; preserve study-plan versions and constrained deletion rules.
- Implement Library materials/associations, teacher management and authorized student consultation.
- Implement Muro posts/replies and moderation tombstones; retain replies when a parent is removed.

Exit condition: teacher and student use the approved Plan/Library/Muro screens with their different capabilities enforced on the server.

### P7 — Activities and participation

- Build private authoring drafts/publication and the three approved activity types.
- Implement questions/options, practical attachments, actual autosave and server-enforced single-editor transfer.
- Implement immutable started content, deadlines/timezones, submission confirmation, preserved attempts and teacher reopening.

Exit condition: students can complete and submit each activity type under the correct eligibility/time/file rules without overwriting history or exposing answer keys.

### P8 — Grading and follow-up

- Implement exact scoring and round-half-up, private teacher correction and explicit publication.
- Implement effective-grade replacement and teacher-only published-grade correction audit, preserving attempts.
- Implement individual/class progress, averages and the notification center with current membership/record permissions.

Exit condition: published grades and metrics match the specification examples; missing work is not a zero and multiple attempts do not duplicate activity counts. Notifications for earlier implemented modules must already be connected as those modules land.

### P9 — Integrated local validation

- Exercise complete teacher/student workflows, cross-classroom authorization, revoked access and archived state.
- Verify responsive web layouts, empty/loading/error/retry states and real supporting-service failures/recovery.
- Prepare reproducible local setup, operational notes and a bounded local pilot checklist.

Exit condition: the approved V1 works end to end locally with its acceptance examples and explicit limitations, not merely isolated endpoint tests. Any production rollout remains a separate user decision.

## Work records and next-session handoff

Every agent must report its contribution through the [work-record protocol](work-log/README.md), including read-only reviewers via their coordinator. Use one record per agent/task/session; do not let parallel agents append to the same file.

Completed P3.1 records: [coordinator handoff](work-log/2026-10-15-01a13fc3-p31-contracts.md), [attributed read-only requirements map](work-log/2026-10-15-mv9zsb0p-p31-requirements-map.md) and [independent security/requirements review](work-log/2026-10-15-mva0p514-p31-contract-review.md). Historical consolidation record: [DOC-001](work-log/2026-10-15-01a13fc3-roadmap.md). Older completed work is evidenced by the task/verification documents above; no fictional historical agent logs are backfilled.

### Historical pre-completion handoffs (superseded execution status)

Completed P3.2 remains on local implementation0c0b0e9 plus evidence, not published main. T2 closure2c1b4df precedes current `feat/p33-token-flows`: [tasks](../odd/tasks/p33-token-flows.md), [coordinator](work-log/2026-10-16-01a14539-p33-token-flows.md), [independent verification](work-log/2026-10-16-mvbkihar-p33-verification-recheck.md). F404a94a/proofc81b810/core2fecee9/orchestration769db2f observed local commits; source631-line cohesive core needs a future review-workload exception before publication, not compression. Scope P3 only then STOP: [umbrella](../odd/tasks/p3-completion.md). Preserve broad mailbox/uppercase-domain policy; do not repeat completed preparation questions.

T2 historical parent56/independent33 and current T3-V parent72/independent41/actual builds and cleanup0 separately attributed. Retain initial confirmation RED exception, original4s failures and incomplete147-input snapshot as historical, never relabeled PASS; corrected178-input verification is a distinct first execution. Retain bounded inbox/idle-category/interleaving/default-budget/Windows limits. Native T3 assessment unavailable, not approved or waived; no switch/maintenance/publication authority. First unfinished product unit recovery request/confirmation, then password change, P3.4/P3.5; no P4 work by this coordinator.

## Deferred decisions and non-goals

Hosting/provider/budget/production quotas/deployment topology remain deferred before any deployment; accepted local V1 validation did not select them. AI is outside V1. Do not introduce microservices, Redis, WebSockets or other infrastructure without a demonstrated need and the applicable decision. No push/PR/release is implied by a phase status, roadmap entry or completed work log.

<a id="current-p7-authorization-2026-10-18"></a>

## Historical P7 authorization (2026-10-18)

Full P7 implementation and verified main merge/push are now explicitly authorized: [tasks](../odd/tasks/p7-activities.md), [coordinator](work-log/2026-10-18-root-p7-activities.md). P7 implementation, independent acceptance and authorized main merge/push are complete (merge8e4fd2e, remote confirmed). No P8 or deployment authorization. Earlier STOP-before-P7 statements are historical scope, superseded only for this explicitly requested P7. P3–P6 acceptance and original dirty checkout remain preserved.

<a id="current-p8-authorization-2026-10-18"></a>

## Historical P8 authorization (2026-10-18)

Full P8 implementation and verified main merge/push are now explicitly authorized: [tasks](../odd/tasks/p8-grading.md), [coordinator](work-log/2026-10-18-root-p8-grading.md). The first confirmed submission determines on-time/late classification; resubmissions remain in history. Previous STOP-before-P8 statements describe the accepted P7 checkpoint and are superseded only for this explicit P8 work. No P9, deployment or retained-data changes.

<a id="p8-final-verification-2026-10-19"></a>

## Historical P8 final verification (2026-10-19)

P8 exit conditions are satisfied: exact scoring/private correction, explicit publication and safe own results, effective replacement, teacher-only audited published correction, current/historical individual/class progress, first-confirmed punctuality and grade notifications. Existing P3-P7 screens and behavior remain connected. [Independent record](work-log/2026-10-18-p8-independent-verify.md) retains per-spec acceptance, provenance and historical failures/advisories. Shared30/180/330-360s budgets unchanged; final targeted proof1 did not rebuild/repeat the full suite. Authorized merge/push remains separate until exact remote readback. At that P8 checkpoint P9 had not started; the later P9 closure below supersedes that execution state. Deployment was not authorized.
<a id="p8-publication-2026-10-19"></a>

## Historical P8 publication (2026-10-19)

Authorized main merge d2a7909aa5d65d13d655d2b8932d6a478b19f9eb was pushed without force; exact remote ref and local HEAD matched. Verified product tree is unchanged. Passive publication-record updates may follow that merge. All P8 tasks were complete at that checkpoint; P9 was then not_started. Later P9 authorization, acceptance and publication are recorded below, not inferred from P8.


<a id="current-p9-authorization-2026-10-19"></a>

## Historical P9 authorization (2026-10-19)

User explicitly authorizes complete P9 in the reviewed order, Verify gpt-6.1-sol/xhigh, decisions in Engram and main merge/push only after acceptance; no deployment. [Tasks](../odd/tasks/p9-local-validation.md), [170-row acceptance matrix](p9-acceptance-matrix.md) and [coordinator](work-log/2026-10-19-root-p9-local-validation.md). Accepted P3-P8 and original dirty checkout remain preserved. Earlier STOP-before-P9 statements are historical and superseded only by this request. At this historical authorization checkpoint P9 was in progress, not accepted; the later final acceptance supersedes that execution state. Static matrix links alone were not runtime proof.


<a id="p9-finite-verification-checkpoint-2026-10-20"></a>

## Historical P9 finite verification checkpoint (2026-10-20)

P9 own implementation/recovery/capacity and local guide preparation are committed through98fd12d; SMTP naturalretry/capturedrecipient own proof passed after Docker restoration. [Independent Sol/xhigh record](work-log/2026-10-20-p9-finite-independent-verify.md) reports fresh bounded builds/units/differentials and immutable/retained evidence passed, but mandatory active Home setup failed at secondaccount capturedverification; downstream independent probes were not launched. At this historical finite checkpoint P9 remained in_progress/not accepted, without mainmergepush or deployment; the later final report and publication below supersede that state. One missing-proof decision is required; no demonstrated productfix or automatic retry/full sweep/limit expansion. Historical earlier checkpoint claims remain attributed.


## P9 final local acceptance (2026-10-20)

Complete P9 local V1 accepted from [final wholefeature Sol/xhigh verification](work-log/2026-10-20-p9-final-independent-verify.md), [exact170-row ledger](p9-final-row-ledger.json) and [tasks](../odd/tasks/p9-local-validation.md). Productbytes98fd12d unchanged throughout independent raw/physical/freshbuild/differential/actualbrowser-API-SQL-files-mail proof. Oneexternal sessionstatus correction andonetargetedrecheck consumed; all requiredlocalproofcomplete. All170 exactoutcomes accounted:169explicitlocal/inherited evidence,069conditionalnumericalGBchoice beforehosting/deployment. No deployment, realpilot or nativeapproval. Earlier partial/failure/checkpoint text remains attributedhistory, notpermission/blocker. Mainmergepush follows authorized coordinator delivery/exactremote readback separately.


## P9 authorized main publication (2026-10-20)

Mergee3a5e723a6bdbb8c6cbc2ca9484af6a632addab6 includes verified localV1 and passiveclosure4d8096a621652e420acbb750cff22e8c4c08cc7f; normalHTTPSpushmain succeeded and localHEAD/originmain/liveremoteSHA matched exactly. [Publication record](work-log/2026-10-20-p9-main-publication.md). T1-T7 complete; no productbytes changed after independent98fd12d, only passiveevidence/closure. Final passivepublication-record update is separate from the verifiedmerge and preserves its producttree. No deployment/realpilot/productionquota choice or nativeapproval.

## Entry glass redesign — local checkpoint (2026-10-21)
[Glass tasks](../odd/tasks/foxmind-entry-glass.md), [coordinator](work-log/2026-10-21-root-foxmind-entry-glass.md), [independent checkpoint](work-log/2026-10-21-glass-independent-verify.md), [visual report](../design-qa.md). Isolated codex/foxmind-entry-glass from1eb5700. Own builds/account/Home/mobile journeys passed; independent web builds/clients passed, but fresh API preparation exceeded original30s before independent runtime fixtures. Not accepted. One missing-proof disposition, no automatic retry/limit expansion/merge/push/deploy/retained-data mutation. Accepted P3–P9 backend checkpoints unchanged.

Entry-glass checkpoint continuation:single authorized90s API preparation passed; independent fixture startup then stopped before UI because local Docker engine unavailable. No browser retry or acceptance; same local-only scope and frozen source.

## Entry glass final local verification (2026-10-21)
The complete authorized entry-glass UI scope is locally implemented and independently verified on codex/foxmind-entry-glass: [tasks](../odd/tasks/foxmind-entry-glass.md), [coordinator](work-log/2026-10-21-root-foxmind-entry-glass.md), [Sol/xhigh verification](work-log/2026-10-21-glass-independent-verify.md), [visual report](../design-qa.md). Single authorized Docker retry resolved prerequisite:glass7/P3browser10/P4integration9/matchedUI6 allPASS,0SKIP,cleanup0; S1–S5 PASS. Earlier unavailable checkpoints are history, not current blockers. Backend/P3–P9 contracts and retained data unchanged. Local commits only; no PR, merge, push or deployment; native off/global, no native approval.

Local implementation commit984e78ca3add445da9a7b144e0099f63b9c2a735; coordinator subsequent document-only closure records it. No product bytes changed after independent verification:20source/test/asset hashes unchanged,4coordinator-doc differences intentional. Final local source tree remains separate from main; no deployment/merge/push.

Live-mobile capture evidence commits observed locally: PDF5fadfd8 (309 authored lines) and Wordb070d15 (368), with passed read-only audit linked in the coordinator record. No product source changes or remote publication.

<!-- Auth responsive local delivery: aed6b89f4857ed52d859445285a6fddcf81f4fcd; coordinator record contains completed handoff. -->
