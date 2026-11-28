# Plazo de subida según el tamaño (F8)

Coordinador /root, sesión en la nube del 2026-11-28, sin identificador expuesto. Rama de trabajo `ccr-9af7730d-b67ekz`, igual a `main` `cfaaaa5`. Contenedor efímero con Node 24.22.3 en el scratchpad (el contenedor traía Node 22 y el proyecto exige 24), Docker propio y envoltorios sin privilegios de `initdb` y `pg_ctl`, como en los cortes 7 a 9 de [transporte compartido](2026-11-26-root-audit-shared-transport.md). No se leyó `.env` ni `.test-artifacts/`.

Encargo: F8 de la [auditoría](2026-11-26-root-full-stack-audit.md), TASK-008 del [tablero del frontend](../../odd/tasks/audit-frontend-design.md), diferida hasta integrar F1 (ya en `main`). El usuario eligió «inactividad más tope»: conservar el corte por 5 s sin datos y reemplazar el plazo total fijo por uno según el tamaño declarado, a un mínimo de 100 kB/s. Autorizó commit y push a `main` con `fast`, `owned-db` y `wrappers` en verde. No concede despliegue.

## Qué cambió

- Regla común: `uploadDeadlineMs(bytes) = max(10 s, bytes / 100 kB/s)`, en [document-formats](../../src/core/domain/documents/document-formats.ts) junto a `FILE_MAX_BYTES`. 50 MB son 500 s; 20 MB, 200 s.
- API de archivos ([uploads/presentation/http.ts](../../apps/api/src/modules/files/uploads/presentation/http.ts)): la subida binaria usa ese plazo en vez de 10 s fijos. El corte por 5 s de inactividad y los 10 s de los metadatos JSON no cambian.
- Proxy de archivos ([file-proxy](../../apps/web/src/application/server/file-proxy.ts)): el tiempo de recepción pasa de 10 s fijos al plazo de la regla más 5 s, para que lo decida la API. Su ventana general de 60 s se extiende en ese mismo plazo.
- El hallazgo menciona también los 20 MB, que son las subidas de Estudio. Tenían el mismo problema con otros valores, así que se aplicó la misma regla:
  - carpetas de estudio ([uploads/http.ts](../../apps/api/src/modules/study/folders/presentation/uploads/http.ts)): de 120 s fijos al plazo según el tamaño;
  - adjuntos de chat ([chat-attachment-transport](../../apps/api/src/bootstrap/chat-attachment-transport.ts)): de 15 s al plazo según el largo declarado (el tope de 20 MB si no hay uno válido);
  - [proxy de estudio](../../apps/web/src/application/server/study-proxy.ts): de 65 s totales a 65 s más el plazo de la regla y 5 s.
- Guías: [archivos](../engineering/files/README.md) y [estudio](../engineering/study/README.md).

## Comprobaciones

Las pruebas usan los temporizadores simulados de `node:test` para no esperar minutos reales. Mandan trozos de 500 kB cada 4 s, así que nunca quedan 5 s sin datos.

| Prueba | RED | GREEN |
| --- | --- | --- |
| `receive-http`: una subida de 2 MB que sigue enviando durante 16 s se completa | 503 a los 10 s | 8/8 |
| `receive-http`: una de 2,4 MB que a los 24 s no terminó se corta con 503 | pasaba también antes: red de seguridad | |
| `file-proxy-upload-deadline` (nueva): la regla común y una subida de 2 MB en 16 s a través del proxy | 503 del proxy a los 10 s | 2/2 |
| `study-upload-deadline` (nueva): un adjunto de 8,5 MB en 68 s y una carpeta de 16 MB en 128 s, a través del proxy de estudio y los transportes reales de la API | 503 en los dos | 2/2 |
| las pruebas que usan esos proxies y transportes | — | en verde |

La primera versión de `study-upload-deadline` daba un falso RED en el adjunto: la prueba no le quitaba el prefijo `/api/v1` al pedido y terminaba en un 404 sin JSON, que el proxy convertía en 503. Se corrigió la prueba y se repitió el RED con el código anterior.

`npx tsc --noEmit -p apps/web/tsconfig.json`, `npm run api:build`, `npm run lint:boundaries`, `run-complete-suite --check` (768 entradas) y `npm run docs:check` pasaron.

Suites integradas, sobre `main` `cfaaaa5`: `fast` 3285/3285, `owned-db` 972/972 y `wrappers` 19/19.

## Límites

- El ritmo mínimo de 100 kB/s no se midió con conexiones reales; con menos que eso, un archivo grande sigue sin poder subirse.
- Una subida ocupa su cupo de transferencia hasta 500 s para 50 MB. El corte por inactividad sigue frenando a quien manda los bytes de a poco.
- No se probó en un navegador ni con `local:up`.

## Primer paso pendiente

Seguir con el orden acordado: preparar las opciones de D3 y D4 de la auditoría para que el usuario decida.
