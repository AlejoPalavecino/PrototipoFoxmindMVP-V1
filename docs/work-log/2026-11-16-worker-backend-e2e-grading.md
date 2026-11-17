# TASK-026 — E2E de cuestionarios, corrección y publicación

- Responsable: /root/backend_identity_capabilities. Fecha: 2026-11-16.
- Worktree: C:/Users/alejo/.codex/worktrees/069c/ProtipoFoxMind, rama codex/backend-capabilities; base dd6f4bc92b959cce0e2c68343291614270c4a17e.
- Autorización vigente del usuario: adaptar también estos E2E en la rama backend, sin cambiar la UI. Root conserva el tablero y la integración.
- Escritura exclusiva: tests/p8-current-ui-helpers.mjs, tests/p8-ui-contract-helpers.test.mjs, tests/p7-questionnaire-integration.test.mjs, tests/p8-grading-integration.test.mjs, tests/p8-publication-integration.test.mjs y este registro. Root autorizó logs e2e026-*.log bajo .test-artifacts/backend-capabilities.
- No se editan UI/API/SQL productiva/paquetes/.env ni se usan datos retenidos, proveedores reales, builds compartidos o commits. Cada E2E usa servicios y cuentas sintéticos propios; otros agentes trabajan en superficies disjuntas.

## Cambios y contratos conservados

1. Helper compartido: inicio nuevo QUESTIONNAIRE/EVALUATION usa «Empezar actividad», confirmado por academic-Activities.tsx y revisión de Dewey/root. Continúan «Preparar entrega» y «Continuar borrador». Freeze comunicado antes de E2E; no hubo otros cambios posteriores en el helper.
2. Cuestionario vigente: una pregunta visible, navegación Siguiente/Anterior y estado global «Borrador guardado». Root aprobó flush explícito «Revisar entrega → Cancelar entrega»: espera POST answer 200 exacto y comprueba cero POST submit. La navegación retiene texto pendiente; no se atribuye el guardado a navegar. Se mantiene autosave >=1900 ms y texto/choices exactos.
3. Reintento vigente: QuestionnaireAttempt.tsx:124 hace flush + onClose al tener éxito. Root aprobó comprobar POST200, cierre real, DB/DTO/restart y reabrir el mismo intento sin POST start. La edición requiere transferencia explícita y captura del editor/epoch real creciente; permanece el posterior 403 del editor revocado y hash sin cambios. No se recuperan capacidades del almacenamiento.
4. Advertencia de transferencia comprobada en la confirmación actual, con texto exacto sobre revocación, último borrador y cambios no transferidos. Recibo y respuestas históricas usan regiones/dialog actuales; se mantienen DTO/DB y ausencia de controles editables.
5. Corrección docente: «Ver entregas → Revisar entrega · Intento 1»; feedback en tab «Devolución» y nota en «Rúbrica y nota». Se conservan cálculo exacto, hashes, privacidad, publicación explícita, rollback/restart y revocación.
6. Recuperación local de lecturas: sólo GET reales iniciados durante la apertura, 429 RATE_LIMITED y Retry-After entero 1..60. Se espera el plazo real y se reabre una vez. No se reintentan escrituras ni cambian cuotas/timeouts. Grading observó activities429/46s y P7 auth/session429/47s.

## Ejecución

Comando canónico, sustituyendo ARCHIVO por cada ruta propia (sin build):

```powershell
node --import ./scripts/register-api-test-build.mjs --experimental-transform-types --experimental-test-module-mocks --disable-warning=ExperimentalWarning --test --test-concurrency=1 ARCHIVO
```

La salida stdout/stderr se conserva en .test-artifacts/backend-capabilities/e2e026-*.log; cada corrida devuelve tail y exit. Las corridas con servicios se ejecutan secuencialmente desde que root pidió no superponer recursos.

| Evidencia | Resultado observado | Motivo / alcance |
| --- | --- | --- |
| Helper RED inicial | 15 PASS / 2 FAIL / 0 SKIP | Mock actualizado frente al default viejo Responder actividad. |
| e2e026-helper-green.log | exit0, 17 PASS / 0 FAIL / 0 SKIP | Gesto único, ningún start previo, admisión/429, lecturas y uploads intactos. |
| Primera secuencia de tres E2E | Inconclusa | Salida/session_id truncados durante compacción. No se infiere PASS de procesos/screenshots. Terminó sin sus procesos activos. |
| e2e026-questionnaire-red.log | exit1, 0 PASS / 2 FAIL / 6 SKIP | Inicio200; timeout en estado por pregunta retirado. Cleanup0. |
| e2e026-questionnaire-02.log | exit1, 2 PASS / 2 FAIL / 4 SKIP | Pasaron autosave/DTO y ack demorado; retryPOST200 cierra solver y no deja status. Cleanup0. |
| e2e026-questionnaire-03.log | exit1, 3 PASS / 2 FAIL / 3 SKIP | Retry/cierre/reapertura pasa; navegación segunda pestaña bloqueada por auth/session429. Cleanup0. |
| e2e026-questionnaire-04.log | exit0, 8 PASS / 0 FAIL / 0 SKIP, 148357ms | Todos los casos; recepción bajo lock/cuerpo tardío y privacidad incluidos. Espera real47s. Cleanup procesos0/recursos0. Archivo congelado. |
| e2e026-grading-01.log | exit1, 0 PASS / 2 FAIL / 3 SKIP | Selector Corregir intento retirado del overview. Cleanup0. |
| e2e026-grading-02.log | exit1, 2 PASS / 2 FAIL / 1 SKIP | Q/E pasan; activities429 impide abrir ASSIGNMENT. Cleanup0. |
| e2e026-grading-03.log | exit0, 5 PASS / 0 FAIL / 0 SKIP, 125444ms | Tres tipos y restartDB/storage/API; hashes, DTO privado, sin nota efectiva/publicación/notificaciones/rectificaciones. Espera real46s. Cleanup procesos0/recursos0. Archivo congelado. |
| e2e026-publication-01.log | exit1, 0 PASS / 2 FAIL / 3 SKIP | Selector de botón Notificaciones retirado. Cleanup0. |

La repetición inicial P7 empezó con la primera secuencia ya en publication, antes del pedido root de no superponer recursos; se informó de inmediato. No duplicó el mismo archivo activo. La captura temporal se copió al log RED persistido. No se presentan los skips históricos como aceptación: sólo las corridas finales sin skips cuentan.

## Estado recuperable y límites

- Helper, cuestionarios, corrección privada y publicación congelados con corridas finales verdes. No hay runners propios activos. Pendiente: verificación independiente e integración de root; este agente no cierra TASK-026.
- Artefactos de browser dentro de TEMP se imprimen en los logs (screenshots y respuestas sanitizadas); no prueban por sí solos permisos/persistencia.
- No se corrió QA global ni se recompiló API/Next; root integra y verifica el candidato completo. La conclusión sólo cubre estos fixtures descartables y pruebas sintéticas, sin proveedor real ni datos retenidos.
- Reversión: retirar únicamente el diff de los cinco archivos de tests de esta unidad y este registro, preservando el resto del árbol concurrente. No ejecutar reset/checkout global ni borrar servicios ajenos.

## Publicación en adaptación

- P7 corrida04 terminó exit0, 8/8 PASS, 0 FAIL / 0 SKIP, 148357ms y cleanup0; root avisado del freeze.
- Publication01: exit1, 0 PASS / 2 FAIL / 3 SKIP, cleanup browser/observer/procesos/recursos0. Q llegó a guardar/cancelar/publicar200 y validó resultadoAPI; falla selector botón Notificaciones retirado.
- Fuente Notifications.tsx:181 confirma link /notificaciones al centro separado; NotificationCenter usa región Tu bandeja de notificaciones con artículos. Adaptado gesto visible al enlace y scope de fila actual, sin cambiar assert de apertura real de notificación/resultGET ni nota/hash/privacidad/restart/revocación.
- Publication02 activa session45914, log e2e026-publication-02.log. Cuestionarios, grading y helper permanecen congelados.
- Publication02: exit1, 1 PASS / 2 FAIL / 2 SKIP, cleanup0; Q completo incluyendo notificación real pasa. Observer confirma teacher/EVALUATION/grading GETactivities429 RATE_LIMITED/45s. Adaptada recuperación local de lecturas para apertura de actividades/preview y centro; jamás envuelve start/upload/submit/save/publish/openNotificationPOST.
- Publication03 activa session7488/e2e026-publication-03.log. Root confirmó mapping del centro y pidió fila del mismoID + POSTopen real/readstate/distintoactor; se reforzará tras esta corrida, sin editarla en vuelo ni abrir notificación por API.
- Publication03: exit1, 2 PASS / 2 FAIL / 1 SKIP, cleanup0. Q/E completos pasan; ASSIGNMENT publica200 y abre notificación, luego GETclassroom429 RetryAfter52 impide resultGET. Fuente ClassroomView:146 ofrece Actualizar aula (sólo detail.reload GET); root informado.
- Publication04 activa session13192/e2e026-publication-04.log. Captura cuenta sintética devuelta por account; evento GRADE_PUBLISHED del mismoattempt/recipient/read_atnull; otro actorPOSTopen403 sin cambiar hash; fila exacta data-notice-id; gesto real abrePOST200 y targetattempt correcto; resultGET real y read_atfecha. En destino429 espera real y Actualizar aula una vez; contador verifica ningún POSTopen adicional durante recuperación. Se mantienen todos los demás asserts.
- Publication04: exit1, 2 PASS / 2 FAIL / 1 SKIP, cleanup0. Q/E pasan con mismoID/readstate/distintoactor. ASSIGNMENT abrePOST200 pero lectura intermedia other-api429/52s impide resultGET; watcher limitado sólo a root/result no la observaba. No se declara aprobado.
- Publication05 activa session26167/e2e026-publication-05.log. Watcher observa429GET del mismoaula, registra path y admite sólo root/result/activity/history/attempthistory del mismo scope. Tras RetryAfter real usa Actualizar aula, Actualizar resultado o navegación histórica readonly Volver al aula→abriractividad→Mis intentos→Consultar intento1. Unknownpath falla cerrado; contador garantiza ceroPOSTopen adicional. Root informado antes de correr.

## Entrega congelada para revisión de root

- Publication05 GREEN: e2e026-publication-05.log, exit0, 5/5 PASS, 0 FAIL / 0 SKIP, 187610ms. Tres tipos completos y restartDB/storage/API pasan. Observer/browser/procesos/recursos propios: cleanup0.
- La lectura limitada concreta fue GET del history del mismo intento; Retry-After53s real. Recuperación histórica por UI, mismo intento/resultado, sin repetir POSTopen. Los checks del ID exacto, destinatario, read_at null→fecha y actor diferente403 sin mutación pasan en los tres tipos.
- Finales de la unidad: helper17 + cuestionarios8 + grading5 + publication5 = 35 PASS / 0 FAIL / 0 SKIP. Los fallos históricos y sus skips dependientes se conservan arriba y en logs; no cuentan como aceptación.
- Comando canónico anterior ejecutado individualmente con estos archivos: tests/p8-ui-contract-helpers.test.mjs, tests/p7-questionnaire-integration.test.mjs, tests/p8-grading-integration.test.mjs y tests/p8-publication-integration.test.mjs.
- Evidencia final: e2e026-helper-green.log, e2e026-questionnaire-04.log, e2e026-grading-03.log, e2e026-publication-05.log bajo .test-artifacts/backend-capabilities. No se agregaron archivos de tests nuevos para inventario; se adaptaron los cinco archivos autorizados.
- git diff --check focalizado: PASS. Helper congelado desde17/17; no hubo modificaciones posteriores. No se ejecutaron builds/QA global ni cambios UI/API/SQL productiva/cuotas/timeouts/paquetes/proveedores/commits.
- Root informado del freeze y de las rutas de evidencia. Próximo paso: revisión independiente y reconciliación de TASK-026 por el orquestador.

## Reapertura por revisión independiente — read-retry

Root reabrió TASK-026 tras el hallazgo de Dewey: un429 de background más un fallo selector no relacionado podía autorizar otra visita. El freeze previo queda reemplazado por esta corrección; no se presenta como cierre vigente.

- RED reproducible propio: e2e026-retry-guard-red.log,17PASS/2FAIL/0SKIP; los dos negativos fuente real no rechazaban unknown429 y auth429 sin errorUI.
- Corrección local sin nuevo helper compartido: cada fase reinicia WeakSet de requests y resultados. Rutas exactas de auth/session, activities de esa aula, detalle/session de esa actividad y notifications/page según fase; respuestas tardías de fase anterior quedan fuera.
- Navegación sólo recupera TimeoutError cuando el aviso RATE_LIMITED correspondiente es visible en su scope y el control esperado sigue ausente. Auth exige aviso con Volver a intentar; Activities exige su región y texto de cambios no confirmados; centro exige su aviso y Actualizar notificaciones. Desconocidos fallan cerrados.
- Destino publicado429 también exige avisoUI correspondiente de aula/resultado/historial/actividad antes de esperar y recuperar. Mantiene paths allowlist del mismo scope y contador ceroPOSTopen adicional.
- GREEN e2e026-retry-guard-green-02.log:22/22PASS,0FAIL/0SKIP. Cinco casos nuevos: unknown429, auth429sinUI, respuesta tardía de fase anterior, control esperado ya visible, positivo faseactual+UIerror permite una espera/relectura. Handlers limpios en todos.
- Dewey recibió contrato/rutas fuente para reejecutar su reproducer in-memory independiente. Tres E2E afectados en corrida secuencial con loadercanónico, session47152; log e2e026-read-guard-e2es-01.log. Sin build/API/UI/quotas/timeouts ni retiro de aserciones/casos.
- Revisión independiente Dewey (sin escrituras/DB/red/browser): P7 fuente SHA1ea24c91fd64c7808dab1745d19843dba6266bb2eb2ed57bc943efd3a0478373 estable. Unknown429+TimeoutError, auth429sinUI y response tardía de fase previa:1visita/0delays/rechazo; positivo path+fase+UI+expectedausente:2visitas/1delay1000/éxito. Todos listeners0. Evidencia atribuida a Dewey, comunicada a root.
- Runner47152: P7 completo PASS (top+7subcasos,143983ms), cleanup0. Grading Q/E PASS, ASSIGNMENT en curso; publicación siguiente. Fuentes no editadas durante la corrida. Huellas compartidas con Dewey para revisión de grading/publicación.
- Grading completo PASS en runner47152 (top+4subcasos,122330ms), cleanup0. Publication en curso; todavía no es evidencia final del guard de destino.
- Dewey revisó publicación y confirmó navegación exacta+fase+UI; señaló captura raw de destino/reread sin request-de-fase. Fix pendiente al finalizar la corrida para no editar fuente en vuelo: reutilizar watchActionResponse existente para POSTopen/GETinicial/GETreread y liberar watcher anterior antes del reemplazo.
- Unit nuevo para ese cerco: GET anterior al watcher con429 tardío se ignora; GETactual200 se captura; listeners0. e2e026-retry-guard-green-03.log:23/23PASS,0FAIL/0SKIP. La implementación de helper compartido sigue intacta. Cifra unit final propuesta es23 (seis nuevos frente17); root será avisado en freeze.
- Runner e2e026-read-guard-e2es-01.log terminó exit0,18/18PASS,0FAIL/0SKIP,463133ms. Los tres archivos completos, cleanup browser/observer/procesos/recursos0. P7 y grading congelados en sus huellas revisadas.
- Después de terminar esa corrida, aplicado fix mínimo destino publicación: POSTopen/GETinicial/GETreread usan watchActionResponse existente; dispose del POST al200 y del GET429 antes de esperar/reemplazar. No cambió implementación del helper compartido. SHA publication9b69e06e94bc3b7aa9a61053b919ff09cb4fbf7df88918feeed49b8f69fbe842, enviado a Dewey/root.
- Repetición final publication sola: session36729, e2e026-publication-phase-final.log. Unit vigente23/23 en e2e026-retry-guard-green-03.log (seis casos nuevos frente17). Pendiente resultado final de esa repetición y confirmación independiente del borde request-de-fase.
- Dewey confirmó guard destino por revisión fuente y suite propia23/23PASS0SKIP, cinco SHA estables antes/después. Publication9b69e06e94bc3b7aa9a61053b919ff09cb4fbf7df88918feeed49b8f69fbe842; unit06d8c38831ed9ef4e038879ea3968aff92ded4e8a85925d67841d3109a6102fe. watchActionResponse/dispose cierran request previo; permanecen status/UI/code/header/allowlist/counterPOST. No otro hallazgo de fuente026 pendiente según Dewey. Evidencia atribuida a reviewer y comunicada a root.
- Publication final en curso: Q/E PASS; ASSIGNMENT observa GETactivities/{id}/history429, UIerror de historial y espera53s real. Nueva captura está vinculada a requests de su fase. Pendiente último resultado y cleanup.

## Freeze vigente después de la revisión independiente

- e2e026-publication-phase-final.log: exit0,5/5PASS,0FAIL/0SKIP,177344ms. Tres tipos, readstate/actor403/ID/nota/hash y restart/revocación pasan. Recuperación GETactivityhistory53s real, errorUI y request de fase, sin repetir POSTopen. Cleanup browser/observer/procesos/recursos0.
- Evidencia actual: e2e026-retry-guard-red.log (RED17/2), e2e026-retry-guard-green-03.log (GREEN23/23), e2e026-read-guard-e2es-01.log (18/18, incluye P7 y grading actuales) y e2e026-publication-phase-final.log (5/5 tras último fix de captura). Los5 de publication reemplazan la versión anterior; no se suman dos veces.
- Total de aceptación propia vigente:23 unit +8 cuestionarios +5 grading +5 publicación =41PASS,0FAIL/0SKIP. Seis tests nuevos en el archivo unit existente; ningún archivo test nuevo para inventario. Root administra ledger/tablero.
- Todos los runners propios finalizaron; archivos congelados para root. Se conserva reversión por diff exclusivo de estos cinco archivos y este registro, sin tocar el árbol ajeno. No build/QA global, UI/API, cuotas/timeouts, proveedores, datos retenidos ni commits. Pendiente integración/verificación final del orquestador.

### SHA256 de los cinco archivos congelados
64177151d2113204959c10235066b5cf9908dead7e37ab2f8b89789ff67a377c  C:\Users\alejo\.codex\worktrees\069c\ProtipoFoxMind\tests\p8-current-ui-helpers.mjs
06d8c38831ed9ef4e038879ea3968aff92ded4e8a85925d67841d3109a6102fe  C:\Users\alejo\.codex\worktrees\069c\ProtipoFoxMind\tests\p8-ui-contract-helpers.test.mjs
1ea24c91fd64c7808dab1745d19843dba6266bb2eb2ed57bc943efd3a0478373  C:\Users\alejo\.codex\worktrees\069c\ProtipoFoxMind\tests\p7-questionnaire-integration.test.mjs
7e2dedf5343cd635f974319d99e0cb58c56ca46ac930321e865a4ef17990d1cb  C:\Users\alejo\.codex\worktrees\069c\ProtipoFoxMind\tests\p8-grading-integration.test.mjs
9b69e06e94bc3b7aa9a61053b919ff09cb4fbf7df88918feeed49b8f69fbe842  C:\Users\alejo\.codex\worktrees\069c\ProtipoFoxMind\tests\p8-publication-integration.test.mjs
