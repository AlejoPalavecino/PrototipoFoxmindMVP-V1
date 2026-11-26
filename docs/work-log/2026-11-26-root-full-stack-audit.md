# Auditoría de frontend, backend y base de datos

Coordinador /root, 2026-11-26, sesión sin identificador expuesto. Rama `main`, worktree principal, commit `c5298e77`. Alcance autorizado por el usuario: auditoría completa de frontend, backend y base de datos buscando vulnerabilidades, acoplamiento, baja cohesión y código spaghetti, y guardar este informe. No autoriza cambios de producto, commits, publicación ni despliegue.

## Cómo se hizo y qué limita las conclusiones

Lectura estática del código. Cuatro revisores de sólo lectura cubrieron seguridad del backend, diseño del backend, frontend y base de datos; el coordinador releyó en el código los hallazgos que este informe da por confirmados. Cada hallazgo indica su estado: **confirmado** (se leyó el código que lo produce) o **plausible** (falta una medición o un dato de despliegue).

- No se ejecutaron pruebas, build, lint ni la aplicación. No hubo pruebas dinámicas ni conexión a ninguna base.
- No se leyeron `.env` ni `.test-artifacts/`.
- El repositorio no contiene configuración de producción: HSTS, TLS y el rol de base pueden estar resueltos fuera del árbol.
- Los filtros por dueño se revisaron por muestreo, no consulta por consulta.
- Sin revisar a fondo: workers de Foxy (publicaciones y visuales), `apps/api/src/platform/ai`, el cifrado del outbox de mail, los cuerpos completos de los triggers SQL y `apps/shared-ui/document-pdf.ts`.
- Los impactos de carga (pool, lock de IA, índices) no se midieron.

Comprobaciones ejecutadas por el coordinador: `npm audit` devolvió 0 vulnerabilidades; `git ls-files` y `git log --all --diff-filter=A -- .env` confirmaron que `.env` está ignorado y nunca entró al historial.

## Qué está bien resuelto

- **Inyección SQL.** Todos los valores viajan como parámetros posicionales; lo interpolado son constantes o listas cerradas.
- **Autorización.** No apareció acceso a recursos ajenos en los flujos seguidos de aulas, archivos, Foxy, estudio, calificaciones, muro e invitaciones. El acceso a aulas vuelve a autenticar dentro de la transacción.
- **Sesiones y CSRF.** Argon2id con verificación de costo equivalente para cuentas inexistentes; identificador de sesión de 256 bits guardado como digest; cookie `HttpOnly` y `SameSite=Lax`; verificación de `Origin` y token HMAC atado a la sesión en las escrituras; tokens de verificación y recuperación de un solo uso.
- **Archivos.** Validación de ZIP y XML antes de procesar, ClamAV antes de dejar un archivo listo, respuesta con `nosniff` y `CSP: sandbox`, sin URLs prefirmadas.
- **Frontend.** Sin XSS, SSRF ni redirecciones abiertas en lo revisado. El destino del proxy sale sólo de configuración validada; las rutas son listas permitidas; la CSP usa nonce por pedido; el markdown de IA se arma como elementos React.
- **Fronteras por imports.** Ningún import de producción llega a los internos de otro módulo, en backend ni en frontend, y la regla corre en CI.
- **Base.** FKs compuestas que atan los hijos a la misma aula, índices parciales únicos para la concurrencia, leases con reloj de la base, puertos de compose sólo en `127.0.0.1`.

## Seguridad

| # | Severidad | Hallazgo | Ubicación | Estado |
| --- | --- | --- | --- | --- |
| S1 | Alta | La aplicación se conecta como superusuario `postgres`, el mismo rol que migra. Ninguna migración define `GRANT`, `REVOKE`, roles ni RLS, de modo que el aislamiento entre aulas y cuentas depende de que cada consulta escrita a mano filtre por dueño. | `scripts/local-app.mjs:55`, `compose.p4.yaml:6`, `prisma/migrations/` | Confirmado en local y CI; plausible en producción |
| S2 | Alta si falta la clave | Sin `FOXMIND_PROXY_CLIENT_KEY` la API usa la dirección del socket, siempre loopback. Todos los límites por IP pasan a ser uno solo: 30 logins fallidos en 15 minutos bloquean el inicio de sesión de todos. | `apps/api/src/platform/http/client-address.ts:12` | Confirmado en código; depende del despliegue |
| S3 | Media | El cupo de transferencias de archivos es una bandera global del proceso. Un usuario que envía los bytes de a poco deja sin subidas ni descargas a toda la plataforma durante 10 a 30 segundos, repetible. Carpetas de estudio y adjuntos tienen topes globales de 4. | `apps/api/src/modules/files/uploads/presentation/http.ts:62` | Confirmado |
| S4 | Media | El contador de intentos por identificador se cobra antes de validar la contraseña. Con el email de la víctima, 10 logins y 3 pedidos de recuperación cada 15 minutos la dejan sin acceso. | `apps/api/src/modules/identity/accounts/application/runtime.ts:42` | Confirmado |
| S5 | Media | Un tope global de 300 fallos cada 10 minutos bloquea a todos la consulta de códigos de aula. Alcanzan unas 10 cuentas de alumno. | `apps/api/src/modules/classrooms/memberships/application/membership-code-operations.ts:10` | Confirmado |
| S6 | Media | El rol docente se elige al registrarse y las invitaciones no tienen cupo diario de destinatarios. El nombre del aula y del docente van en el cuerpo del mail: sirve como canal de spam desde el dominio propio y atrasa las invitaciones legítimas. | `apps/api/src/modules/classrooms/invitations/application/invitations-operations.ts:10` | Confirmado; el ritmo exacto del worker es plausible |
| S7 | Media | Los códigos de acceso de aula se guardan con SHA-256 sin clave. Con un volcado de la base se recuperan por fuerza bruta, en segundos los de 6 dígitos heredados. | `apps/api/src/platform/crypto/digest.ts:2` | Confirmado |
| S8 | Media | No hay purga, retención ni ruta de borrado de cuenta. Sesiones, tokens, turnos de Foxy y trabajos de IA se acumulan sin límite. | sin código de retención en `apps/api/src`; `docs/engineering/data-model.md:119` | Confirmado por ausencia |
| S9 | Media | El sobre cifrado de códigos e invitaciones no lleva versión ni identificador de clave: rotar `CLASSROOMS_DELIVERY_KEY` invalida todo lo sellado. | `apps/api/src/modules/classrooms/invitations/infrastructure/delivery-envelope.ts:4` | Formato confirmado; consecuencia deducida |
| S10 | Baja | `list()` ejecuta `tick()` antes de autenticar: un pedido sin sesión dispara dos `UPDATE` sin límite sobre `study_review_sessions`. | `apps/api/src/modules/study/reviews/infrastructure/runtime.ts:30` | Confirmado |
| S11 | Baja | Los nombres aceptan caracteres de control y bidireccionales, útiles para suplantar visualmente en mails e interfaz. | `apps/api/src/modules/identity/domain/security/inputs.ts:3` | Confirmado |
| S12 | Baja | La API ejecuta `docker run` para convertir `.doc` y `.ppt`: quien comprometa el proceso obtiene el host. El contenedor de conversión sí está aislado. | `apps/api/src/modules/files/custody/infrastructure/legacy-office.ts:19` | Confirmado |
| S13 | Baja | Faltan `Strict-Transport-Security`, `Permissions-Policy` y `Cross-Origin-Opener-Policy`. | `apps/web/next.config.mjs`, `apps/web/proxy.ts` | Ausencia confirmada en el repo |
| S14 | Baja | Cuatro proxies reenvían cualquier `Set-Cookie` de la API y tres sólo el borrado de sesión. La cookie no usa el prefijo `__Host-`. | `apps/web/src/application/server/` | Confirmado |
| S15 | Baja | `file-proxy` reenvía `Content-Type` sin lista permitida, a diferencia de `foxy-proxy` y `study-proxy`. Mitigado por `CSP: sandbox` y `nosniff`. | `apps/web/src/application/server/file-proxy.ts:155` | Confirmado |
| S16 | Baja | Tres archivos `*.prompt.txt` se publican desde `public/`. No contienen secretos. | `apps/web/public/foxmind/` | Confirmado |
| S17 | Baja | El presupuesto global diario de IA puede agotarse a propósito si el tope por actor no está configurado. | `apps/api/src/platform/ai/text-budget.ts:35` | Plausible; no se revisaron los valores configurados |

La calificación asistida por IA sólo propone: aplicarla y publicarla son acciones separadas del docente. No se encontró ninguna acción con efecto disparada directamente por la salida del modelo.

## Base de datos

| # | Severidad | Hallazgo | Ubicación | Estado |
| --- | --- | --- | --- | --- |
| B1 | Alta | Una subida a S3 ocurre dentro de una transacción de hasta 25 segundos que mantiene `users … FOR UPDATE`. | `apps/api/src/modules/files/custody/infrastructure/chat-attachment-service.ts:147` | Confirmado |
| B2 | Media-alta | El pool tiene 5 conexiones para HTTP y todos los workers, con `statement_timeout` y `connectionTimeoutMillis` de 1 segundo. No hay `lock_timeout` ni `idle_in_transaction_session_timeout`. Sumado a B1, un S3 lento puede agotar el pool. | `apps/api/src/platform/database/prisma.service.ts:11` | Configuración confirmada; impacto plausible |
| B3 | Media | `pg_advisory_xact_lock(78123001)` sin clave por dueño serializa las reservas y liquidaciones de IA de todos los usuarios. | `apps/api/src/platform/ai/text-budget.ts:56` y seis archivos de Foxy | Lock confirmado; contención plausible |
| B4 | Media | `study_folders.state` es un JSON de hasta 3 MB que se reescribe entero, y un trigger depende de la clave `linkedClassroomId`, sin FK. | `prisma/migrations/202611080003_study_folders/migration.sql:6`, `202611190001_study_strategy_sharing/migration.sql:41` | Confirmado |
| B5 | Media | Sólo identidad usa Prisma Client. El resto es SQL crudo con tipos declarados a mano: renombrar una columna no rompe el compilador. | `apps/api/src/modules/` | Confirmado |
| B6 | Media | Unas 65 FKs no tienen un índice que empiece por su columna, entre ellas varias de `notifications`, `foxy_conversations(classroom_id)` y `grading_ai_jobs`. | `prisma/schema.prisma` | Plausible; lista heurística sin `EXPLAIN` |
| B7 | Media | `$queryRawUnsafe` es el primitivo general y hay unas 50 interpolaciones de texto. Hoy son constantes; la seguridad depende de una convención. | `apps/api/src/modules/` | Confirmado que no hay entrada de usuario |
| B8 | Baja | Índices parciales únicos existen sólo en SQL y Prisma no los conoce. | `prisma/migrations/` | Plausible |
| B9 | Baja | Cuatro prefijos de migración duplicados y huecos de numeración. El orden es determinista por el nombre completo. | `prisma/migrations/` | Confirmado en nombres |
| B10 | Baja | Unos 30 `DROP CONSTRAINT … ADD CHECK` sin `NOT VALID` y sin índices `CONCURRENTLY`. | `prisma/migrations/` | Confirmado |
| B11 | Baja | El cupo diario corta en UTC y el mensual en hora de Buenos Aires; cinco formas distintas de borrado lógico; enums mezclados con textos con `CHECK`. | `apps/api/src/platform/ai/text-budget.ts:40`, `monthly-budget.ts:25` | Confirmado |
| B12 | Baja | La imagen de Postgres no está fijada por digest y no hay backups ni restauración probada en el repo. | `compose.yaml:4` | Confirmado por ausencia |

`docs/engineering/data-model.md` declara 69 modelos y 68 migraciones; el árbol tiene 71 y 70.

## Diseño del backend

El grafo de imports está limpio. El acoplamiento real es por duplicación y por SQL compartido, que las reglas actuales no detectan.

| # | Impacto | Hallazgo | Evidencia | Tamaño del remedio |
| --- | --- | --- | --- | --- |
| D1 | Alto | Reglas de aula copiadas como texto SQL. 39 archivos de Foxy consultan `classrooms`; `teacher_id` aparece 75 veces en ese módulo. `activities` se lee desde 8 módulos y `files` desde 10. | `apps/api/src/modules/foxy/` | L |
| D2 | Alto | Autenticación y admisión repetidas en 9 hosts. `IdentityRuntime` expone `store` y `configuration` como públicos. | `readSessionCookie(` en `apps/api/src/bootstrap/` e identidad | M |
| D3 | Alto | NestJS casi sin uso: 1 controller y ningún guard, pipe ni filtro. El resto es un transporte HTTP propio duplicado (8 escritores de respuesta, 7 tablas de error a status). `foxyRoute` tiene complejidad ciclomática cercana a 100. | `apps/api/src/modules/foxy/presentation/http-routes.ts:54`, `apps/api/src/bootstrap/academic-http.ts:138` | M o L |
| D4 | Alto | 12 colas durables hechas a mano con `SKIP LOCKED`, cada una con su claim, lease y recuperación. | 12 archivos en `apps/api/src/` | L |
| D5 | Medio-alto | Puertos de aplicación con la forma de Prisma en identidad (34 llamadas `tx.<modelo>.<op>`). | `apps/api/src/modules/identity/accounts/application/ports.ts:28` | M |
| D6 | Medio | `bootstrap/` está exento de reglas y contiene SQL de Study, un scheduler y ramas de test en la composición de producción. | `scripts/migration-boundaries.mjs:50`, `apps/api/src/bootstrap/study-agenda-integration.ts` | M |
| D7 | Medio | `request: unknown` llega hasta la capa de aplicación (307 apariciones en 78 archivos) y la hora de recepción de una entrega viaja por un `WeakMap` del pedido. | `apps/api/src/bootstrap/academic-http.ts:102` | L |
| D8 | Medio | 162 funciones con complejidad de 15 o más y 30 con 30 o más. `runStudy` llega a 100. Transiciones de estado de carpeta repartidas en 7 lugares. | `src/core/domain/study/engine.ts:125`, `apps/api/src/modules/study/folders/application/service.ts:233` | S a M |
| D9 | Medio | `src/core/domain/study/engine.ts` contiene el prompt del modelo y la llamada al proveedor, y sólo lo consume la API. | `src/core/domain/study/engine.ts:174` | M |
| D10 | Medio | 16 tests importan el build compilado y 30 comparan texto SQL literal; los tests están fuera de las reglas de límites. | `apps/api/src/modules/foxy/turns/infrastructure/tests/` | M a L |
| D11 | Medio | Ciclo `foxy` ↔ `files` por sus `public.ts`. El detector mira archivos, no módulos. | `apps/api/src/modules/files/custody/infrastructure/foxy-private-asset-files.ts` | S |
| D12 | Medio | `foxy/application/ports.ts` reúne 18 puertos de 7 capacidades y lo importan 25 archivos. | `apps/api/src/modules/foxy/application/ports.ts` | S a M |
| D13 | Bajo | `publicBarrels` y la regla de herencia apuntan a carpetas que ya no existen. | `scripts/check-boundaries.mjs:11` | S |
| D14 | Bajo | 12 clases de error propias, 12 guards de objeto plano y 41 adaptadores de transacción duplicados. | `apps/api/src/modules/` | S a M |

## Diseño del frontend

| # | Impacto | Hallazgo | Evidencia | Estado |
| --- | --- | --- | --- | --- |
| F1 | Alto | El proxy son 8 transportes copiados que ya divergen: política de `Set-Cookie`, drenado de cuerpos rechazados, `requestId` en errores y límite binario (`50*1024*1024` en `study-proxy.ts:7` frente a `50_000_000` en `file-proxy.ts:7`). | `apps/web/src/application/server/` | Confirmado |
| F2 | Alto | Validación de dominio reimplementada en el proxy con límites que también están en la API y en `src/core`, contados de forma distinta. | `apps/web/src/application/server/classroom-proxy.ts:124` | Duplicación confirmada; divergencia plausible |
| F3 | Alto | Componentes que mezclan carga, estado, reglas y render: `ActivityAuthoring.tsx` con 35 `useState`; `foxy-workspace.tsx` y `Activities.tsx` con 24 cada uno. | `apps/web/src/features/`, `apps/web/src/application/workflows/` | Confirmado |
| F4 | Medio | Efectos que sólo reinician estado y dependencias incompletas. `eslint-plugin-react-hooks` no está instalado. | `apps/web/src/application/workflows/classroom-workspace/ClassroomWorkspace.tsx:135`, `eslint.config.mjs` | Patrón confirmado; bug plausible |
| F5 | Medio | Sin capa de datos común: unos 8 clientes HTTP, 7 clases de error y un pedido de token CSRF antes de cada mutación. | `apps/web/src/application/clients/`, `apps/web/src/features/*/api` | Confirmado |
| F6 | Medio | `application/clients` y `application/transport` forman un ciclo; `application/navigation` contiene UI y un cliente HTTP; `workflows` concentra 4 de los 8 componentes más grandes. | `apps/web/src/application/` | Confirmado |
| F7 | Medio | 127 líneas de producción superan los 400 caracteres y 12 superan los 1000. | `apps/web/src/features/home/queue/HomePriorities.tsx:22` | Confirmado |
| F8 | Medio | La subida de un archivo tiene que terminar en 10 segundos, en el proxy y en la API, con límites de 20 y 50 MB. | `apps/web/src/application/server/file-proxy.ts:179` | Plazo confirmado; impacto plausible |
| F9 | Medio | La regla de arquitectura sólo detecta HTTP directo en tres features y no controla tamaño ni complejidad. | `scripts/check-frontend-architecture.mjs` | Confirmado |
| F10 | Bajo | Archivos sin referencias (`features/files/index.ts`, `account-artwork.tsx`, `BrujulaIcon.tsx`, `PlanWorkspace.tsx`) y componentes que sólo alcanzan los tests. | `apps/web/src/`, `apps/shared-ui/` | Confirmado por imports estáticos |
| F11 | Bajo | `features/foxy/model/` y `features/foxy/ui/` contienen sólo tests que cargan el código real por ruta en texto. | `apps/web/src/features/foxy/` | Confirmado |

Tipado: en producción no hay `any`, `eslint-disable` ni `@ts-ignore`.

## Orden recomendado

1. **Antes de exponer a usuarios reales:** S1, S2 y los límites globales S3 a S6.
2. **Bajo costo y alto retorno:** B1, B2, S7 y S10.
3. **Duplicación que ya es riesgo de seguridad:** F1 y D2.
4. **Deuda estructural:** D4, D1, F3 y un formateador con largo de línea en un commit aislado.

## Decisiones pendientes del usuario

- Adoptar NestJS con controllers, guard y filtro, o asumir el transporte propio y extraerlo a `apps/api/src/platform/http` (D3).
- Primitiva de colas propia o una dependencia como pg-boss o graphile-worker (D4).
- Criterio de qué pertenece a `src/core/domain` (D9).
- Política de retención y borrado por tabla (S8).
- Separar el rol de base que migra del que usa la aplicación, y si se agrega RLS (S1).

## Cambios, comprobaciones y siguiente paso

Cambios de esta sesión: este registro, su entrada en `docs/documentation-map.json` y su enlace en `docs/verification/README.md`. No se modificó código de producto ni se hicieron commits.

Primer paso pendiente: que el usuario elija el bloque a remediar y resuelva las decisiones que lo condicionan; recién entonces abrir el tablero en `odd/tasks/`.
