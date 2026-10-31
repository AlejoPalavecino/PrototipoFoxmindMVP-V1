# Foxy AI — implementación aislada

- Agent / role: /root, coordinador
- Session or task ID: /root; identificador de sesión no disponible
- Date: 2026-10-31
- Branch / worktree: codex/foxy-ai, C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Starting commit: 64f613f
- Phase and detailed task/spec links: [Foxy AI](../../odd/tasks/foxy-ai-proposal.md)
- Status: in_progress

## Request and scope
Implementar el recorrido completo de Foxy AI para docentes, en tareas verificables y worktree separado. Contexto de aula con plan, materiales y actividades ya realizadas; selección de tema y uso de pasado/presente/futuro. Preparación y publicación en Biblioteca tras revisión y confirmación docente. El usuario confirmó esquemas e imágenes generadas con IA en la primera entrega. No se autorizó despliegue, push ni datos reales.

## Work performed
Se creó el worktree desde 64f613f sin alterar los cambios preexistentes del checkout principal. Diseño técnico y exploración encargados en solo lectura; decisiones del usuario registradas en la propuesta.

## Verification
Pendiente diseño, pruebas e implementación. No se afirma ninguna capacidad nueva terminada.

## Commits and outcomes
Sin commits de implementación.

## Handoff
Finalizar contrato y dividir slices; diseñar la generación visual y validar cada tarea antes de declarar la feature completa.

## Informe atribuido de exploración
- Agente: /root/foxy_explorer, solo lectura; persistido por /root. Sesión no disponible. Consultó Engram, guías de IA, Plan/Biblioteca, tareas, código y Git; sin inspección de Docker ni cambios.
- Plan dispone de PENDING, NEXT y TAUGHT; NEXT es el próximo tema marcado, no prueba por sí solo que sea el actual. Biblioteca exige archivo aprobado y flujo de validación existente. IA de actividades ya selecciona fuentes explícitas y controla límites. Búsqueda AST tuvo salida demasiado extensa para identificar nodos adicionales.
- Primer paso: contrato técnico de contexto, publicación y recursos visuales; preservar aislamiento del checkout principal.


## Informe atribuido RED de contratos
- Agente: /root/foxy_red, solo pruebas; persistido por /root. Sesión no disponible; rama codex/foxy-ai, base 64f613f.
- Creó `src/core/domain/foxy-ai-contract.test.mjs`. `node --test --test-reporter=dot src/core/domain/foxy-ai-contract.test.mjs` terminó 1 con seis fallos por parsers todavía inexistentes. Cubre aislamiento de contexto, validación de objetos, UUID, revisión, Unicode, límites y duplicados.
- Siguiente paso: implementar parsers sin modificar pruebas y ejecutar GREEN. Sin pruebas de DB/UI; esta unidad es contrato puro.

## Informe atribuido de arquitectura
- Agente: /root/foxy_architect, solo lectura; persistido por /root. Sesión no disponible; rama codex/foxy-ai, base 64f613f. Inspeccionó guías, schema, dominio, puertos, presupuesto, UI y pruebas; Engram sin diseño vigente de Foxy. No ejecutó tests, Docker o proveedor. Una búsqueda amplia fue truncada y un glob falló; se completó con lecturas focalizadas.
- Contrato F0: conversación con contexto fijo general/aula, selección de fuentes, validaciones estrictas. Slices siguientes: respuesta/recurso/publicación, persistencia, catálogo y snapshots autorizados, trabajos y presupuesto compartido, edición, publicación por flujo de archivos y Biblioteca, transporte, UI y verificación; generación de imágenes confirmada por usuario y pendiente de diseño específico.
- Plan NEXT es opcional y no prueba tema en curso; versiones históricas son distintas de temas enseñados. Actividades no poseen estado realizada; seleccionar publicadas con fecha, sin claves ni datos de estudiantes. Biblioteca exige archivo material listo y escaneado, y publicación idempotente con control de revisión. Mantener presupuesto compartido y no sobrescribir ediciones.
- Siguiente paso: GREEN de F0, contratos restantes y diseño de generación visual, luego integración y pruebas aisladas. No se declara feature completa.

## Informe atribuido RED de recursos
- Agente: /root/foxy_red, solo pruebas; persistido por /root. Sesión no disponible; branch codex/foxy-ai base 64f613f.
- Creó `src/core/domain/foxy-ai-resource.test.mjs`. `node --test --test-reporter=dot src/core/domain/foxy-ai-resource.test.mjs` terminó 1 con cuatro fallos por parsers aún inexistentes. Cubre respuesta y referencias, edición, destino unidad/tema y confirmación, objetos exactos y revisiones.
- No se fijaron máximos de markdown, advertencias ni datos faltantes; falta contrato. Primer paso: implementación GREEN sin editar pruebas. Sin DB/UI.

## Diseño visual y revisión atribuidos
- /root/foxy_architect, solo lectura: diseños de esquemas, imágenes privadas, presupuesto multimodal y publicación. Context7 sin cuota; consultó documentación oficial. Sin proveedor real ni credenciales. F2 requiere aislamiento, idempotencia y CAS; git fetch origin terminó exit 0.
- /root/foxy_review, solo lectura: revisó F0/F1, 10 tests, fronteras y diff; encontró duplicados UUID con distintas mayúsculas y títulos con controles incompatibles con Biblioteca. /root/foxy_red añadió pruebas RED y /root/foxy_green corrigió ambos; 13 pruebas PASS, build y fronteras exit 0. Revisión de correcciones pendiente.
- /root/foxy_red preparó prueba F2 con helper de base efímera; RED exit 1 por módulo inexistente, antes de Docker. No se ha demostrado GREEN ni ejecución SQL.

- Revisión posterior /root/foxy_review: sin hallazgos sobre las dos correcciones; 13 pruebas y fronteras PASS, scan de archivos sin filtraciones. Una búsqueda inicial con glob falló y se repitió. No inspeccionó DB ni proveedor.

- Primer corte F0/F1 registrado en commit 246cc62, con 13 pruebas y revisión independiente; sin feature funcional todavía. /root/foxy_red creó prueba visual V0: node --test --test-reporter=dot src/core/domain/foxy-ai-visual.test.mjs terminó 1 con cinco fallos por parsers ausentes; sin UI/DB. Sigue GREEN visual y F2 de persistencia.

- /root/foxy_visual_review revisó V0 en solo lectura: 18 pruebas y fronteras PASS, escaneo sin filtraciones; sin hallazgos dentro del contrato. No verificó renderer, proveedor ni publicación. V0 quedó en 6c792c6; diff --cached --check señaló una línea vacía final en el registro que el autor corrigió después, pendiente de commit adicional. /root/foxy_green completó F2 con PostgreSQL temporal: prueba y cuatro subcasos PASS; primera ejecución falló por TS strip-only y fue corregida; sin prueba de concurrencia, drift ni HTTP. F2 está en revisión.

- Revisión F2 /root/foxy_review: concurrencia y repositorio pasan en DB temporal; detectó drift de cuatro claves foráneas Prisma vs SQL por onUpdate implícito; se asignó corrección al autor. F3 requiere contabilizar también adjuntos de consignas de actividades entre límites documentales y no omitirlos silenciosamente.

- F2 revisado por /root/foxy_review: prueba principal y cuatro subpruebas, concurrencia real de solicitud y CAS, fronteras y scan PASS. Una discrepancia de ON UPDATE fue corregida por el autor y migrate diff en otra DB temporal devolvió 0 sin diferencias. Contenedores propios eliminados; sin DB retenida. Corte guardado en 726ea51; no acredita HTTP ni feature completa. Algunas lecturas de rutas inexistentes se repitieron con rutas reales.

- /root/foxy_architect definió F3 en solo lectura: catálogo limitado a metadatos, autorización docente y aula revalidada, versiones de plan y actividades publicadas; adjuntos de consignas cuentan para los límites y no se omiten sin advertencia. Primer RED de currículo encargado. No realizó pruebas ni DB. docs:check: 137 archivos, 1663 enlaces, 0 incidencias.

- F3 currículo: /root/foxy_red confirmó RED (6 fallos por servicio inexistente); /root/foxy_green obtuvo 6 PASS fake, build y fronteras PASS. /root/foxy_review verificó con ClassroomService y PostgreSQL temporal aislado: estados, permisos de docente/alumno, aula archivada, general y 101 unidades; PASS, scan limpio. Sin autenticación HTTP, materiales, actividades ni proveedor. Commit 9b356e4. Parser de consulta de fuentes en RED: 3 fallos por export inexistente; implementación en curso.

- Parser de paginación: /root/foxy_red RED por export ausente, /root/foxy_visual_green GREEN 3 pruebas/build/fronteras, /root/foxy_visual_review sin hallazgos; commit 9797358.
- Catálogo de fuentes: /root/foxy_red RED inicial y reparación atribuida de fixture P4; /root/foxy_green implementó. Revisión /root/foxy_review detectó cursor incompatible, límite 51, tema legacy y actividad vacía; /root/foxy_red reprodujo con tests RED, /root/foxy_green corrigió. Revisión posterior: 17 pruebas y PostgreSQL temporal PASS, privacidad, custodia, orden y fronteras PASS. Sin DB retenida; contenedores propios eliminados. Commit 198c993. Lectura de contenido y revalidación de despacho aún pendientes.

- F4A: /root/foxy_red RED, /root/foxy_green GREEN; arquitecto corrigió supuesto de archivo compartido incompatible con custodia. /root/foxy_review detectó currículo omitido y cardinalidad; RED y corrección, recheck 11 PASS sin hallazgos; commit 7523576. El grounding contiene IDs internos y el futuro adaptador debe excluirlos y no enviar referenceMap.
- F4B: RED y GREEN con PostgreSQL temporal; revisión /root/foxy_review detectó actividad vacía aceptada, se agregó RED y corrigió, recheck 19 PASS. Commit 5956102. F4C loader revisado por /root/foxy_visual_review con 18 pruebas y sondeos de aborto PASS; commit a135022. Primeros commits parciales de barrel tuvieron avisos de whitespace por CRLF y se normalizaron en f2cf351. Reader de archivos sigue en curso; no hay proveedor ni interfaz.

- Reader F4C: /root/foxy_red RED por módulo ausente; primer intento de test por barrel falló por decoradores de Nest y se cambió a módulo directo. /root/foxy_green GREEN 5 tests; /root/foxy_review verificó FileService/createFileAccess con DB temporal y storage/principal/scanner sintéticos: lectura, ajeno y revocación tras parsing PASS. Una primera sonda pg falló por int8 string y se repitió con bigint equivalente a Prisma. Sin sesión HTTP, storage remoto ni escáner real. Commit ba7db3d. Pendiente integrar loader con reader y despacho.
- F5A turnos: git fetch origin exit 0; /root/foxy_red RED por repositorio ausente antes de iniciar DB; implementación en curso. Presupuesto/worker, generación de imagen, publicación e interfaz pendientes.

- F5A: /root/foxy_red RED; /root/foxy_visual_green GREEN, 8 tests; /root/foxy_review concurrencia y Prisma sin diferencias PASS. Commit c6e7bb6.
- F5B: RED ocho escenarios, corrección de cuatro claimers y harness activity por TypeScript strip-only; /root/foxy_review verificó nueve pruebas, QUEUED no bloquea y fairness PASS; commit 3664e79. Cola Foxy aún deshabilitada.
- F5C: /root/foxy_red RED y corrección de fixtures que violaban invariantes SQL; /root/foxy_visual_green implementó. /root/foxy_review detectó QUEUED antiguo y lease vencida bloqueados; tests RED adicionales y corrección, recheck 23 PASS y Prisma sin diferencias. Commit 341e0f4. Antes de activar worker se requieren scheduler de recovery y settlement del presupuesto; claimers existentes esperan recovery explícito. No se probó revocación de sesión ni proveedor real.

- Presupuesto B1: /root/foxy_red RED, /root/foxy_green GREEN y regresiones reales, /root/foxy_review comparó compilado con implementación anterior y verificó 18 pruebas, shim, SQL y locks sin hallazgos. Primeras pruebas con strip-only fallaron en imports existentes y pasaron con --experimental-transform-types. Commit 64fd5d5. Presupuesto Foxy B2 tiene prueba RED y está en implementación; no está habilitado.

- B2 presupuesto Foxy: /root/foxy_red RED; /root/foxy_visual_green implementó, con recuperación y ledger atómicos. Tests adicionales validaron rollback/reserva; revisión /root/foxy_review confirmó concurrencia, tarifas congeladas y Prisma sin diferencias; una sonda de revocación motivó RED adicional y corrección: reserva rechazada pero settle con lease/nonce válido liquida costo ya generado. 35 pruebas en revisión PASS, gitleaks falso positivo por nombre access corregido a permissionSql y scan limpio. Commit beaaede; scheduler y worker aún no habilitados.

- F5D autoridad durable: /root/foxy_architect diseñó capabilities por identidad, ligadas a lease, snapshot y signal; /root/foxy_red observó RED por módulo ausente y añadió casos de mutabilidad/abort que ya pasaron sin RED observado porque implementación se adelantó. /root/foxy_green reporta 16 PASS con DB temporal; revisión independiente pendiente. No integra lectura durable ni proveedor.

- F5D autoridad: 16 pruebas y revisión /root/foxy_review sin hallazgos, commit 4966731. El revisor detectó que ese commit omitió el archivo no rastreado claim-authority-check.ts, por lo que D1 aislado no era reconstruible; fue agregado en commit D2 b6ee0b1. D2 compartió reconstrucción HTTP/durable, 39 pruebas PASS y revisión con ClassroomService/DB temporal, sin hallazgos; lectura durable en revisión. Sigue pendiente fencing de despacho y proveedor.

- Reader durable revisado por /root/foxy_review: 9 tests e integración authority/FileService/PG temporal, revocación tras parser y capability falsa PASS, storage/scanner sintéticos; commit ec53be6. Loader durable D3 y parser F5E están en revisión. Aún sin worker, proveedor, UI, imágenes ni publicación.

- D3 loader durable: /root/foxy_red RED y fixture corregido de identidad; /root/foxy_green GREEN; /root/foxy_review verificó PG/authority/reader/FileService integrados, capacidad falsa y cambio tras lectura, PASS; commit 3abf54d. Parser de respuestas con referencias: /root/foxy_red RED, /root/foxy_visual_green GREEN y /root/foxy_visual_review 10 PASS sin hallazgos; commit 8a88c3a. Falta proyección segura al proveedor y worker.

- E1 proyección segura: /root/foxy_red RED, /root/foxy_green GREEN, /root/foxy_review verificó exclusión de IDs estructurales; 6f87a48. El contenido docente y bytes se conservan, no se afirma anonimización.
- E2/E3 adaptador textual inyectado: RED y GREEN con SDK simulado; revisión y RED adicional hallaron que mutación posterior a preflight recuentaba y despachaba bajo reserva antigua. Corregido y revalidado por /root/foxy_review: 18 PASS, scan y fronteras; commit de0713d. 503 se clasifica AI_UNAVAILABLE y worker debe tratar incertidumbre por fase; no hubo llamada real. No se activa todavía.

- F5F1: /root/foxy_red RED y /root/foxy_green implementación. /root/foxy_review detectó READY sin despacho y deadlock 40P01 con reserva grading tras vencer lease. Tests RED añadidos; /root/foxy_architect corrigió su orden inicial de locks, ahora usuario→aula→conversación→budget→turno. Revisión independiente: 15 pruebas, carreras grading/recovery y Prisma sin diferencias PASS; commit 13e46e9. Un intento inicial del test runner fue abortado antes de escribir y el reintento tuvo éxito.
- F5F2 preparación: /root/foxy_red RED, /root/foxy_visual_green GREEN y /root/foxy_visual_review verificó lector SQL con PG aislado, autoridad y loader; sin hallazgos, commit 89980a7. Worker/scheduler, UI, imágenes y publicación siguen pendientes.

- H0 UoW: RED y corrección de error SQL no saneado, revisión 6 PASS; 9bb5fb9. H1 conversaciones: paginación y replay tras archivar corregidos; revisión de concurrencia 16 PASS, 8888c2a. H2 turnos: replay y snapshot en tx, DTO público; revisión 18 PASS, 16bf9f4. H3 HTTP detectó lentitud, UTF8/encoding, URL y EMPTY_CONTENT; corregidos con 9 tests y sondas, a4b2fad.
- H2b mapping y acceso citas: text-only y casing corregidos; FileService y DB sintéticos con revocación PASS, 6015e38 y df091f2. Rutas HTTP y DTO sin referencias privadas + paginación UTF8 byte con 101 turnos/13 páginas integradas hasta proxy, 25 PASS, cb1af7d. Proxy seguro y DOCX corregido, a7601c7. Una prueba de proxy ECONNRESET inicial no reproducida en focal, 84 solicitudes y suite final; sin parche especulativo. Composición real, UI, recursos, imágenes, publicación y E2E aún pendientes.

- UI W2/W4: historial y controlador integrados; /root/foxy_visual_review confirmó QA ego de permisos/carreras/citas/selección y aula activa, bases sintéticas; 5ac5c55 y 86e897c. Historial v2 revisado 42 PASS, 0a66b42; redacción UUID no anonimiza otros datos. Rsrc1 revisado PG/concurrencia, 492ac4f; PDF WinAnsi determinista, cap100/fallo explícito caracteres no compatibles, revisión 8 PASS, 545d893. Servicio privado recurso/HTTP 23 PASS, cb74099. H2b publication está en diseño; no hay publicación a Biblioteca ni imágenes. P0 beginInTransaction y P1 intención en curso; conservar referencia de preparación en cleanup antes de asignar archivos.

- P3 publicación: intención durable, asignación y custodia de archivo, autoridad por lease, puente a FileService y validación de READY revisados en 811c9a8, 3a1c617, 0e59fe0, 6998367 y 5a81764. PDF se ejecuta en worker limitado (99dd876). La sincronización de lease con P4 y revisión con PostgreSQL aislado quedaron en 49deb37. FAILED conserva archivo/cuota: reintento y descarte siguen pendientes.
- P3D3 en revisión: /root/foxy_red escribió pruebas; /root/foxy_green implementó puertos de reanudación y corrigió carrera de eliminación en inspección (4 pruebas); /root/foxy_visual_green implementó worker y corrección de READY rechazado (9 pruebas). Compilación y fronteras informadas PASS; revisión independiente con DB temporal en curso. No se ha completado la publicación en Biblioteca ni la integración del worker.
- P3D3 revisión /root/foxy_review LGTM: 9 pruebas worker, 5 focales puertos y 14 previas; PostgreSQL temporal validó fresh/reserved/restart→READY, no repetir IO con READY, revocación/edición→FAILED y eliminación durante lock→UNAVAILABLE. Heartbeat/shutdown, build y fronteras PASS; storage/scanner sintéticos. P3D4 queda fuera de esta revisión. Reintento y descarte siguen pendientes.
- P3D3 commit c9b7c27 tras diff-check y Gitleaks limpios. P3D4: /root/foxy_red RED de lifecycle sin IA, /root/foxy_green integración, 15 pruebas focales PASS y build/fronteras PASS. /root/foxy_red comprobó reinicio con PG temporal, runtime compilado y FileService real, scanner/storage sintéticos. /root/foxy_review LGTM: 8 pruebas, fresh y reanudación READY con IA off, cierre durante scan drena y recuperación conserva archivo/cuota; sin publicación a Biblioteca. Pendientes confirmación, reintento y descarte, imágenes y validación integral.
- P3D4 commit f59c2d1 tras diff-check/Gitleaks. E1 Biblioteca: /root/foxy_architect definió contrato; /root/foxy_red RED; /root/foxy_green implementó. Revisión independiente detectó mutación de entrada y arquitecto dependencia de parser legacy; RED y correcciones verificadas por /root/foxy_review: 28 pruebas, carrera con un material y revisión, permisos, rollback y visibilidad con PG temporal, build/fronteras/Gitleaks PASS. E2: fetch origin exit 0 previo a migración; pruebas RED y primer GREEN 5 pruebas, migración sin drift; revisión pendiente. Publicación completa, retry/discard e imágenes siguen pendientes.
- E1 commit bc2c7b6. E2 /root/foxy_red RED y pruebas negativas; /root/foxy_green implementó repositorio y migración. /root/foxy_review LGTM: cinco pruebas iniciales y PG temporal con FileService/PDF/UoW/publisher, cuatro puntos rollback, replay, carreras con borrado/publicación y denegaciones PASS; build/drift/fronteras/Gitleaks PASS. No incluye HTTP ni interfaz. E3A servicio y lectura autorizada en revisión; E3B HTTP en implementación.
- E2 commit 43ae9bd. E3A: /root/foxy_red RED servicio/inspect, /root/foxy_green GREEN; revisión detectó tipos compartidos ausentes y replay con destino inaccesible produciendo 23505 en fixture inconsistente. RED y correcciones; /root/foxy_review verificó 11 pruebas, permisos de dos aulas, rollback por revocación, borrado concurrente, proyección y replay PG; build/fronteras/Gitleaks PASS. E3B rutas y prueba de sesión/CSRF sintética GREEN, revisión independiente pendiente; conexión web y feature completa pendientes.
- E3A commit 52c88fb. E3B /root/foxy_red RED rutas, /root/foxy_green GREEN; prueba host con sesión/CSRF real y servicios dobles PASS. /root/foxy_review verificó 10 pruebas y aplicación raíz con PG temporal, FileService/renderer/E1 reales: prepare→READY→confirm y Biblioteca estudiante, revocación durante lock, roles/CSRF/límites PASS; storage/scanner sintéticos, IA deshabilitada. E3C proxy y E3D lector privado en revisión; interfaz y flujo completo siguen pendientes.
- E3B commit 85d14aa. E3C proxy: /root/foxy_red RED de ruta existente, /root/foxy_green GREEN; /root/foxy_visual_review verificó 19 pruebas, seis operaciones admitidas, 51 rechazos y headers/cookies/control de errores mediante servidor proxy→handler sintético; fronteras/Gitleaks PASS. E3D lector privado y E3E listado aún en desarrollo/revisión, sin interfaz completa.
- E3C commit d5d9e7e. E3E listado: /root/foxy_red RED para servicio/repositorio; /root/foxy_green GREEN y build/fronteras PASS. /root/foxy_visual_review verificó 14 pruebas y PG temporal: cursores, permisos, privacidad y orden microsegundos/empates sin pérdidas; sin HTTP aún. E3D lector: revisión detectó errores en borrado durante lectura, cambio de binding y sanitización; RED reproducidos, correcciones GREEN pendientes de revalidación independiente.
- E3E listado commit c191491. E3D lector: /root/foxy_red RED y /root/foxy_green GREEN; /root/foxy_review detectó borrado durante lectura, cambio de binding y error no saneado; RED, corrección y revalidación PG/FileService 6 pruebas + 7 sondas PASS. Ruta binaria/proxy GREEN inicial, revisión pendiente. Vista no conectada a interfaz.
- E3D lector commit 0c44eac. HTTP/proxy privado: /root/foxy_red RED, /root/foxy_green GREEN, /root/foxy_review verificó sesiones y PG real, permisos/revocación, bytes y cabeceras, 19 pruebas PASS; storage/scanner sintéticos. E3E HTTP/proxy /root/foxy_visual_review verificó build, sesiones/PG, 21 preparaciones, cursores y permisos; 19 PASS en segunda ejecución. Primera suite 18/1 por ECONNRESET en prueba previa de tamaño, no atribuida, conservada. Interfaz docente y cierre aún pendientes.
