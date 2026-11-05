# Brújula integral — revisión independiente

- Agent / role: `/root/brujula_complete_review`, revisor independiente de solo lectura, gpt-6.1-sol/xhigh.
- Session or task ID: `/root/brujula_complete_review`.
- Persisted by: root; el revisor no escribió archivos ni realizó las correcciones.
- Date: 2026-11-05.
- Branch / worktree: codex/foxmind-brujula, checkout principal.
- Starting commit: 5ea7f568d485512c88ed626511aef537bcad5704; candidato con cambios locales.
- Phase and detailed task/spec links: [BRU-06–10](../../odd/tasks/foxmind-brujula.md).
- Status: completed para la revisión acotada.

## Request and scope

Revisión independiente de permisos, persistencia, compatibilidad histórica y flujos nuevos frente al HTML y las decisiones humanas. Incluye contratos/migraciones, aula, evaluación, Home, búsqueda, Foxy y notificaciones. No certifica fidelidad visual ni sustituye los E2E del coordinador.

## Work performed

Se detectaron seis defectos, corregidos por los autores y revalidados sin hallazgos accionables abiertos:

1. P2: la sugerencia ponderada aparecía como final pero se guardaba otro valor. Ahora aceptar la sugerencia es explícito y persiste al guardar/recargar.
2. P2: override ocultaba puntajes manuales pendientes en la UI. `pending` mantiene la incompletitud por pregunta y la publicación permanece bloqueada.
3. P1: una corrección intermedia interpretaba `calculated_grade=NULL` de filas históricas como pérdida de nota. Backfill antes del nuevo trigger y fallback defensivo preservan las notas privadas/publicadas; una base nueva explícitamente nula con override sigue nula.
4. P2: parser de plan reinterpretaba temas como «Unidad de longitud» como encabezados. Formato canónico `Unidad: nombre`/`- tema` conserva roundtrip y edición.
5. P2: lectura masiva realizaba un POST por aviso; reproducción121 dejaba120leídos y1pendiente. Nuevo batch conserva selecciones autorizadas, locks ordenados, recheck e idempotencia; una sola mutación.
6. P2: Home ignoraba un `NEXT` explícito frente a un `PENDING` anterior. La consulta ahora prioriza el tema seleccionado por el docente.

## Verification

Resultados reportados por el revisor con salida0; selecciones se superponen y no deben sumarse como casos únicos:

- Selección inicial contratos/evaluación/wizard/búsqueda/Foxy/avisos/Home:45PASS.
- `node --import ./scripts/register-api-test-build.mjs --test tests/brujula-contract-parity-pending.test.mjs tests/brujula-grading-ui.test.mjs tests/p8-grading-client.test.mjs`:15PASS.
- SQL serial de `brujula-contract-parity-database`, `brujula-contract-parity-migration`, `brujula-wizard-database`, `brujula-search-database`, `brujula-foxy-handoff-database`:14PASS/0FAIL/0SKIP. Upgrade conserva notas7privada/8publicada; permisos, rollback y cursores comprobados.
- Wizard y referencias navegación/sugerencias/drop:15PASS; reproducción directa del roundtrip también aprobada.
- `brujula-data-database` y `brujula-home-complete`:10PASS.
- Notificaciones complete/batch/transporte/SQL:5PASS/0FAIL/0SKIP. Incluye123visibles, rollback total, budget+1, timestamps idempotentes, aulas archivadas, actor ajeno, revocado, target inválido y revocación mientras espera lock.

Fixtures desechables propios finalizados con cleanup satisfactorio. Sin builds, navegador, proveedores, servicios retenidos, lectura de secretos ni escrituras de memoria por el revisor.

## Commits and outcomes

Sin commits ni escrituras del revisor. Revisión completa dentro del alcance informado; no autoriza publicación ni despliegue.

## Handoff

Root completa build/E2E y QA visual del candidato final; conserva fallas históricas y evidencia actual en [el registro coordinador](2026-11-05-id-unavailable-brujula-complete-base.md).
