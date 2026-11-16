# Regresiones de navegación · integración UX/UI

- Agente: `parity_release_test_regressions` (verificación e implementación de pruebas); identificador de sesión no expuesto.
- Fecha: 2026-11-16. Rama `codex/refactor-ux-ui`, worktree exclusivo de integración `foxmind-ux-ui-merge/ProtipoFoxMind`, base `be4deb6a`, integración concurrente en curso.
- Alcance asignado: actualizar las pruebas de navegación de Brújula y JD01; corregir los terminadores duplicados de otros dos tests. Sin cambios de producción, commits ni publicación. Referencia del comportamiento: `odd/tasks/foxmind-product-parity.md`, TASK-013.
- RED observado antes de editar: `node --experimental-strip-types --disable-warning=ExperimentalWarning --test tests/brujula-fidelity-navigation.test.mjs` dio 4 OK y 1 fallo al buscar un botón del modal retirado. `node --experimental-strip-types --disable-warning=ExperimentalWarning --test --test-name-pattern=JD01 tests/foxmind-3d-regressions.test.mjs` dio 2 OK y 1 fallo por falta de `window.addEventListener`.
- `git diff bd4e49f9^ --check` detectó whitespace en los dos archivos, cuyas 43 y 46 líneas respectivamente tenían terminadores CRCRLF.

## Fixture del presupuesto de texto

Alcance adicional asignado: `apps/api/src/modules/foxy/infrastructure/providers/tests/foxy-text-budget.test.mjs`. La corrida previa con el preload de CI dio 2 OK y 3 fallos «Unexpected budget query» después de integrar el runtime con perfiles.

## Resultados y límites

- Navegación: el asistente abre con un tema del Plan seleccionado dentro de la unidad correcta; no selecciona los temas vecinos, avanza a Contenido manual o transfiere el alcance a la solicitud inicial de Foxy. JD01 monta `AppNavbar` con un `EventTarget` local y conserva los clicks modificados y la interceptación única del click común.
- Whitespace: sólo se quitaron CR de los terminadores de `tests/classrooms-reference-controls.test.mjs` y `apps/api/src/modules/foxy/infrastructure/tests/foxy-visual-editorial-publication.test.mjs`. `git diff --ignore-space-at-eol --exit-code` no detectó cambios de contenido en esas dos rutas.
- Comando verificado: `node --import ./scripts/register-api-test-build.mjs --experimental-transform-types --experimental-test-module-mocks --disable-warning=ExperimentalWarning --test --test-concurrency=1 tests/brujula-fidelity-navigation.test.mjs tests/classrooms-reference-controls.test.mjs tests/foxmind-3d-regressions.test.mjs apps/api/src/modules/foxy/infrastructure/tests/foxy-visual-editorial-publication.test.mjs`: 18 pasaron. Sin preload, publicación visual dio FAILED en vez de READY para IMAGE y DIAGRAM; el preload oficial, que usa el build estricto de API, dejó ambos casos verdes.
- Con el mismo comando y sólo `apps/api/src/modules/foxy/infrastructure/providers/tests/foxy-text-budget.test.mjs`: 5 pasaron tras adaptar las dos consultas de lectura a la columna `execution_profile` y comprobar que liquidación bloquea el trabajo correcto. Se mantienen cuotas, deduplicación, liquidación completa si faltan tokens e idempotencia. Tarifas fijadas por perfil tienen cobertura PostgreSQL en `tests/ai-execution-policy-database.test.mjs`.
- No hubo cambios de producción ni publicación; los casos usan fixtures sintéticos y las pruebas SQL usan PostgreSQL descartable. No se probó el clic de creación desde Plan: la superficie actual no presenta el CTA aunque mantiene el callback en su tipo. Se reportó al orquestador para cotejarlo con el diseño.
- Para revertir, aplicar inversamente sólo el diff de las cinco pruebas y este registro, preservando la integración concurrente. Próximo paso: el orquestador valida sobre el candidato integrado.

## Formulario y progreso visual de Foxy

Alcance adicional asignado: `apps/web/src/features/foxy/ui/foxy-visual-workspace.test.mjs`. RED con el preload oficial: 1 OK y 3 fallos. La prueba esperaba un selector visible de proporción, un botón interno de envío y el progreso dentro del formulario. La [guía de Foxy](../engineering/ai/foxy.md) documenta que la proporción queda en el modelo, el envío viene del diálogo y la espera se muestra en el chat.

El test verifica los dos radios, bloqueo y envío real del formulario para cada capacidad, temas iniciales y editados enviados sin mutar la selección del chat, y estados de cola/ejecución en `FoxyVisualTimeline` con cancelación de la solicitud exacta. Conserva las aserciones de vista previa/descarga privada sólo para trabajos listos y de ausencia en fallidos y en curso. El texto de los estados se verifica en el indicador renderizado con anuncio accesible. El diálogo exterior y la navegación en navegador quedan fuera de esta prueba de componentes.

`node --import ./scripts/register-api-test-build.mjs --experimental-transform-types --experimental-test-module-mocks --disable-warning=ExperimentalWarning --test --test-concurrency=1 apps/web/src/features/foxy/ui/foxy-visual-workspace.test.mjs apps/web/src/features/foxy/model/foxy-visual-controller.test.mjs`: 7 de 7 pasaron. Sin cambios de producto. Para revertir esta unidad, aplicar inversamente sólo el diff de `foxy-visual-workspace.test.mjs` y de esta sección.

## Cuenta y accesos de Inicio

Alcance adicional: tres pruebas de cuenta/navegación/Inicio. Con el loader oficial dieron 2, 2 y 3 fallos respectivamente. La [guía vigente](../design/README.md) confirma perfil directo, navegación por rol y exclusión de bloques de devoluciones de Inicio; [reglas de Inicio](../engineering/home/README.md) ubican las devoluciones publicadas dentro de las aulas.

Los casos corregidos ejercen el enlace accesible a Perfil por rol, callback real y cierre del menú compacto, enlace a Configuración y acción de cierre de sesión del perfil, guarda de la navegación en borradores y rutas a Plan y Actividades. Inicio conserva el contenido aprobado: una prueba verifica que Mi progreso expone sólo la devolución publicada y entrega el ID exacto de actividad/intento al abrirla.

`node --import ./scripts/register-api-test-build.mjs --experimental-transform-types --experimental-test-module-mocks --disable-warning=ExperimentalWarning --test --test-concurrency=1`, ejecutado por archivo: `tests/brujula-agenda-account-complete.test.mjs` 5/5, `tests/entry-glass-client.test.mjs` 5/5 y `tests/folder-platform.test.mjs` 9/9. Sin cambios de producto; sin pruebas de navegador en esta unidad. Se revierte sólo el diff de estas tres pruebas y esta sección.

## Inicio y catálogo: colas, borradores y búsqueda

Dos rutas asignadas. RED con loader oficial: tres fallos en `home-reference-dashboard.test.mjs` y uno en `foxmind-3d-flows-collection.test.mjs`. La maqueta vigente retira el panel de borradores y el botón Ver todas de Inicio; se conservan las colas, las rutas y el selector de aulas.

Inicio reintenta prioridades, catálogo, selector y rango semanal a través del lector dedicado de Agenda; el reintento recupera la vista y aborta la lectura anterior. La cola de entregas completa el cursor en el cliente de Inicio, deduplica filas y abre el intento exacto de la página siguiente. Los borradores se reabren desde Actividades del aula con una lectura del borrador exacto y sin publicarlo. Las pruebas negativas de identidad, revocación y selección de aula se mantienen. En el catálogo sólo se actualizó el mensaje de búsqueda sin coincidencias.

`node --import ./scripts/register-api-test-build.mjs --experimental-transform-types --experimental-test-module-mocks --disable-warning=ExperimentalWarning --test --test-concurrency=1 tests/home-reference-dashboard.test.mjs tests/foxmind-3d-flows-collection.test.mjs`: 19 de 19 pasaron. Sin cambios de producto ni verificación de navegador en esta unidad. Para revertir, aplicar inversamente sólo el diff de estas dos pruebas y esta sección.

## P4: desbordamiento móvil de Archivos privados

El job 133521881947 mostraba que el selector real, la carga, el estado de ClamAV, la vista previa y la descarga habían pasado; fallaba el assert existente de ancho de documento a 375 px en `tests/p4-integration.test.mjs:86`. Se reprodujo en la copia de integración con el runtime aislado de PostgreSQL, S3, ClamAV, Mailpit y Next.
La CSS de paridad aplicaba la compensación del margen interno de `.p5-app` también al encabezado exterior de `/files`, que carece de ese margen. Se conserva el encabezado de la maqueta y se limita la compensación al contenedor que tiene el margen.
El RED local se ejecutó con `node --test --test-isolation=none --test-concurrency=1 tests/p4-integration.test.mjs`: 7 subcasos pasaron y falló el assert móvil de 375 px (más el contenedor de la suite); limpieza propia sin fallos. Con Ego Browser, un fixture de CSS midió ancho de documento 391→375 y 792→768 px fuera de `.p5-app`; dentro de `.p5-app` se mantuvo 375→375 y 768→768 px. El fixture aísla la causa geométrica; no reemplaza la prueba de carga y escáner.

Para la prueba real se preparó una copia de `f425d508` más la CSS modificada, con build separado del worktree de integración. Turbopack rechazó resolver `next/package.json` fuera de su raíz mediante junction; se reintentó con `npm ci --prefer-offline --no-audit --no-fund` propio.
GREEN: `npm run test:p4:integration` en la copia aislada con dependencias propias, Prisma/TypeScript/Next de producción recién compilados. Pasaron 9/9, incluyendo selector y carga real, bytes intactos en preview/descarga, assert existente a 375 px, cuarentena y reintento con scanner real, controles de acceso y reinicio. La limpieza reportó cero fallos. Se inspeccionó la captura de 375 px tomada por la prueba. El test y sus helpers no cambiaron. No se publicó nada. Para revertir la unidad, aplicar inversamente sólo el diff de `apps/shared-ui/parity-foundation.css` y esta sección.
