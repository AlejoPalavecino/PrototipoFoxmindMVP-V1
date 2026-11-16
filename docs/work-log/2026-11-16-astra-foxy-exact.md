# Foxy AI — fidelidad a la maqueta

- Agente: `/root/foxy_exact`, implementador delegado (Astra xhigh solicitado por coordinador).
- Fecha: 2026-11-16. Rama: `codex/foxmind-product-parity`.
- Worktree: `C:/Users/alejo/.codex/worktrees/foxmind-product-parity/ProtipoFoxMind`.
- Commit inicial: `ef6828b96084b0fcaf9a883e4afb95e0871cf1d6`. Árbol con cambios concurrentes previos; no se restauran ni revierten.
- Autorización: implementación de fidelidad UI/UX de Foxy docente y chat compartido contra maqueta externa, conservando servicios y datos. Sin commits, publicación, secretos ni runtime propio.
- Fuente: archivos Foxy de `C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/design/foxmind-ui-lab`.
- Superficies: feature Foxy; FoxyChatLayout, FoxyToolPicker, ChatAttachmentControls y CSS compartido; ampliación expresa para `screens/foxy-*`, custodia/contrato Foxy, transporte binario, hooks de adjuntos y aliases nuevos de IconKey. El coordinador reasignó los ajustes finales de `parity-ai-fidelity.css` a `/root/study_exact`; no se solaparon escritores.
- Coordinación: Study conserva componentes/estilos específicos y recibe props opcionales compatibles de chat. Navegador exclusivo del coordinador.

## Desvíos y trabajo

Desvíos iniciales: cabecera sin contador; paneles sin subtítulos/footer de retorno; historial sin renombrado directo; filtros y contenido extra en creaciones; contexto como listado de radios en lugar de modos/vista previa; biblioteca sin búsqueda/origen/plan; herramientas con sexta tarjeta y configuración en compositor; revisión con lectura y secciones simultáneas.

Estado: VERIFYING. Implementación congelada para QA del coordinador. Se conservaron callbacks, guardas y persistencia reales. Los permisos adicionales de custodia fueron aprobados antes de implementar. No se simulan materiales, progreso del proveedor ni conteos.

## Evidencia y límites

- Inspección de Git, instrucciones, documentación canónica y fuentes productivas/maqueta.
- No se ejecutaron servidores, builds ni proveedor real por este agente. Los servicios y capturas pertenecen al coordinador en snapshot separado.
- Fidelidad visual completa pendiente de reconciliar QA del coordinador; una captura no prueba custodia o persistencia.
- Primer paso pendiente: reconciliación de QA final y comprobación HTTP real sobre entorno sintético del coordinador.

## Extensión autorizada: adjuntos privados y conservación de contexto

El coordinador transmitió aprobación explícita del usuario: abrir archivos privados y conservarlos al cambiar contexto sin duplicar bytes ni borrar el origen. Alcance ampliado a custodia compartida, transporte binario, creación Foxy y vínculos/migración mínimos. Sin proveedores reales, datos retenidos, reinicios compartidos ni publicación.

Diseño revisado previamente por /root/review_study_persistence: vínculos normalizados por conversación al objeto canónico; reclamación terminal de limpieza independiente de la revocación de vínculos; creación y vínculos en una transacción idempotente. GET mantiene autorización de lectura vigente (aula archivada legible, escritura/traslado prohibidos), comprueba autorización antes y después de bytes y valida digest. Backfill sólo propietarios y conversaciones coherentes. Cuotas físicas una vez y límites por conversación. API congelada; pruebas de custodia y transporte verdes.

## Resultado implementado

- Historial, herramientas, creaciones, contexto y biblioteca separados; cinco herramientas de referencia. Las actividades usan el selector/editor de aula existente. Renombrado conserva conflicto y revisión. Los diálogos mantienen foco, retorno y estados accesibles.
- Biblioteca con búsqueda, origen, plan, apertura privada autenticada y confirmación de retiro. Cambio de contexto conserva adjuntos con la misma identidad canónica, sin storage.put adicional. No incluye materiales del aula entre los transportados.
- Configuración de intención/temas antes de solicitar una creación; texto enviado exactamente como lo escribió el usuario, con purpose separado. Esquema por defecto e imagen como opción. Espera derivada de QUEUED/RUNNING, detener/reintentar reales, resultados dentro del chat.
- Lectura → Editar → Guardar; cancelar borrador ofrece conservar/descartar. Conflicto prioriza edición. Descarga TXT usa versión guardada. Llevar a Biblioteca conserva autorización, preparación, revisión y confirmación. Handoff explícito conserva entrada a compartir.
- `FoxyDialog` compartido y `historyOpenKey` compatibles con Study. Aliases `chat-square` y `pencil` agregados sin cambiar los iconos anteriores.
- Migración `202611160001_foxy_attachment_links`: custodios por conversación y `cleanup_claimed_at`. Limpieza revalida después del bloqueo para evitar una instantánea anterior a un carry confirmado. Un objeto reclamado no se reactiva; fallos físicos conservan reintento. La copia de carpeta Study sigue independiente.
- Guías actualizadas: `docs/engineering/ai/foxy.md`, `docs/api/files.md`, `docs/engineering/files/README.md`. No se modificó el tablero TTP del coordinador.

## Verificación ejecutada y fallos conservados

- RED inicial UI de contexto/biblioteca por componentes inexistentes; GREEN posterior. RED adjuntos por contrato `carryAttachments` rechazado y método read ausente; luego GREEN.
- `node --test --test-concurrency=1 apps/api/src/modules/files/infrastructure/tests/chat-attachment-transfer.test.mjs apps/api/src/modules/files/infrastructure/tests/chat-attachment-custody.test.mjs`: **9/9 PASS**. PostgreSQL17.10 propio y descartable, almacenamiento sintético. Propiedad cruzada, reautorización/digest, Aula↔General, archive read/carry, revocación, idempotencia concurrente, custodia destino tras eliminar origen, traslado a tercero, cleanup-claim/remove/carry, fallo y reintento físico, seis archivos/20MB/cuota física sin duplicación, backfill anterior y copia Study. Log `.test-artifacts/foxy-study-exact/foxy-attachment-transfer.log`.
- Primer intento de esa suite paralelo falló por timeout AI_INPUT_LIMIT del parser PDF; ejecución serial posterior verde. El fixture inicial de revocación intentó cambiar teacher_id y recibió la restricción DB de propietario inmutable; se corrigió al caso real de conversación eliminada, sin cambiar guardas de producción.
- `node --test tests/foxy-exact-attachment-transport.test.mjs`: **3/3 PASS**. Bytes binarios idénticos a través de API/proxy HTTP local efímero, native GET sin CSRF, nombre escapado, PDF inline/download, Office download, query/método inválido y errores privados seguros.
- `node --test tests/foxy-exact-attachments-ui.test.mjs`: **4/4 PASS**. Conserva origen/borrador/retryID, bloquea cambio durante upload, no abandona origen si falla lectura del destino ya creado y descarta listados anteriores al upload confirmado.
- `node --test apps/web/src/features/foxy/ui/foxy-workspace.test.mjs apps/web/src/screens/foxy-resource-workspace.test.mjs tests/foxy-exact-tools.test.mjs`: **36/36 PASS**, log `foxy-final-ui-tests.log`. Incluye composer montado, UI sin proveedor, seguridad de enlaces/HTML, borrador/conflicto y brief puro. Aceptación antigua adaptada con autorización expresa del coordinador, sin retirar guardas.
- Suite anterior de colecciones/contexto/start/visual/resource/actions/demand-panels: **83/83 PASS**, log `foxy-adapted-tests.log`. Regresión final después de carry: `node --test apps/web/src/features/foxy/ui/foxy-workspace-start.test.mjs apps/web/src/features/foxy/ui/foxy-context-view.test.mjs apps/web/src/features/foxy/ui/foxy-collections.test.mjs apps/web/src/screens/foxy-visual-navigation.test.mjs tests/foxy-exact-context.test.mjs tests/foxy-exact-resource.test.mjs tests/foxy-exact-attachments-ui.test.mjs tests/foxy-exact-attachment-transport.test.mjs`: **37/37 PASS, exit0**, log `foxy-final-flows-tests.log`. El primer intento reveló un acceso de subtítulo sin recurso y dos fixtures obsoletos (listado adjuntos sin ready y prefijo de rúbrica); guard de recurso corregido y fixtures ajustados al contrato autorizado. Freeze definitivo comunicado tras el resultado verde.
- `npx tsc --project apps/api/tsconfig.json --noEmit`: **exit0**. Web noEmit detectó dos errores propios de useRef sin valor inicial; corregidos a unión con undefined e inicialización explícita. El cierre de `/root/review_study_persistence` reportó **API y web noEmit exit0**, web con `--incremental false`; evidencia atribuida al revisor.
- ESLint focal21archivos TS/TSX (shared, feature, screens, hooks y custodia/transporte): **exit0**. `git diff --check` focal: **exit0**, sólo avisos LF/CRLF del árbol concurrente.
- Revisor `/root/review_study_persistence` cerró **VERIFIED**, reportó independientemente **26/26 PASS** (UIcarry4, transport3, controller17, policy2), contrato carry1/1PASS, boundaries PASS0excepciones y lectura estática sin hallazgos abiertos de custodia. Su observación del log SQL se atribuye al autor, no a ejecución propia.
- Fallos amplios fuera de propiedad conservados en `foxy-chat-regression.log`: Home docente/estudiante esperan button aria-label `Abrir aula Aula autorizada`; Plan espera select `Tema del plan`. Se informaron al coordinador y no se editaron. Dos fixtures Study omitían collections y fueron reasignados a study_exact. Los tres fallos Foxy antiguos de ese log fueron corregidos en la suite36/36 posterior.

No commits, push, despliegue, secretos, datos retenidos ni cambios de proveedor. La exactitud visual completa y el comportamiento con proveedor real no se deducen de estas pruebas.

## Corrección de QA: temas en Imágenes y esquemas

El coordinador reabrió la unidad por P2 independiente: la maqueta permite elegir temas antes de generar también en visuales; el formulario productivo omitía ese control y enviaba ALL_CLASSROOM. Autorizado corregir UI/adaptador sin alterar backend ni CSS compartido (propiedad de Study). RED `node --test tests/foxy-exact-visual-topics.test.mjs`:3/3 fallan por checkbox ausente, selección explícita ignorada y resolver inexistente. Implementación: selección local, fuentes reales del catálogo para estrechar un ALL_CLASSROOM sin descartarlas, snapshot explícito e inmutable al iniciar/reintentar. El chat nuevo consulta los temas antes de crear la conversación; los errores conservan el formulario. Estado VERIFYING: candidato congelado para QA del coordinador.

- GREEN final: `node --test tests/foxy-exact-visual-topics.test.mjs apps/web/src/screens/foxy-visual-navigation.test.mjs apps/web/src/features/foxy/model/foxy-visual-controller.test.mjs apps/web/src/features/foxy/model/foxy-chat-controller.test.mjs apps/web/src/features/foxy/model/foxy-workspace-actions.test.mjs apps/web/src/features/foxy/ui/foxy-workspace-start.test.mjs`: **76/76 PASS, exit0**. Log `.test-artifacts/foxy-study-exact/foxy-visual-topics-tests.log`. Cinco casos nuevos cubren selección local, request/reintento estable, resolución real de fuentes sin mutar el chat, fallo recuperable y primer visual de aula nueva.
- ESLint focal de los nueve archivos TS/TSX modificados: **exit0**. Web `tsc --noEmit --incremental false`: **exit0**.
- Revisión independiente `/root/review_study_persistence`: **28/28 focales y 87/87 regresiones PASS**, API y web noEmit **exit0** (sesión78242), sin hallazgos abiertos en contexto, permisos, epoch o selección del reintento. Evidencia atribuida al revisor.
- Corrección autorizada de iconos: `chat-square`, `pencil` y `foxy-folder` usan los paths exactos del `core.js` externo con trazo1.8 y terminaciones redondeadas. Se preservaron los nombres/dibujos originales usados por otras pantallas. La toolbar de Creaciones usa el nuevo alias; los consumidores Foxy/Study de los otros dos reciben el dibujo exacto. No se editó CSS compartido.
- El coordinador registró la prueba nueva en el inventario y conserva la verificación visual/build del snapshot. Esta unidad no ejecutó navegador ni reinició servicios.

## Corrección de QA: lector visual

El coordinador detectó controles anteriores en el lector visual. La fuente `foxy-flows.js:25–33` confirma lector común con título, cuerpo, preview, TXT y paso Biblioteca. Se autorizó corregir ese flujo conservando preview real. La edición durable queda pendiente de decisión explícita: el payload visual actual es inmutable y su revisión gobierna publicaciones; no se alterará ese trigger ni se simulará guardado local. Propuesta elevada: metadata editorial independiente con revisión, receipts idempotentes y publicación versionada; el coordinador consulta al usuario. Se avanza sólo lectura/TXT/Biblioteca independientes, sin nuevas entidades, migraciones ni cambios de proveedor.

### Checkpoint de pausa solicitado por el usuario

El usuario aprobó después «Sí, completar edición y versiones (recomendado)»: overlay editorial separado, original intacto, copias publicadas inmutables y nuevas versiones publicables. Antes de implementar pidió detenerse en un punto seguro. Se detuvo la unidad; esa aprobación conserva el alcance pero no se continúa durante la pausa.

- Cambios desde el último freeze: sólo este registro y `tests/foxy-exact-visual-reader.test.mjs`, con dos casos nuevos RED por componente todavía inexistente. La ejecución terminó: **0/2 PASS, 2/2 FAIL esperados (ENOENT)**. No pruebas ni procesos activos de este agente.
- Un patch de producción fue rechazado en validación antes de escribir; se comprobó que `foxy-visual-reader.tsx` no existe. No se implementaron cambios nuevos de UI/runtime/backend, esquema o migración. La compilación de producción corresponde al freeze anterior; no se ejecutó otra compilación y la suite nueva queda deliberadamente roja para retomar TDD.
- Próximo paso: terminar diseño de contrato y pruebas RED de edición/versiones, luego implementación. Propuesta: `editorial_title`, `editorial_body`, `editorial_revision` en asset; `source_editorial_revision` y `snapshot_editorial_body` en publicación; receipt EDIT con revisión editorial separada de revisión binaria; PATCH con owner/rol/contexto, revisión esperada, idempotencia y bloqueo transaccional. No alterar bytes, digest, JSON de esquema ni revisión binaria original. Nuevas publicaciones congelan texto y revisión editorial; worker/confirm de publicaciones anteriores conservan su snapshot aunque cambie el overlay.
- Revisión temprana atribuida a `/root/review_study_persistence`: preservar guardas SQL originales, agregar inmutabilidad de nuevos snapshots, incluir editorialRevision en dedup/hash y distinguir acción EDIT de DISCARD en receipts. Creaciones debe proyectar COALESCE(editorial_title,title).
- Dependencia pendiente: `MaterialPublisherPort` y `materials/application/library-publication.ts` reconstruyen el input sin cuerpo. Para conservar texto visible en Biblioteca hace falta ampliar ese puerto/publisher/insert de forma coordinada, usando snapshot y límite compatible con materialText (20000). No se modificó esa superficie ajena. El coordinador deberá asignar ownership antes de implementarla.
- CSS del lector fue solicitado a Study antes de la pausa; su estado debe reconciliarlo el coordinador. Este agente no editó CSS.
