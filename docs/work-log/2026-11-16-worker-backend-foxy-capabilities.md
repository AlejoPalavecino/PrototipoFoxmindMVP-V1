# TASK-019 / TASK-020 — Foxy por capacidades

- Agente: /root/backend_identity_capabilities, chuli_worker. Fecha: 2026-11-16.
- Rama/worktree: codex/backend-capabilities, C:/Users/alejo/.codex/worktrees/069c/ProtipoFoxMind; base dd6f4bc92b959cce0e2c68343291614270c4a17e.
- Encargo: distribuir Foxy por capacidades; avisar checkpoint TASK-019 antes de politicas editoriales/citas TASK-020. Identity y Grading/Participation congelados.
- Superficie: modulo Foxy, cinco bootstrap autorizados, guia ai/foxy y mapping propio. Preservar CAS/locks/WeakMaps/nonces/replay/fingerprints/perfiles/presupuesto y transacciones; no producto/schema/DB/red/proveedores/publicacion.
- Estado: baseline por fuente y mapa de colaboraciones en curso.

## Checkpoint TASK-019 — movimiento y colaboracion

- 206 movimientos exactos en `.test-artifacts/backend-capabilities/foxy-move.json`: 103 archivos fuente y 103 archivos de pruebas. Siete capacidades: conversations, turns, resources, citations, private-assets, visuals y publications; presentation HTTP agregada conservada en module root y consume APIs de capacidad.
- APIs public.ts nombradas por capacidad; root public conserva sus exportaciones previas mediante esas APIs. Editorial privado se expone con nombre propio. Contratos root application ports.ts, authority-ports.ts y read-ports.ts permanecen transversales, consumidos solo como tipos; se declara la transicion, no se presenta como retirada legacy completa.
- Proyeccion pura de proveedor y groundingSources a module/domain; politica pura de management y version PDF a publications/domain. Sin cambio de algoritmo. La reserva de assets tiene contrato application propio en private-assets; el grounding visual define puerto consumidor propio. Ningun public.ts expone adaptadores.
- Los adapters de visuals reciben grounding; private-assets authority recibe checkVisualClaim; publicaciones reciben el puerto de lectura de assets. Las consultas y comprobaciones de filas siguen dentro del mismo tx, sin sacar CAS, WeakMap, lease/nonce o locks al host. Bootstrap solo conecta esas colaboraciones.

### Evidencia checkpoint

- Baseline source de provider-input, publication-management, citation-mapping y visual-worker: 27/27 PASS. El primer intento bloqueo por import legacy de activity-draft en foxy-service-factories; se remapeo dentro de ownership al destino generation ya existente, sin cambio de comportamiento. Mismo grupo despues del movimiento: 27/27 PASS.
- Comparacion AST contra HEAD para los 103 fuentes: 278 expresiones tx.query identicas; para los 103 tests: misma secuencia de 2.823 llamadas assert. Son comprobaciones de preservacion, no ejecucion SQL.
- `node --experimental-transform-types --experimental-test-module-mocks --test <los 10 paths movidos de infrastructure/providers/tests>`: 57/57 PASS, providers y fetch sinteticos. El primer intento sin el flag module mocks y con imports a otros dominios legacy fallo; se corrigieron solo imports/wiring de 39 pruebas .mjs y el comando. No se alteraron assertions ni se llamo proveedor real.
- `node node_modules/eslint/bin/eslint.js apps/api/src/modules/foxy apps/api/src/bootstrap/foxy-runtime.ts apps/api/src/bootstrap/foxy-service-factories.ts apps/api/src/bootstrap/foxy-visual-runtime.ts apps/api/src/bootstrap/foxy-visual-host-providers.ts apps/api/src/bootstrap/foxy-host.ts`: PASS.
- Guard real filtrado /foxy/: PASS, sin accesos privados entre capacidades ni ciclos propios. TypeScript createProgram API con noEmit: 0 diagnosticos propios, 97 externos/concurrentes; no representa compilacion global PASS.
- Se solicito gate019 al coordinador antes de modificar resource policy o SQL de citation-service. Sin DB/servicios/build global/red/secretos/commits.

### Remap externo adicional por simbolo

El mapping JSON sigue siendo movimiento archivo→archivo. Estas funciones tienen wrapper host en bootstrap/foxy-service-factories.ts que conserva su forma anterior e inyecta los puertos. Sus consumidores externos y fixtures de integracion deben importar el wrapper, o inyectar explicitamente el puerto en el adapter:

- createFoxyPrivateAssetAuthority: checkVisualClaim.
- createFoxyVisualClaimAuthority, createFoxyVisualQueue, createFoxyVisualCompletion: grounding.
- createFoxyPublicationAuthority, createFoxyPublicationCompletion, createFoxyPublicationConfirmationRepository, createFoxyPublicationFileAllocator, createFoxyPublicationFileReader, createFoxyPublicationManagementRepository: assets.
- inspectFoxyPublicationManagement y retryFoxyPublication: lectura de assets como ultimo parametro en adapter, omitido por wrapper.

Los cinco bootstrap autorizados y las pruebas propias estan remapeados. Root debe actualizar foxy-file-integration y composiciones de publicacion fuera de mi superficie, imports globales, inventarios y runners. Las 103 pruebas movidas conservan su pertenencia/ruta aplicable; no activar suites con DB o navegador por descubrimiento.

## TASK-020 — reglas editoriales y citas

Gate recibido de /root: TASK-019 verificado con build global capabilities PASS y guard0; autorizacion vigente para continuar TASK-020. El baseline compilado `.build/backend-capabilities/capabilities` se uso solo para comparacion de comportamiento, sin regenerarlo.

### Antes y despues

- Resource repository validaba contenido, decidia READY, replay/revision y armaba la identidad editorial en linea. Esas reglas ahora pertenecen a resources/application/editorial-policy.ts: assertResourceIdentifiers, resourceEditCommand, assertResourceTurnReady, resourceTurnContent, resourceEditIdentity y resourceEditReplay. El repositorio las aplica sobre los hechos que obtuvo bajo los locks existentes; SQL y autorizacion de filas permanecen en el adapter.
- Resource service valida el comando dentro de la UOW autenticada antes de invocar edit. El puerto FoxyResourceRepositoryPort ahora expresa EditFoxyResource en vez de unknown; el adapter acepta entrada desconocida para conservar sus consumidores directos y vuelve a usar el mismo parser/policy. No se duplican reglas con implementaciones diferentes.
- Private asset editorial: serializacion del hash y decision replay/estado/revision/maximo extraidas a private-assets/application/editorial-policy.ts. El servicio conserva su parser core vigente. Se conserva reautorizacion→locks de cuenta/conversacion/asset→hash→recibo previo→replay→comprobacion de estado/revision→UPDATE CAS→recibo nuevo. Replay valido precede el chequeo del estado/revision actual, como antes.
- Citation-service ya no ejecuta SQL. FoxyCitationPort.attachment(tx,{attachmentId,ownerId,conversationId}) devuelve un booleano de disponibilidad; citationAttachment lo implementa con la query textual exacta anterior. El host service-factories lo inyecta. Se conservan titulo sanitizado, TEXT_ONLY para adjunto autorizado, UNAVAILABLE para vinculo revocado/no disponible, href null y ausencia de lectura de storage.
- No cambios de limites, codigos de error, JSON persistido, hash/version markers, revisiones, nonces, WeakMaps, perfiles o protocolo de proveedor. No se saco ninguna comprobacion de fila ni lock fuera de su tx.

### RED/GREEN y caracterizacion

1. Nuevos editorial-policy.test.mjs de resources/application y citation-service-policy.test.mjs: RED 2 PASS/3 FAIL. Fallos esperados: application issue SQL contra fake tx que lo prohibe y falta de rechazo del markdown de 50001 puntos de codigo antes del puerto persistente.
2. Tras implementar: mismos cinco casos GREEN 5/5. Texto aceptado conserva spelling, espacios y limite de 50000 puntos de codigo Unicode. Denegacion de turno corta antes de resolver adjuntos; adjunto desvinculado/no disponible no se habilita.
3. 12 caracterizaciones nuevas de adapters reales sobre tx SQL sintetico: recursos (7) y assets privados (5). PASS tanto contra baseline compilado019 usando register-build como contra fuente020 con --experimental-transform-types. Cubren permisos, READY, replay tras cambios de revision/estado, request reutilizado, revision vencida/agotada, UPDATE sin fila, hash y parametros de recibos, orden de locks y no mutacion de contenido producido. No son pruebas PostgreSQL.
4. Dos casos del adapter citationAttachment: PASS. Parametros en orden original, vinculo owner/conversacion y todos los predicados de cleanup/ready/folder conservados; la huella SHA256 de la expresion SQL anterior es c2c5fa159d929df56e256476559db6739e9561f2b7df98a7700fd9948ab3d183. Comprobacion negativa de SQL en citation application incluida.
5. Los cinco archivos nuevos juntos con `node --experimental-transform-types --test <paths abajo>`: 19/19 PASS.
6. Ejecucion final de esos 19 + 27 caracterizaciones019 + 57 provider tests sinteticos: `node --experimental-transform-types --experimental-test-module-mocks --test <19 archivos seleccionados>`: 103/103 PASS. No proveedores reales ni red.
7. TypeScript createProgram tsconfig API con noEmit/getPreEmitDiagnostics: 0 errores propios y 0 globales en ese candidato. ESLint de toda ownership y guard filtrado Foxy PASS. Root conserva la compilacion conjunta fresca y pruebas de integracion.

### Contratos compartidos y cierre pendiente

Los contratos Actor/UOW son transversales a todas las capacidades; leases/autoridades y read-ports root siguen siendo contratos tipados sin implementacion. Se mantuvieron para evitar duplicar autoridades o introducir ciclos; no se crea capability access incidental. Los nuevos consumidores especificos tienen puerto local (grounding visual, visual claim, reserva privada y citas). La eventual distribucion final de los contratos root por duenio se concilia en TASK-023; no se afirma su retiro completo.

Altas finales de tests para inventario/runtime:

- apps/api/src/modules/foxy/resources/application/editorial-policy.test.mjs (2).
- apps/api/src/modules/foxy/citations/application/citation-service-policy.test.mjs (3).
- apps/api/src/modules/foxy/resources/infrastructure/tests/foxy-resource-editorial-policy.test.mjs (7).
- apps/api/src/modules/foxy/private-assets/infrastructure/tests/foxy-private-editorial-policy.test.mjs (5).
- apps/api/src/modules/foxy/citations/infrastructure/tests/foxy-citation-attachment-port.test.mjs (2).

No cambio al mapping206 de TASK-019. Nuevo wiring020 limitado al host citationAttachment; factory publica createFoxyCitationService conserva sus argumentos previos. Root debe registrar estas cinco altas, compilar el candidato conjunto y ejecutar DB aislada/roles/concurrencia cuando corresponda. No se marcaron tareas DONE ni se editaron inventarios/tablero/tests aprobados.

Reversion020: restaurar exclusivamente validacion/decisiones inline de los dos adapters y delegacion previa del resource service, devolver la query a citation-service y retirar su port/inyeccion, reponer el tipo anterior del puerto resource y retirar las dos policies y cinco tests nuevos, mediante diff revisado. Conservar todos los movimientos y conexiones de TASK-019 y el trabajo concurrente. No hay datos que revertir.

Comparacion final AST020 contra HEAD: 278 expresiones SQL antes/despues, mismo multiset SHA256 6e02c943e1ece901a9c778f62e4f61bd317c3f83b29f396dca8ce5b30b5ba5b3. Los 103 tests originales conservan las 2.823 llamadas assert en el mismo orden. Sin hallazgos de preservacion. La unica relocalizacion SQL020 es application citation-service→infrastructure citation-repository.
