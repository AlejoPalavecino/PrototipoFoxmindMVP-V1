# Seguimiento de base de datos de la auditoría (B3, B6, B11, B12, S7, S8)

Sesión lateral iniciada por la coordinación, 2026-11-26, sin identificador expuesto. Rama `claude/audit-database-fd9d93`, worktree propio, commit inicial `a06c9214`. Encargo: resolver B3, B6 y B12 de la [auditoría](2026-11-26-root-full-stack-audit.md) y proponer B11, S7 y S8 sin tocar datos ni comportamiento visible sin decisión del usuario. Es la única sesión que agrega migraciones. Autoriza commits en esta rama; no push, PR, merge ni despliegue. Tablero: [audit-database-followups](../../odd/tasks/audit-database-followups.md). Sólo se usaron bases Docker propias con datos sintéticos; no se leyó `.env` ni `.test-artifacts/` ni se tocó el entorno local persistente.

## Qué cambió

- **B3 · lock de presupuesto por dueño.** `pg_advisory_xact_lock(78123001)` pasó a `pg_advisory_xact_lock(78123001, hashtext(owner_id))` en la reserva de texto e imagen y en los diez sitios de Foxy (turnos y visuales); los try-locks también son por dueño. El barrido de turnos vencidos usa try-lock por fila y deja para la próxima pasada las cuentas ocupadas, para no esperar locks de otra cuenta mientras tiene la fila global. Toda liquidación bloquea las filas de `ai_usage_daily` en orden fijo (global primero), lo que además cierra un deadlock posible entre una reserva (global → cuenta) y una liquidación cuyo `UPDATE ... scope IN (...)` no tenía orden. El tope global sigue exacto porque cada reserva bloquea la fila `global` con `FOR UPDATE` antes de comprobar y sumar. [Lock](../../apps/api/src/platform/ai/admission.ts) · [presupuesto](../../apps/api/src/platform/ai/text-budget.ts) · [guía](../engineering/ai/README.md#concurrencia-de-reservas-y-liquidaciones).
- **B6 · índices.** La consulta a `pg_catalog` sobre una base propia migrada da 141 FKs; 64 no tienen un índice no parcial que empiece por su primera columna (86 si se exige el conjunto exacto de columnas: muchas compuestas ya quedan cubiertas por la columna líder). Cruzadas con el SQL de `apps/api/src` y `src`, ocho sirven: tres `file_id` de las comprobaciones de referencias de archivos, tres columnas recorridas al borrar preguntas, opciones y eventos de agenda, y `grading_ai_jobs.attempt_id` (el único índice existente es parcial). [Migración 202611260002](../../prisma/migrations/202611260002_foreign_key_indexes/migration.sql), con `@@index` equivalente en `schema.prisma`. Las otras 56 quedan como lista revisada en la prueba. `prisma migrate diff` entre la base migrada y el esquema devuelve una migración vacía.
- **B12 · imagen y backups.** La imagen `postgres:17.10-bookworm` queda fijada por el digest del índice multiarquitectura que ya usaban las suites (`sha256:9b18b783…6ea8f`) en las 17 referencias (compose, CI, scripts y pruebas). Nuevo [script de backup y restauración](../../scripts/database-backup.mjs) y [guía](../engineering/database-backup.md).
- Guías: [modelo de datos](../engineering/data-model.md) (índices, backup, cortes de día, borrado lógico, decisiones pendientes y conteo de 72 migraciones) y [IA](../engineering/ai/README.md).

## Comprobaciones

| Qué | Prueba | RED | GREEN |
| --- | --- | --- | --- |
| B3 | `tests/ai-budget-owner-lock-database.test.mjs` (Postgres propio) | con la fila del trabajo de A tomada por otra transacción, la reserva de B esperó: `owner B waited behind owner A` | 2/2: B reserva mientras A espera y A termina al liberar; seis cuentas concurrentes admiten exactamente 3 (tope global) y la liquidación concurrente deja el libro global exacto |
| B6 | `tests/foreign-key-indexes-database.test.mjs` | las ocho FKs elegidas sin índice | 1/1: las ocho indexadas y el resto coincide con la lista revisada |
| B12 digest | `tests/postgres-image-pin.test.mjs` | sobre una copia de `HEAD`: 17 referencias sin digest | 1/1 |
| B12 restauración | `tests/database-backup-restore.test.mjs` | script inexistente | 1/1: backup de una base migrada con historial y usuarios sintéticos, restauración en un clúster nuevo sin `foxmind_app`, mismas filas por tabla, historial completo, permisos del rol recreados, `_prisma_migrations` sin acceso para la app y rechazo de una segunda restauración |

Las pruebas existentes que fijaban el texto del lock global (fakes de `foxy-text-budget` y `daily-actor-budget`, pausas de `foxy-turn-completion` y `ai-study-reservation-database`, bloqueos de `foxy-visual-authority-recovery` y `foxy-visual-cross-admission`, orden de `foxy-turn-recovery`) se actualizaron al lock por dueño sin cambiar lo que verifican. La primera corrida de ese conjunto fuera del runner falló por `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` (faltaba `--experimental-transform-types`); con los flags del runner: 181/181. El fixture `withAgendaDatabase` ahora también expone el nombre del contenedor.

Suites: ver la [sección de cierre](#cierre).

## Segunda tanda: B11, S7 y S8 decididos

El mismo día el usuario respondió «Vamos con lo recomendado». Se implementó así:

- **B11.** El día de los cupos diarios de IA es el de Buenos Aires ([constante](../../apps/api/src/platform/ai/operational-day.ts)) en reservas, liquidaciones y `operational_day`. El aviso de Estudio dice «Se renueva a la medianoche, hora de Buenos Aires». El borrado lógico no se tocó.
- **S7.** Los códigos nuevos se guardan como `h1:` + HMAC con `CLASSROOMS_CODE_DIGEST_KEY`, obligatoria en producción y distinta de las otras claves. Fuera de producción se deriva de la clave de firma, porque obligarla rompía unos 20 entornos de prueba que no la definen. La vista previa acepta ambas formas durante la transición. La rotación tampoco reemite un código revocado con SHA-256. [`rehash-classroom-codes`](../../scripts/rehash-classroom-codes.mjs) recalcula los vigentes: sin `--apply` sólo informa. No se regeneraron los códigos de 6 dígitos.
- **S8, primera tanda.** [Reglas de retención](../../apps/api/src/platform/database/retention.ts) en la purga periódica de identidad que ya existía para `account_action_controls` (la auditoría no la había visto). Plazos: credenciales a 30 días, avisos leídos a 180, trabajo de IA terminado e idempotencia de Foxy a 90, contadores diarios a 13 meses. Ninguna FK apunta a esas tablas.

| Qué | Prueba | RED | GREEN |
| --- | --- | --- | --- |
| B11 | `daily-actor-budget.test.mjs` y `study-client.test.mjs` | el SQL usaba `AT TIME ZONE 'UTC'`; el aviso decía `00:00 UTC` | 12/12 |
| S7 | `tests/classroom-code-digest-database.test.mjs` | módulos inexistentes | 2/2: código nuevo con `h1:` y sin SHA-256; vista previa con código nuevo y con uno anterior; recálculo de vigentes, revocados intactos, idempotente, sobre que no coincide queda sin tocar; el comando no escribe sin `--apply` |
| S7 configuración | `tests/p5-host.test.mjs` | escrita después de la implementación, sin RED observado | sin la clave en producción no arranca; clave igual a otra o inválida se rechaza |
| S8 | `tests/data-retention-database.test.mjs` y `runtime-lifecycle.test.mjs` | módulo inexistente; la purga no llamaba a la retención | borra sólo lo vencido, un lote por tabla por pasada, conserva sesiones vigentes, avisos sin leer, trabajo en curso y trabajos pendientes; la purga drena lotes llenos y para en uno corto |

Se actualizaron las pruebas que precargaban el día en UTC (`grading-ai-sql`, `foxy-text-budget`), el fixture de recuperación de códigos (`brujula-data-database`) y la prueba de membresía. Suites: ver [cierre](#cierre).

Siguen pendientes, con decisión propia: purga de conversaciones de Foxy borradas (tiene custodia de bytes), fecha en `classroom_ai_requests` y `activity_ai_requests` para poder purgarlas, borrado o anonimización de cuenta (requiere API, interfaz y criterio legal), quitar la lectura por SHA-256 cuando el recálculo haya corrido en todos los entornos, y si hace falta, `CLASSROOMS_CODE_DIGEST_KEY` en `local:up`.

## Decisiones pendientes

Las tres siguientes quedaron decididas (ver la sección anterior); se conservan como propuesta original.

### B11: corte diario y borrado lógico

**Qué pasa.** El cupo diario de IA corta a las 00:00 UTC (21:00 en Buenos Aires) y el mensual al comienzo del mes en Buenos Aires. Un docente que usa la IA a las 22:00 ya consume el cupo del "día siguiente", y el último día del mes el corte diario cae tres horas antes que el mensual. No hay pérdida de dinero ni de datos; es una regla confusa para quien la mira.

**Propuesta (recomendada).** Pasar el corte diario a `America/Argentina/Buenos_Aires`, igual que el mensual: cambiar `(transaction_timestamp() AT TIME ZONE 'UTC')::date` por la zona de Buenos Aires en `text-budget.ts` y en `operational_day` de `monthly-budget.ts`, y actualizar la guía de IA. No requiere migración de datos: las filas viejas conservan su `day`. El día del cambio, entre las 21:00 y las 24:00 de Buenos Aires, cada cuenta podría tener hasta tres horas con cupo diario nuevo; es aceptable para un cupo operativo. Alternativa: dejar UTC y documentarlo en la interfaz. Cambia comportamiento visible, así que espera tu decisión.

**Borrado lógico.** Conviven seis formas (ver [modelo de datos](../engineering/data-model.md#borrado-lógico)). Recomiendo no unificarlas ahora: cada una tiene reglas de dominio distintas (tombstones con autor en el muro, archivo de aulas, descarte de visuales con custodia de bytes) y reescribirlas toca casi todos los módulos. La convención para tablas nuevas podría ser `deleted_at` + `deleted_by_id` cuando el borrado lo hace una persona.

### S7: códigos de aula con HMAC

**Qué pasa.** `classroom_codes.code_digest` es SHA-256 sin clave. Con una copia de la base, un código de 6 dígitos heredado se recupera en milisegundos y uno de 8 caracteres (unos 6,5 × 10^11 combinaciones) en alrededor de un minuto con una GPU actual. Con HMAC y una clave que no está en la base, el volcado solo no alcanza.

**Diseño propuesto.**

1. Digest nuevo `h1:` + HMAC-SHA-256 del código normalizado, con un secreto propio `CLASSROOM_CODE_DIGEST_KEY` de 32 bytes. Descarté derivarlo de la clave de entrega (`deliveryKey`): la sesión de seguridad backend agrega su rotación (`CLASSROOMS_DELIVERY_PREVIOUS_KEYS`) y, si el HMAC dependiera de ella, cada rotación obligaría a recalcular todos los códigos. El secreto propio no se rota salvo incidente; si se rota, hay que recalcular los vigentes con el mismo script.
2. Escritura: los códigos nuevos se guardan sólo con `h1:`. Lectura de transición: buscar primero por `h1:` y, si no hay, por el SHA-256 viejo.
3. Recalcular los códigos vigentes: un script (no una migración SQL, porque necesita la clave) descifra `code_envelope`, verifica que coincida con el digest viejo y reemplaza `code_digest` por `h1:` dentro de una transacción por aula, con el lock de escritura del aula. Los docentes y alumnos no notan nada: el código sigue siendo el mismo.
4. Códigos revocados: no tienen sobre cifrado, así que no se pueden recalcular. Recomiendo conservar su SHA-256 tal cual (sólo sirven para no reasignar un código) y, al generar uno nuevo, comprobar ambas formas. Un revocado de 6 dígitos sigue siendo recuperable de un volcado, pero ya no da acceso.
5. Cuando el script corrió en todos los entornos, quitar la lectura por SHA-256 en una entrega posterior.

**Qué necesito de vos.** (a) secreto nuevo `CLASSROOM_CODE_DIGEST_KEY` (recomendado) o clave derivada de la de entrega aceptando recalcular en cada rotación; (b) autorización para implementar los pasos 1–3 y correr el script sólo en bases de prueba (en tu entorno local o en producción sería una autorización aparte); (c) si además querés regenerar los códigos de 6 dígitos que sigan vigentes, que sí es visible para los docentes. Recomiendo (a) secreto nuevo, (b) sí, (c) no por ahora.

### S8: retención y borrado de cuenta

**Qué pasa.** Nada se purga. Sesiones vencidas, tokens de cuenta usados, turnos de Foxy, trabajos de IA y avisos crecen sin límite, y una persona no puede pedir que se borre su cuenta.

**Propuesta por tabla (recomendación inicial, para que decidas plazos):**

| Datos | Tablas | Propuesta |
| --- | --- | --- |
| Credenciales vencidas | `sessions` revocadas o vencidas, `account_tokens` usados o vencidos, `account_action_controls` | Borrar a los 30 días del vencimiento. No tienen valor histórico. |
| Trabajos de IA terminados | `classroom_ai_requests`, `activity_ai_requests`, `foxy_*_requests`, `study_ai_dispatches`, `background_jobs` | Borrar a los 90 días. Las reservas y movimientos mensuales (`ai_monthly_*`) se conservan 13 meses para conciliar facturación. |
| Conversaciones de Foxy | `foxy_conversations` borradas, sus `foxy_turns` y adjuntos | Purgar a los 30 días del borrado lógico; las activas se conservan mientras exista la cuenta. |
| Avisos | `notifications`, `notification_projection_reads` | Borrar los leídos a los 180 días. |
| Contadores diarios | `ai_usage_daily` | Conservar 13 meses. |
| Historia académica | intentos, respuestas, calificaciones, correcciones, muro, materiales | Conservar mientras exista el aula; definir aparte qué pasa al archivarla. |
| Borrado de cuenta | todas | Anonimizar al usuario (nombre, correo y hash) y conservar su historia académica sin datos personales, porque las calificaciones afectan a docentes y aulas; borrar sus sesiones, tokens, conversaciones de Foxy y carpetas de Estudio. Necesita decisión de producto y legal. |

La implementación sería un barrido acotado por lotes con `FOR UPDATE SKIP LOCKED`, como los existentes, y una prueba por tabla con el camino negativo (lo que no vence no se toca). No implementé nada: los plazos y el borrado de cuenta son decisión tuya.

## Límites

- B3 reduce la espera entre cuentas en el trabajo previo a la fila global (búsqueda del trabajo, permisos, comprobaciones de Foxy). La fila `global` de `ai_usage_daily` y el lock de admisión `78123002`, que también es global y toman las colas y las finalizaciones de Foxy, siguen serializando. No se midió contención con carga real.
- B6: la utilidad de cada índice se juzgó leyendo el SQL de la app y las reglas de borrado, no con `EXPLAIN` sobre volúmenes reales (las tablas de prueba están vacías). `CREATE INDEX` sin `CONCURRENTLY` bloquea escrituras de cada tabla mientras se construye.
- B12: la restauración se probó en bases propias, no en el entorno local persistente. El primer `local:up` después de este cambio recrea el contenedor de Postgres (mismo volumen y datos). No hay backups programados.
- B11, S7 y S8 quedan sin implementar, con propuesta y decisión pendiente.

## Cierre

### Primera tanda

Suites con `npm run test:complete -- --group <grupo>`: `fast` 3225/3225, `owned-db` 966/966 (incluye las tres pruebas nuevas con base propia) y `wrappers` 19/19 completas (no informan conteos individuales). `npm run api:build`, `npm run lint:boundaries` y `npm run docs:check` (0 problemas) en verde; `run-complete-suite --check`: 751 pruebas en 23 rutas; tablero válido con `taskboard.py check`.

Las primeras corridas de `fast` y `wrappers` fallaron por el entorno: el `node_modules` del worktree estaba vacío, así que no se encontraban `tsc` ni `next`. Un enlace al `node_modules` del repo principal arregló `tsc`, pero el build de Next no lo sigue fuera del worktree. Con `npm ci` dentro del worktree (dependencias ignoradas por Git) se repitieron `fast` y `wrappers` completas. `owned-db` corrió antes de esa instalación y desde entonces sólo cambiaron documentación y tablero.

Commit en la rama `claude/audit-database-fd9d93`, sin push, PR ni merge. Primer paso pendiente: que el usuario decida B11, S7 y S8 según las propuestas de arriba.

### Segunda tanda

La rama se rebasó sin conflictos sobre `origin/main` (`490105ff`, con F1 cortes 1 y 2). Sobre ese resultado: `fast` 3232/3232, `owned-db` 969/969 y `wrappers` 19/19 completas; `api:build`, `lint:boundaries`, `docs:check` (0 problemas) y `run-complete-suite --check` (754 pruebas en 23 rutas) en verde.

La primera corrida de `fast` tras el rebase falló en dos pruebas que fijaban el SQL anterior de la búsqueda de códigos: `classrooms-persistence.test.ts` (además su tipo de casos no admitía arreglos, lo que cortó el build de `wrappers`) y `classroom-preview-cover.test.mjs`, que además armaba la vista previa sin claves. Se actualizaron y se repitieron `fast` y `wrappers` completas; `owned-db` no incluye esos archivos.

Commits en `claude/audit-database-fd9d93`; push y PR contra `main` autorizados por el usuario a través de la coordinación. Sin merge ni auto-merge.
