# Extraer unidades y temas del plan con Gemini

ESTADO_DISENO: LISTO_PARA_TDD_RED

Diseño L3 aprobado para el aula existente: cuando el PDF/DOCX privado queda aprobado y guardado en el borrador, iniciar su análisis automáticamente. Mostrar unidades y temas extraídos, permitir editarlos y exigir confirmación docente para incorporarlos al borrador. La creación final conserva su revisión explícita. El usuario aceptó D1:A y pidió implementar, según instrucción actual del coordinador (2026-10-23); el gate previo a RED está cumplido. El diseño inicial precedió la implementación; la evidencia de cierre local se registra al final de este documento.

## Alcance y base observada

- Rama `codex/classroom-gemini`, base `ed06f885bfbf08725024013a7a45c9a3a723cfc7`. [Registro](../../docs/work-log/2026-10-23-design_classroom_ai.md).
- [Especificación §5/§7](../../docs/foxmind-v1-functional-spec.md), [P5](p5-classrooms.md), `apps/classrooms-ui/Wizard.tsx` y `api.ts`: cuatro pasos, carga PDF/DOCX de hasta 20.000.000 bytes, seguridad previa, autosave con revisión y publicación explícita.
- `classrooms/drafts.ts` guarda JSON versionado; publicar crea aula/unidades/temas y promueve el plan dentro de una transacción. `files/index.ts` es la frontera pública; `FileService.read` ya verifica autorización, disponibilidad y digest.
- El usuario amplía ahora el alcance para extracción con Gemini. La regla histórica de carga manual sin IA requiere una actualización acotada al implementar esta capacidad; no implica autorización para otras funciones IA.
- Extraer contenido presente en el documento; no inventar programas, unidades ni temas. Mantener el camino manual si no hay estructura reconocible o falla el proveedor. `.doc` legacy continúa rechazado.

## MATRIZ_DE_DECISION_Y_STACK

| ID | A | B | Recomendación fundada |
|---|---|---|---|
| D1: ejecución | Trabajo durable en PostgreSQL, worker con lease y consulta de estado. Tolera navegación/reinicio y evita I/O de Gemini bajo locks; agrega migración y ciclo de worker. | Solicitud síncrona con deadline de 20 s. Menor código y sin cola; un timeout pierde el resultado, puede consumir crédito y exige reintento docente. | **A**: un PDF válido de 20 MB no garantiza respuesta en 20 s. La cola recupera trabajo y conserva la propuesta sin bloquear el asistente. |

**Decisión vigente: D1:A aceptada por el usuario.** La comparación se conserva como fundamento histórico. Mantener TypeScript estricto/NestJS/PostgreSQL existentes, con adaptador del SDK oficial `@google/genai`; añadir otro lenguaje o servicio ampliaría despliegue y contratos sin mejorar esta extracción acotada.

## SUPUESTOS_ASUMIDOS

- Gemini Developer API y modelo de extracción configurables en el servidor; son supuestos técnicos reversibles. Créditos de Cloud/Vertex pueden requerir otro backend/configuración y no se presupone compatibilidad.
- PDF inline multimodal; DOCX convertido localmente a texto con párrafos/tablas. No OCR de imágenes incrustadas en DOCX. Avisar esta limitación y permitir edición manual; no convertir Office ejecutando binarios ni macros.
- Un archivo seleccionado y aprobado dispara la primera extracción sin otro botón obligatorio. Aviso visible: el plan se procesa con Gemini y la propuesta requiere revisión. Reintentos posteriores y reemplazo de contenido editado son explícitos.
- Los valores operativos propuestos abajo son configurables; no fijan una cuota comercial ni compran infraestructura. Sin configuración válida, la capacidad queda deshabilitada y funciona la carga/manual existente.

## Flujo propuesto para D1:A

1. Conservar el upload/escáner actual. Al obtener `ready`, guardar `planFileId` mediante la cola de autosave y luego invocar el alta idempotente. Al reabrir, repetir esa alta para el archivo actual: devuelve el mismo trabajo; no genera otra llamada cobrada.
2. El servidor autentica sesión real, verificación de correo, Origin/CSRF y propietario del borrador. Bajo locks verifica revisión, borrador no publicado y el mismo plan aprobado. Persiste snapshot de archivo/digest y trabajo `QUEUED`; responde rápido, sin contactar a Gemini.
3. Worker reclama un trabajo con lease, valida de nuevo borrador/archivo y obtiene bytes privados. PDF se envía inline; DOCX se transforma en texto acotado. Ejecuta una única capacidad de extracción con esquema estructurado, sin tools, agentes, RAG, enlaces externos ni acceso del modelo a la base.
4. Valida de nuevo la respuesta en el servidor y persiste la propuesta aparte de `classroom_drafts.payload`. Revalida archivo/digest/borrador antes de confirmar `READY`; una fuente cambiada o un aula publicada produce `STALE`.
5. En `Unidades y temas`, mostrar la propuesta editable y advertencias. `Usar unidades revisadas` aplica exclusivamente esas unidades bajo revisión optimista. Si ya hay contenido docente, pedir confirmación de reemplazo; no mezclar ni deduplicar nombres silenciosamente.
6. Luego se usa el autosave habitual y `Revisión → Crear aula`. Gemini nunca publica ni llama `publishDraft`. La edición manual está disponible durante espera/error; la llegada tardía de una propuesta nunca pisa ese contenido.

## CONTRATOS_Y_PLAN_POR_SLICE

Crear el núcleo compartido en la raíz `src/core/domain/`, inexistente hoy, para consumo real de API y UI. Esquemas/validadores puros sin NestJS, Prisma, Node Buffer ni SDK. Exportar desde `src/core/domain/index.ts`; adaptar los includes/imports y salida del build existente antes de trabajar ambos frentes. Reutilizar límites actuales de `classrooms/policy.ts` sin endurecer los borradores incompletos.

```ts
// study-plan.ts: forma canónica de creación; sin IDs ni estado académico.
export interface CurriculumUnit { name: string; topics: { name: string }[] }
export interface ExtractedCurriculum {
  units: CurriculumUnit[];
  warnings: ('PARTIAL_STRUCTURE' | 'DOCX_IMAGES_OMITTED')[];
}
export type ExtractionState = 'QUEUED' | 'RUNNING' | 'READY'
  | 'FAILED' | 'STALE' | 'APPLIED';
export interface StartExtraction {
  revision: string;
  planFileId: string;
}
export interface RetryExtraction { revision: string; requestId: string }
export interface ApplyExtraction {
  revision: string;
  requestId: string;
  units: CurriculumUnit[];
}
export interface ExtractionView {
  id: string;
  draftId: string;
  planFileId: string;
  baseRevision: string;
  state: ExtractionState;
  proposal: ExtractedCurriculum | null;
  error: ExtractionError | null;
  retryable: boolean;
}
export type ExtractionError = 'FILE_NOT_READY' | 'AI_INPUT_LIMIT'
  | 'NO_STRUCTURE' | 'INVALID_AI_OUTPUT' | 'AI_UNAVAILABLE'
  | 'AI_RATE_LIMITED' | 'AI_BUDGET_EXCEEDED' | 'AI_TIMEOUT'
  | 'PROVIDER_OUTCOME_UNKNOWN';
export type PlanDocument =
  | { kind: 'pdf'; bytes: Uint8Array }
  | { kind: 'text'; text: string };
export interface StructuredExtractionPort {
  countStudyPlanTokens(input: {
    document: PlanDocument;
    schemaVersion: 'study-plan-v1';
    signal: AbortSignal;
  }): Promise<number>;
  extractStudyPlan(input: {
    document: PlanDocument;
    schemaVersion: 'study-plan-v1';
    signal: AbortSignal;
  }): Promise<{
    json: unknown;
    inputTokens: number | null;
    outputTokens: number | null;
  }>;
}
export interface ApprovedPlanReader {
  read(input: {
    ownerId: string; draftId: string; fileId: string; digest: string;
  }, signal: AbortSignal): Promise<PlanDocument>;
}
```

Los contratos de transporte resuelven `ExtractionError` junto con los errores existentes de autenticación/CSRF, `INVALID_INPUT`, `FORBIDDEN` y `CONFLICT`. Exportar parsers `parseStartExtraction`, `parseRetryExtraction`, `parseApplyExtraction`, `parseExtractedCurriculum` y JSON Schema `studyPlanSchemaV1`. Todos reciben `unknown`; rechazan claves extra, tipos coercionados, controles, vacíos y límites excedidos. Esquema raíz `{units,warnings}` sin texto libre del proveedor.

| Operación dentro de `/api/v1/classrooms` | Entrada y salida |
|---|---|
| `POST /drafts/:draftId/curriculum-extractions` | `StartExtraction` → `202 ExtractionView`, o `200` si existe la extracción para la fuente actual, aun con revisión general anterior. Fuente distinta o revisión obsoleta al crear un trabajo nuevo: `409`. |
| `GET /drafts/:draftId/curriculum-extractions/:id` | `200 ExtractionView`; solo propietario. `Cache-Control: no-store`. |
| `POST /drafts/:draftId/curriculum-extractions/:id/retry` | `RetryExtraction` → `202 ExtractionView`; solo último fallo reintentable y misma fuente. |
| `POST /drafts/:draftId/curriculum-extractions/:id/apply` | `ApplyExtraction` → `{ extractionId, appliedRevision, draft }`, con la misma forma pública de borrador actual. Solo `READY` y fuente actual. |

`StartExtraction` autentica/autoriza y compara primero el archivo actual; después busca el trabajo existente y solo exige igualdad de revisión si debe crear uno nuevo. Devuelve el último trabajo de la misma fuente/versiones, incluso fallido o aplicado, sin reejecutarlo. Identidad de fuente: borrador + fileId + digest + versión de capacidad/prompt; no incluye revisión general, para no cobrar otra vez al editar materia. `requestId` UUID en retry/apply persiste con hash de entrada: repetición idéntica devuelve resultado confirmado; reutilización con otra entrada produce `409`. Retry de un fallo tiene un único sucesor; solicitudes simultáneas reciben el mismo sucesor.

En apply, el servidor conserva todo el payload excepto `units`, incrementa la revisión y marca `APPLIED` en la misma transacción. La respuesta idempotente incluye el borrador actual y la revisión original aplicada, evitando devolver un snapshot obsoleto. Una revisión diferente, otro archivo, publicación o propuesta ya aplicada con otra solicitud devuelve `409`; no auto-rebase. El docente puede editar libremente después de aplicar y antes de crear.

### Contrato ejecutable de backend y host real

`apps/api/src/app.module.ts` no existe: `AppModule` vive en `application.ts`; `ClassroomsModule.integrated` construye servicios y `ClassroomHostLifecycle` drena recursos antes de Prisma. Extender esa composición, sin crear otro host ni autenticación. Exportar las clases/puertos siguientes por `apps/api/src/classrooms/ai/index.ts`. `createClassroomsHandler` es un handler HTTP manual; mantiene admisión una vez, body JSON ≤512 KB y errores públicos existentes. Añadir rutas IA y estado `202` de alta fresca/`200` de deduplicación antes del fallback404; no asumir controllers Nest.

```ts
// Tipos de dominio anteriores; FileTransaction/ClassroomPorts importados de sus puertos.
interface ApprovedPlanSnapshot {
  fileId: string; digest: string; extension: 'pdf' | 'docx'; sizeBytes: number;
}
interface AiPlanSource extends ApprovedPlanReader {
  snapshot(tx: FileTransaction, request: unknown, draftId: string,
    fileId: string): Promise<ApprovedPlanSnapshot>;
}
interface ClassroomAiOptions {
  database: ClassroomPorts['database'];
  authenticate: ClassroomPorts['authenticate'];
  reader: AiPlanSource;
  provider: StructuredExtractionPort;
  configuration: ClassroomAiConfiguration;
}
interface QueueResult { created: boolean; view: ExtractionView }
// Constructores y métodos observables; no implementación en este documento.
class ClassroomAiService {
  constructor(options: ClassroomAiOptions);
  start(request: unknown, draftId: string, input: unknown): Promise<QueueResult>;
  get(request: unknown, draftId: string, id: string): Promise<ExtractionView>;
  retry(request: unknown, draftId: string, id: string, input: unknown): Promise<QueueResult>;
  apply(request: unknown, draftId: string, id: string, input: unknown):
    Promise<{ extractionId: string; appliedRevision: string; draft: DraftView }>;
}
class ClassroomAiWorker {
  constructor(options: ClassroomAiOptions);
  runOnce(): Promise<boolean>;
  onModuleDestroy(): Promise<void>;
}
```

`DraftView` tiene la forma actual `{id,revision,payload,publishedClassroomId}`. `reader.snapshot` opera solo en DB dentro del contexto autorizado, aplica seguridad files existente y nunca lee bytes/contacta proveedor. `reader.read` ejecuta lectura privada/parsing con grant durable y revalidaciones fuera de transacciones. Exportar ambos contratos por el barril files; RED usa un fake de esa frontera y pruebas de integración separadas contra el reader real. El servicio consulta borradores/jobs, no internals de storage/custodia.

Servicio: conservar la semántica de `ClassroomCore.run`: autenticar, lock usuario, correo verificado, autenticar de nuevo y luego lock borrador. Extraer un helper autorizado si hace falta; no forzar su constructor, que exige claves de invitación ajenas a IA. Transacciones DB acotadas a6s; start/get/retry/apply no llaman count/extract ni leen blobs. HTTP conserva `INVALID_INPUT`400/`FORBIDDEN`403/`CONFLICT`409/`SERVICE_UNAVAILABLE`503 y errores identidad actuales; fallos IA detallados se persisten en `ExtractionView.error`, sin ser sanitizados accidentalmente por un catch genérico.

Worker: `runOnce` reclama como máximo un trabajo elegible y retorna `false` si no existe, `true` si lo reclamó aunque termine en fallo de capacidad. Constructor no inicia timers; el lifecycle inicia polling y tests llaman `runOnce` explícitamente. Usa DB clock, leases/fencing, snapshot privado, conteo, reserva y extracción; los I/O ocurren fuera de tx. Fallos SQL sistémicos se propagan, no se convierten en una respuesta IA inventada. Un reintento transitorio conocido puede programar `RUNNING → QUEUED` con `next_attempt_at`; otra ejecución consume el siguiente dispatch. Timeout/resultado incierto no se reenvía automáticamente.

`ClassroomAiConfiguration` valida modelo/backend, deadlines/edad/dispatches, concurrencia, límites de tokens y presupuesto global/actor/trabajo. RED/C2 acuerdan los nombres públicos `dailyActorRequests`, `dailyGlobalRequests`, `dailyBudgetUsd`, `inputUsdPerMillion`, `outputUsdPerMillion`; consumir esa misma configuración o normalizarla una vez, sin diccionarios divergentes. Montos USD validados se convierten a microUSD enteros; cálculo BigInt/ceil por separado para entrada y salida. `countStudyPlanTokens` cuenta documento + instrucciones/esquema del mismo request de generación; un valor no finito/entero/positivo o sobre el máximo impide `extractStudyPlan`. Reservar el peor caso de entrada contada + salida máxima en DB antes del dispatch; deduplicación no consume otra reserva.

Credencial queda en configuración privada del adaptador Gemini; el servicio/worker solo reciben el puerto. El host crea adapter/config una vez e inyecta el mismo puerto/fakes por opciones; no lee entorno ni crea SDK dentro de casos de uso. Capacidad ausente/off conserva host/manual anteriores; enabled con configuración inválida falla cerrado con error de configuración sanitizado. `installClassroomsTransport` recibe servicio IA opcional mediante opciones compatibles; `AppModule.onModuleDestroy` drena worker IA antes de files/Prisma. RED debe demostrar que generar una propuesta no toca payload ni publica el aula.

## Permisos, archivos y concurrencia

- El reader nuevo pertenece al módulo files y se exporta por su barril. El host lo construye con autorización obligatoria de trabajo; el módulo IA no lee `storage_key`, credenciales S3 ni internals de files. No usar URLs públicas o firmadas ni reenviar cookies/sesión a Google.
- El grant durable queda ligado al actor, borrador, archivo, digest y trabajo reclamado. No crea una sesión de usuario: cerrar sesión no cancela un trabajo ya autorizado. En el worker se revalidan propietario, correo verificado, borrador sin publicar y fuente actual. Lectura/status/apply HTTP siempre usan sesión real vigente.
- Reutilizar la regla de files: carga `COMPLETED`, fase `ready`, validación `APPROVED`, scan `CLEAN`, blob presente y digest de bytes igual a digest validado/escaneado. PENDIENTE/ERROR/rechazado nunca llega al modelo. Revalidar antes y después de I/O con el mismo reader, sin replicar el escáner.
- Locks de negocio: usuario → borrador → archivo/custodia → trabajo; claim de worker en una transacción separada que libera su lock antes de pedir locks de negocio. Ninguna transacción permanece abierta durante S3, parsing o Gemini. Lease con nonce/fencing rechaza respuestas de un worker vencido.
- `QUEUED → RUNNING → READY | FAILED | STALE`; `READY → APPLIED | STALE`. Sustituir plan/publicar invalida resultados pendientes al siguiente acceso/finalización. No borrar unidades ya guardadas; advertir que pertenecen al plan anterior y exigir revisión docente del reemplazo.
- Una edición ajena al plan durante la extracción no invalida la propuesta; apply utiliza la revisión actual que el docente revisó. Dos pestañas no pueden aplicarla sobre una revisión obsoleta. Publicar conserva atomicidad y orden de promoción P4 actuales.

## Persistencia y límites operativos propuestos

| Cambio | Campos/invariantes |
|---|---|
| Nueva `classroom_curriculum_extractions` | UUID, owner/draft/file FK RESTRICT, source digest, base_revision, schema/prompt/model versions, state, proposal JSONB, error_code, created/updated/completed_at, generation/retry_of, apply_request_id/input_hash/applied_revision, dispatch_count, lease_nonce/until, dispatch_started_at, next_attempt_at, token usage. Unique source/version/generation, unique retry_of y request IDs por actor. |
| Nueva `ai_usage_daily` | Día UTC + ámbito global/actor + capacidad; reservas/consumo de solicitudes y tokens. Unicidad y actualizaciones atómicas impiden eludir cuotas mediante procesos o pestañas concurrentes. |
| Migración forward y Prisma | Solo tablas/índices/relaciones nuevos; no cambiar las tablas de unidades/temas ni migraciones históricas. Hacer fetch/reconciliación antes de generarla. No aplicar a bases retenidas. |

La propuesta contiene contenido educativo privado y recibe el mismo acceso que el borrador. Conservarla para reanudar; no copiar documento/texto completo a DB/logs. Retener contadores e identidades para deduplicación; una limpieza futura debe preservar esa identidad y no borrar archivos/borradores. No crear un historial público de prompts.

- Límites iniciales de extracción: archivo actual 20 MB; PDF hasta 100 páginas; DOCX hasta 1.000 entradas/32 MB descomprimidos/200.000 caracteres de texto; parsing en worker acotado a 3 s. Excederlos conserva el plan válido y ofrece carga manual, sin truncar silenciosamente.
- Salida válida: 1–100 unidades, 1–100 temas por unidad, máximo 500 temas total; nombres 1–120 caracteres Unicode según política actual, JSON hasta 256 KB. El esquema proveedor permite `units: []` para expresar ausencia de estructura; el caso de uso lo convierte en `NO_STRUCTURE` antes de validar una propuesta exitosa. No HTML ejecutable, markdown renderizado ni campos de instrucciones. Respuesta incompleta/truncada/bloqueada es error; nunca contenido parcial aprobado.
- Runtime piloto revisable: 1 trabajo activo por actor, 2 dispatches locales concurrentes globales mediante leases DB; deadline configurable de proveedor 90 s/dispatch, 2 dispatches máximos por trabajo y edad máxima de trabajo 300 s. El HTTP de alta/status permanece breve, independiente del trabajo; no ampliar los límites compartidos de builds/pruebas. El worker cancela/draina dentro de su lifecycle. Cancelar no garantiza detener procesamiento/facturación ya aceptado por el proveedor.
- Backoff con jitter/Retry-After solo para errores transitorios clasificados; no retry de permisos, parsing, esquema, bloqueo o ausencia de estructura. Tras timeout/crash con llamada enviada y sin resultado confirmado: `PROVIDER_OUTCOME_UNKNOWN`, sin reenvío automático; el docente puede reintentar sabiendo que pudo consumir crédito.
- Reservar cada dispatch antes de I/O: máximo inicial 5 por actor/día y techo global diario requerido en configuración; límite de entrada 100.000 tokens y salida 16.384 por dispatch. Preflight de tokens del adaptador antes de generación; falta de conteo fiable falla cerrado con alternativa manual. Configurar también techo monetario y precios del modelo para reservar el peor caso de entrada/salida por intento; sin precios/techo válidos no habilitar. Si falta usage final, consumir la reserva completa. No prometer facturación exactamente una vez ni retención cero del proveedor.
- `AI_ENABLED`, backend, modelo, credencial, cuotas/token/moneda, deadlines y concurrencia son configuración servidor validada al iniciar. `.env.example` solo nombres/placeholders. Mensajes públicos en español sin stack, prompt privado, claves ni errores crudos de Google; logs solo IDs técnicos, estado, duración, tokens y error sanitizado.

## ESTRATEGIA_EQUIPO_Y_SUPUESTOS

Trabajar en este worktree aislado; no tocar el checkout histórico. Micro-unidad de contrato compartido primero, luego superficies disjuntas. Cada unidad revisable contiene ≤400 líneas cambiadas; cada archivo nuevo <200 líneas y función <40. Si un slice excede el límite, dividirlo manteniendo contratos estables; no comprimir ni reformatear archivos largos ajenos. Cada agente mantiene su registro; solo el coordinador actualiza roadmap.

| Unidad | Rutas propuestas y propietario | Salida verificable |
|---|---|---|
| C1 contratos | test_runner RED → slice_worker: `src/core/domain/{study-plan,classroom-ai,index}.ts`; imports acotados `classrooms/policy.ts`, `classrooms-ui/api.ts`, tsconfigs/build | Una forma de currículo y parsers compartidos, políticas manuales conservadas. |
| C2 proveedor/documento | test_runner → slice_worker: `apps/api/src/ai/{index,ports,gemini-adapter,configuration}.ts`; `files/{approved-plan-reader,docx-text}.ts`, exports files; package/lock/.env.example | Adapter sin HTTP/UI, lectura aprobada, DOCX acotado, fake determinista. |
| C3 persistencia/worker | test_runner → slice_worker: `classrooms/ai/{repository,queue,worker,extraction,budget}.ts`, schema Prisma + nueva migración | Claim/fencing/dedup/cuotas/recuperación transaccional; sin I/O bajo lock. Dividir migración/repository/worker en unidades separadas. |
| C4 transporte/apply | test_runner → slice_worker: `classrooms/ai/{http,apply}.ts`, `classrooms/{http,host,contracts}.ts`, host composition | Sesión/CSRF real, revisión/apply atómico y lifecycle; serializar dueño del host con C2/C3. |
| C5 UI | test_runner → slice_worker: `apps/classrooms-ui/PlanExtraction.tsx`, `extraction-client.ts`, integración mínima `Wizard.tsx`, estilos | Arranque automático tras save, polling cancelable, edición/confirmación y fallback sin pisar autosave. |
| C6 verificación/docs | test_runner y reviewer: pruebas dedicadas, funcional §5 y guía de configuración; coordinador roadmap/Engram | Evidencia real, riesgos/costos, revisión del diff y commit local. Push/PR solo con alcance humano aplicable. |

## CRITERIOS_DE_TEST_DOT

test_runner escribe RED antes de producción; slice_worker no modifica tests. Docker usa recursos propios y base `*_test`, rollback por caso cuando no se prueba recuperación entre transacciones; para worker/reinicio usar fixture aislado con cleanup explícito y conteos observados. El borrador/archivo existente y contratos de cuenta siguen protegidos.

| Nivel | Casos que deben demostrar |
|---|---|
| Unitario | JSON malformado/extras/coerción/controles/vacíos/Unicode/límites100/500/120; salida truncada/bloqueada; ningún dato inventado ante texto sin estructura. Fixtures PDF y DOCX equivalentes; docx imágenes/ZIP bomb/XML externo/links/timeout y prompt injection no ejecutan acciones ni llaman tools. |
| Unitario adapter | Modelo/backend/configuración ausente, cuota y pricing inválidos, deadline/AbortSignal, conteo de tokens y reserva; 429/503 clasificados, máximo de dispatches y resultado incierto; SDK fake sin red. Incluir contrato HTTP real del SDK/API elegido antes de fijar implementación. |
| Integración real Docker | Propietario/sesión verificada/CSRF/Origin; ajeno/inexistente sin disclosure; archivo de otro borrador, pendiente/rechazado/error, digest alterado y blob ausente sin llamada proveedor. Storage privado real y scanner aprobado; Gemini fake controlado. |
| Integración concurrencia | Dos altas iniciales/reapertura crean una sola fuente; retry simultáneo un sucesor; dos workers un lease válido; respuesta vencida ignorada; crash antes/después de dispatch y reinicio; cuotas global/actor no excedidas entre procesos. |
| Integración estado | Edición manual durante respuesta no sobrescrita; cambio plan/publicación → stale; metadatos solos permiten revisar; apply obsoleto409, idempotencia exacta/reuso distinto409; apply+publish carrera no crea aula parcial. Persistencia/reanudación y errores no mutan unidades ni archivos. |
| UI en ego(lite) | Space dedicado, snapshots y capture desktop/móvil: upload PDF y DOCX reales → aprobación → análisis automático → editar/quitar/agregar → confirmar → revisión → crear. Probar atraso/error/retry, dos pestañas, cerrar/reabrir, reemplazo con advertencia, foco/teclado/status accesible y camino manual completo. |
| Cierre | API/web strict typecheck/build y regresiones aulas/archivos aplicables; auditoría de dependencia nueva; diff, `.env.example`, migración y logs sin secretos. Smoke Gemini real solo con credencial/budget habilitados y documento sintético, sin guardar prompts privados; su ausencia queda explícita, no como PASS. |

## Fuentes y handoff

### Implementación y verificación del 2026-10-23

Los contratos, adaptador Gemini Developer API, lector PDF/DOCX, cola/consumo PostgreSQL y propuesta editable están implementados en el worktree `codex/classroom-gemini`. El usuario confirmó Google AI Studio. La configuración privada y operación se describen en [la guía](../../docs/classroom-ai.md). Esta implementación permite reintentos explícitos del docente; no programa reenvíos automáticos, tampoco para fallos transitorios conocidos. Cada nuevo envío sigue sujeto a las cuotas y reservas.

Verificación automatizada independiente:66 casos IA +38 regresión P4/P5 +6 proxy histórico, todos aprobados. Las nuevas regresiones reprodujeron primero el proxy404, rechazo no observado durante cancelación, lectura simultánea rechazada, cierre durante claim y expiración sin reintento; pasaron después de sus correcciones. La re-revisión acotada v2 quedó aprobada por ambos jueces. La integración P5 completa y el recorrido web final se verificaron en la continuación del 2026-10-24; sus resultados y límites se enlazan en el cierre local. No se ha llamado a Gemini real ni se declara completada esta capacidad hasta reconciliar sus pruebas. [Registro](../../docs/work-log/2026-10-23-root-classroom-ai.md), [revisión](../../docs/work-log/2026-10-23-root-ai-review.md).

Investigación oficial del coordinador, 2026-10-23: [document processing](https://ai.google.dev/gemini-api/docs/document-processing), [structured output](https://ai.google.dev/gemini-api/docs/structured-output), [file input methods](https://ai.google.dev/gemini-api/docs/file-input-methods). PDF admite procesamiento multimodal; otros documentos como texto pierden layout. Inline evita usar Files API, cuyo almacenamiento temporal no se necesita para este límite; no equivale a retención cero del servicio. Structured output no garantiza todos los límites de negocio: validar otra vez en servidor. Modelo/API precisos se verifican contra SDK/documentación al configurar, sin fijar una versión antigua inferida.

Siguiente acción: configurar Gemini API de Google AI Studio en el backend y ejecutar un smoke con documento sintético y presupuesto explícito. La implementación y verificación local con proveedor controlado están cerradas; el smoke real no se ejecutó por ausencia de credencial configurada. No se realizó publicación remota ni despliegue.

### Cierre local del 2026-10-24

Implementación y verificación funcional local con proveedor controlado completadas: [integración P5](../../docs/work-log/2026-10-24-final_regression.md), [flujo IA en vivo](../../docs/work-log/2026-10-24-final_ai_live.md), [cierre coordinado](../../docs/work-log/2026-10-24-root-classroom-ai-final.md). La revisión dual v2 aprobó las correcciones y la suite automatizada independiente observó110 PASS. Configuración real: [guía Gemini](../../docs/classroom-ai.md). El usuario autorizó explícitamente las excepciones de tamaño de la unidad de cola (hasta1.049 líneas) y del lockfile (440 generadas); las demás unidades se mantienen dentro de400.

Prueba visual pendiente: la captura de ego agotó el plazo nativo de20segundos; DOM/API y geometría responsiva están registrados, pero no equivalen a inspección de píxeles. No se declara cumplido el cierre visual completo. Recuperar captura y realizar smoke real de Gemini son los siguientes pasos de aceptación.

### Smoke real del 2026-10-24 — bloqueo confirmado

Con clave privada configurada, el PDF sintético pasó seguridad y el trabajo automático terminó FAILED/AI_UNAVAILABLE. countTokens real pasó; las dos solicitudes diagnósticas de generación devolvieron400 INVALID_ARGUMENT genérico. No hubo propuesta para editar/aplicar: el flujo IA completo no está aprobado. La complejidad del esquema anidado es una hipótesis apoyada por advertencia del SDK, todavía sin experimento diferencial. [Evidencia y handoff](../../docs/work-log/2026-10-24-root-gemini-real-smoke.md).

El mismo borrador permitió continuar manualmente, editar y crear un aula de dos unidades/cinco temas; API200 y recarga confirmaron persistencia. Captura desktop disponible solo para cabecera/parte superior del Plan publicado manualmente; aceptación visual completa IA/móvil pendiente. Siguiente acción actual: minimizar el rechazo400 y reparar con regresión test-first antes de repetir extracción→edición→aplicación→creación con Gemini. No se modificó producción ni se publicó remoto.

### Reparación del400 y aceptación real — 2026-10-24

La autorización posterior del usuario incluyó corregir el rechazo y repetir el flujo real completo en el mismo worktree. Commit de implementación observado: 0c6b4df412097daeba4d21e9fbdad55c3e404de0. El diferencial con el mismo PDF/adaptador/configuración pasó al retirar únicamente maxItems del esquema enviado al proveedor. Se mantienen los límites del parser local y todas las demás restricciones del esquema; no cambian DB, cuotas, reintentos ni autenticación.

RED1fallo/8PASS antes de producción; GREEN9PASS; verificación independiente76PASS/0FAIL/0SKIP y builds API/Next frescos, cleanup0. Gemini real extrajo dos unidades/cuatro temas sin retry; se editaron unidad/tema, se agregó un tema, se aplicó la propuesta y se creó el aula37d3be3a-5141-45b1-8297-b9799df440c9. Tras reautenticar la misma cuenta y recargar, Plan y API200 conservaron dos unidades/cinco temas. [Cierre y límites](../../docs/work-log/2026-10-24-root-gemini400-fix.md), [browser](../../docs/work-log/2026-10-24-fix400-real-browser.md). El fallo400 previo queda como historia, no como bloqueo actual del candidato corregido.

El recorrido funcional autorizado está completado localmente. La captura desktop del editor revisado fue inspeccionada; captura final Plan/móvil y el cierre visual histórico amplio siguen separados y pendientes. Una redirección/401 anterior tiene causa desconocida; la comprobación posterior pasó sin cambiar políticas. Plataforma temporal actual http://127.0.0.1:55453, inbox http://127.0.0.1:56558, runtime36307 sigue activo para el usuario. Sin push, PR ni despliegue.

### DOCX con Gemini real — aceptación del 2026-10-24

La petición posterior de verificar Word completo se completó sobre el mismo worktree, sin modificar producción. Evidencia local observada: 1a22fe2fbbe41298cd99d1415ea54f227ed41320. Fixture sintético con párrafos y tabla→archivo aprobado→extracción automática real de dos unidades/cuatro temas→editar unidad/tema y agregar uno→aplicar explícitamente→revisión→crear aula ebf2bc57-28c0-44a7-af01-1ab1565e7a75. Recarga inmediata, reapertura del Plan y API200 confirmaron dos unidades/cinco temas, sin reingreso, fallback ni reintentos del proveedor. Seis regresiones documentales pasaron; la advertencia de imágenes Word es la limitación documentada, no un fallo nuevo.

[Cierre DOCX](../../docs/work-log/2026-10-24-root-docx-real.md) y [verificación browser](../../docs/work-log/2026-10-24-docx-real-browser.md). Capturas desktop de revisión y Plan reabierto muestran las dos unidades/cinco temas; móvil sigue fuera de esta aceptación. El flujo funcional PDF y DOCX con Gemini real está verificado localmente; no se infiere aceptación de otras capacidades IA ni publicación remota. Preview temporal actual http://127.0.0.1:58175, inbox http://127.0.0.1:49710, runtime88198/Space2 quedan para el usuario.

### Creación móvil PDF y Word — 2026-10-24

Evidencia móvil local: a3f6b0859d253a2d2991f8b82b7a0dee7645d42e. Chromium con emulación táctil375×812 y320×812: ambos formatos pasaron carga/seguridad, primera extracción real2unidades/4temas, edición de unidad/tema y adición de uno, aplicación explícita, revisión y creación. Recarga y API200 conservaron2unidades/5temas en PDF91eeff28-7f9d-42fd-8827-32376c2f31c5 y Word27952a35-81ef-4751-bda0-31002d6d5e73. Se probaron quitar/agregar temporalmente, focoTab y espacio reducido320×480; el swipe vertical PDF pasó. No se demostró fallo de producto que justificara cambios de código.

Plan real capturado e inspeccionado a375/320 para ambos formatos, sin desbordamiento/solapamientos observados. Las fotos live anteriores a crear no se recuperaron: DOM/touch/geometry reales se complementaron con19 renders estáticos claramente identificados del componente real y CSS compilado, sin handlers/API/modelo. No sustituyen ni fingen fotos E2E. [Cierre móvil](../../docs/work-log/2026-10-24-root-mobile-ai.md) y [alcance visual/interacciones](../../docs/work-log/2026-10-24-mobile-ai-browser.md) detallan límites, recuperación autorizada únicamente de la cuenta sintética y swipe Word no completado. Sin certificación de dispositivo físico/Safari/teclado nativo ni declaración retrospectiva de todas las fotos históricas faltantes.

Runtime87655 sigue activo en http://127.0.0.1:60061, inbox http://127.0.0.1:57642; se entregó Space3, sin garantizar Plan visible al cierre. No push, PR o despliegue. La fuente de producto sigue siendo la corrección previa; estos commits guardan la verificación móvil y su checkpoint.


### Capturas live antes de crear — cierre del 2026-10-24

La nueva petición cierra las capturas faltantes del editor editado y la revisión previa a crear: PDF y DOCX,375×812/320×812,36 PNG originales de la aplicación real. Una extracción Gemini automática por formato devolvió2unidades/4temas; edición y tema agregado llevaron a2/5. Se capturó antes de aplicar y antes de crear, con cuatro controles visuales coordinados. Ambas aulas nuevas pasaron recarga y detalle autenticado200 con igualdad exacta. [Índice con fotos/manifiestos](../../docs/work-log/evidence/2026-10-24-mobile-live/live-mobile-20261024-resume-1792856935167/README.md), [coordinador](../../docs/work-log/2026-10-24-root-live-mobile-captures.md), [tester atribuido](../../docs/work-log/2026-10-24-live-mobile-browser.md).

Sin defecto visual/interacción demostrado ni cambios de producto. Errores del driver fueron corregidos fuera del repositorio y quedan atribuidos. No se cuentan renders SSR como fotos live. Emulación Chromium táctil; sin certificación física/Safari/teclado nativo ni nueva prueba swipe Word. Space3 entregado con emulación/touch retirados; runtime87655 preservado en60061/inbox57642. Commits locales solamente, sin publicación remota.

Live-mobile capture evidence commits observed locally: PDF5fadfd8 (309 authored lines) and Wordb070d15 (368), with passed read-only audit linked in the coordinator record. No product source changes or remote publication.
