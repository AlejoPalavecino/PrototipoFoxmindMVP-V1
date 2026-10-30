# Auditoría integral FoxMind — Astra, 2026-10-29

Base inspeccionada: `main`, `9fddbd815fc01b1822b6093231d6d40dbee979a0`. Autor: tarea `/root/astra_project_audit`. Alcance autorizado: auditar y proponer prioridades antes de nuevas funciones o UX/UI; **sin corregir producto, cambiar datos, publicar ni desplegar**. [Registro del auditor](../work-log/2026-10-29-astra_project_audit.md), [corroboración del coordinador](../work-log/2026-10-29-root-project-audit.md).

## Veredicto y resumen ejecutivo

**FoxMind no es un proyecto enteramente “espagueti”; sí tiene un núcleo de aulas que está creciendo como un servicio monolítico repartido mediante herencia.** Hay separación útil en Agenda, Inicio, seguridad, archivos y adaptadores IA, invariantes SQL fuertes y pruebas sustanciales. La principal deuda no exige cambiar TypeScript, React, Nest o PostgreSQL: exige detener la expansión de esa jerarquía, poner contratos verificables en las fronteras y reducir el alcance de cada operación.

Se identificó **un defecto P1 por crecimiento de datos válidos**: el Muro devuelve todo su historial y el proxy rechaza respuestas mayores de 2 MiB. Un aula suficientemente activa deja de poder cargarlo; reintentar no reduce el contenido. Los demás hallazgos son P2: deuda estructural o limitaciones concretas cuya exposición depende de cambios, volumen o fallos parciales. No se encontró un P0 ni un bypass de autorización demostrado en la muestra; esto no certifica ausencia de vulnerabilidades.

Antes de otra ronda amplia de funcionalidades recomiendo resolver el límite del Muro, establecer un gate de regresión representativo y acordar que no se añadan más capas a `ClassroomService`. Después, refactorizar por unidades conservando los contratos de publicación, privacidad, revocación y concurrencia. No recomiendo una reescritura, microservicios, una nueva cola externa ni una migración de stack.

## Cobertura y metodología

Se inventariaron todos los archivos versionados bajo `apps`, `src`, `tests`, `scripts` y `prisma` con extensiones `.ts`, `.tsx`, `.mjs`, `.css`, `.sql`, `.prisma`. No se contaron dependencias instaladas, outputs generados, assets binarios ni documentación como código. Las líneas son físicas, no complejidad ciclomática ni cobertura de tests.

| Superficie | Archivos | Líneas |
|---|---:|---:|
| `apps/api` | 194 | 11.068 |
| `apps/classrooms-ui` | 83 | 7.023 |
| `apps/agenda-ui` | 38 | 1.529 |
| `apps/shared-ui` | 53 | 3.532 |
| `apps/web` | 52 | 2.108 |
| `apps/p5-preview` | 1 | 45 |
| `src` | 26 | 983 |
| `prisma` | 20 | 2.648 |
| `scripts` | 47 | 3.408 |
| `tests`, incluidos helpers | 418 | 31.761 |

El análisis AST de TypeScript cubrió 382 archivos propios `.ts/.tsx`, excluyendo declaraciones `.d.ts`, y resolvió 1.233 aristas de imports/reexports relativos. Se encontraron seis componentes cíclicos **incluyendo relaciones de tipos**; no equivalen a seis ciclos de ejecución ni prueban fallos de inicialización. Entre los ciclos de valores inspeccionados están `files/service.ts ↔ promotion.ts` y `agenda-ui/event-draft.ts ↔ event-validation.ts`; no se observó un fallo de arranque causado por ellos. El inventario de herencia confirma 16 niveles desde `ClassroomCore` hasta `ProgressService`.

Lectura profunda orientada al riesgo: bootstrap y composición Nest; barriles públicos; cadena y transacciones de aulas; Muro/notificaciones; participación y corrección/publicación/progreso; admisión y sesión; custodia/promoción y puente de adjuntos; runtimes/cola/proveedor IA; servicios Agenda/Inicio; cliente y proxy de aulas; vista principal del aula, carga de plan/generación y respuestas; imports CSS de producción; esquema y selección de migraciones/invariantes; workflows y muestras de tests unitarios, UI e integración. Se contrastaron reglas de roles, archivos, Muro, calificaciones, progreso y stack con la especificación, roadmap y tareas P6/P8/IA.

**No fue una revisión exhaustiva línea por línea de todos los archivos.** No se ejecutaron navegador, integración DB, scanner, proveedor IA, carga concurrente, build, migraciones, auditoría online de dependencias ni análisis de secretos completo. Tampoco se leyeron configuraciones privadas, datos retenidos o credenciales. La aceptación histórica del roadmap no se contabiliza como una prueba nueva; las notas de ramas locales no sustituyen el árbol real de HEAD.

## Arquitectura observada y fortalezas

- **Monolito modular razonable para el producto.** Nest compone servicios y ciclo de vida; varios transports HTTP se instalan manualmente. Los handlers manuales no son por sí mismos un defecto, pero los contratos y gates deben cubrirlos porque no se benefician automáticamente de decoradores, guards y DTOs Nest.
- **Regla de dependencia preservada en el núcleo compartido inspeccionado.** `src/core/domain` importa otros módulos de ese núcleo, sin React, Nest, Prisma o SDK Gemini. `AgendaService` depende de `AgendaUnitOfWork`; Inicio recibe un puerto de lectura. Son modelos locales útiles para próximas extracciones, sin crear otro framework.
- **Seguridad en el servidor y rechazo conservador.** `identity/transport.ts:68` aplica admisión y `:70` valida origen (CSRF en `:72`); `classrooms/core.ts:53` autentica y revalida bajo lock; `files/service.ts:121` vuelve a autorizar tras I/O antes de habilitar bytes. La UI no es la única barrera de permisos.
- **Custodia de archivos explícita.** Digest de contenido, validación y escaneo deben coincidir; estados, cuotas, leases y autorizaciones están separados de la mera extensión. No hay aprobación automática por fallo del scanner en la muestra revisada.
- **Integridad académica.** Publicación de nota, puntero efectivo, revisión y notificación comparten transacción (`grade-publication.ts:45`); racionales/BigInt preservan precisión. El esquema usa claves compuestas y las migraciones añaden CHECKs e índices únicos parciales que Prisma no expresa por completo. Su tamaño no justifica eliminarlos.
- **IA sin autoridad para publicar.** Propuestas privadas, validación de salida, referencias acotadas, fencing por snapshot/epoch/lease, presupuesto y revisión docente. La corrección determinista de opciones se conserva. En grading IA el texto libre y PDF pueden contener datos identificatorios: es un límite explícito del alcance aprobado, no anonimización total ni una fuga demostrada por esta auditoría.
- **Pruebas de comportamiento existentes.** Hay verificaciones de precisión, privacidad, rechazo de IDs ajenos, rollback y CAS; no todo son snapshots o regex. Tipos API/web y el subconjunto seguro ejecutado por el coordinador pasaron.

## Hallazgos priorizados

Prioridades: P0 emergencia; P1 defecto importante a atender antes de ampliar el uso; P2 corrección/refactor planificado; P3 opcional. La prioridad distingue impacto potencial y evidencia, no cantidad de líneas.

### F01 — P1: el historial válido del Muro termina excediendo el límite del proxy

**Evidencia:** `apps/api/src/classrooms/wall.ts:47`, especialmente consultas `:53` y `:55`, cargan todas las publicaciones y respuestas del aula. `wall-policy.ts:5` admite 5.000 puntos de código por texto. `apps/web/src/lib/classroom-proxy.ts:7` fija 2 MiB; `:337` y `:338` rechazan una respuesta mayor y el handler devuelve `503 SERVICE_UNAVAILABLE`.

**Causa/escenario/impacto:** no hay paginación ni cota de historial en la respuesta. Solo 420 cuerpos ASCII de 5.000 caracteres suman 2.100.000 bytes, más que 2.097.152 antes de metadatos; Unicode puede alcanzar el límite antes. Un conjunto permitido de publicaciones/respuestas hace imposible cargar el Muro a través de la web. No se afirma que los datos actuales ya alcancen ese tamaño. El coordinador corroboró independientemente esta ruta de fallo por inspección.

**Corrección acotada:** cursor estable para publicaciones y carga acotada de respuestas por hilo, con contrato explícito en API/proxy/cliente. Preservar orden, tombstones y deep links a una respuesta fuera de la primera página. No subir indefinidamente `responseLimit` ni borrar historial. Revisar en la misma fase el patrón ilimitado de `listNotifications` (`wall.ts:124`), sin asumir que otros listados ya fallan.

**Prueba propuesta:** fixture aislada cuyo historial supere 2 MiB; cada página queda bajo el límite, todas las entradas son recuperables sin duplicados/pérdidas y una notificación abre el hilo correcto. Verificar permisos y moderación entre páginas.

**Dependencias/secuencia:** primer arreglo de producto propuesto; contrato de paginación antes de API/UI, RED antes de implementación. No depende de rehacer toda la arquitectura.

### F02 — P2: CI comprueba una selección centrada en grading IA, no una regresión representativa del producto

**Evidencia:** `.github/workflows/issue2-ci.yml:38` enumera siete archivos P7/P8/proxy y `:47` selecciona `grading-ai-*`. Tipos y builds sí se ejecutan. El otro workflow tiene `if: ${{ false }}` (`codex-pr-audit.yml:13`), por lo que su Gitleaks de `:22` no es un gate activo. No hay script/config de lint de fronteras en el inventario ni un job activo que lo ejecute.

**Causa/escenario/impacto:** cambiar autenticación, archivos, Agenda, Inicio o UI puede mantener el job verde sin ejecutar sus regresiones de comportamiento. No significa que falten esas pruebas en el repositorio; falta su selección reproducible y ejecutada por CI. Tampoco se verificó la configuración remota de checks obligatorios o protecciones de rama.

**Corrección acotada:** manifiesto de suites rápidas puras/contratos por superficie y matriz separada de integraciones aisladas, con exclusiones y opt-ins explícitos; añadir análisis de fronteras y secretos sin activar el template de Codex que requiere otra revisión. No lanzar todos los `*.test.mjs` a ciegas: varios son helpers o poseen side effects/fixtures. Incorporar primero pruebas existentes útiles, evitando checks que solo reflejen texto fuente.

**Prueba propuesta:** cambios controlados que rompan un contrato de Agenda, una regla de privacidad y un import prohibido deben hacer fallar su job; la lista de pruebas ejecutadas/skips debe quedar visible. Verificar independencia entre fixtures y límites de tiempo existentes.

**Dependencias/secuencia:** preparar antes de ampliar features; puede hacerse junto con F01. Es la red de seguridad para F03–F06.

### F03 — P2: aulas usa 16 capas de herencia para acumular capacidades sin relación de especialización

**Evidencia:** `apps/api/src/classrooms/service.ts:1` exporta `ProgressService` como `ClassroomService`. Cadena verificada: `ClassroomCore → Draft → Membership → Invitation → Plan → Library → Wall → ActivityAuthoring → ActivityParticipation → PracticalSubmission → QuestionnaireAttempt → ActivityHistory → Grading → GradingAi → GradePublication → GradeCorrection → Progress`. Ejemplos: `library.ts:8`, `activity-authoring.ts:23`, `grading-ai/service.ts:38`, `grade-publication.ts:13`, `progress.ts:16`. `contracts.ts:1` toma transacción y `FileStore` de internals de archivos; `files/attempt-bridge.ts:2` importa internals de aulas en sentido inverso.

**Causa/escenario/impacto:** la herencia distribuye un servicio grande entre archivos, pero no crea slices independientes. Progreso hereda invitaciones, carga, Muro y corrección; agregar una capacidad cambia la cadena que consumen todos. Los tests y workers acceden a la superficie completa y a `ports`. Esto reduce cohesión y vuelve más costoso razonar sobre permisos/locks al modificar un caso de uso. No se reporta un fallo funcional de herencia actualmente observado.

**Corrección acotada:** mantener temporalmente la fachada pública y extraer un caso de uso cohesivo por vez a composición: primero lectura de progreso o Muro; recibir una unidad de trabajo/autorización pequeña y puertos explícitos. Llevar el contrato SQL común a una frontera neutral, conservar los adapters de infraestructura en composición, y publicar interfaces mínimas para el puente de adjuntos. No exportar todos los internals por el barril como solución cosmética.

**Prueba propuesta:** caracterización de salidas/errores de la fachada, permisos por rol, revisión/CAS, rollback y revocación para cada extracción; check AST de nuevas dependencias. El comportamiento de `ClassroomService` debe mantenerse mientras se retira herencia internamente.

**Dependencias/secuencia:** F02 primero; F01 puede resolverse sin esperar. Prohibir nuevos niveles desde ahora como decisión de diseño, sin cambiar hoy producto.

### F04 — P2: contratos de aulas replicados y tipado genérico que no verifica el JSON recibido

**Evidencia:** DTOs manuales en `apps/classrooms-ui/api.ts:110` y `:136`; `response<T>` entrega `res.json()` en `:333`. Proxy mantiene reglas y validadores propios (`apps/web/src/lib/classroom-proxy.ts:11`, `:102`, `:177`), API valida por otra ruta (`classrooms/http.ts:134` y políticas), y `classrooms/policy.ts:41` devuelve `Record<string, any>` tras comprobar solo forma/claves.

**Causa/escenario/impacto:** `call<T>` permite declarar que una respuesta tiene cualquier forma sin comprobarla; cambios válidos para una capa pueden ser rechazados o interpretados distinto por otra. `strict:true` no verifica el JSON ni el SQL genérico y `any` omite verificaciones posteriores. El hallazgo es una brecha de garantía y duplicación comprobada, no una incompatibilidad concreta de payload demostrada en HEAD. La validación duplicada de seguridad en proxy y API es útil; lo que no conviene duplicar son sus definiciones.

**Corrección acotada:** un contrato compartido por endpoint que exporte tipos y parsers puros; usar el mismo parser en ambas fronteras y decodificar respuestas críticas. Empezar con el endpoint paginado F01 y luego corrección/publicación. Mantener autorización y reglas transaccionales en backend; no intentar mover SQL/SDKs al dominio. Cambiar `object` a `Record<string, unknown>` por unidades con estrechamientos explícitos.

**Prueba propuesta:** corpus común de entradas válidas/inválidas ejecutado en parser, proxy y API, más respuestas malformadas que el cliente convierta en error recuperable sin exponer datos ni romper render. Validar decimal, null, campos extra y discriminantes.

**Dependencias/secuencia:** F01 define el primer contrato; extender tras F02 y durante F03, evitando migración global de DTOs.

### F05 — P2: las lecturas compiten por un lock exclusivo y progreso hace trabajo cuadrático por alumno

**Evidencia:** `classrooms/core.ts:118` usa `FOR UPDATE OF c` tanto para lectura como escritura; `:73` fija la transacción a 6 segundos. `progress.ts:57` y `:60` filtran toda la matriz por cada estudiante, dos veces. `database/prisma.service.ts:11` limita el pool a cinco y `:12` configura consultas/statements a un segundo.

**Causa/escenario/impacto:** lecturas de una misma aula se serializan con otras lecturas y mutaciones. Si hay S alumnos y A actividades, el filtrado de S×A filas repetido por S alumnos es O(S²×A), bajo el lock del aula. Datos crecientes y consultas simultáneas pueden agotar presupuestos y devolver indisponibilidad. Se demuestra la forma del algoritmo y la contención, **no** un umbral de usuarios, SLA incumplido o benchmark real.

**Corrección acotada:** agrupar filas una vez por `studentId` y calcular cada resumen/promedio sin búsquedas repetidas. Medir espera de lock, tiempo SQL y serialización. Solo después evaluar snapshots de lectura/locks más estrechos, preservando consistencia, membresía, revocación y orden de locks. Cambiar `FOR UPDATE` por `FOR SHARE` sin diseñar las carreras no es una corrección segura.

**Prueba propuesta:** equivalencia exacta de progreso con cero, pendiente, reingreso y medias racionales; benchmark sintético con tamaños definidos; carrera lectura/publicación/remoción/archivo. No ampliar timeouts para ocultar regresión.

**Dependencias/secuencia:** agrupación local después de F02; cambio de locks requiere diseño y evidencia de concurrencia independientes de F03.

### F06 — P2: la vista del aula comparte carga y estado de secciones con fallos independientes

**Evidencia:** `apps/classrooms-ui/ClassroomView.tsx:75` carga detalle, resetea settings (`:84`) y ejecuta un `Promise.all` para miembros, historial e invitaciones (`:91`); solo después actualiza esos resultados. Las secciones y mutaciones comparten `busy`, `error`, `load` y confirmaciones. El archivo tiene 691 líneas, pero la causa es el acoplamiento de estados, no superar un límite arbitrario.

**Causa/escenario/impacto:** entrar al Plan dispara consultas de miembros/historial/invitaciones; si falla la última, se descartan para esa actualización también las respuestas exitosas. La sección Alumnos puede quedar vacía/obsoleta por un fallo en invitaciones y se muestra un error global. Recargar el aula también sobrescribe el borrador de settings. No se afirma una pérdida persistida ni un bug al cambiar de aula: el padre usa `key={classroomId}`.

**Corrección acotada:** shell con identidad/tab; hooks y estados de carga por sección, carga diferida y reintentos locales; separar borrador de configuración de datos confirmados y definir cuándo se reinicializa. Extraer roster/invitaciones/settings a componentes responsables sin cambiar estética ni navegación.

**Prueba propuesta:** historial o invitaciones falla y miembros/Plan siguen utilizables; respuesta vieja no reemplaza una nueva; retry local conserva el borrador; cambio de aula no reutiliza datos. Verificar con React real/DOM los flujos sensibles: el helper actual `tests/agenda-ui-helpers.test.mjs:30` sustituye internals privados de React y no demuestra reconciliación, foco o scheduling del renderer real.

**Dependencias/secuencia:** después de F02; permite continuar UX/UI sobre secciones delimitadas sin esperar completar toda F03.

### F07 — P2: el worker de grading IA espera 30 segundos después de cada trabajo aunque haya backlog

**Evidencia:** `apps/api/src/classrooms/grading-ai/runtime.ts:29` programa `runOnce` y vuelve a `poll` solo al finalizar; `:68` reclama un único job. `:21` mantiene una sola operación activa. La cola sí tiene coordinación durable y límites globales/por propietario (`grading-ai/sql-queue.ts:31`), que deben conservarse.

**Causa/escenario/impacto:** en un proceso, el rendimiento máximo es inferior a dos jobs/minuto incluso si el proveedor es inmediato. Para 40 trabajos ya encolados, solo los 39 intervalos entre ejecuciones añaden 19,5 minutos, más ejecución y espera inicial. Es una cota derivada del scheduler, no una medición real ni una promesa de latencia incumplida documentada. Un mismo docente puede ver una cola larga después de una entrega grupal.

**Corrección acotada:** intervalo largo cuando no hay trabajo; drenaje acotado al completar un job si aún hay elegibles, con yield/backoff, límite por ciclo y presupuestos existentes. No elevar concurrencia/consumo ni saltar la exclusión por docente; no hace falta introducir Redis.

**Prueba propuesta:** reloj controlado y proveedor sintético: varios trabajos drenan sin pausa fija entre cada uno, se respeta un trabajo activo, presupuesto, apagado, lease vencido y `PROVIDER_OUTCOME_UNKNOWN`; cola vacía no produce busy-loop.

**Dependencias/secuencia:** después de F02 y antes de ampliar procesamiento masivo; conservar admisión, coste e idempotencia actuales. El intervalo puede ser una elección conservadora del MVP: solo cambiarlo si una cola esperada, por ejemplo una clase de 40 entregas, requiere menos espera que esta cota. No es una urgencia ni un permiso para elevar concurrencia.

### F08 — P2: errores inesperados se sanitizan pero se pierde también su diagnóstico interno

**Evidencia:** `apps/api/src/application.ts:77` crea Nest con `logger:false`; `classrooms/core.ts:91` reduce excepciones no previstas a `SERVICE_UNAVAILABLE`; el poll de grading IA (`grading-ai/runtime.ts:29`) descarta rechazo con `catch(() => false)`. `main.ts` solo imprime eventos de inicio/fallo de arranque. Hay códigos persistidos de jobs, pero no explican todos los fallos previos a reclamar/guardar un job.

**Causa/escenario/impacto:** una consulta inválida tras migración, timeout o fallo de recuperación puede parecer la misma indisponibilidad y un worker puede seguir sondeando sin señal de causa. El mensaje público saneado es correcto; la ausencia de una señal operativa separada encarece diagnóstico y oculta si el problema crece.

**Corrección acotada:** puerto de telemetría con eventos/códigos estables, duración y correlación; redacción por allowlist, sin cuerpos, SQL con parámetros, tokens, correos, prompts ni archivos. Contadores de fallos de worker/cola y latencia/espera de lock. No imprimir indiscriminadamente el objeto `error` ni habilitar logs verbosos del SDK.

**Prueba propuesta:** fallo sintético SQL y recuperación de worker produce una señal interna saneada y conserva el mismo error público; assertions negativas de secretos/datos en el sink. Una repetición de errores es observable sin flood.

**Dependencias/secuencia:** útil antes de medir F05/F07, aislable del refactor de dominio; no requiere un proveedor externo de observabilidad.

## Plan incremental y criterios de salida

| Orden | Unidad propuesta | Salida verificable |
|---|---|---|
| Antes de nuevas features | F01: contrato, API/proxy y UI de Muro paginado | Historial mayor de 2 MiB recuperable, deep links y privacidad preservados |
| Antes de ampliar superficie | F02: selección CI por dominios + gate de fronteras/secretos | Regresiones representativas ejecutadas y exclusiones explícitas; no solo compilación |
| Decisión previa de arquitectura | F03: no sumar subclases; seleccionar primera extracción | Fachada compatible y caso de uso compuesto, con pruebas de caracterización |
| Refactor incremental | F04: contratos compartidos; F06: cargas/estado por sección | Paridad de validación y fallos aislados, sin rediseño visual obligatorio |
| Medición y escala | F08, agrupación de F05 y scheduler F07 | Diagnóstico saneado; equivalencia académica; menos trabajo repetido/espera artificial |
| Solo con evidencia adicional | Cambiar estrategia de locks, índices o concurrencia | Plan de consultas/carga y carreras reproducibles; invariantes intactas |

F01 es la corrección previa recomendada por un defecto concreto. F02 es una condición aconsejada para ampliar con confianza la superficie de pruebas y cambios, no una vulnerabilidad. F03/F04/F06 son refactors incrementales aconsejados; F05/F07 son optimizaciones condicionadas a volumen/latencia definidos y evidencia de concurrencia, no una instrucción de debilitar locks o límites seguros.

No es necesario terminar todos los P2 para corregir un detalle visual acotado. Para otra ampliación transversal sí conviene cerrar las primeras unidades y no agregar deuda a la cadena de servicios. Las unidades con contratos/DB/UI requieren diseño previo y permiso de implementación distinto al de esta auditoría.

Mejoras opcionales, sin defecto funcional demostrado: revisar CSS por pantalla al tocarla (producción importa sucesivamente `folders`, `foxmind-3d`, `workspace` y referencias en `apps/web/pages/_app.tsx:4`); consolidar solo selectores efectivamente redundantes con comparación visual. Evaluar `noUncheckedIndexedAccess` por módulo tras quitar `any`, no convertir su ausencia en una vulnerabilidad. Deshacer ciclos pequeños al extraer su helper puro, sin un proyecto global de “cero ciclos” como fin en sí mismo.

## Comprobaciones observadas y límites de aceptación

Realizadas por el auditor: Git rama/HEAD/status inicial limpio; inventario versionado y métricas de líneas; AST TypeScript de imports/reexports/herencia; búsqueda estructural con ast-grep y lectura de las rutas citadas. El primer intento de inventario con Python no produjo resultado utilizable y se reemplazó por PowerShell; un comando con glob de sintaxis Bash falló al parsear PowerShell y se repitió corregido. No se consideran checks exitosos ni afectaron producto. Las lecturas puntuales de rutas supuestas que no existían se reemplazaron por inventario real.

Corroboración **ejecutada por el coordinador**, comunicada y registrada por separado:

- `node node_modules/typescript/bin/tsc --noEmit -p apps/api/tsconfig.json`: exit 0.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false -p apps/web/tsconfig.json`: exit 0.
- `node --test --test-reporter=dot --test-timeout=30000 tests/p3-web-client.test.mjs tests/p3-web-proxy.test.mjs tests/issue2-ci-workflow.test.mjs`: exit 0; el reporte dot no aporta un total numérico. `FOXMIND_WEB_TEST_ORIGIN` ausente; browser opt-in no habilitado.
- `node --experimental-transform-types --disable-warning=ExperimentalWarning --test --test-reporter=tap --test-timeout=30000 tests/domain-barrel.test.mjs tests/dependency-security.test.mjs tests/p31-contracts.test.mjs tests/grading-ai-contract.test.mjs tests/grading-ai-provider.test.mjs`: 33 PASS, 0 FAIL, 0 SKIP; sin DB ni proveedor real. Node observado: v24.20.0.

Estos resultados no son una suite completa ni acreditan UX, carga, integración o seguridad productiva. `dependency-security.test` no reemplaza una consulta actual de advisories; no se afirmó ausencia de CVEs. No se generó cobertura porcentual ni métrica de duplicación token a token. No se alteraron archivos funcionales, pruebas, configuraciones o el roadmap, ni se realizó commit/push.

**Primer siguiente paso:** convertir F01 en contrato y prueba de regresión revisables, junto con la selección mínima de F02; requerirá autorización de implementación. El informe por sí mismo no ejecuta ese trabajo.
