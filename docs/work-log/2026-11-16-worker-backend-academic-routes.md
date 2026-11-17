# TASK-025 — Despacho HTTP por capacidad

Agente `/root/backend_capability_guards`. 2026-11-16. Worktree `C:/Users/alejo/.codex/worktrees/069c/ProtipoFoxMind`, rama `codex/backend-capabilities`. Ejecución incremental P07 autorizada por el coordinador. Ownership: academic-http.ts, nuevos academic-routes/http-operations de ocho capacidades, contrato técnico neutral, test propio y este registro. Sin cambios de host/composition, contratos públicos, IA HTTP, datos, DB, red o proveedores. Sin commits/build global.

Estado: implementación y verificación propia finalizadas; fuentes congeladas para reconciliación/build del coordinador. No se marca DONE.

## Responsabilidades y contratos

- Bootstrap se redujo de 425 a 199 líneas. Conserva parseo inicial de URL, allowlist de métodos/query, admisión, headers privados, lectura JSON (512 KiB/10 s), cancelación, captura de recibo, límite de 16 solicitudes activas, serialización bigint y mapeo de errores/Retry-After/Connection.
- Los dos módulos HTTP IA existentes siguen delegándose primero, sin modificar sus archivos ni estados HTTP.
- Nuevos `application/http-operations.ts` y `presentation/academic-routes.ts` en estas ocho superficies: `classrooms/catalog`, `curriculum/plan`, `materials/library`, `communication/wall`, `activities/authoring`, `participation/attempts`, `grading/review`, `home/notifications`.
- Cada handler recibe sólo su interfaz estructural de operaciones; ninguna depende de ClassroomService, Omit, bootstrap, repositorios o infraestructura. El resultado de las operaciones es unknown porque el transporte sólo lo serializa, y los cuerpos crudos conservan la validación de presentación/dominio existente.
- Interfaces: Catalog 27 métodos, Plan 1, Library 2, Wall 4, Authoring 4, Attempts 16, Review 12, Notifications 5. Total: 71 operaciones realmente consumidas.
- Catalog es la agregación HTTP transitoria de las rutas de Aulas (incluye borradores, configuración, pertenencia e invitaciones); no cambia el dueño de los casos de uso. Review agrupa el transporte de revisión/publicación/correcciones/progreso y Attempts el de sesiones/intentos/historial/entregas, sin modificar esos servicios. Su separación adicional y el retiro de la fachada global quedan en el cierre P07 del coordinador.
- `src/core/contracts/academic-http.ts` contiene exclusivamente DTO técnico neutral: request unknown, método, segmentos de path, body unknown, búsqueda, headers y callback exact. `handled/value` diferencia una ruta atendida con resultado undefined de una ruta no coincidente.
- Los 54 bloques originales se distribuyen en 14 segmentos ordenados. El campo técnico order conserva su posición previa; bootstrap reúne y ordena los segmentos. Se preserva tanto notifications antes del detalle genérico como los bloques que reclaman una ruta para rechazar un método incorrecto.

## Verificación observada

- Caracterización inicial con `node --test tests/backend-academic-routes.test.mjs`: **78 tests, 77 PASS/1 FAIL**. El único RED fue la dependencia arquitectónica de bootstrap respecto de ClassroomService y sus llamadas directas de despacho. Los 74 casos de rutas y los controles de comportamiento existentes caracterizados ya pasaban.
- Durante GREEN se afinó el patrón de esa prueba nueva: `service.` también coincidía accidentalmente con el nombre de archivo service.ts. La prueba final identifica llamadas service.método(...), sin confundir paths. No se editaron pruebas protegidas/existentes.
- GREEN final del mismo comando: **83/83 PASS**, 0 skips. Se usa loadTsModule para transpilar la fuente real y requests/responses EventEmitter sintéticos; no se abren sockets ni se consulta red/DB/proveedores.
- Cobertura propia: 74 casos positivos de todas las operaciones y variantes; dispatch único y resultado undefined; cuerpos forjados, discriminadores, métodos, query y headers editoriales inválidos; admisión previa a servicio, límite de JSON, JSON malformado; saturación 16 y liberación; aborto del cuerpo; recibo ligado al request original y capturado antes del caso de uso; error de identidad con Retry-After/requestId/cierre; delegación IA con 202.
- Comparación AST determinista del `academic-http.ts` previo en HEAD contra los ocho handlers: **54 ramas originales, 54 extraídas, 14 segmentos, mismatches []**. Se normalizaron exclusivamente service→operations, req.headers→headers y url/search del DTO. Condiciones y cuerpos conservan los mismos tokens y orden. No se guardó una copia histórica del código como prueba permanente.
- TypeScript noEmit con opciones de apps/api/tsconfig.json y raíces academic-http/academic-routes/http-operations, filtrado a esas superficies: **0 diagnósticos**. La primera pasada encontró dos tipos boolean inferidos como string (members/includeHistory y readNotification/read); se corrigieron sólo los contratos nuevos.
- `node scripts/check-boundaries.mjs`: PASS, **0 frozen exceptions**.
- `git diff --check -- apps/api/src/bootstrap/academic-http.ts tests/backend-academic-routes.test.mjs src/core/contracts/academic-http.ts`: PASS tras retirar una línea vacía al final del bootstrap. El aviso Git de normalización LF/CRLF no es una modificación funcional.

## Integración, límites y reversión

- `createClassroomsHandler(service, options)` conserva su forma. `ClassroomsHttpOperations` es ahora la intersección de las ocho interfaces explícitas; la fachada transitoria existente puede satisfacerla. No hace falta cambiar host/composition para ejecutar este corte. El root integra el wiring directo de capacidades cuando retire esa fachada.
- Inventariar un test nuevo `tests/backend-academic-routes.test.mjs`, 16 archivos de módulos y el contrato core neutral; el coordinador es dueño de scripts/inventarios, docs y tablero. Se notificó freeze antes del build global.
- No se ejecutó build global, sockets HTTP reales ni proxies de frontend en esta unidad concurrente. El deadline real de diez segundos no se esperó; su implementación permanece en el shell existente. Las pruebas sintéticas acreditan despacho/admisión/errores, no DB, autorización real o comportamiento del proveedor. Build estricto fresco y suites oficiales quedan en el coordinador.
- No se modificaron APIs HTTP IA, public.ts, servicios de dominio, frontend, host/composition ni pruebas anteriores. Sólo se remapearon imports legacy del bootstrap autorizado usando los mapas existentes.
- Reversión: restaurar únicamente el diff propio de academic-http.ts y retirar los 16 archivos nuevos de handlers/contratos, core/contracts/academic-http.ts, el test nuevo y este registro. Coordinar antes de revertir si root ya conectó consumidores o inventarios. No restaurar globalmente el worktree compartido.
