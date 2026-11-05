# Brújula agenda y cuenta — en curso

- Agent / role: worker
- Session or task ID: /root/brujula_account_fidelity
- Date: 2026-11-05
- Branch / worktree: codex/foxmind-brujula / compartido
- Starting commit: 5ea7f568d485512c88ed626511aef537bcad5704
- Phase and detailed task/spec links: odd/tasks/foxmind-brujula.md; coordinador complete-base
- Status: in_progress

## Request and scope
Después de este día con personales y plazos reales; Mi cuenta modal con foco/Escape/drawer. Sin AppNavbar/search/Notifications ni serviciosretenidos.

## Work performed
Leídos componentes agenda/nav/ref. HTML consulta desde día+1 a día+31 inclusive, tres items. API range admite93días y paginado. Se reutiliza allItems con rango explícito, no datos del calendario parcial.

## Verification
Pendiente RED.

## Commits and outcomes
Sin commits.

## Handoff
Implementar consulta extra cancelable de31días y modal nativo anidado; root QA global.

## Implementation and freeze

- AgendaAfterDay.tsx: sección Después de este día con hasta3items personales/plazos reales, fechas y destinos por tipo. Filtra y ordena rango seleccionado día+1..día+31 inclusive; deduplica; estados loading/error/retry sin afirmar futuro si consulta falla. Evento personal abre editor real; plazo reutiliza revalidación api.open y destino autorizado. Los31días vacíos se declaran como rango consultado, no como ausencia universal de futuro.
- useAgenda.ts: lectura paginada/cancelable independiente del rango visible, con expiración de respuestas previas al cambiar día/zona. Cuando Agenda usa selectedDay se consulta calendario+AfterDay; query upcoming antigua solo se activa para consumidores anteriores sin selectedDay. Endpoint/archivo Upcoming y DeadlineCard permanecen.
- Agenda.tsx: monta sección AfterDay y recarga calendario+futuro al guardar cambios. Mantiene captura FORBIDDEN y limpieza inmediata al revalidar.
- NavbarParts.tsx: botón real de cuenta abre dialog nativo Mi cuenta; identidad disponible y enlaces perfil/settings con follow vigente; logout conserva callback real. openDialog conserva restauración de foco; cancel de modal evita propagar Escape al drawer. NavbarDrawer excluye clicks del menú/dialog para no desmontar al abrirlo. Link primario cierra modal y conserva callback; modificadores conservan navegación nativa.
- brujula-account-menu.css: geometría/colores/tipografía/controles HTML del modal y lista futura, móviles incluidos. Root importará al final.
- accountEmail opcional añadido a ShellAccount/HomeAccountMenu. Tubería AppNavbar/account-navbar/Classrooms/classrooms-screen fue realizada por /root/brujula_classroom_fidelity tras coordinación directa, no por este agente; correo real mostrado junto al rol.
- tests/brujula-agenda-account-complete.test.mjs: cinco pruebas propias de consulta paginada/rango, mezcla/orden/callbacks, modal/Escape/email, navegación y aborto/respuesta tardía.

## Observed verification

- RED node --test tests/brujula-agenda-account-complete.test.mjs:2FAIL antes de implementación (sin afterDay y sin trigger dialog).
- GREEN propio ampliado:5PASS/0FAIL.
- Último node --test tests/brujula-agenda-account-complete.test.mjs tests/home-warm-navigation.test.mjs tests/agenda-ui.test.mjs:19PASS/0FAIL. Las adaptaciones de tests ajenos al nuevo contrato fueron realizadas por fidelity_tests, no por este agente. Incluye revocación de acceso, no restaurar rango anterior tras navegar, retry aislado y Escape sin navegación.
- npx eslint apps/agenda-ui/Agenda.tsx apps/agenda-ui/useAgenda.ts apps/agenda-ui/AgendaAfterDay.tsx apps/shared-ui/NavbarParts.tsx:exit0 último.
- node node_modules/typescript/bin/tsc --project apps/web/tsconfig.json --noEmit --incremental false:exit0 último.
- PostCSS parse brujula-account-menu.css:PASS.
- Scoped git diff --check:exit0, avisos CRLF sin error.
- Corrida intermedia incluyendo agenda-ui/home-warm-navigation/foxmind-3d-regressions antes actualizar contratos de pruebas:14PASS/14FAIL;14fallos por Upcoming/details/summary eliminados del nuevo diseño, reportados y luego casos Agenda/Home corregidos por fidelity_tests. JD PostgreSQL del archivo de regresiones pasó6subtests con rollback conforme su runner; no se atribuye como prueba del nuevo futuro ni del modal.
- Sin QA navegador/build de este agente. Foco y drawer reales quedan en QA global del coordinador; no se declara observación visual.

## Exact handoff

Archivos propios congelados. Root debe importar brujula-account-menu.css al final y verificar desktop/móvil: abrir Mi cuenta desde drawer, correo/rol, Escape interior mantiene drawer y foco, links/logout reales; Agenda mezcla evento personal/plazo después del día seleccionado con31días completos consultados. No hay secretos, proveedores ni publicación. Status permanece in_progress hasta QA global.

## Follow-up: fast regression after-day query expectation

Assigned root scope: tests/agenda-event-form-result.test.mjs case1 line37; no builds/production changes. Reproduced focal RED3PASS/1FAIL with node --test tests/agenda-event-form-result.test.mjs. Cause: historic assertion required every post-navigation list request start2026-10-26 (new visible November calendar), excluding the now-required after-day read from2026-12-01 after selected2026-11-30. No stale request or production defect observed.

Updated only that test to capture full AgendaRange and require exact two new ranges in viewing zone: calendar2026-10-26..2026-12-07exclusive; AfterDay2026-12-01..2027-01-01exclusive. Old-range protection becomes more precise; contract expectation now includes approved31-day section. No production contract changed in this follow-up.

GREEN node --test tests/agenda-event-form-result.test.mjs tests/agenda-ui.test.mjs tests/brujula-agenda-account-complete.test.mjs:14PASS/0FAIL, exit0. Includes recurrence/result/retry/removal, revocation/current-range/errors, pagination and abort. No builds executed. Test and own record frozen afterward.
