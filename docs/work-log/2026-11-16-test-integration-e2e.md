# Verificación E2E del candidato integrado

- Agente: /root/integration_e2e, test_engineer; identificador de sesión no expuesto.
- Fecha: 2026-11-16. Rama: codex/refactor-integration. HEAD inicial: d79ee909e094b5c7dbbbcccf1eb2bf972908e0c1.
- Worktree: C:/Users/alejo/.codex/worktrees/refactor-integration/ProtipoFoxMind.
- Candidato: backend d79ee909 + frontend eba381b3, conciliación local coordinada por root.
- Alcance autorizado: cuatro E2E existentes, en serie, Node v24.20.0, proveedores sintéticos y servicios efímeros propios. Sin cambios de aceptación o producción, secretos, datos retenidos ni Git remoto.
- Fuentes: registro root-refactor-integration, run-ci-suite, cleanEnvironment de run-complete-suite, run-fast-suite, los cuatro tests y sus helpers P4/Mailpit.
- Ejecución prevista: runner de evidencia e2e-run.mjs, llama runSuite([file]) con cleanEnvironment y preload API existente, timeout por archivo original de 360000 ms. Conserva stdout/stderr y recibo de exit/error por archivo. Un intento por archivo.
- Estado: IN_PROGRESS. Primer paso pendiente: ejecutar y reconciliar resultados y cleanup.

## Resultado del intento único por archivo

Comando real: `node .test-artifacts/refactor-integration/e2e-run.mjs > .test-artifacts/refactor-integration/e2e-run.log 2>&1`.
Runner: `runSuite([file])` con `cleanEnvironment()`, preload `scripts/register-api-test-build.mjs`, `--experimental-transform-types --experimental-test-module-mocks --disable-warning=ExperimentalWarning --test --test-reporter=tap --test-concurrency=1`; timeout existente 360000 ms por archivo. Ejecutado Node v24.20.0. El recibo guarda argv, fechas UTC, exit y señal; no guarda variables de entorno.

| Archivo | Pass | Fail | Skip | Exit | Duración runner |
| --- | ---: | ---: | ---: | ---: | ---: |
| tests/p7-questionnaire-integration.test.mjs | 8 | 0 | 0 | 0 | 202 s |
| tests/p7-practical-integration.test.mjs | 5 | 0 | 0 | 0 | 140 s |
| tests/p8-grading-integration.test.mjs | 5 | 0 | 0 | 0 | 163 s |
| tests/p8-publication-integration.test.mjs | 0 | 2 | 3 | 1 | 98 s |

Total TAP: 18 pass, 2 fail, 3 skip; los dos fail corresponden al primer subcaso de publicación y su padre, no a dos causas independientes. Runner global EXIT1. No hubo reintentos. Los cuatro stderr quedaron vacíos.

### Fallo bloqueante y discrepancia de aceptación

Publicación falla con `page.waitForResponse: Timeout 12000ms exceeded` en tests/p8-publication-integration.test.mjs:316. El caso guarda correctamente la corrección privada, modifica feedback local, comprueba publicación deshabilitada y pulsa «Recargar corrección», esperando GET /grading inmediato. GradingEditor.tsx:54 usa leaveEditor; use-grading-draft.ts:25-28 difiere la acción si hay cambios sin guardar. GradingEditor.tsx:209-213 muestra el diálogo «Tenés cambios sin guardar» y requiere «Descartar cambios». tests/frontend-grading-discard.test.mjs exige no hacer GET antes de esa decisión. La espera antigua y la nueva aceptación frontend son incompatibles en ese punto. No se modificaron ni relajaron tests, producción, timeout o asserts; se informó al coordinador para revisión.

Los subcasos EVALUATION, ASSIGNMENT y reinicio/revocación del E2E de publicación quedaron omitidos por dependencia. El caso QUESTIONNAIRE no alcanzó publicación explícita ni su resultado/notificación. Los otros tres archivos verificaron draft/autosave/retry/editor/recibos, archivos privados/scanner/transferencia/entrega y corrección privada persistente.

### Artefactos y cleanup observado

- Recibos: .test-artifacts/refactor-integration/e2e-receipts.json.
- Logs completos: e2e-run.log y e2e-p7-questionnaire-integration, e2e-p7-practical-integration, e2e-p8-grading-integration, e2e-p8-publication-integration con sufijos .stdout.log/.stderr.log en la misma carpeta.
- Observador seguro de publicación copiado a e2e-publication-safe-observer-final.json desde el temporal propio registrado por el test.
- Los cuatro archivos registraron `P4 integrated process cleanup failures: 0` y `P4 owned cleanup failures: 0`; publicación además `P8 browser/observer cleanup failures: 0`.
- Inventario Docker sólo de nombres antes/después: e2e-docker-before.json, e2e-docker-after.json y e2e-docker-delta.json. Sin contenedores/redes/volúmenes añadidos al terminar. Algunos recursos que ya estaban al inicio desaparecieron por trabajo concurrente; no se operó sobre ellos ni se atribuye su limpieza a esta tarea.
- Los helpers existentes generan temporales P4/Mailpit/browser fuera de e2e-*; se usaron tal como están aprobados. No se leyeron sus archivos de credenciales ni .env; el helper elimina auth/config efímeros. Los temporales de evidencia permanecen según comportamiento del test.

Estado: verificación ejecutada, candidato no aprobado por fallo bloqueante de publicación. Primer paso pendiente: coordinador debe revisar la discrepancia de aceptación y autorizar el ajuste correspondiente antes de una nueva ejecución. Sin commits propios ni cambios de producción/aceptación.
`n## Revisión autorizada de aceptación`nRoot revisó la discrepancia y autorizó adaptar únicamente el paso de recarga de p8-publication al descarte confirmado aprobado, agregar cancelación sin GET/POST y repetir archivo completo. RED anterior conservado. Producción y otras aceptaciones protegidas no se editan.

## GREEN tras adaptación revisada

- Cambio acotado: tests/p8-publication-integration.test.mjs, paso de recarga; 37 altas/11 bajas. Agrega cancelación visible, conservación del feedback local y publicación deshabilitada, ausencia de requests grading antes de confirmar y recarga con descarte explícito. watchActionResponse observa sólo nuevas requests de fase con path exacto + GET; se dispone en finally. Retry 429 conserva validación Retry-After y vuelve a confirmar descarte. No se eliminaron controles de privacidad, persistencia, publicación o reinicio.
- Verificación estática propia: `node --check tests/p8-publication-integration.test.mjs`, EXIT0.
- Revisión independiente solicitada a /root/frontend_cohesion después de escribir: sin hallazgos en bloque316–354; reportó frontend-grading-discard 3/3 verde y node --check EXIT0. No atribuirle navegador/DB.
- Comando real: `node .test-artifacts/refactor-integration/e2e-publication-rerun.mjs > .test-artifacts/refactor-integration/e2e-publication-rerun.log 2>&1`.
- Resultado del archivo completo: 5 PASS, 0 FAIL, 0 SKIP, EXIT0; 184316 ms TAP. Mismos preload, cleanEnvironment, sintéticos y timeout360000ms. El runner sólo incluye publicación. Los primeros tres E2E no se repitieron; sus resultados previos siguen siendo 8+5+5 PASS.
- Evidencia por fase: stdout confirma para QUESTIONNAIRE, EVALUATION y ASSIGNMENT cancelación sin requests grading y descarte confirmado con exactamente GET. Los cuatro subcasos pasan, incluyendo resultado/notificación propios y reinicio/revocación. Hubo recuperación real Retry-After47s en destino publicado de ASSIGNMENT, sin reabrir la notificación. La rama de recarga429 nueva conservada no se activó en esta ejecución.
- Cleanup: browser/observer0, procesos P4 integrados0, recursos owned0. Inventario Docker antes/después idéntico en contenedores, redes y volúmenes: e2e-rerun-docker-delta.json no contiene añadidos ni retirados.
- Artefactos nuevos: e2e-rerun-receipts.json, e2e-rerun-p8-publication-integration.stdout.log/.stderr.log, e2e-publication-rerun.log; originales RED preservados. Evidencia temporal propia de browser: foxmind-p8-publication-ibRUtD.
- Estado final de esta unidad: verificación focalizada completada. Resultado vigente de cuatro archivos: 23 PASS,0FAIL,0SKIP, con publicación repetida después del ajuste autorizado; no sumar los intentos RED a pruebas únicas. Sin cambios productivos ni commits propios. El coordinador conserva decisión de integración y conciliación de otras verificaciones.
