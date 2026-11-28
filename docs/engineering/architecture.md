# Arquitectura y tecnologías de FoxMind

FoxMind es una plataforma educativa para organizar aulas, planes, materiales, actividades, entregas y devoluciones. Cada cuenta tiene un rol exclusivo de docente o estudiante. La V1 está implementada con comprobaciones locales de alcance explícito; integración, publicación y despliegue tienen estados independientes en el [roadmap](../implementation-roadmap.md).

## Lectura del sistema

1. Abrí el [diagrama de arquitectura](../diagramas/arquitectura.html) para seguir una solicitud desde el navegador hasta los datos e integraciones.
2. El [modelo de datos](data-model.md) explica entidades, relaciones e integridad.
3. Las [funciones por rol y sección](../product/features-by-role.md) explican capacidades y permisos.
4. El [diseño UX/UI vigente](../design/README.md) explica recorridos, estados y componentes.
5. La [política documental](../documentation-policy.md) indica qué actualizar al incorporar una función.

## Tecnologías declaradas por el repositorio

| Área | Tecnología | Responsabilidad |
|---|---|---|
| Ejecución y lenguaje | Node.js 24, TypeScript 5.9.3 | Herramientas, servicios y tipado |
| Interfaz | Next.js 16.4.5, React 19.3.1 | Páginas, componentes y proxies HTTP; Pages Router en apps/web/pages |
| Estilos | CSS compartido y por pantalla, Tailwind CSS 4.3.3 | Brújula sobre componentes existentes; no asumir que todos los estilos históricos pueden retirarse |
| API | NestJS common/core 12.1.3, platform-express 12.3.2 | Composición, transporte y ciclo de vida |
| Persistencia | Prisma 7.10.0, pg 8.23.1, PostgreSQL 17.10 local | Acceso transaccional; migraciones SQL para restricciones adicionales |
| Archivos | SDK S3 3.1152.0, almacenamiento compatible con S3, ClamAV | Custodia privada, validación y escaneo |
| Identidad y correo | Argon2, Nodemailer, Mailpit local | Hash de contraseñas y flujos de correo; Mailpit captura sin enviar a destinatarios reales |
| IA y recursos | @google/genai 2.31.0, pdf-lib, sharp | Adaptadores de generación, documentos y recursos; capacidades sujetas a configuración/cuotas |
| Proveedor IA opcional | @anthropic-ai/sdk 1.8.0 | Adaptador Claude seleccionable por perfil de backend; pruebas sintéticas no certifican activación real |
| Verificación | node:test, Playwright, ESLint y control de límites | Pruebas por grupo, navegador y dependencias entre módulos |

Versiones tomadas del [manifiesto](../../package.json); el [lockfile](../../package-lock.json) fija la resolución. PostgreSQL local está declarado en [Compose](../../compose.yaml). Son datos del proyecto, no una recomendación de actualización ni una validación de soporte externo.

## Componentes y responsabilidades

Se conserva el monolito modular: una aplicación backend compone capacidades especializadas. Separar módulos no implica servicios desplegados por separado. La composición, contratos y excepciones se comprueban en el código y en el guard de límites, sin depender de relatos históricos.

| Superficie | Responsabilidad |
|---|---|
| apps/web/pages | Adaptadores Next de páginas y proxies /api/v1 |
| apps/web/src/application | Shell, navegación, clientes/transportes, workflows entre features y transporte servidor |
| apps/web/src/screens | Composición de pantallas a partir de las entradas públicas de features |
| apps/web/src/features | Dominios organizados por caso de uso, con UI/estado/estilos propios y contratos/adaptadores acotados |
| apps/shared-ui | Presentación genérica, controles y estilos Brújula; sin dependencia de features |
| apps/api/src/modules | Casos de uso y puertos por dominio; adaptadores de persistencia/proveedor y presentación HTTP |
| apps/api/src/bootstrap | Conexión de módulos, configuración del host y ciclos de vida |
| apps/api/src/platform | Base de datos, diagnóstico, paginación, soporte técnico IA compartido y transporte HTTP común (`platform/http`) |
| src/core/domain | Reglas neutrales agrupadas por dominio; sin dependencias de framework |
| src/core/contracts | DTOs académicos, contratos de cliente y contrato SQL separados de las reglas |
| prisma | Modelo físico y migraciones; incluye integridad no expresable sólo con el esquema Prisma |
| tests, scripts, ci | Contratos, runners, fixtures, controles y operación; no son código descartable por no estar en producción |
| docs, odd/tasks | Guías actuales, contratos, decisiones, tareas y evidencia atribuida |

Identidad controla sesión y verificación; cada capacidad revalida propiedad y membresía. Files conserva los bytes privados; el puente de adjuntos coordina su relación académica sin trasladar esa autoridad al navegador. Inicio y Agenda usan proyecciones autorizadas; los trabajos IA comparten admisión sin combinar sus políticas de privacidad.

La composición académica productiva crea un `AcademicRuntime` bajo el token `ACADEMIC_RUNTIME`: un solo `ClassroomCore`, sus puertos/tokens y las instancias agrupadas por capacidad. HTTP recibe ocho puertos de consumidor; Foxy recibe sólo `run/classroom`, Student AI sólo `progressView` y Activity AI sólo autenticación/base de datos y acceso al aula. Los callbacks conservan el servicio dueño como receiver. El provider de `InvitationService` selecciona la instancia concreta de invitaciones del runtime, sin usar el agregado como servicio de invitaciones.

La API plana `ClassroomService` queda exclusivamente en `tests/helpers/academic-fixture.ts` para fixtures y el host sintético `p5-runtime`. Su tabla tipada conserva métodos de prototipo y retornos de los servicios reales; construye el runtime productivo una sola vez desde el build estricto y delega sobre esas instancias, sin repetir composición ni reglas. No es un provider productivo.

La [base de ejecución IA](ai/README.md#ejecución-con-sdk-oficiales) conecta las seis tareas textuales a contratos/perfiles y SDK oficiales Gemini/Claude en `platform/ai`. Los dominios conservan sus puertos, permisos y reglas; `profile-client.ts` traduce sus solicitudes al ejecutor neutral y Estudio conserva SQL/admisión/presupuesto en un coordinador separado. Gemini es el default; Claude requiere perfil, habilitación y clave explícitos en backend. Los visuales mantienen su configuración específica.

Cada trabajo guarda un snapshot de proveedor/modelo, versiones, límites y tarifas sin secretos. `execution-snapshot.ts` lo valida y resuelve configuración local al trabajo; `execution-policy.ts` inicializa baseline y perfiles activos antes de iniciar workers. Cambiar configuración no reasigna trabajos existentes ni cambia sus precios. La transición exige drenar pendientes legacy antes del primer arranque de la nueva política. [Configuración y transición](ai/README.md#configurar-perfiles-textuales) · [modelo físico](data-model.md#instantánea-de-ejecución-ia).

## Flujo de una operación

El navegador usa Next.js y sus proxies `/api/v1`; el host Nest compone transportes y servicios, con dominio y puertos compartidos. La configuración determina qué módulos de archivos y aulas se integran. Las guías y contratos enlazados contienen las reglas.

```text
Navegador -> Next /api/v1 -> Nest (composición y transportes)
                                    |
                          servicios -> dominio / puertos
                                    |
 PostgreSQL, almacenamiento privado, escáner, correo y proveedor IA
```

- [Identidad](identity/README.md) y [archivos](files/README.md): sesión, autorización y contenido privado.
- [Aulas](classrooms/README.md), [enseñanza](teaching/README.md), [actividades](activities/README.md), [corrección](grading/README.md), [agenda](agenda/README.md) e [inicio](home/README.md): capacidades por dominio.
- [IA](ai/README.md) cubre extracción de planes, generación de actividades, análisis, asistencia de corrección, Foxy y Estudio, además de los recursos visuales y la cuota mensual.
- [Operación local](local-development/README.md) y [pruebas](testing/README.md): configuración, recursos propios y limpieza. Los procesos de trabajo y su ciclo de vida se describen en las guías correspondientes.

La cuenta verificada que inicia sesión ordinariamente llega a `/inicio`; destinos explícitos permitidos e invitaciones conservan su flujo y la verificación sigue siendo obligatoria.

Para una mutación, la UI reúne la intención y revisión; el proxy limita ruta, método, payload y destino backend. El transporte autentica y valida la solicitud, y el servicio decide permisos y reglas dentro de su unidad transaccional. PostgreSQL protege relaciones e invariantes; almacenamiento, correo y proveedores se integran mediante sus adaptadores. Las respuestas y errores vuelven a estados explícitos de la interfaz. Ocultar un botón no sustituye la autorización del servicio.

## Configuración del host y runtime de Estudio

El host admite las siguientes combinaciones. Se conserva el contrato de [configuration.ts](../../apps/api/src/bootstrap/configuration.ts): deshabilitar una capacidad no equivale a tener un proveedor disponible ni concede permisos.

| Files | Classrooms | AI | Capacidades compuestas |
|---|---|---|---|
| Ausente | Ausente | Ausente o `false` | Identidad, salud, Agenda e Inicio; sin transportes de Estudio ni adjuntos de chat |
| `1` | Ausente | Ausente o `false` | Lo anterior más archivos privados; sin Estudio ni Foxy |
| `1` | `1` | Ausente o `false` | Aulas, Foxy y Estudio con archivos, Agenda y avisos; generación sin proveedor responde `AI_UNAVAILABLE` |
| `1` | `1` | `true`, configuración completa | Lo anterior más las capacidades IA configuradas; conserva admisión, autorización y presupuesto |

Los nombres son `FILES_ENABLED`, `CLASSROOMS_ENABLED` y `AI_ENABLED`. Files/Classrooms se deshabilitan **por ausencia**, no con `false`; sus lectores sólo aceptan `1` cuando el flag está presente. Cada capacidad habilitada exige sus claves, cuotas y demás campos completos. No existe un flag independiente `STUDY_ENABLED`: Estudio y los transportes de adjuntos se montan sólo cuando hay archivos y aulas, aunque IA esté deshabilitada. `STUDY_STORAGE_QUOTA_BYTES` es opcional (entero decimal de 1–15 dígitos, incluido cero); no activa Estudio. El default del almacenamiento privado está en la [guía de Estudio](study/README.md#contratos-y-operación).

| Combinación rechazada | Error exacto del lector del host |
|---|---|
| Aulas sin archivos privados | `Invalid configuration: classrooms require private files.` |
| IA completa sin aulas | `Invalid configuration: AI extraction requires classrooms.` |
| IA habilitada incompleta/inválida | `Invalid configuration: AI extraction configuration is unavailable.` |
| Cuota privada de Estudio inválida | `Invalid configuration: private study storage quota.` |
| Visuales habilitados sin prerrequisitos/configuración válida | `Invalid configuration: Foxy visual configuration is unavailable.` |

Los visuales de Foxy son opt-in separados (`AI_IMAGE_ENABLED`/`AI_DIAGRAM_ENABLED`); requieren IA y su configuración específica. Un override de pruebas no modifica estas validaciones del entorno. En Estudio, `options.study.provider` tiene prioridad y reautoriza antes de generar; sin ese override, la presencia de `options.ai` impide recurrir a Gemini real. La ruta real exige configuración IA y contexto de dueño/solicitud, pasando también el callback de autorización al adaptador. Las fixtures de prueba son sintéticas, nunca copias del entorno local.

### Dueño y cierre del runtime

[study-runtime.ts](../../apps/api/src/bootstrap/study-runtime.ts) compone los servicios existentes de Estudio, autenticación, archivos, adjuntos, Agenda y avisos. Reutiliza sus fábricas y transacciones; no abre transacciones independientes. [application.ts](../../apps/api/src/bootstrap/application.ts) conserva sólo registro, montaje y coordinación del cierre. La admisión de uploads/avisos/adjuntos conserva cookie, autenticación de sesión, dirección remota obligatoria y admisión general de Identidad; los servicios siguen revalidando permisos.

- La limpieza de adjuntos corre cada 60 segundos con timer `unref`, sin superponer una ejecución pendiente. El fallo se captura con `Chat attachment cleanup unavailable` y habilita el próximo intento; no revela errores del driver.
- `close()` cancela ese timer e invoca el cierre de avisos, esperando ambos pendientes mediante `Promise.all`. El runtime de avisos conserva su timer de 30 segundos y su propio drenaje.
- El módulo raíz espera los cierres de Estudio, Foxy y workers con `Promise.allSettled` antes de cerrar correo, archivos y aulas; Prisma se destruye después en los módulos importados. Conserva el primer rechazo tras intentar la segunda fase.
- No se agrega idempotencia de `close()` ni una garantía de drenaje completo ante rechazo: el `Promise.all` interno conserva su rechazo temprano si falla el cierre de avisos. No confundir el camino de cierre exitoso con tolerancia adicional a fallos.

[architecture-host.test.mjs](../../tests/architecture-host.test.mjs) verifica el parser real, registro/montaje con bordes sintéticos y orden de cierre del root. [study-runtime.test.mjs](../../tests/study-runtime.test.mjs) verifica wiring, guardas de proveedor/admisión, no solapamiento, recuperación y espera de ambos pendientes en ambos órdenes. Son pruebas en memoria, no aceptación de servicios reales ni de transporte HTTP completo.

## Persistencia y trabajos diferidos

PostgreSQL mantiene las relaciones académicas, sesiones, revisiones y colas durables. Los archivos se almacenan de forma privada y se referencian por metadatos/custodia; una carga no se vuelve publicable por haber terminado de transmitir bytes. Las colas conservan estados, deduplicación y propiedad de ejecución; las tablas no ejecutan los trabajos por sí mismas. El host coordina su inicio y drenaje antes de cerrar infraestructura.

Hay seis tareas textuales: extracción de plan, generación de actividades, análisis individual, corrección asistida, [espacio Foxy](ai/foxy.md) y [Estudio](study/README.md). Proponer, guardar y publicar son operaciones distintas. La configuración del proveedor permanece en backend; su existencia no prueba que se haya ensayado con un proveedor real.

El [modelo de datos](data-model.md), las [guías de archivos](files/README.md) y las [guías IA](ai/README.md) detallan relaciones, estados y controles. No aplicar migraciones ni arrancar servicios sobre datos retenidos para comprobar esta documentación.

## Dónde empezar un cambio

La [migración aprobada](architecture-migration.md) organiza el candidato actual por dominios. Los directorios frontend anteriores `apps/classrooms-ui`, `apps/agenda-ui`, `apps/web/src/components` y `apps/web/src/lib`, y las carpetas API legadas, fueron retirados. No agregar nuevos imports hacia esas rutas. Se usa `application` porque `src/app` está reservado por Next; se conserva Pages Router.

Los módulos backend son identity, files, classrooms, curriculum, materials, communication, activities, participation, grading, agenda, home, foxy y study. Cada módulo expone `public.ts` con nombres explícitos; `presentation` llama a aplicación, infraestructura implementa sus puertos y `bootstrap` conecta dependencias. Crear sólo las capas necesarias. Las coordinaciones académicas y de archivos conservan el tx/actor recibido, locks, reautenticación y atomicidad; la extracción no habilita transacciones independientes.

| Módulo dueño | Responsabilidad |
|---|---|
| identity / files | Cuenta, sesión, seguridad y correo / custodia, escaneo y acceso a bytes |
| classrooms | Creación, propiedad, pertenencia, archivo y revisión de aulas |
| curriculum / materials / communication | Plan y avance temático / Biblioteca / Muro |
| activities / participation | Autoría y asignación / intentos, editor, recepción e historial |
| grading | Cálculo exacto, corrección, publicación, auditoría y progreso académico |
| agenda / home | Eventos privados y proyección académica / lecturas y avisos autorizados |
| foxy / study | Conversaciones y recursos privados / carpetas, prácticas y repasos privados |

### Capacidades dentro del backend

La [reorganización aprobada](backend-capabilities-plan.md) mantiene esos 13 módulos y agrupa su comportamiento por capacidad. Por ejemplo, `classrooms/drafts/application` contiene decisiones de publicación y su puerto; `classrooms/drafts/infrastructure` implementa persistencia. Cada capacidad crea sólo las capas que utiliza. No se exige una clase por endpoint ni se fragmenta por cantidad de líneas.

| Módulo | Capacidades implementadas |
|---|---|
| identity | accounts, sessions, mail-delivery |
| files | uploads, downloads, custody, chat-attachments |
| classrooms | access, catalog, drafts, settings, memberships, invitations, academic-projection |
| curriculum | plan, generation |
| materials | library, publication |
| communication | wall |
| activities | authoring, generation |
| participation | attempts, practical-submissions, questionnaires, history |
| grading | review, publication, corrections, progress, assistance, student-analysis |
| agenda | events, academic-projection |
| home | dashboard, notifications |
| foxy | conversations, turns, resources, citations, private-assets, visuals, publications |
| study | folders, sources, conversations, generation, practices, reviews |

`application` coordina reglas mediante puertos tipados; los adaptadores conservan SQL, locks y comprobaciones atómicas. Los comandos de repositorio tienen entradas y resultados concretos. La colaboración entre capacidades usa contratos públicos nombrados o puertos inyectados; la composición conserva el mismo actor y transacción. Las reglas compartidas puras quedan en `domain` del módulo. Los contratos que necesitan varias capacidades pueden permanecer en `application` del módulo como dependencias de tipos. Foxy conserva una presentación común para admisión, límites, errores y despacho HTTP; no contiene persistencia ni construcción de proveedores.

El transporte HTTP es propio (D3 de la auditoría, decisión del 2026-11-28): `platform/http/json-response.ts` escribe las respuestas JSON (`sendJson`) y resuelve código y estado de un error con la tabla que pasa cada host (`publicError`; un código desconocido cae al respaldo, 503 por defecto). `platform/` no importa clases de error de los módulos. Las capas `presentation` pueden importar `platform/http/` y nada más de `platform/`; el resto de las capas mantiene sus reglas. Migración por hosts según el [tablero](../../odd/tasks/audit-api-transport.md); las diferencias entre hosts que fija `tests/api-error-characterization.test.mjs` se conservan.

La bandeja pertenece a `home/notifications`; Muro y otros productores insertan sus avisos dentro de la transacción original. Las rutas HTTP existentes se conservan. La recepción de archivos utiliza un puerto de autorización y vuelve a comprobar la custodia al recibir el cuerpo, sin exponer el store al transporte. Estudio prepara, reserva, revalida, ejecuta fuera de la transacción y aplica el resultado junto con su recibo; cancelación y revocación siguen vigentes.

El frontend y el backend importan las reglas desde su dominio en `src/core/domain`. Los controles de arquitectura comprueban la dirección de estas dependencias y las entradas públicas de cada módulo. La fachada `domain/index.ts` conserva la compatibilidad de sus exportaciones. Los DTO compartidos viven en `src/core/contracts` y el contrato SQL de persistencia se define por separado.

La [verificación de integración](../verification/refactor-integration.json) reúne la evidencia del backend por capacidades y el frontend por casos de uso. El [mapa de archivos](../verification/backend-capabilities-map.json) conserva las rutas y huellas del refactor original.

Estudio conserva motor neutral en `src/core/domain/study/engine.ts`, casos de uso en `modules/study/application` y cargas/avisos en su infraestructura/presentación. `bootstrap/study-file-integration.ts` y `bootstrap/study-agenda-integration.ts` conectan las capacidades sin conceder permisos docentes. Ver [Estudio](study/README.md) y [frontend](frontend/README.md).

## Patrones en dependencias reales

- **Adapter:** `S3Storage`, `ClamdScanner` y los adaptadores Gemini implementan los contratos de almacenamiento, escaneo o generación que consumen los casos de uso. Traducen un proveedor externo sin introducir sus SDKs en las reglas neutrales.
- **Strategy:** los puertos de proveedor permiten seleccionar una implementación real o una sintética en pruebas. `selectFoxyVisualProviders` elige IMAGE/DIAGRAM según configuración y overrides; el caso de uso conserva presupuesto, autorización y publicación.
- **Factory:** `createFileInfrastructure` construye almacenamiento/escáner y su cierre; las fábricas de `bootstrap` conectan transacciones, identidad y módulos. Encapsulan dependencias y recursos concretos, sin jerarquías adicionales para representar el patrón.

1. Ubicá la regla en la [especificación vigente](../foxmind-v1-functional-spec.md) y su [matriz por rol](../product/features-by-role.md).
2. Seguí proxy → transporte → capacidad dueña → transacción/persistencia, consultando la guía de dominio y el código. La composición académica vive en bootstrap; las reglas de autoría, participación y calificación tienen sus propios módulos.
3. Elegí pruebas de permisos, contratos y datos según el cambio. Revisá [verificación](testing/README.md) y ejecutá lint:boundaries si cambia una dependencia entre módulos.

Fuentes: [host](../../apps/api/src/main.ts), [composición](../../apps/api/src/bootstrap/application.ts), [núcleo](../../src/core/domain/), [contratos](../../src/core/contracts/), [factory Files](../../apps/api/src/modules/files/custody/infrastructure/configuration.ts), [selección visual](../../apps/api/src/bootstrap/foxy-visual-host-providers.ts), [scripts](../../package.json). [Estado actual](../implementation-roadmap.md).
