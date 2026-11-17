# Adaptación de fixtures frontend

- Agente: `/root/frontend_regression_tests`, test_engineer. Fecha: 2026-11-16.
- Worktree: `C:/Users/alejo/.codex/worktrees/frontend-cohesion/ProtipoFoxMind`; rama `codex/frontend-cohesion`, base `dd6f4bc` con trabajo concurrente preservado.
- Alcance autorizado: tests consumidores de Materials, Authoring, Grading y Study; imports/fixtures de tests internos Study y structured-feedback-flow. Sin producción, manifests, tablero, servicios, credenciales ni commits. No modificar tests/frontend-*-cases.test.mjs de otros escritores.
- Aceptación: conservar aserciones de comportamiento; usar adaptadores reales sobre transportes sintéticos y montaje explícito de la composición Materials.
- Estado: adaptación entregada al coordinador; no implica DONE del refactor ni verificación global. Sin commits.

## Cambios

- `tests/helpers/frontend-feature-fixtures.mjs` compone adaptadores productivos sobre los transportes sintéticos existentes, preservando recibos de rutas/métodos/payloads. API de generación estable por transporte/aula para no reiniciar efectos en cada render.
- Fixture explícito de Materials monta el dispatcher real y, cuando corresponde catálogo, su MaterialPublishing real mediante render prop y ciclos de hooks independientes. No se autoexpanden otros hijos ni se simula lógica de publicación. Admite actualización de props para el descarte por cambio de contexto.
- Consumers heredados de Materials: classroom-library-modes/search, classroom-plan-library-exact, classroom-sections-redesign, classroom-interior-redesign, product-parity-library-ui.
- Consumers de Authoring: activity-ai-polling/ui, activity-unknown-start (sólo fixtures UI), brujula-authoring-complete/fidelity-navigation/integration, classroom-activity-redesign/workflow, education-experience, foxmind-3d-flows, grading-ai-ui, parity-authoring-entry y product-parity-activity-ui.
- Consumers de Grading: brujula-grading-ui, classroom-activities-exact/progress-exact/sections-redesign, entry-glass-client, grading-ai-review-ui, parity-progress-fidelity, product-parity-activity-ui, student-ai-references, student-feedback-journey, pruebas p8 de cliente y structured-feedback-flow interno. Los fixtures de páginas `platform-polish/grading.tsx` y `learning.tsx` también componen puertos reales estables.
- Study: imports internos de study-client/payload/sequence separados entre transporte, reglas y controlador; aceptación frontend-study-context apunta al controlador nuevo. Práctica/repaso y persistencia apuntan a carpetas nuevas. El test de pantalla Study monta useStudyFolders real con transporte sintético por su nuevo seam.
- Los 12 escenarios protegidos en frontend-study-context y frontend-grading-discard conservan todas sus aserciones: sólo imports y fixture de puertos cambiaron. Ningún frontend-*-cases de otros escritores fue editado.

## Aserciones estructurales revisadas

El coordinador autorizó expresamente adaptar `p8-grading-client` al dueño extraído. `manualPoints` se comprueba en use-grading-draft. El guard de save/publicación conserva su comprobación UI y ejecuta además createGradingEditingApi y createGradingPublicationApi reales: save a grading con payload privado exacto sin confirm; publish a publish-grade con `{revision,confirm:true}` exacto, sin nota/devolución privadas. Se mantiene canPublish condicionado por identidad, pending, dirty y busy; confirmación/cancelación y ausencia de saveAttempt. Los tests de CSRF, capability y DTO inválido siguen íntegros. No se concatenan fuentes para aparentar una coincidencia.

`issue2-ci-workflow` se remapeó a ai-review/GradingAiReview. Conserva el rechazo cuando falta su prueba obligatoria; por eso detectó un guard de workflow todavía apuntando a ui/GradingAiReview. El coordinador recibió ese pendiente y es dueño de CI/manifests.

## Evidencia

- Primera selección de 36 archivos: 225 tests, 217 pass/8 fail, exit 1. Un fallo de fixture Materials (controlledView no montaba el dispatcher) fue corregido con fixture explícito. Siete fallos corresponden al archivo mixto activity-unknown-start y no al frontend: backend TS importado por Node strip-only rechazó parameter properties.
- Desvío de ejecución comunicado: el filtro inicial de suites detectaba withP*Database, pero omitía withAiDatabase. Por eso lancé activity-unknown-start completo. Sus primeros tres bloques levantaron PostgreSQL Docker descartable propio y aplicaron migraciones antes del fallo de import; el cuarto falló antes del helper. Su finally realiza owner-check y eliminación del contenedor y no se observó error de cleanup. No se usaron datos retenidos ni proveedores reales. Se corrigió la selección y no se repitieron esos casos.
- `node --test --test-concurrency=1 --test-name-pattern="A01 reopening" tests/activity-unknown-start.test.mjs`: **2/2 pass**, exit 0; sólo escenarios UI del archivo mixto.
- `node --test --test-concurrency=1 tests/study-exact-creation-entry.test.mjs tests/study-exact-persistence-ui.test.mjs tests/frontend-study-context.test.mjs tests/frontend-grading-discard.test.mjs`: **19/19 pass**, exit 0.
- `node --test --test-concurrency=1 tests/classroom-interior-redesign.test.mjs tests/p8-corrections-client.test.mjs tests/p8-progress-client.test.mjs tests/p8-publication-client.test.mjs tests/p8-grading-client.test.mjs`: primer recorrido **17/18**, sólo aserción estructural manualPoints en dueño antiguo. Adaptada con autorización; p8-grading-client ejecutado solo después de la edición final: **2/2 pass**.
- `node --test --test-concurrency=1 tests/p8-grading-client.test.mjs tests/issue2-ci-workflow.test.mjs`: **16/17 pass**, exit 1. Único pendiente: guard CI no exige grading-ai-review-ui cuando se introduce la ruta nueva (esperaba rechazo, obtiene exit 0).
- `node --test --test-concurrency=1 tests/study-exact-generation-ui.test.mjs tests/study-exact-generation-hook.test.mjs tests/study-exact-generation-model.test.mjs tests/study-feature.test.mjs tests/foxy-study-demand-panels.test.mjs tests/ux-chat-polish.test.mjs`: **21/21 pass**, exit 0.
- Recorrido combinado final abajo: **244/244 pass**, 0 fail/cancelled/skipped, exit 0, duración 35815 ms. La suite Study API incluye su servidor HTTP loopback sintético propio; no accede a servicios externos.
- `git diff --check -- tests`: exit 0; avisos LF→CRLF de Git, sin errores de whitespace. El log temporal de ejecución fue retirado después de registrar los resultados.

Comando combinado final (se ejecutó mediante spawnSync de Node con esta lista de argumentos):

```powershell
$fixtureTests = @(
  'apps/web/src/features/grading/ui/structured-feedback-flow.test.mjs',
  'apps/web/src/features/study/api/study-client.test.mjs',
  'apps/web/src/features/study/model/study-payload.test.mjs',
  'apps/web/src/features/study/model/study-sequence.test.mjs',
  'tests/activity-ai-polling.test.mjs', 'tests/activity-ai-ui.test.mjs',
  'tests/brujula-authoring-complete.test.mjs', 'tests/brujula-fidelity-navigation.test.mjs',
  'tests/brujula-grading-ui.test.mjs', 'tests/brujula-integration.test.mjs',
  'tests/classroom-activities-exact.test.mjs', 'tests/classroom-activity-redesign.test.mjs',
  'tests/classroom-activity-workflow.test.mjs', 'tests/classroom-interior-redesign.test.mjs',
  'tests/classroom-library-modes.test.mjs', 'tests/classroom-library-search.test.mjs',
  'tests/classroom-plan-library-exact.test.mjs', 'tests/classroom-progress-exact.test.mjs',
  'tests/classroom-sections-redesign.test.mjs', 'tests/education-experience.test.mjs',
  'tests/entry-glass-client.test.mjs', 'tests/foxmind-3d-flows.test.mjs',
  'tests/grading-ai-review-ui.test.mjs', 'tests/grading-ai-ui.test.mjs',
  'tests/p8-corrections-client.test.mjs', 'tests/p8-grading-client.test.mjs',
  'tests/p8-progress-client.test.mjs', 'tests/p8-publication-client.test.mjs',
  'tests/parity-authoring-entry.test.mjs', 'tests/parity-progress-fidelity.test.mjs',
  'tests/product-parity-activity-ui.test.mjs', 'tests/product-parity-library-ui.test.mjs',
  'tests/student-ai-references.test.mjs', 'tests/student-feedback-journey.test.mjs',
  'tests/study-exact-creation-entry.test.mjs', 'tests/study-exact-persistence-ui.test.mjs',
  'tests/study-exact-practice.test.mjs', 'tests/study-exact-repaso.test.mjs',
  'tests/frontend-study-context.test.mjs', 'tests/frontend-grading-discard.test.mjs',
  'tests/study-feature.test.mjs', 'tests/study-exact-generation-ui.test.mjs',
  'tests/study-exact-generation-hook.test.mjs', 'tests/study-exact-generation-model.test.mjs',
  'tests/foxy-study-demand-panels.test.mjs'
)
node --test --test-concurrency=4 $fixtureTests
```

## Pendientes y límites

El coordinador debe resolver el guard de CI indicado, actualizar manifests y remapear otras features desde sus mapas de movimientos. No se verificó visualmente ni en navegador; fixtures de páginas quedan adaptados sin build propio. No se ejecutaron lint/tipado global ni pruebas backend adicionales. Los fallos backend anteriores requieren el runner correcto y no acreditan defecto de producto. Los cambios concurrentes posteriores pueden requerir otro recorrido del candidato integrado.

## Ajuste acotado Foxy tras extracción

Nuevo encargo del coordinador: sólo `apps/web/src/features/foxy/ui/foxy-collections.test.mjs` y este registro. El caso de renombrado monta el FoxyRenameDialog real que entrega el workspace con sus props/callbacks reales, mediante otro hookView y limpieza propia. Conserva envío exacto de Título mío, borrador intacto después del rechazo, mensaje de conflicto y ausencia de operación para blanco; añade comprobación explícita de que el workspace mantiene el diálogo abierto después del rechazo. Sin renderer general, cambios de producción ni eliminación de controles.

Comando: `node --test --test-concurrency=1 apps/web/src/features/foxy/ui/foxy-collections.test.mjs tests/frontend-foxy-cases.test.mjs` → **11/11 PASS**, exit 0; sin servicios ni commits. Se conserva el facade actual de workspace para el remapeo posterior del coordinador. Archivo liberado para ese remapeo; no se declara verificación global de Foxy.

## Participación — fixtures de puertos

Nuevo encargo del coordinador: adaptar sólo fixtures de QuestionnaireAttempt, PracticalAttempt y AttemptAnswers a los adaptadores reales de participation/api.ts. Se preservan los transportes sintéticos y aserciones; hosts mantienen su API raw. Pruebas puras, sin servicios, DB ni edición de frontend-participation-cases del otro escritor.

Archivos adaptados: `tests/classroom-activity-workflow.test.mjs`, `tests/p7-practical-client.test.mjs`, `tests/product-parity-activity-ui.test.mjs`, `tests/questionnaire-footer-clearance.test.mjs`, `tests/student-feedback-journey.test.mjs` y `tests/helpers/frontend-feature-fixtures.mjs`. El helper compone puertos de escritura/lectura/adjuntos reales desde cada transporte fake, aula, intento y editor original. Los casos dinámicos cargan la entrada pública en lugar de la ruta ui retirada. No se modificaron aserciones ni reglas, incluido el borrador con CAS recuperado, confirmación única, conservación del recibo tras refresh fallido, headers dedicados de archivo y reserva/liberación de altura del footer.

Comando: `node --test --test-concurrency=1 tests/classroom-activity-workflow.test.mjs tests/p7-practical-client.test.mjs tests/product-parity-activity-ui.test.mjs tests/questionnaire-footer-clearance.test.mjs tests/student-feedback-journey.test.mjs` → **25/25 PASS**, exit 0, 0 fail/cancelled/skipped; duración 5064 ms. `git diff --check` sobre estos seis archivos: exit 0, sólo avisos Git LF→CRLF. Sin fallos pendientes de este grupo ni cambios de producción; tests liberados para coordinación. No acredita tipado/build/navegador global.

## Reconciliación final de la selección rápida

Nuevo encargo autorizado: tests frontend colocados y tests/**, este registro y artefactos test-reconciliation. Selección explícita de 227 archivos en `.test-artifacts/frontend-cohesion/selected-fast-files.json`, sin reclasificar suites. Runner propio `test-reconciliation.mjs` reutiliza executeFastFile con cleanEnvironment y preload API existentes, máximo cuatro archivos simultáneos, continúa después de fallos y registra resultados por archivo y TAP completo en test-reconciliation.json/.log. No altera el runner del coordinador.

Inicio: ajustado navPorts de application/navigation/foxy-navigation.test.mjs al import relativo nuevo de AppNavbar del host ClassroomsApp. Se conserva la captura real de props y todas las aserciones de ruta/rol. Primera pasada en curso; producción, navegador y build a cargo del coordinador.

### Causas agrupadas y correcciones

- Stub de navegación: `apps/web/src/application/navigation/foxy-navigation.test.mjs` incluye el import de AppNavbar del nuevo host; permisos, etiqueta y destino exacto permanecen comprobados.
- Stubs de Plan movido: classroom-curriculum-workspace, classroom-interior-redesign y classroom-plan-filters apuntan `use-plan-workspace` al specifier actual del dueño Curriculum. Se ejecuta el componente real y se conserva el stub de lectura de datos previsto originalmente, sin simular selección, marcado ni escrituras.
- Rutas construidas dinámicamente: classroom-people-wall-exact carga Roster/Settings desde members/settings; p7-history-client lee Activities y AttemptHistory desde activity-session y ClassroomWorkspace desde classroom-workspace. Se conservan todos los controles de permisos, año/IA persistidos, guardado, historial/reapertura y destino del muro.
- Cascada CSS: folder-platform y platform-glass usan el helper de lectura `tests/helpers/global-style-fixture.mjs`, que sigue imports reales de JS y CSS, mantiene orden y falla si falta una hoja. Se conserva existencia de folders, ausencia de glass y precedencia tokens→globals→academic→folders, además de equivalencia de la entrada standalone. No concatena fuentes ajenas ni sustituye interacción por regex; estos casos ya eran comprobaciones estáticas de CSS.
- CSS de dueños: home-parity-navigation carga explícitamente parity-home de Home y parity-catalog-fidelity de Classrooms; conserva los controles PostCSS sobre selectores raíz y display, sin cambiar expectativas.

### Recibos parciales

1. `node .test-artifacts/frontend-cohesion/test-reconciliation.mjs`: 227/227 archivos recorridos, **1268 pass/13 fail**, 0 skipped, exit 1. Recibo completo preservado en `test-reconciliation-initial.json/.log`. Ocho archivos fallaron; no se identificó fallo productivo. El stub de navegación estaba corregido antes de esta pasada y pasó.
2. Mismo runner con `--failed`: ocho archivos, **42 pass/2 fail**, 0 skipped, exit 1; guardado como `test-reconciliation-rerun-1.json/.log`. Restaban una sustitución de fixture que no había aplicado y dos rutas supuestas incorrectamente en p7-history-client; corregidas desde el mapa real, sin cambiar aceptación.
3. Mismo runner con `--failed`: dos archivos, **11/11 pass**, exit 0; guardado como `test-reconciliation-rerun-2.json/.log`.

4. Pasada total final: `node .test-artifacts/frontend-cohesion/test-reconciliation.mjs` → **227/227 archivos, 1281 pass/0 fail/0 skipped, exit 0**. El recibo único final con resultados por cada archivo está en `.test-artifacts/frontend-cohesion/test-reconciliation.json`; TAP completo en `.test-artifacts/frontend-cohesion/test-reconciliation.log`. No se sumaron artificialmente resultados de subsets.

`git diff --check` sobre los nueve tests adaptados: exit 0, sólo avisos Git LF→CRLF. Ningún test eliminado, ningún facade productivo restaurado, ninguna aserción semántica retirada y ningún cambio de producción/manifests/tablero por este agente. El runner usó exclusivamente los 227 archivos clasificados fast, con entorno limpio y preload de build API; no se ejecutaron suites de servicios/DB/browser ni proveedores reales. Tests liberados al coordinador para comprobar manifests y candidato integrado. Estos recibos son de tests; no acreditan build ni QA en navegador.
