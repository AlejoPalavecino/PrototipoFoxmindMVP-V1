# Actividades IA y multi-tema — implementación autorizada

- Agent / role: coordinator.
- Session or task ID: /root (runtime task path).
- Date: 2026-10-25.
- Branch / worktree: codex/classroom-activity-ai; C:/Users/alejo/.codex/worktrees/classroom-activity-ai/ProtipoFoxMind.
- Starting commit: af48e69 (decisiones documentales aceptadas).
- Phase and tasks: [actividades IA](../../odd/tasks/classroom-activity-ai.md).
- Status: completed.

## Request and scope

Usuario: «Si implementa ese alcance». Autoriza implementación local del diseño D1:A multi-tema dentro de una unidad, D2:A fuentes seleccionadas/contexto docente, D3:A PDF/DOCX inicial. Tres tipos existentes, manual e IA, borrador editable y publicación explícita. Se satisface el gate humano L3; no hace falta repetirlo. No autoriza integrar main, push/PR, despliegue, datos reales ni leer secretos/configuración privada retenida.

## Work performed

Inspección inicial: rama propia limpia; propuesta y registros anteriores leídos. Bootstrap delegado read-only antes de contrato técnico y TDD. Skills activas: memoria, contrato mínimo, ambiguity gate, arquitectura y estrategia de equipo; se cargarán testing/QA/revisión en su fase.

## Verification

`git status --short --branch`: codex/classroom-activity-ai sin cambios antes del registro. No pruebas de implementación todavía.

Preparación por coordinador: `git fetch origin` exit 0 antes de futuras migraciones; `npm ci --no-audit --no-fund` exit 0 (389 paquetes, scripts de instalación bloqueados según política npm); `npm run api:build` exit 0, Prisma y TS baseline PASS. Documentación Next instalada use-client/route-handlers leída; no SDK o comportamiento de versión inferido sin documentación.

Docker inicialmente sin daemon; se inició Docker Desktop oculto y `docker version --format '{{.Server.Version}}'` confirmó 29.9.2. No se iniciaron stacks retenidos por el coordinador. El PATH de ego apunta a junction obsoleto 0.6.1.9; localizado ejecutable instalado 0.6.1.11 por inventario de directorio. Skill ego-browser completa leída usando ruta absoluta, exit 0; no se cambió PATH/junction ni instalación. Error inicial comando no reconocido y lecturas de ruta antigua se conservan como diagnóstico, no prueba de QA.

Baseline focalizada por coordinador: `node --test --test-concurrency=1 tests/classroom-ai-contracts.test.mjs tests/classroom-ai-adapter.test.mjs tests/classroom-ai-configuration.test.mjs tests/p7-authoring-client.test.mjs tests/p7-authoring-proxy.test.mjs`: 20 PASS, 0 FAIL. Docker ps después del arranque del daemon: vacío.

RED independiente comunicado por /root/activity_red_tests: `node --test --test-reporter=dot tests/activity-multitopic.test.mjs`: 4 FAIL/1 PASS; `... tests/activity-multitopic-database.test.mjs`: cuatro escenarios fallan más contenedor padre, PostgreSQL propio classroom_ai_test y rollback por escenario. Producción no existía para esos contratos. Se liberó GREEN al worker multi-tema; pruebas permanecen exclusivas del test_runner.

Anti-colisión: MT worker único dueño Prisma/migraciones/policy/authoring/Plan; AI worker dueño shared-domain (excepto activity-topics.ts asignable a MT), nueva capacidad/provider/reader/runtime; tester sólo archivos *.test.* y reporte atribuido. Contrato y feature doc sólo architect; roadmap y este registro sólo coordinador. Build API serializado mediante lock coordinador para evitar .build generado concurrente. UI se inicia tras contrato y RED.

Contrato técnico persistido por architect en feature doc, incluyendo DDL y DoT. El coordinador interrumpió esa tarea después de la entrega del contrato para liberar slot de implementación durable; su registro quedó parcial y no se atribuye verificación funcional al arquitecto. Runtime/cola/presupuesto/HTTP asignados a /root/activity_runtime_green; MT añadió UI/proxy como superficie exclusiva. Tests continuaron exclusivos del test_runner.

Resultados focalizados comunicados por workers: MT policy/DB+regresiones30PASS; dominio/adapter13PASS; UI/proxy+regresiones11PASS; reader6PASS (luego ampliado catálogo7PASS); jobs/lifecycle/budget/source-limits30PASS; extracción regresión19PASS; ledger/lifecycle final22PASS. Son ejecuciones solapadas, no sumar como casos únicos. Los registros individuales preservan comandos/fallos; falta consolidación independiente final.

Build Next propio bounded180s: primera ejecución falló por un byte CP1252 en ActivityAuthoring.tsx; UTF8 estricto detectó ese único archivo inválido entre83rutas. MT corrigió exclusivamente bytes inválidos y validó21rutas propias. Segunda compilación Next exit0 (tipos, optimización y rutas). No se relajaron tests por el fallo.

Coordinador creó scripts/activity-ai-live{,-seed,-provider}.mjs para fixture controlada aislada, con registro/verificación reales P3, carga PDF/Word escaneada y aula/biblioteca reales. `node --check` PASS en los tres. `npm run api:build` fresh exit0 seguido por live runtime session65774; PostgreSQL/S3/scanner/Mailpit propios, Prisma migrate deploy/diff PASS, URL inicial http://127.0.0.1:51859. Credenciales sintéticas sólo en fixture ignorado; no proveedor real/config retenida. Verificador independiente /root/activity_independent_verify Sol6.1/xhigh asignado para QA real en ego; debe volver a comprobar candidato final si cambia producción.

Boundary adicional detectado antes de DoD: publicar un draft previamente generado con IA desactivada omitía provenance. Test_runner creó RED de composición real (sin callback mock) y AI worker prepara validador siempre activo sin proveedor. Esta corrección está dentro del alcance ya autorizado y requiere GREEN antes aceptación; no una nueva decisión de producto.

Cierre de ese boundary: fresh `npm run api:build` exit0 tras patch always-on; test_runner confirmó AIoff targeted1PASS. [Suite automatizada independiente](2026-10-25-activity_red_tests.md) final:84PASS/0FAIL/0SKIP en14archivos, 50.374527s. Producción congelada para revisión; árbol inmutable f6ef5538bb7a020f0f7650a7986c057cf1f28750 contra baseaf48e698 entregado por igual a /root/jd_activity_a y /root/jd_activity_b (read-only ciegos). No se creó commit de implementación antes de DoD.

Revisión inicial reconciliada: [juez A](2026-10-25-jd_activity_a.md), [juez B](2026-10-25-jd_activity_b.md). Coincidencias: stale replay (warnings A-02/B2) e historial multi-tema (warnings A-03/B3). Severe iniciales unilaterales: unknown-start bypass A-01 y FK unidad histórica B1; no se declaran corroborados por ambos jueces. Test_runner reprodujo B1/B2/B3 y polling QA con RED real; agrega RED de A-01/A-04/A-05. Estas son correcciones necesarias de requisitos ya autorizados, no cambios externos o decisiones de producto nuevas; se corrigen como implementación tras reproducción independiente y se enviará ledger/delta a ambos jueces para revalidación acotada. No se solicita permiso para corregir fallos del alcance aprobado.

Lote de corrección1: MT owner schema/historial/UI/polling; AI owner replay/unknown/mappingHTTP. Se conserva historial de jobs, removiendo sólo FK de unidad viva en la nueva migración aún local; las doce migraciones históricas quedan intactas. El cambio de catorce migraciones obligó actualizar inventarios de harness/tests: RED14!=12 observado, prefix/hashes de12históricas preservados y nuevas2entradas exactas; no se relajan escenarios SQL.

Lote1 GREEN: workerAI freshbuild+16targetPASS, MT21targetPASS/types; finalNextbuild con esos cambios exit0. Nueva fixture propia http://127.0.0.1:54153, session16878, migración deploy/diff PASS. Verificador Sol6.1/xhigh ejecutó104PASS/0FAIL/0SKIP,19archivos sin helperfixture,66.8s<330, source/test SHA256 antes/después sin diferencias. Es evidencia de01d1bea0029376fe7f56c3d66b65572488fa2898, no de una versión inventada posterior.

Ambos jueces R1 scopedAPPROVED cerraron ledger y detectaron mismo INFO de recuperación: antecedente UNKNOWN resuelto seguía autoseleccionado. Corrección final2 con RED1 y hook2líneas; tester independiente20PASS y ambos jueces R2 scopedAPPROVED sobre7d47529b560902f82411a53e2f7fc4ebe90ef94e. Fuente API/backend/schema sin cambios respecto a104PASS; nueva rama UI cubierta por20target, sin repetir suites extensas innecesarias. Dos rondas de revalidación consumidas. JUDGMENT: APPROVED; no autoridad de publicación.

## Commits and outcomes

Base documental af48e69; entrega local realizada tras DoD y verificación completos:14unidades2b2dfa2..629ae96, máximo368líneas textuales por unidad. Identidades observadas, no inventadas. Frontera de rollback: revertir las unidades de esta extensión conservando las doce migraciones históricas; una migración aplicada en otro entorno requeriría un procedimiento forward explícito, no reescritura de historia. No se aplicó ninguna a datos retenidos.

Plan local validado antes de escribir Git:14unidades/113rutas, máximo368líneas textuales cambiadas por unidad, sin comprimir código ni omitir tests. Orden por dependencia: contrato; schema/inventarios; multi-tema; dominio; proveedor; lectores; solicitudes/snapshots/apply; admisión/worker; runtime/HTTP; pruebas de límites/publicación; cliente/controles; UI integrada; regresiones de recuperación/auditoría; preview/evidencia. Algunas garantías transversales se entregan como unidades de verificación sobre los componentes ya incorporados, evitando commits que superen400líneas. Compilaciones y pruebas corresponden al candidato final aceptado; el particionado Git no altera sus bytes. Histórico de pruebas RED anterior a producción permanece en los registros, sin inferir orden TDD sólo del orden de commits.

## Handoff

QA final completada sobre54153: tipos3 aplicados, revisión/regen/recuperación, privacidad/estudiante/entrega real, corrección manual publicada10.00, progreso1/1 y Agenda1. SQL independiente: dos temas, una elegibilidad, un intento entregado, una calificación; notificaciones publicación/calificación/entrega una vez. Advisory de etiqueta tras entrega preexistente confirmado por blobs sin cambios; refresh devuelve estado correcto, no se modificó esa fuente ajena.

Se detuvo runtime16878 limpio (owned cleanup0); última compilación Next con hook2líneas exit0 y nueva fixture63684 en http://127.0.0.1:50800 con migrate deploy/diff PASS. Verificador comprobó montaje real, generación/aplicar/save/reopen y capturas1440/390/320; coordinador inspeccionó desktop/mobile exportados. [Matriz final](2026-10-25-activity_independent_verify.md) DoT1–9 completa; source/test diff7d475→working vacío. EgoSpace3 finalizado conservando p1docente en editor, emulación retirada; runtime50800 activo sólo con datos/proveedor sintéticos para revisión humana.

Entrega local observada: rama limpia y `git diff --exit-code 7d47529b560902f82411a53e2f7fc4ebe90ef94e HEAD -- apps src prisma scripts tests` exit0 después de las14unidades. Canonical main sigue727614d9ed05818fab1295271bfd9654820dc74f; archivos untracked ajenos, incluidos los nuevos durante la sesión, preservados sin leer/editar/committear. UTF8 estricto y251enlaces locales PASS; whitespace PASS. Resumen Engram de cierre intentado sin session_id inventada: hook rechazó porque no pudo confirmar identidad host. No persistencia de memoria afirmada; repo contiene toda la continuidad.

## Identidades de entrega observadas

| Commit local | Unidad |
|---|---|
| 2b2dfa2 | Contrato y aceptación |
| d2db346 | Schema e inventarios |
| e8b84d7 | Multi-tema compatible |
| ccac5b6 | Dominio de propuestas |
| bae910e | Adaptador Gemini estructurado |
| 7cd1051 | Lectores privados PDF/Word |
| 31f5f35 | Solicitudes/snapshots/aplicación |
| cc5036d | Cola/worker/admisión compartida |
| 0f26cd7 | Composición runtime y HTTP |
| 870d4b7 | Pruebas de límites/publicación |
| c611b07 | Cliente y controles |
| a41318c | UI manual/IA integrada |
| fc4e6b3 | Recuperación incierta y revisión |
| 629ae96 | Preview/evidencia reproducible |

Este cierre documental se guarda después de observar esos commits; no cambia bytes de producto ni inventa su propio hash futuro. Próximo paso humano: revisar el resultado local y decidir una eventual integración/publicación por separado. Runtime50800 y Space3p1docente quedan para esa revisión con proveedor/datos sintéticos; no se realizó llamada real a Gemini. Ninguna acción de implementación/verificación requerida queda pendiente.
