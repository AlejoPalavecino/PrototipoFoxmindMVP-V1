# Reorganizar el backend por capacidades y responsabilidades

Propuesta del 2026-11-16 sobre `main`, commit `dd6f4bc92b959cce0e2c68343291614270c4a17e`. El resultado buscado es poder localizar, entender y cambiar una capacidad sin recorrer toda la aplicación ni depender de contratos SQL implícitos. Se conserva el monolito modular y se organiza su interior por capacidades funcionales.

**Estado:** diseño y ejecución aprobados el 2026-11-16 por el usuario, en rama propia para preservar el refactor frontend concurrente. Implementación en `codex/backend-capabilities`, con [tablero único](../../odd/tasks/backend-capabilities.md) y [registro de ejecución](../work-log/2026-11-16-root-backend-capabilities-execution.md). Commits, integración, push y despliegue mantienen sus autorizaciones propias. La [arquitectura vigente](architecture.md) describe el código efectivo; este documento conserva el diseño aprobado. [Preparación](../work-log/2026-11-16-root-backend-capabilities-plan.md).

**Ampliación de aceptación aprobada:** el usuario pidió adaptar también seis E2E de UI anteriores dentro de la rama backend, sin cambiar la interfaz. Se preservan sus reglas de privacidad, permisos, concurrencia, persistencia y admisión; sólo se reconcilian guiones y selectores con la UI vigente. La ejecución queda en TASK-026–028 y el cierre global en TASK-024. El agente frontend conserva la migración de sus imports al núcleo; la entrada de compatibilidad sigue disponible por decisión explícita.

**Resultado local:** implementación y seis E2E adaptados, con aceptación del alcance acordado y revisión independiente registradas en TASK-024. El mapa conserva615 fuentes API,134 pruebas reubicadas y37 archivos runtime nuevos. Las tandas finales verifican2808 fast,914 DB,52 servicios y75 browser seleccionados sin fallos/omitidas, además de19 wrappers y builds. Los33 archivos browser fuera de selección y los proveedores reales no se presentan como verificados. Los cambios permanecen locales, sin commits ni publicación.

## 1. Resultado, alcance y condiciones

- Conservar los 13 dominios, stack, rutas HTTP, payloads, códigos de error, roles, permisos, cuotas y comportamiento visible.
- Reorganizar capacidades, asignar decisiones al componente dueño, reducir interfaces amplias y reemplazar contratos SQL implícitos por operaciones tipadas.
- Conservar esquema, migraciones, formatos persistidos, trabajos IA existentes y configuración de proveedores. El tipado del estado de Estudio debe aceptar los datos válidos anteriores.
- Actualizar imports, composición, pruebas, loaders, inventarios, CI y documentación cuando una ruta cambie. Los consumidores web del núcleo compartido pueden requerir cambios de imports; no se rediseña la interfaz.
- Usar datos sintéticos y recursos descartables propios para verificación. No acceder a secretos, datos retenidos ni proveedores reales como parte del refactor.

Una capacidad se divide cuando hay responsabilidades, dependencias o motivos de cambio independientes. La cantidad de líneas sirve para revisar, no para decidir automáticamente una extracción. Se mantienen funciones puras y se crean clases cuando aportan un estado o ciclo de vida coherente. No se introduce un repositorio genérico ni una clase por endpoint por obligación.

## 2. Distribución y reglas propuestas

```text
apps/api/src/
  main.ts
  bootstrap/                         construcción, integración y ciclo de vida
  platform/                          soporte técnico neutral
  modules/
    classrooms/
      domain/                        reglas puras compartidas del módulo
      drafts/
        application/
          create-draft.ts
          publish-draft.ts
          draft-repository.ts
        infrastructure/
          sql-draft-repository.ts
        presentation/
          drafts-http.ts
      memberships/
      invitations/
      settings/
      catalog/
      public.ts
    study/
      folders/
      sources/
      conversations/
      generation/
      practices/
      reviews/
      public.ts
src/core/
  domain/<dominio>/                  reglas realmente compartidas con web/API
  contracts/                         contratos de cliente y técnicos separados
```

Se crean únicamente las capas que necesita cada capacidad. Para que su rol pueda validarse sin adivinar por el nombre del archivo, el patrón inicial usa carpetas de capa; una capacidad mínima puede tener sólo `application/`. No se crean directorios vacíos.

| Superficie | Regla de dependencia y responsabilidad |
|---|---|
| `domain` de capacidad/módulo | Reglas puras; sin HTTP, SQL, SDKs, framework ni adaptadores. El dominio compartido del módulo no depende de sus capacidades. |
| `application` | Coordina el caso de uso y define sus puertos. Consume dominio y contratos explícitos; no ejecuta SQL ni construye proveedores. |
| `infrastructure` | Implementa puertos, SQL, almacenamiento y proveedores. Conserva locks, CAS y comprobaciones atómicas dentro de la transacción. |
| `presentation` | Traduce HTTP, valida transporte y llama al caso de uso. No accede a stores ni a filas SQL. |
| `public.ts` del módulo | Exportaciones nombradas de casos de uso/contratos y reglas públicas necesarias; sin adaptadores ni exportaciones globales. |
| Capacidades hermanas | Colaboran con puertos definidos por el consumidor e inyectados en composición. No importan implementaciones privadas ni su propio `public.ts` agregador. Reutilizan reglas comunes desde el dominio del módulo. |
| Otros dominios | Acceso sólo por `public.ts`; una coordinación transaccional conserva actor y tx recibidos. |
| `bootstrap` | Construye adaptadores y conecta puertos y ciclos de vida. Los handlers y reglas que actualmente contiene migran a su capacidad. |
| `platform` | Dependencias técnicas compartidas; no conoce reglas educativas ni importa capacidades. |
| `src/core` | Conserva reglas necesarias para consumidores compartidos y DTOs apropiados; no recibe código sólo por ser reutilizable en dos servicios backend. |

Los adaptadores compartidos tienen un dueño concreto, por ejemplo custodia o entrega de correo. Se inyectan por puertos; no se crea una carpeta `common` o `utils` para mezclar responsabilidades. Si aparece una colaboración que no puede expresarse razonablemente así, se presenta una excepción concreta para revisión antes de implementarla.

## 3. Mapa inicial de los 13 dominios

Son agrupaciones propuestas a contrastar con consumidores en el inventario de cada corte. No obligan a crear una carpeta por cada nombre si la capacidad sigue siendo pequeña y coherente.

| Módulo conservado | Capacidades o familias de responsabilidad |
|---|---|
| `identity` | `accounts`, `sessions`, `profile`, `mail-delivery`; extraer flujos sólo si la cohesión lo justifica. |
| `files` | `uploads`, `downloads`, `custody`, `chat-attachments`. |
| `classrooms` | `drafts`, `memberships`, `invitations`, `settings`, `catalog`. |
| `curriculum` | `plan`, `topic-progress`, `generation`. |
| `materials` | `library`, `publication`, `revisions`; limpieza bajo el dueño del ciclo de publicación. |
| `communication` | `wall`, incluyendo conversaciones y moderación; producción de avisos conserva su atomicidad. |
| `activities` | `authoring`, `assignments`, `generation`. |
| `participation` | `attempts`, `practical-submissions`, `questionnaires`, `history`. |
| `grading` | `review`, `publication`, `corrections`, `progress`, `assistance`, `student-analysis`. |
| `agenda` | `events`, `academic-projection`; recurrencia/tiempo puros siguen en el núcleo donde los necesitan ambos consumidores. |
| `home` | `dashboard`, `search`, `notifications`; dueño propuesto para la bandeja unificada. |
| `foxy` | `conversations`, `turns`, `resources`, `citations`, `private-assets`, `visuals`, `publications`. |
| `study` | `folders`, `sources`, `conversations`, `generation`, `practices`, `reviews`; creaciones se asignan según el caso que gobierna su ciclo. |

Propuesta concreta para notificaciones: `home/notifications` posee consulta, apertura y estado de lectura; los productores académicos conservan la inserción del aviso dentro de su transacción. Se mantienen las URLs actuales bajo `/classrooms/notifications`. Los destinos compartidos conservan contratos neutrales y reautorización. No se crea un dominio número 14.

## 4. Secuencia y dependencias

Las unidades siguientes fueron aprobadas para ejecución en la rama backend. Responsable de coordinación: orquestador. Un implementador por superficie; revisión independiente de los cortes transaccionales/concurrentes. El [registro TTP único](../../odd/tasks/backend-capabilities.md) conserva aceptación, dependencias y evidencia por tarea. Los consumidores frontend del barrel compartido se coordinan por separado; el backend elimina sus dependencias de esa entrada y la conserva mientras tenga consumidores vigentes.

| Etapa / unidad | Depende de | Resultado verificable y superficies principales |
|---|---|---|
| **1 · P01 Base y mapa de cambios** | Aprobación del plan y ejecución | Inventario origen → destino por archivo/capacidad, consumidores, contratos, tests y frontera transaccional. Baseline con build fresco, inventario, controles y suites aplicables. Fallos previos identificados. |
| **1 · P02 Controles para ambas estructuras** | P01 | Guard AST, pruebas negativas, descubrimiento y loaders admiten la estructura actual y la nueva por reglas explícitas. Mantienen capas, APIs públicas, aislamiento frontend/backend y detección de ciclos. Cero nuevas excepciones congeladas. |
| **2 · P03 Piloto estructural: `curriculum/plan`** | P02 | Mover un caso pequeño ya bien separado con sus puertos, adaptador y pruebas. Mismo contrato HTTP, permisos, revisión y transacción; sin rediseñar comportamiento en este corte. Sirve de referencia para la distribución. |
| **2 · P04 Piloto de contratos: `activities/authoring`** | P03 | En cortes separados: mover la capacidad; después sustituir métodos numerados/genéricos por operaciones tipadas con objetos de entrada. SQL y locks inicialmente conservados. Corregir el dueño de `RevisionPort` y contratos de colaboración usados por el piloto. |
| **3 · P05 Gestión de aulas** | P04 | Migrar `settings`, `drafts`, `memberships`, `invitations`, `catalog` por unidades distintas. Extraer decisiones que hoy viven en `*-operations`; repositorios conservan persistencia. Permisos, publicación, cuotas y pertenencia invariantes. |
| **3 · P06 Capacidades académicas restantes** | P04 y puertos necesarios de P05 | Migrar currículo/generación, biblioteca/versiones, muro, asignaciones, participación y calificación. Tipar repositorios y extraer políticas por capacidad, sin abrir tx independientes. Cada dominio/caso importante tiene su propio corte y evidencia. |
| **3 · P07 Fachada y HTTP académicos** | Empieza con P03; termina tras P05/P06 | Cada capacidad recibe su handler y contrato HTTP acotado. Conservar admisión compartida, errores, límites de cuerpo, concurrencia y recibos. Retirar delegadores de `ClassroomService` sólo al quedar sin consumidores; `academic-http` deja de concentrar rutas. |
| **4 · P08 Identidad, archivos, Agenda e Inicio** | P03; bandeja completa tras P06 | Reorganizar por capacidades sin dividir artificialmente servicios cohesionados. Puerto de recepción de archivos oculta store/filas; lifecycle de identidad queda en host. Bandeja unificada en `home/notifications`, conservando productores y permisos. |
| **4 · P09 Estudio** | P04 y contratos files/agenda de P08 | Mover primero; luego generación explícita `prepare → validate → apply`, sin dispatcher con excepción sentinela. Tipar entrada/salida, estados y registros persistidos; contexto de schema separado del prompt. JSON previo válido, cancelación y recibos compatibles. |
| **4 · P10 Foxy** | P04 y contratos de P08; puede avanzar junto a P09 con superficies disjuntas | Reorganizar conversaciones, turnos, recursos, citas, assets, visuales y publicación. Extraer reglas editoriales de repositorios y SQL de aplicación. Conservar leases, custodia, replay, revisiones y autorización dentro de tx. |
| **5 · P11 Protocolo IA neutral** | P06, P09 y P10 | Migrar consumidores de a uno al protocolo neutral ya existente. Retirar compatibilidad superpuesta sólo al no tener consumidores. Preservar conteo, reservas, deadlines, despacho único, snapshot de proveedor/modelo y prohibición de fallback implícito. Sin activar otro proveedor. |
| **6 · P12 Cierre y controles definitivos** | P07–P11 | Retirar puentes y barrel global sin consumidores, incluyendo imports compartidos web/tests; cerrar reglas temporales de estructura antigua. Suites aplicables, revisión crítica, docs y mapa coherentes. Ninguna implementación duplicada ni prueba perdida. |

P06 y P08 no son cambios monolíticos: cada dominio y cada resultado verificable se desglosan al crear el tablero. P07 acompaña la migración, no exige rehacer todos los transportes al final. P09 y P10 pueden paralelizarse si no comparten archivos; P11 tiene dueño único para evitar cambios simultáneos en el protocolo IA.

## 5. Trazabilidad de los hallazgos

| Hallazgo de la auditoría | Unidad que lo resuelve | Evidencia requerida |
|---|---|---|
| Repositorios con métodos numerados, argumentos posicionales y `T` elegido por el llamador | P04, P05, P06 | Comandos/resultados concretos, pruebas negativas de tipos y contratos del adaptador con SQL real aislado. |
| Reglas de negocio en infraestructura y SQL en aplicación | P05, P06, P10 | Decisiones probadas con puertos sintéticos; adaptadores conservan locks, autorización de filas y atomicidad. |
| Generación de Estudio por replay del dispatcher/sentinela | P09 | Preparación, revalidación y aplicación explícitas; pruebas de cancelación, cambios concurrentes, replay y respuesta tardía. |
| Estado/proveedor de Estudio poco tipados y schema dependiente de parsear el prompt | P09 | Tipos discriminados, contexto estructurado y fixtures de JSON previo; cambio de texto no cambia restricciones por accidente. |
| Fachada académica y HTTP concentrados | P07 | Handlers por capacidad, contratos mínimos por consumidor y regresiones de rutas/admisión; cero consumidores de la fachada retirada. |
| Muro mezclado con bandeja de notificaciones | P06, P08 | Bandeja separada; lecturas, filtros, apertura y permisos equivalentes; productores continúan en su tx. |
| HTTP de archivos conoce store y filas SQL | P08 | Puerto de autorización de recepción; rechazo antes de aceptar el cuerpo y revalidación antes de mutar. |
| Compatibilidad IA con protocolos superpuestos | P11 | Misma reserva/liquidación y un despacho por trabajo; tickets aislados, sin reconteo o generación tras cancelación. |
| Barrel global y documentación contradictoria | Cada corte; retiro final P12 | Imports al dueño, ausencia de consumidores y guard negativo; arquitectura documenta sólo lo implementado. |
| Revisión de aula bajo contrato de Materials y hooks del host en aplicación | P04, P08 | Consumidores usan el puerto del dueño; pruebas de ciclo de vida conservadas. |

## 6. Aceptación, pruebas y evidencia

### Por corte

1. Registrar candidato, rutas, consumidores y pruebas antes de cambiar. Separar movimiento mecánico y extracción de responsabilidades en diffs revisables. Código, pruebas y documentación del mismo resultado se verifican juntos; objetivo aproximado de 400 líneas de autoría, justificando excesos cohesionados y separando renombres de cambios reales.
2. Para un movimiento, caracterizar el comportamiento existente y mantenerlo verde; no fabricar un RED funcional. Para nuevas restricciones de arquitectura, tipos o una regresión, obtener RED por la causa esperada y luego GREEN. Un fallo funcional descubierto se reporta; no se cambia producto silenciosamente.
3. Actualizar imports y mocks, suites explícitas, `complete-suite-inventory.json`, `complete-suite-routes.json`, loader/tsconfig/workflows afectados. Conservar correspondencia de pruebas antes/después: ninguna exclusión o disminución de aserciones usada para lograr verde.
4. Ejecutar build fresco cuando las pruebas usen `.build` o decoradores, tipos, límites y pruebas afectadas. Para persistencia, sumar contrato con PostgreSQL descartable propio y negativos de permisos/concurrencia que correspondan.
5. Guardar comandos, resultados, fallos y omisiones por tarea. Un movimiento compilado no alcanza para marcar el comportamiento DONE.

Comandos base para ejecución futura, sujetos al inventario de cada corte:

```powershell
node scripts/build-api.mjs
node node_modules/typescript/bin/tsc --noEmit -p apps/api/tsconfig.json
npm.cmd run lint:boundaries
node scripts/run-complete-suite.mjs --check
npm.cmd run docs:check
```

Las suites `pure` y `transport` y los grupos completos `fast`, `owned-db`, `owned-services`, `owned-browser` y `wrappers` se seleccionan leyendo su inventario y prerrequisitos. El cierre global exige todas las rutas aplicables a esta migración; una ruta bloqueada queda pendiente con su razón, no se presenta como PASS. Los ensayos opt-in de proveedor real siguen fuera de la aceptación sintética.

### Garantías observables de mayor riesgo

| Flujo | Aceptación que debe mantenerse |
|---|---|
| Aulas y publicación del borrador | Mismo actor/tx; orden de locks, promoción de bytes, plan, pertenencia/código y revisión atómicos. |
| Entregas | Propiedad de intento/editor, recepción confiable, revisión, adjuntos, aviso y encolado en su frontera vigente; doble envío/replay no duplica efectos. |
| Calificación | Cálculo exacto, separación privado/publicado, auditoría, corrección y aviso conservados; estudiante ajeno rechazado. |
| Archivos | Autorización antes de leer cuerpos grandes, revalidación antes de mutar, cuota/custodia/escaneo intactos, sin store expuesto al HTTP. |
| Estudio/Agenda | Carpetas previas válidas siguen legibles; confirmación/cancelación/conflicto conservan eventos y recibos; salida tardía no revive trabajo cancelado. |
| Foxy e IA | Leases, nonces, idempotencia, snapshots, revocación de permisos, reserva y liquidación conservados; ningún retry/fallback nuevo. |
| Host y cierre | Timers sin solapamiento, errores sanitizados y drenaje antes de cerrar DB/storage; preservar las semánticas existentes de rechazo. |

Los cambios de transacciones, custodia, presupuesto, leases y cierre requieren verificación independiente proporcional. Por defecto basta una revisión de otro agente sobre el candidato y pruebas independientes en recursos propios; no se afirma aislamiento estricto de escritor/pruebas si no se configuró y comprobó. Esa revisión no sustituye las pruebas de integración.

En el cierre se recorren con Ego Lite y cuentas sintéticas los flujos afectados de ambos roles: cuenta, aula/plan, biblioteca, muro/bandeja, actividad/entrega/devolución, archivos, Foxy, Estudio y Agenda. Se comprueban permisos y persistencia además de apariencia; los casos de generación usan proveedores sintéticos del entorno aislado. Si la verificación requiere servicios o recursos fuera de ese entorno, se explicita y resuelve antes de usarlos.

## 7. Transición y recuperación

- P02 admite temporalmente dos formas de ubicación, con las mismas prohibiciones y sin excepciones de import privado. P12 prohíbe rutas retiradas. Los permisos de `bootstrap` no se conceden a un handler por su antigua ubicación.
- Si un consumidor exige un puente de importación, será una reexportación nombrada hacia una sola implementación, con dueño, consumidores y condición de retiro registrados. No se duplican clases de error ni reglas.
- Cada corte conserva una base verificable. Si falla, se detiene su avance y se corrige o revierte sólo el cambio propio mediante un diff revisado, preservando trabajo ajeno. No se hace reset global ni se tocan datos para recuperar una reorganización de código.
- Una incompatibilidad de JSON, esquema, comportamiento HTTP, producto o proveedor se presenta como cambio de alcance antes de implementarla; no se agrega una migración incidental.
- Documentar el resultado real en guías canónicas y roadmap sólo tras verificarlo. Esta propuesta y su futura tarea no reemplazan la arquitectura vigente mientras el código siga en transición.

## 8. Decisiones para aprobar y primer paso

El plan propone: mantener los 13 dominios; usar capacidad → capas necesarias con roles comprobables; colaboración por puertos y composición; bandeja en `home/notifications`; piloto estructural en Plan y piloto de contratos en Autoría; conservar datos, API, stack y proveedores. Estas son decisiones de diseño propuestas para aprobar con el plan, no cambios ya ejecutados.

Tras esa aprobación y la autorización de implementación, crear un único registro `odd/tasks/backend-capabilities.md` desde la plantilla TTP, desglosar P05/P06/P08–P11 en resultados verificables y comenzar P01. El orquestador será su único escritor y reflejará seis hitos en el plan nativo. Commits, publicación y despliegue mantienen sus autorizaciones propias.
