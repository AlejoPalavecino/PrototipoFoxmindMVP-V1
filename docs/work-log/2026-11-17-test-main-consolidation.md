# Consolidación y verificación P9

- Agente: /root/integration_e2e; identificador de sesión no expuesto. Fecha: 2026-11-17.
- Destino: C:/Users/alejo/.codex/worktrees/refactor-integration/ProtipoFoxMind, HEAD 880612e9b3c2e1d95bc6649e471e470fd1605255.
- Origen sólo lectura: foxmind-ux-ui-merge/ProtipoFoxMind, HEAD d50b651a404d1867eccb045a963ef6ec44fee5a1 con tres cambios locales autorizados.
- Copiados al destino: tests/p9-teaching-remainder-integration.test.mjs y docs/work-log/2026-11-16-worker-ux-integration-{regressions,inventories}.md. Registros históricos conservan atribución y evidencia anterior; no se les atribuye esta ejecución.
- Alcance adicional autorizado por root: sólo recuperación de lectura GET de progreso ante429 real, sin cambiar producción, otros casos de admisión, asserts semánticos existentes, tiempos o skips. Sin commits propios ni publicación por esta unidad.

## Cambio y conservación de aceptación

El candidato UX ya adaptaba controles vigentes de Plan/Biblioteca/Muro/bandeja/progreso. La recuperación heredada repetía el click en Mi progreso ya seleccionado; Progress ofrece Reintentar progreso dentro de su alerta. Se agregó readProgress y se cambió únicamente su llamada final, importando observedUiAction existente. El observer acepta sólo requests nuevas de fase, path exacto y GET. Sólo un429 real con código RATE_LIMITED y Retry-After entero textual1..60 habilita una espera y click en región Seguimiento del aprendizaje -> alert -> Reintentar progreso. El resto del helper confirmed quedó intacto.

Auditoría determinista del origen copiado:64 llamadas assert frente a68 en candidato final; todas las líneas assert del origen están retenidas. No se descartaron las85 condiciones semánticas citadas por coordinación; ese conteo de condiciones no equivale al conteo de llamadas assert. Evidencia p9-source-audit-final.json.

SHA256 final del archivo: 23e9eba624161ce1428a137ad556b42deab641a91ffa3bef98abe689caefef43. No se inventa commit para el diff local.

## RED/GREEN y revisión

- RED puro: `node --test .test-artifacts/main-consolidation/p9-progress-recovery.test.mjs`,0PASS/1FAIL por secuencia observada navigation,navigation frente a navigation,retry-progress esperada. Log p9-progress-recovery-red.log. La prueba extrae los helpers reales del archivo y usa páginas/respuestas sintéticas, sin Docker ni tiempo real.
- GREEN inicial: mismo comando,1PASS/0FAIL, node --check del P9 EXIT0. Comprueba única espera1000ms, dueño del botón y exclusión de CSRF y POST del predicadoGET.
- Primera ejecución completa: `node .test-artifacts/main-consolidation/p9-run.mjs > .test-artifacts/main-consolidation/p9-run.log 2>&1`,1PASS/0FAIL/0SKIP/EXIT0 en126759ms. Reviewer audit_pending_e2e detectó que filter(has) con locator anclado a región no se evalúa correctamente relativo al alert. Se corrigió ese selector antes del candidato final, buscando botón directamente desde el alert. El mock ya no permite filter para no ocultar esa equivocación. Se conservan ambos resultados y no se cuentan como pruebas únicas.
- GREEN puro final: `node --test .test-artifacts/main-consolidation/p9-progress-recovery.test.mjs > .test-artifacts/main-consolidation/p9-progress-recovery-green-final.log 2>&1`,1PASS/0FAIL/EXIT0.

## Archivo completo del candidato final

Comando real: `node .test-artifacts/main-consolidation/p9-final-run.mjs > .test-artifacts/main-consolidation/p9-final-run.log 2>&1`.

Runner usa runSuite([tests/p9-teaching-remainder-integration.test.mjs]) con cleanEnvironment(), Node v24.20.0, preload register-api-test-build.mjs, --experimental-transform-types --experimental-test-module-mocks --disable-warning=ExperimentalWarning --test --test-reporter=tap --test-concurrency=1 y timeout360000ms. Servicios Docker/PostgreSQL/S3/scanner/Mailpit efímeros propios de helpers aprobados; ninguna lectura de .env ni proveedor real o datos retenidos.

Resultado:1PASS,0FAIL,0SKIP,EXIT0;114952ms TAP. Recibo p9-final-receipts.json conserva argv, fechas UTC y exit. Stdout p9-final-p9-teaching-remainder-integration.stdout.log; stderr vacío.

Pasaron TAUGHT/no NEXT automático/403 sin mutación; publicación, asociación, inmutabilidad e identidad/SHA privados de Biblioteca; aviso/consulta/respuestas, permisos de destinatario, lectura y apertura, cancelación de moderación y tombstone preservando respuesta; progreso curricular; reinicio de base/almacenamiento/API, notificaciones y bytes privados durables. Se respetó Retry-After real45s en helperP6. Rama429 específica de progreso no se activó: evidencia de esa recuperación es pura, no se atribuye ejecución real.

Cleanup observado: P4 integrated process cleanup failures0 y P4 owned cleanup failures0. Inventario Docker nombres antes/después idéntico en contenedores, redes y volúmenes; p9-final-docker-{before,after,delta}.json. Sin pruning ni operación manual sobre recursos ajenos. Temporales propios de evidencia de los runners se conservan según comportamiento existente.

`git diff --check` focal de los tres archivos copiados EXIT0; sólo advertencias de normalización LF/CRLF de los registros. Estado: unidad verificada; coordinador reconcilia revisión independiente, integración y publicación. Límites: no suite completa en esta unidad, no proveedores reales, no datos retenidos ni deploy.
