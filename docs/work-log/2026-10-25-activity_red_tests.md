# Actividades IA — RED independiente y GREEN focalizado

- Agent / role: test_runner.
- Session or task ID: /root/activity_red_tests.
- Persisted by: coordinator /root desde informe final; el rol de pruebas no escribió este archivo.
- Date: 2026-10-25.
- Branch / worktree: codex/classroom-activity-ai; worktree classroom-activity-ai/ProtipoFoxMind.
- Starting commit: af48e698aa575733e60a9e900875075dda77e138.
- Phase/task: [actividades IA](../../odd/tasks/classroom-activity-ai.md), A1–A5/D1.
- Status: completed (pruebas automatizadas focalizadas, no QA visual).

## Request and scope

TDD independiente; sólo archivos nuevos de prueba. No fuente, migraciones, scripts de runtime, commits o publicación. Sin datos/configuración retenidos ni llamadas a Google.

## Work performed

Catorce archivos nuevos tests/activity-*.test.mjs, incluida fixture reutilizable. RED observado antes de los contratos/implementación de cada superficie: multi-tema policy4FAIL/1PASS y DB4escenariosFAIL; dominio5FAIL; adapter6FAIL; jobs3FAIL; proxy3FAIL; UI3FAIL; lifecycle/budget7FAIL; reader export missing. Nuevos límites agregados tuvieron RED4FAIL/2PASS con implementación parcial, no sólo import missing.

Cobertura final: listas ordenadas y legacy, cambiar unidad/limpiar asociaciones/metadata post-intento, SQL/permisos, tipos/límites/evidencia/esquema, claves privadas, snapshots/digest/currículo obsoletos, PDF/DOCX reales, formatos/50MB no procesables, acceso de archivos, cuotas y concurrencia compartidas con extracción, leases/crash/late output/unknown sin reenvío, liquidación conservadora, generación/aplicación idempotentes y nuevo draft, recuperación/edición/dirty regen/preview mediante SSR/hooks, proxy/host reales con sesiones persistidas y Origin/CSRF.

Prueba de composición real AIoff: el servicio reconstruido sin configuración AI publicaba un draft IA con currículo modificado. RED por ausencia de rechazo; módulo corregido y recompilado por worker/coordinador; GREEN1PASS posterior.

Fixtures ajustadas legítimamente: envelope provider definitivo READY/proposal e INSUFFICIENT_CONTENT; material distinto para caso de seguridad después de eliminación irreversible, conservando la política y las aserciones. No se editaron tests históricos ni se relajaron assertions para pasar.

## Verification

Comando final observado por test_runner:

```powershell
$activityTests = @(rg --files tests -g 'activity-*.test.mjs')
node --test --test-concurrency=1 --test-reporter=tap $activityTests
```

Resultado: 84 tests, 84 PASS, 0 FAIL, 0 SKIP/cancelled/todo; 50.374527s, exit 0. Incluye tests con PostgreSQL owned classroom_ai_test y rollback por caso cuando corresponde, almacenamiento/FileService real y fixture HTTP con sesiones/CSRF reales. Compilación no se ejecutó concurrentemente desde el rol tester.

## Commits and outcomes

Sin commits del test_runner. Pruebas congeladas tras ese resultado. No Space/navegador propio, no aceptación visual ni feature completa declarada.

## Handoff

Revisión y verificación independientes en ego(lite), capturas desktop/390/320, publicación/participación real y prueba targeted del candidato final. Coordinador conserva evidencias y realiza commits locales por unidades; no integración/publicación remota autorizada.

## Continuaciones atribuidas — inventarios y correcciones

Inventarios existentes classroom-ai/P8-migration RED14!=12 con PostgreSQL propio. Actualizó dos pruebas de migración y seis inventarios de integración para agregar exactamente las dos migraciones nuevas, preservando prefijo/aserciones anteriores. Inventarios SQL GREEN3; seis archivos integración `node --check` PASS, sin repetición de fullE2E. Nuevo manifiesto exact14 inicialmente usó hashes WindowsCRLF; coordinador detectó diferencia frente a blobs GitLF. Se corrigió sólo ese test a hashesrawGitLF y normalización exclusiva CRLF→LF; pruebaLF/CRLF equivalentes y cambio de espacio detectable:2PASS. NoSQLhistóricos modificados.

Lote1 RED reales: polling READY/QUEUED; borrar unidad sin actividades tras jobFAILED devolvía SERVICE_UNAVAILABLE; replays READY obsoletos; historial/entregas perdían segundo tema. A01 freshkey/revisión/orden de selecciones y siblingolderREADY eludían reconocimiento UNKNOWN; A04 hostreal503 en vez400AI_INPUT_LIMIT; A05 cards/preview omitían unidad/temas. Nuevos tests preservan acceso/privacidad y ausencia de despachos duplicados. Fixes de workers, sin edición de sus pruebas.

Targeted sibling final: unknown-start10PASS después de nuevo build. Verificador independiente ejecutó posteriormente suite ampliada104PASS sobre01d1bea (evidencia propia en su registro, no corrida del tester).

Final2: ambos jueces detectaron INFO causado por lote1, autoselección de UNKNOWN histórico pese a sucesorREADY. Test_runner añadió RED1 en unknown-start; worker cambió sólo hook2líneas; ejecución independiente focalizada:

```powershell
node --test --test-concurrency=1 --test-reporter=tap tests/activity-unknown-start.test.mjs tests/activity-ai-ui.test.mjs tests/activity-ai-polling.test.mjs tests/activity-curricular-context.test.mjs
```

20PASS/0FAIL/0SKIP/cancelled,9.474s exit0. Revisa historial íntegro, creación habilitada, ceroPOST y recuperación del último UNKNOWN genuino. No nueva fullsuite por delta2líneas. Estas continuaciones fueron sólo tests, sin producto/builds/Git ni Space.
