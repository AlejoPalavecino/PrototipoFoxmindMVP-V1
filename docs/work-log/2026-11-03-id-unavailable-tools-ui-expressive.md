# UI-05 — Agenda y Foxy AI

- Agent / role: /root/tools_ui, worker.
- Session or task ID: unavailable.
- Date: 2026-11-03.
- Branch / worktree: codex/foxmind-escritorio-expresivo, workspace compartido.
- Starting commit: ec024bc.
- Phase and detailed task/spec links: [UI-05](../../odd/tasks/foxmind-escritorio-expresivo.md), [Agenda](../../odd/tasks/agenda.md), [Foxy AI](2026-11-01-browser-live-handoff.md).
- Status: completed

## Request and scope

Rediseño expresivo del calendario y el espacio docente Foxy AI, con zonas, privacidad, series, permisos y confirmaciones vigentes. Se emplearon clientes sintéticos para la verificación.

## Work performed

- Agenda, en `apps/agenda-ui`. Reduje la cabecera y dejé controles, calendario y detalle en el flujo normal. El panel lateral contiene el día seleccionado y los próximos vencimientos. Identifiqué los eventos personales con candado y las entregas con documento. En móvil la vista inicial es Día hasta 600 px. La primera lectura espera que el modo se resuelva y usa la fecha y zona restauradas. Mes y Semana siguen disponibles.
- Foxy AI, en `apps/web/src/components/foxy-*`. Separé historial, conversación y contexto seleccionable. La conversación distingue pedido y respuesta con indicación de revisión docente. La preparación de texto o visuales conserva destino y confirmación explícita, con un panel visualmente diferenciado.
- Pruebas en `tests/agenda-reference-selection.test.mjs` y stub de CSS en `tests/foxmind-3d-flows-loader.test.mjs`.

## Verification

- `node --test tests/agenda-reference-selection.test.mjs` reprodujo inicialmente Día inactivo. Tras implementar Día, la comprobación de una sola solicitud reprodujo dos lecturas iniciales. Después de diferir la lectura, 2/2 pasaron.
- `node --test @cases tests/agenda-reference-selection.test.mjs tests/agenda-ui.test.mjs`, con `$cases` expandido a los archivos `apps/web/src/components/foxy-*.test.mjs`: 67/67 pasaron, incluidos permisos, sesiones, selección de contexto, edición y confirmación explícita de publicación.
- ESLint dirigido a `apps/agenda-ui` y `apps/web/src/components/foxy-*.tsx`, TypeScript estricto con `-p apps/web/tsconfig.json --noEmit --incremental false` y `git diff --check` pasaron.
- Playwright/Edge contra Agenda en el fixture local, 320/390/1280 px. Comprobé modo inicial, cambio a Mes en móvil y regreso a Día, apertura/cierre del formulario con Escape y ausencia de desborde o error JS. Capturas en `.test-artifacts/desk-expressive-evidence/ui05-agenda-*.png`. Esta corrida precedió al ajuste final de una sola lectura, que se comprobó con la prueba dirigida.
- Playwright/Edge contra la ruta real de Next `/foxy-ai` con API interceptada, 320/390/1280 px. Comprobé seleccionar conversación, desplegar contexto, elegir tema y fuente, recuento y citas, sin desborde ni error JS. El fixture de componentes repitió los tres tamaños y sobrescribió las capturas de la ruta; las capturas disponibles son las del fixture de componentes y están renombradas como `.test-artifacts/desk-expressive-evidence/ui05-foxy-component-*.png`. La ruta Next quedó comprobada en la salida del comando.
- `ego-browser` no estaba disponible en PATH. No se invocaron proveedores, escrituras reales ni publicación desde navegador. La confirmación se comprobó con la suite de componentes.

## Commits and outcomes

Cambios locales en la rama compartida. Sin commit propio.

## Handoff

UI-05 lista para reconciliar en la verificación integrada UI-06. Usar las capturas de Agenda y del fixture de componentes Foxy, y distinguir de la ejecución Next interceptada.
