# Resolver la deuda identificada por Astra

La autorización del usuario del 2026-10-29 abarca los seis frentes del [informe F01–F08](../../docs/audits/2026-10-29-astra-project-audit.md). Se trabaja localmente en `codex/audit-remediation` desde `9fddbd8`, sin publicación ni despliegue. [Registro coordinador](../../docs/work-log/2026-10-29-root-audit-remediation.md).

## Unidades y aceptación

| Unidad | Estado | Salida requerida |
|---|---|---|
| A — F01/F04 Muro y contrato | Verificado localmente | Páginas bajo 2 MiB, historial íntegro, hilo/respuesta fuera de primera página, permisos y cursores verificados |
| B — F03 composición | Verificado localmente | Capacidades sin cadena de herencia, fachada compatible y lectores explícitos por tipo; privacidad y CAS preservados |
| B — F05/F07/F08 escala/diagnóstico | Verificado localmente | Lecturas concurrentes seguras, agrupación lineal, scheduler serial que drena y señales operativas saneadas |
| C — F06 aislamiento UI | Verificado localmente | Cargas por sección, errores/reintentos locales, borradores preservados y respuestas antiguas ignoradas; captura Ego no acreditada |
| D — F02 controles | Verificado localmente | Inventario completo explícito, fronteras activas y secretos en CI independiente; sin ejecución remota en esta entrega |
| Verificación y entrega local | Completada localmente | Tipos/build, regresiones, DB efímera, browser real y revisión independiente aprobados; unidades locales en el registro de entrega |

## Contrato A: navegación del Muro

Contrato puro compartido en `src/core/domain/classroom-wall.ts`; los tipos y parsers se consumen desde API, proxy y cliente. `WallData` contiene `revision`, `posts`, `nextCursor`. Cada post conserva `replies` y añade `replyCount`, `repliesNextCursor`, `repliesPreviousCursor`. `WallRepliesPage` contiene `revision`, `postId`, `replies`, `nextCursor`, `previousCursor`; `WallThreadData`, `revision` y `post`.

| Ruta GET | Query permitida | Cota |
|---|---|---|
| `/:room/wall` | `cursor`, `limit` | 10 posts y preview de 2 respuestas por post |
| `/:room/wall/:post` | `replyId` opcional | Post objetivo y ventana de hasta 20 respuestas |
| `/:room/wall/:post/replies` | `cursor`, `limit` | 20 respuestas |

Parámetros repetidos, extra, límites fuera de rango y cursores mayores de 2048 caracteres se rechazan. El transporte no verifica la firma secreta. El servidor firma versión/tipo/scope/dirección y highwater del feed, conservando la clave temporal SQL con microsegundos. Posts ordenan fecha DESC/id ASC; respuestas fecha ASC/id ASC. Las páginas anteriores revierten el resultado SQL para mantener salida ASC. Cursores previo/siguiente solo existen si hay filas en esa dirección.

Cada página reautoriza acceso. Tombstones y CAS mantienen semántica actual. El highwater del feed limita navegación ante inserciones nuevas, pero no promete snapshot DB multitransacción; edits y eliminaciones se reflejan con su estado actual. Las páginas de respuestas pueden incorporar respuestas nuevas entre peticiones: no tienen highwater ni snapshot y cada petición permanece acotada a 20. Refresh recupera entradas nuevas del feed. No se incrementa indefinidamente el límite del proxy ni se elimina historial. Esta precisión corrige una ambigüedad de redacción señalada en revisión; no agrega una garantía de snapshot ausente en el diseño incremental.

F04 continúa con parsers puros compartidos de guardado de corrección privada, publicación explícita, corrección auditada y resultado publicado. Se extraen las reglas existentes sin cambiar decimales, cero/null, confirmaciones, límites ni discriminantes; autorización y SQL permanecen en backend. Se revisa también notificaciones ilimitadas: página de hasta 50, contador total autorizado y adaptación compatible del array legado a primera página acotada. Cambios adicionales requieren su RED antes de implementación; no se consideran resueltos por haber tipado solo el Muro.

## Contrato B: composición y operaciones seguras

Un contexto recibe puertos y centraliza autorización, transacciones, revisión y locks. Las capacidades reciben contexto mínimo y dependencias nominadas por composición, sin `extends`, mixins, modificación de prototipos ni expansión de `any`. La fachada conserva métodos públicos y bindings. Los lectores de actividad/sesión distinguen TP y cuestionario explícitamente: la extracción no puede publicar consignas o correcciones privadas.

La intención de transacción se registra desde `run(request, write)` mediante `WeakMap`. Solo lecturas verificadas usan locks compartidos; escrituras y transacciones externas desconocidas conservan locks exclusivos. No se deduce la intención del parámetro `classroom(write)`: `setArchive` y `readNotification` escriben aunque lo omitan. Locks secundarios deben seguir la misma intención y orden. El progreso agrupa filas una sola vez por alumno y preserva racionales/BigInt y resultados académicos.

`SerialJobScheduler(runOnce, options?)` expone `start()` y `stop(): Promise<void>`. Defaults: idle 30000 ms, yield 0, máximo 10 trabajos por ciclo, pausa de ciclo 25 ms. `true` drena con yield; `false` o excepción vuelve a idle. No hay trabajo paralelo; stop cancela timer y espera activo. `runOnce` público sigue reclamando exactamente un job. Cola, presupuestos, exclusión por propietario, leases y resultado incierto no cambian.

`DiagnosticSink.record(event)` recibe solo `operation`, `code`, `outcome`, `durationMs`, `correlationId`. Operaciones: `classroom.operation/query/lock`, `grading-ai.recover/claim/scheduler`; códigos `COMPLETED`, `UNEXPECTED`, `TIMEOUT`; outcome `success/failure`. Correlación aleatoria, sin identidad. Adapter `createDiagnosticSink(write, options?)` permite límite de eventos/ventana y reloj, coalesce con contador de suprimidos y nunca propaga fallo del sink. No incluir errores crudos, SQL, cuerpos, prompts, nombres, correos, archivos o credenciales. Respuestas públicas conservan el error saneado.

## Contrato C: recursos de interfaz

Shell de aula conserva detalle e identidad/tab. Recursos independientes con estado discriminado `idle/loading/ready/error`, datos previos durante retry, generación monotónica y AbortController. Miembros/historial/invitaciones se consultan solo en sus secciones autorizadas. No hay `Promise.all` global ni busy/error/confirm compartidos para secciones independientes.

Settings inicializa borrador por aula, no por refresco ajeno. Guardado exitoso actualiza baseline; conflicto conserva borrador y ofrece recarga explícita. Una respuesta antigua no reemplaza la nueva aunque el mock ignore abort. Cambiar aula cancela y reinicia datos. Mutaciones invalidan solo detalle y recursos afectados. La navegación, roster reveal, diálogos y las ocho secciones existentes se conservan.

## Contrato D: controles ejecutables

Manifiesto explícito de suites puras, transporte e integración efímera: auth, archivos, Agenda, Inicio, Muro, P7/P8, IA y regresiones de esta iniciativa. Runner con `--suite`/`--list`, nombres faltantes/duplicados rechazados, fail-fast, deadlines y conteos visibles. No descubrir ciegamente todos los tests con glob, porque existen helpers/opt-ins con efectos laterales.

Fronteras con ESLint/plugin-boundaries más guard AST para restricciones de dominio, imports UI/backend, API pública entre módulos y capacidades sin herencia. Excepciones heredadas solo por aristas exactas justificadas; nuevas dependencias prohibidas deben fallar. Secrets gate independiente sin habilitar el template Codex desactivado. Conservar el gate grading IA y presupuestos API30s/Next180s/child360s.

## Pruebas y cierre

Actualización de aceptación del 2026-10-30: el pedido de suite completa amplió el gate representativo a un inventario explícito de **304 entrypoints**, **51 exclusiones justificadas** y **23 rutas**: FAST180, DB65, navegador41, servicios8 y diez archivos cubiertos mediante 19 wrappers/grupos exactos. Una selección verde o un sufijo diagnóstico no acredita cierre. Los resultados vigentes y los intentos rechazados están en [el registro actual del coordinador](../../docs/work-log/2026-10-30-root-audit-completion.md).

Ampliación posterior del mismo día: nueva prueba determinista de preflight/observador añade un entrypoint; inventario actual **305/51/23, FAST181**. Helper plain.mjs es auxiliar, no un entrypoint omitido ni una exclusión nueva. RED2/6→GREEN8/0 independiente; metadata --check y validador12/0. La repetición completa final usa un mismo candidato con default de helpers preservado y modo estricto optativo solo en los dos recorridos afectados.

F01/F04 se reabrieron por una regresión real de representación de cursores: texto Base64URL distinto podía representar los mismos bytes de firma. La corrección compartida exige recodificación exacta de cuerpo y firma antes de comparar el MAC; conserva namespaces, límites y compatibilidad de cursores válidos, además de los ámbitos y permisos existentes. La nueva regresión determinista pasó de RED3/12 a GREEN15/0 y está incluida en FAST; falta reconciliar las ejecuciones completas del candidato final. No se modificó para relajar el tamper test DB original.

Cada unidad tiene RED independiente antes de GREEN. Los implementadores no editan tests. Se requieren recorridos DB sintéticos mayores de 2 MiB, precisión temporal y permisos, carreras lectura/escritura/revocación, equivalencia del progreso, scheduler con reloj controlado y canarios de diagnóstico. La UI se verifica con renderer/browser real dentro de Space dedicado ego, sin presentar SSR o inspección de fuente como prueba visual.

Los contenedores son efímeros con propiedad y cleanup verificados; COMMIT es necesario para observar revocación/concurrencia entre sesiones, por lo que no se promete rollback por prueba. No usar datos/proyectos retenidos ni proveedores reales. Los junctions originales de dependencias/generados permanecen inmutables; cualquier instalación nueva se aislará.

El coordinador consolida evidencia y roadmap solo al cumplir salidas completas. Los hallazgos históricos permanecen como evidencia de origen. Los commits contienen comportamiento, tests y documentación por unidad; si una unidad segura excede 400 líneas se declara el exceso sin comprimir ni separar tests artificialmente. Push/PR/despliegue requieren nueva autorización.

## Aceptación local final, 2026-10-30

Los seis puntos cumplen las salidas anteriores. Candidato final `4aeae0179723bd8442628f9ba3b301dffeac1af1a1762d983dc126b07ef9732c`: FAST181 completo783PASS/0FAIL/5SKIP y navegador41 completo169PASS/0FAIL/0SKIP, sin NOTRUN, con builds reales y plazos originales. DB65:394/0/0; servicios8:50/0/0; wrappers19exactos:152/0/0, conservados por igualdad comprobada de101entradas explícitas y305fuentes de su grafo, no por igualdad ficticia del hash global. Total de comprobaciones ejecutadas:1548PASS/0FAIL/5SKIP;305archivos admitidos únicos,51exclusiones justificadas y23rutas. Tipos estrictos, fronteras y auditoría de dependencias pasaron; cero vulnerabilidades en el lock verificado.

Verificación independiente de navegador:41archivos exactos,2662.763s,exit0;82reportescleanup0,41prefijos vacíos/123consultas0,39dependencias fijadas intactas y ningún padre/hijo propio activo. Los cuatro contenedores retenidos y173volúmenes permanecieron intactos. Se mantuvo el conteo de15redes y la identidad de14; cambió el ID de la red predeterminada bridge, sin causa ni propietario atribuidos. Fuentes del mirror y código root sin drift. El [registro coordinador](../../docs/work-log/2026-10-30-root-audit-completion.md), la [verificación independiente](../../docs/work-log/2026-10-30-complete_owned_verify.md) y las [unidades locales](../../docs/work-log/2026-10-30-local-remediation-units.md) conservan intentos previos y entrega.

Limitaciones: las cinco omisiones FAST existentes no son PASS; de51exclusiones,47son auxiliares/manuales/retirados/fixtures no admitidos y4son pruebas reales que dependen de entornos retenidos no autorizados. La unificación de contratos cubre Muro, notificaciones y corrección/publicación/resultados críticos; no equivale a migrar todos los DTOs del proyecto. La paginación no promete snapshot. Las mediciones son locales con datos sintéticos, sin prueba de capacidad productiva ni proveedores reales. Captura Ego no acreditada; sí existen recorridos reales de navegador y revisión de capturas nativas. Cleanup observado, sin garantía general ante terminación forzada. La causa SQL del503histórico no se demostró retrospectivamente. Sin ejecución remota de CI, publicación ni despliegue.
