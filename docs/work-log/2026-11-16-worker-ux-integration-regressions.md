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
