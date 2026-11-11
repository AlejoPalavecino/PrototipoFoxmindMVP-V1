# TASK-002 · Creación, Plan, Muro y Biblioteca

- Autor: `classroom_content_ui`, implementador delegado. ID de sesión no expuesto.
- Fecha: 2026-11-11. Rama `codex/classrooms-ux-unification`, base `3895f4d`, worktree `FoxMind-classrooms-ux`.
- Alcance autorizado: trasladar la referencia aprobada a las superficies de contenido y creación, con sus contratos existentes. El coordinador verifica candidato, integración y tablero.
- Inicio: árbol con diseño, registro y mapa documental concurrentes. Sin cambios iniciales de esta unidad.

## Unidad implementada

- Creación: cuatro pasos con archivo obligatorio en Cargar plan. Resumen editable, revisión de propuestas sin disclosure exterior y editor estructurado común de unidades y temas para manual e IA. Se conserva el texto alternativo, el autosave, la revisión del borrador y la validación final. La revisión de archivos pendientes es cancelable y se vincula a la selección vigente. Un resultado atrasado del archivo anterior ya no aprueba un reemplazo rechazado.
- Plan: filtros Todos/Por dar/Dados, progreso general y de unidad, estado Siguiente, detalle con recursos y navegación. Marcar y seleccionar son independientes. Deshacer conserva el estado anterior, incluido NEXT. En móvil, el detalle y el índice devuelven el foco al control apropiado.
- Muro: filtros, publicaciones y respuestas con cabeceras flexibles y estados visibles. El POST confirmado cierra el compositor y un fallo de refresco ofrece actualizar. Los textos se renderizan como nodos de React; se mantienen revisión, permisos y cursores.
- Biblioteca: FILE y TEXT conservan entradas independientes y publican sólo el modo activo. Durante revisión FILE se mantiene el formulario bloqueado y el destino intacto. Organizar en el plan se abre al iniciar desde un tema. El lector común conserva búsqueda y foco al volver. Los formatos, revisiones, bytes, visibilidad, asociaciones y confirmación de borrado siguen sus contratos.

## Evidencia observada

- Pruebas nuevas: `tests/classroom-plan-filters.test.mjs`, `tests/classroom-library-modes.test.mjs`, `tests/classroom-wizard-file-step.test.mjs`. RED inicial por ausencia de filtros, selector de formato y archivo en el paso incorrecto. RED de carrera por avance al paso 3 pese a haber rechazado el reemplazo. GREEN luego de implementar.
- `node --test` sobre filtros, modos, archivo/pasos del wizard, currículo, interior, disclosure, paridad, referencias de arrastre/navegación/propuesta, clientes de Biblioteca/Muro, búsqueda y autoría completa: 72/72. La primera corrida extendida detectó la búsqueda de PDF incluyendo TEXT y una dependencia de requestAnimationFrame en el retorno del lector. Corregidos y vueltos a ejecutar.
- `node --test tests/classroom-sections-redesign.test.mjs tests/classroom-library-modes.test.mjs tests/classroom-library-search.test.mjs`: 12/12 luego de restituir el bloqueo del formulario mientras FILE se escanea. El runner integrado había detectado esa diferencia; se mantuvo la aserción preexistente.
- `node_modules/.bin/tsc.cmd --noEmit -p apps/web/tsconfig.json`, ESLint de los TSX modificados y `git diff --check` de la unidad: PASS. `npm run typecheck --workspace @foxmind/web` no aplica a este repositorio, que carece de workspaces npm.
- Ego TaskSpace 10, p2, fixture sintética sobre componentes de la aplicación. Scripts ignorados bajo `.test-artifacts/classrooms-ux/content-round-*.mjs`. Ronda 07: wizard de 960 px a 1280×700, scroll único y pie visible; a 375×700, texto largo completo, quitar/deshacer y revisión. Ronda 10: Plan 1→2→1 temas dados al marcar/deshacer, NEXT restaurado, filtro y ancho móvil. Ronda 11: alternancia de formatos, confirmación de descarte y lector/búsqueda. Rondas 12 y 14: aviso, respuesta con foco inicial, filtro vacío y ancho móvil. Ronda 15: recorrido de foco ida/vuelta en Plan y Biblioteca. Capturas ignoradas `content-*.png`.
- Diagnósticos de navegador: corregida interferencia de estilos heredados en el ancho y scroll del wizard; el chequeo de píldora espera el final de la transición. El fixture del Muro se alineó con la forma real de WallData por coordinación.

## Superficie, límites y reversión

Cambios en `apps/web/src/application/academic-Wizard.tsx` y su CSS, `features/classrooms/ui/WizardReview.tsx` y su CSS, `features/curriculum/ui/{WizardPlan,WizardSuggestions,ExtractionEditor,Plan,PlanWorkspace}.tsx` y sus CSS locales, `features/communication/ui/Wall.tsx` y su CSS, `features/materials/ui/{Library,MaterialReader}.tsx` y su CSS. En pruebas existentes se ajustaron acciones/orden del wizard, modo TEXT, ubicación desplegable y etiquetas/feedback de Muro y Biblioteca sin alterar checks de permisos, revisiones, bytes y publicación.

La verificación de esta unidad usa puertos sintéticos. Quedan a cargo del coordinador la corrida integrada contra servicios aislados, el build del candidato completo, las guías canónicas compartidas y el tablero. Sin commit propio. Revertir sólo los hunks de esta unidad con el diff de sus rutas, y retirar sus CSS, pruebas nuevas y registro; preservar cambios concurrentes.
