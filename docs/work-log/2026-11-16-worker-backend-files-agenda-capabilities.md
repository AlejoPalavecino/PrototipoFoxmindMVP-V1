# TASK-014 / TASK-015 — Files y Agenda por capacidades

- Agente: /root/backend_files_agenda_capabilities; rol worker. Fecha: 2026-11-16.
- Rama/worktree: codex/backend-capabilities, C:/Users/alejo/.codex/worktrees/069c/ProtipoFoxMind.
- Alcance: módulos files/agenda, composición propia, guías y mapas. Sin commits, proveedores, secretos, DB o esquema.
- Autorización: encargo del coordinador; diseño backend-capabilities aprobado. Trabajo ajeno preservado.
- Estado: implementación en curso. Custodia conserva integraciones durables y atomicidad; APIs de capacidades sólo aplicación/dominio.
- Evidencia y límites: pendientes de ejecutar. Integración externa e inventarios a cargo del coordinador.

## Resultado implementado

TASK-014: `uploads/application` conserva admisión/estado/uso y agrega `authorizeReceive`; HTTP recibe sólo `{expectedBytes}`. `downloads/application` posee contrato de lectura. `chat-attachments/domain` posee política pura de chat. `custody/application` conserva permisos/promoción/lectores y `custody/infrastructure` conserva storage/scanner/store/limpieza, parsers y adaptadores durables, incluidos los de chat. Agrupamiento confirmado por coordinador: comparten custodia, leases, locks y parsers; no se crearon fachadas de infraestructura ni servicios artificiales. `public.ts` de capacidad sólo exporta aplicación/dominio con nombres.

TASK-015: `events` conserva eventos, UoW y HTTP; `academic-projection` concentra upcoming/open. `AgendaService` conserva firmas públicas y delega con la misma UoW. Listado combinado sigue en una sola operación; reglas neutrales permanecen en core. Sin cambios en SQL, locks, esquema o autenticaciones de la UoW.

Mapas completos exactos original → destino (ignorados): `.test-artifacts/backend-capabilities/files-move.json` y `agenda-move.json`. El coordinador remapea consumidores externos, inventarios y loaders. Bootstrap propio y tres integraciones autorizadas fueron remapeados. Ningún cambio a application.ts, frontend, mapas globales o tablero.

## Evidencia observada

- RED: `node --experimental-transform-types --test apps/api/src/modules/files/application/receive-authorization.test.mjs`: 0 PASS/2 FAIL por `service.authorizeReceive is not a function` (antes de implementar/mover).
- Intento anterior con `--experimental-strip-types`: runner rechazó parameter property existente; no se presenta como RED funcional. Se utilizó transform-types.
- GREEN: `node --experimental-transform-types --test apps/api/src/modules/files/uploads/application/file-use-cases.test.mjs apps/api/src/modules/files/uploads/application/receive-authorization.test.mjs apps/api/src/modules/files/uploads/application/receive-http.test.mjs apps/api/src/modules/files/chat-attachments/domain/policy.test.mjs apps/api/src/modules/agenda/academic-projection/application/academic-agenda-service.test.mjs`: 13/13 PASS. Prueba autorización antes de suscribirse a bytes, errores de identidad preservados, longitud rechazada sin mutar, misma UoW/tx/actor, reautenticaciones, límites y destino revocado.
- `npm.cmd run lint:boundaries`: PASS, 0 excepciones congeladas.
- `node node_modules/typescript/bin/tsc --noEmit -p apps/api/tsconfig.json`: PASS.
- `node --experimental-transform-types --test apps/api/src/modules/files/custody/infrastructure/tests/foxy-begin-transaction.test.mjs apps/api/src/modules/files/custody/infrastructure/tests/foxy-s3-owned-send.test.mjs apps/api/src/modules/files/custody/infrastructure/tests/foxy-storage-startup-close.test.mjs apps/api/src/modules/files/custody/infrastructure/tests/foxy-private-image-inspector.test.mjs`: 26 PASS/1 FAIL. El fallo cargaba `.build` por una ruta new URL que el helper no remapeó; ruta corregida, rerun requiere build fresco integrado y module mocks.
- `node --experimental-transform-types --test apps/api/src/modules/files/custody/infrastructure/tests/foxy-document-reader.test.mjs apps/api/src/modules/files/custody/infrastructure/tests/foxy-durable-document-reader.test.mjs apps/api/src/modules/files/custody/infrastructure/tests/foxy-private-asset-files.test.mjs apps/api/src/modules/files/custody/infrastructure/tests/foxy-publication-files.test.mjs`: 41 PASS/1 FAIL. Prueba de runtime final cargaba ruta new URL de `.build` anterior al movimiento; dos rutas corregidas mientras la tanda ya estaba cargada. Pendiente repetir sobre build integrado fresco.
- Comparación de tests existentes del mapa con `git show HEAD:<original>`: 12 tests trasladados, 364 usos de assert conservados. No se redujeron aserciones. La comparación de conteos es complementaria, no demuestra equivalencia semántica por sí sola.

## Integridad y límites

HTTP ya no conoce FileCustodyPort/store ni size_bytes. La autorización inicial sigue bajo store.transaction/loadAuthorized(upload); receive conserva las autorizaciones previas a cada mutación y después de I/O, cuota, scanner, digest, slot, lease y liberación originales. SQL de Files y UoW de Agenda conservado; se cambian imports. No se ejecutó build global por concurrencia ni DB/red/proveedores/datos retenidos. Los tests llamados SQL/UoW usan puertos sintéticos. No se declara aceptación SQL real ni cierre de TASK.

Nuevos tests para inventario: uploads/application/receive-authorization.test.mjs, uploads/application/receive-http.test.mjs, agenda/academic-projection/application/academic-agenda-service.test.mjs. Todos bajo apps/api/src/modules.

Pendiente: coordinador remapea externos y suites, compila y ejecuta las dos pruebas del host además de Agenda/Files PostgreSQL en recursos propios y revisión independiente proporcional. No hubo commits ni publicación.

Reversión: invertir únicamente los mapas de este corte y restaurar los diffs propios de Files/Agenda, bootstrap asignado y las dos guías; retirar APIs/tests nuevos y este registro tras revisar el diff. No usar reset/checkout global por escritores concurrentes. Los cambios no requieren migración de datos.
