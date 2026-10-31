# Cinco comprobaciones — pruebas independientes

- Agent / role: `/root/five_pending_tests`, test_runner.
- Persisted by: coordinador `/root`; el rol de pruebas no escribe documentos.
- Session or task ID: tarea canónica indicada; sesión host no expuesta.
- Date: 2026-10-30.
- Branch / worktree: `codex/five-historical-checks`, worktree aislado de remediación.
- Starting commit: `fd47adf2fe62c0435d596d3075ca699b52ce8f12`.
- Task: cierre de cinco omisiones históricas.
- Status: completed.

## Trabajo atribuido

Trasladó los cuatro casos condicionados por origen web desde p3-web-client/p5-web-client a subpruebas hermanas de p5-integration, conservando sus nombres y aserciones. Los doce casos puros permanecen en sus archivos anteriores. Se retira la ejecución duplicada de esos archivos dentro del último recorrido P5. El caso de resumen se convirtió de placeholder manual a prueba Node con navegador real:894x486, fixture sintética, geometría/hit-test, navegación con hasta30Tab y ausencia de recentrado tras remoción diferida/refresco.

## RED observado

Root preparó el mirror aislado `.test-artifacts/five-pending-red`, con dependencias privadas y generados propios. El test_runner ejecutó `node --test --test-concurrency=1 tests/student-summary-scroll.test.mjs`: falla por export `withAuditResourcePreview` ausente; un fallo y cero omisiones. `node --test` sobre los dos archivos puros P3/P5 produjo12PASS/0FAIL/0SKIP. No hay GREEN integrado todavía. Se añadirá la comprobación de desplazamiento efectivo y dos requestAnimationFrame tras finalizar busy, para evitar una aprobación vacía o prematura.

## Handoff

Worker habilitado para implementar el contrato del preview y mover la entrada de resumen a owned-browser. El test_runner conserva propiedad exclusiva de archivos de pruebas; no escribió helpers plain, producto, documentos, infraestructura ni memoria. Falta ejecutar los cinco casos completos, revisar afirmaciones y validar en Ego dentro de un único Space dedicado.

## GREEN y revisión visual observados

Test_runner ejecutó en `.test-artifacts/five-pending-green1`, con dependencias privadas fijadas, `node --test --test-concurrency=1 tests/student-summary-scroll.test.mjs`: exit0,1PASS/0FAIL/0SKIP,5.67s. La optimización Vite en frío terminó en3s; no se aumentó el plazo de navegación30s. Se verificó desplazamiento positivo antes de actualizar y dos frames después de finalizar busy. Los cuatro casos P5 conservan un único presupuesto conjunto90s mediante el tiempo restante para cada subtest; resumen tiene timeout nativo330s.

En Ego, Space único `qa-five-historical-checks` id2, viewport894x486: snapshot con Alumnos/Ver resumen/Remover y captura temporal `ego-browser-shot-397933.png` inspeccionada por el test_runner, sin superposición observada. Esta observación visual complementa la prueba nativa completa; no se presenta como ejecución Ego de los otros cuatro casos. El primer selector de Space legacy devolvió un objeto sin page; se recuperó en el mismo Space usando la API taskSpace vigente. `task.finish({keep:[]})` completado.

Preview CLI propio en mirror green1 (sesión40273, origen loopback54741) terminó por Ctrl+C con exit1. No se expusieron PID ni cache exacto; limpieza interna temporal de esa terminación no confirmada. No se borran caches de propiedad desconocida. El cierre normal del fixture en la ejecución nativa sí retornó con éxito. Pendiente P5 completo y conciliación final de recursos.

## Primer gate integrado rechazado y ajuste de viewport

Native1 no ejecutó pruebas por guard auxiliar de inventario41obsoleto; root preparó native2 con guard exacto42. Test_runner ejecutó native2 una vez: P5 produjo11PASS/2FAIL/0SKIP (una hoja fallida y su parent), resumen1PASS/0FAIL/0SKIP. La hoja de invitación falló esperando el menú móvil a1280x720. CSS vigente oculta ese botón por defecto y lo muestra hasta1023px; se añadió únicamente viewport320x900 antes de abrir el menú. Perfil/cierre, autorización, destino exacto, CSRF, aceptación explícita0→1 y layouts320/375/1280se conservan; sin force ni mayor plazo. Reviewer aprobó el delta de una línea.

Otros tres casos históricos pasaron en native2. P4 reportó cleanup0/0 y el prefijo propio quedó sin contenedores/volúmenes/redes. Vite emitió warningEBUSY al observar archivos de perfil Chromium temporal; no se atribuye a él el fallo de invitación ni se oculta el resultado. Native3 con el mismo P5 completo/resumen está en curso, aún sin aceptación final.

## Resultado final atribuido

Test_runner ejecutó native3 una vez: exit0,106801ms. P5 completo13PASS/0FAIL/0SKIP y resumen1PASS/0FAIL/0SKIP. Los cuatro nombres históricos y el resumen aparecen explícitamente como ok; sin cancelaciones ni TODO. Cleanup integrado0 y owned0. Pruebas SHA256 finales: P3b866c1247fc4f2d526c4849132c9b94b7c5302afe23b90df57bbad956e8c65c7, P5cliente05cfe085fb48e319a8dea71fa7cf6659cb4c2e73ebda94f5c01f4c6426ac694d, P5integración11feebba52b9a5569db4a7de8af520638038ab78dbb56e43ef7846541b2865f1 y resumen320822baed9f29c2220ae8cd16563d617b08c706e0b345bf745642d8cda45492. Sin commits propios ni edición de producto/helpers.

Handoff final: cinco comprobaciones cerradas según DoT; root consolida registros, secretos, commits e integración autorizada. Los intentos rechazados y la limitación de la cache del CLI cancelado permanecen explícitos; no equivalen a fallos del cierre normal observado.
