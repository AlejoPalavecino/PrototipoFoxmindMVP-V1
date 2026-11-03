# ARQ-08 — ejecución y diagnóstico

- Agent / role: /root, coordinación e implementación.
- Session or task ID: no disponible.
- Date: 2026-11-02.
- Branch / worktree: main, C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind.
- Starting commit: add38ec16a6f03e4e4332288b198036161e4cf58.
- Phase and detailed task/spec links: [ARQ-08](../../odd/tasks/architecture-consolidation.md#arq-08--ordenar-ejecución-y-diagnóstico), [diseño aprobado](../../odd/tasks/architecture-consolidation-arq03-design.md).
- Status: completed.

## Request and scope

Ejecutar ARQ-08 con coordinación de admisión, inventario y mediciones reproducibles. Se preservan los intervalos, infraestructura, cuotas y políticas de fallo y gasto vigentes. Pruebas con datos sintéticos en recursos propios.

## Work performed

Reconciliados Git, diseño y cierres previos. Se identificaron seis colas IA que comparten el lock de admisión. Publicación Foxy y tareas de mantenimiento tienen ciclos propios.

`apps/api/src/ai-admission.ts` concentra el lock transaccional `78123002` y la lista de seis colas. Cada worker conserva el dueño, las guardias, el orden de sus candidatos, su recuperación y sus escrituras de lease. El presupuesto conserva su lock `78123001`. En visual, donde se toman ambos, se mantiene admisión antes de presupuesto. Se distinguen tres lecturas:

| Lectura | Comportamiento preservado |
|---|---|
| Cupo global y dueño habitual | Foxy texto cuenta todos los `RUNNING` hasta recuperación. Las otras cinco colas cuentan leases vivos |
| Dueño en extracción y generación | Conserva bloqueo por los `RUNNING` de ambas colas de generación aun si la recuperación omitió una fila bloqueada |
| Prioridad cruzada entre extracción y generación | La otra cola gana por `created_at,id` cuando su candidato está disponible según las dos colas de generación y Foxy texto/visual. Estudiante y corrección siguen fuera de este filtro de prioridad, aunque cuentan para admisión |

Inventario de ejecución y propiedad:

| Worker | Claim, repetición, recuperación y gasto | Cierre / cadencia vigente |
|---|---|---|
| Extracción de plan y generación de actividad | Lease con nonce y plazo de proveedor más margen de 10 s. Recuperación compartida de las dos colas. Sin despacho vuelve a cola, con despacho incierto falla y liquida conservadoramente. Request ID y hash del comando preservan replay. Reserva y liquidación de texto en `ai_usage_daily` | Sondeo cada 500 ms con lote limitado por configuración. Cancelan proveedores activos y esperan trabajos |
| Análisis estudiantil | Lease y hash de evidencia por inscripción. Revalida docente, aula y pertenencia. Reintento limitado para fallas sin despacho y espera de presupuesto diferenciada. Mismo presupuesto técnico de texto | Sondeo cada 30 s, ejecución no solapada y drenaje del trabajo activo |
| Corrección asistida | Job de intento con epoch docente, nonce, lease y revalidación de entrega/nota. Recuperación y liquidación conservadora. Uso confirmado liquida tokens reales | Scheduler serial con reposo de 30 s y cesión entre lotes. Cancela y drena al cerrar |
| Foxy texto | Turno idempotente, lease de plazo más 10 s, recuperación explícita. El despacho incierto no se reenvía. Conserva cupo hasta recuperar y liquida según reserva/uso | Worker y mantenimiento de recuperación a 30 s. Cierre cancela proveedor y espera terminal dentro de su política vigente |
| Foxy visual | Job y activo ligados por nonce y lease de 90 s. Recupera trabajo no despachado o artefacto existente bajo guardias. Perfil congelado y liquidación técnica del proveedor. Lease vencido no ocupa cupo global | Sondeo a 30 s. Cancela y drena. El claim y la recuperación preservan el orden de locks compartidos |
| Publicación Foxy | Lease de 90 s, heartbeat cada 30 s y plazo de 120 s. Custodia y reserva de archivo con reintento cercado. Capacidad propia que cuenta la reserva activa una vez | Sondeo a 5 s. Cancela y drena antes del cierre del almacenamiento |
| Correo e invitaciones | Outbox de identidad reclama por token y lease. Reintento acotado. Invitaciones verifican generación y token de claim, con 8 intentos de entrega como máximo | Identidad reprograma a 250 ms tras cada ciclo. Invitaciones cada 5 s. Los ciclos se drenan antes de cerrar remitentes |
| Limpieza Files, biblioteca y activos Foxy | Reclamo por lease o token según la custodia. Revalida referencias y confirma borrado antes de liberar cuota o marcar final. Parsing de documentos bajo demanda conserva límites propios | Files por defecto 60 s, biblioteca y activos Foxy 5 s. Se drenan trabajos antes de cerrar infraestructura y luego Prisma |

Fuentes principales de inventario: `apps/api/src/application.ts`, `classrooms/{ai,activity-ai,student-ai}/worker.ts`, `classrooms/grading-ai/{runtime,scheduler,sql-queue}.ts`, `foxy-ai/{worker,visual-worker,publication-worker,runtime,turn-recovery}.ts`, `classrooms/{delivery,library-cleanup}.ts`, `identity/mail-lifecycle.ts`, `account-mail-outbox/worker.ts` y `files/cleanup-worker.ts` dentro de API.

## Verification

- RED del contrato de lock: faltaba el módulo de coordinación. GREEN posterior y selección pura de scheduler, diagnóstico, drenaje Foxy texto y limpieza: 12 PASS, 0 FAIL.
- Compilación API estricta y `npm run lint:boundaries`: exit 0, 146 entradas vigentes. El guard no necesitó excepciones nuevas.
- Línea base de medición: `node --test --test-name-pattern 'ARQ-08 measures' apps/api/src/foxy-ai/foxy-shared-admission.test.mjs` antes de recompilar el build de ARQ-07. PostgreSQL desechable, dos conexiones contendieron por un trabajo de actividad frente a un lock retenido deliberadamente, y una obtuvo el lease. Se observaron conexión 8,75 / 8,16 ms, espera observada de lock 16,36 / 29,25 ms y operación total 39,05 / 47,69 ms. Edad observada 289,02 ms. La operación de presupuesto duró 17,09 ms. Una solicitud, 0 micróUSD reservados al final y 130 micróUSD consumidos con uso sintético.
- Las observaciones del fixture incluyen las dos operaciones completas y se emiten aparte del diagnóstico de producción, que deduplica eventos y reporta supresiones. La espera del lock incluye ida y vuelta de la consulta. La conexión incluye préstamo del pool y apertura cuando corresponde. La edad se lee después de los dos reclamos. La muestra es local, deliberadamente pequeña y con contención controlada. No permite inferir rendimiento productivo.
- Selección de admisión y recuperación en PostgreSQL 17.10 desechable: `foxy-shared-admission.test.mjs`, `foxy-visual-cross-admission.test.mjs`, `foxy-turn-queue.test.mjs` y `foxy-turn-recovery.test.mjs` con preload del build. 74 PASS, 0 FAIL, 0 SKIP. Conserva cupos global y por dueño, exclusión cruzada, lease vencido, guardias, liquidación por día original y exclusividad de claim/settlement.
- Selección de presupuesto: `classroom-ai-budget.test.mjs`, `activity-ai-budget.test.mjs` y pruebas de presupuesto Foxy texto/imagen de API. 32 PASS, 0 FAIL, 0 SKIP. Incluye reinicio, concurrencia, redondeo, gasto por cuota y liquidación idempotente.
- Medición del candidato en la selección de admisión concurrente: conexión 7,21 / 6,79 ms, lock 3,01 / 15,15 ms y total 23,23 / 29,02 ms. Edad 32,67 ms, presupuesto 15,58 ms. Misma cantidad de leases y una solicitud con 130 micróUSD consumidos y saldo reservado 0. Los valores no son un benchmark de mejora, ya que la línea base corrió aislada y los tiempos incluyen ruido de scheduling y SQL.
- Selección de lifecycle, reinicio, publicación y análisis estudiantil: `classroom-ai-lifecycle.test.mjs`, `activity-ai-lifecycle.test.mjs`, `grading-ai-lifecycle.test.mjs`, `student-ai-integration.test.mjs` y pruebas Foxy visual de perfil/recovery y cola de publicación. Corrida inicial 38 PASS, 1 FAIL. El arranque Docker de la fixture del permiso de reporte estudiantil falló antes de ejecutar el caso. El mismo caso pasó 1/1 en reintento aislado. El contenedor temporal residual tenía etiqueta propia, `AutoRemove` y datos tmpfs. Se detuvo por ID exacto tras inspeccionar su propiedad. Verificación final por etiqueta: cero contenedores de IA, Agenda o P5.
- [Revisión independiente](2026-11-02-arq08_review-independent.md): VERIFIED en alcance estático y puro. Coincide el SHA-256 agregado de 13 archivos. Confirmó predicados de cupo y orden de locks. Pruebas puras 12/12.
- Se usaron proveedores sintéticos y PostgreSQL desechable. Las métricas registradas son observaciones del fixture y no una medición de producción o de saturación del pool.
- `git diff --check`: exit 0 con avisos de LF/CRLF. HEAD final coincide con el inicial. Validador focal: 4 documentos y 284 enlaces sin problemas. `npm run docs:check`: 138 archivos y 1715 enlaces sin problemas.

## Commits and outcomes

ARQ-08 completada localmente, con cierre en plan y roadmap. Se conservaron polling, políticas y límites. Sin cambios de esquema, datos retenidos, commits ni publicación.

## Handoff

ARQ-09 queda pendiente de asignación. La verificación integrada puede partir de las pruebas y del inventario de ejecución registrados aquí.
