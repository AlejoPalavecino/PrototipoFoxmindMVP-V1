# Crear actividades manuales o con IA

Diseño con D1:A, D2:A y D3:A aceptadas por el usuario el 2026-10-25. El usuario confirmó después la **implementación completa local**; el coordinador despachó este contrato PRE-RED en `/root/activity_technical_contract`. La autorización L3 está satisfecha. No autoriza integración en main, publicación remota ni despliegue.

ESTADO_DISENO: LISTO_PARA_TDD_RED

ESTADO_IMPLEMENTACION: IMPLEMENTADO_Y_VERIFICADO_LOCAL (2026-10-25); entrega Git local en registro coordinador.

## Resultado propuesto

Desde Actividades → Crear actividad, el docente elige «Crear manualmente» o «Generar con IA». Ambos caminos terminan en un borrador editable y una publicación explícita. Se mantienen los tipos Trabajo práctico, Cuestionario y Evaluación.

El worktree aislado usa `codex/classroom-activity-ai`, desde main `727614d9ed05818fab1295271bfd9654820dc74f`. [Registro de diseño](../../docs/work-log/2026-10-25-root-activity-ai-design.md), [implementación actual](../../docs/work-log/2026-10-25-root-activity-ai-implementation.md) y [contrato técnico](../../docs/work-log/2026-10-25-activity_technical_contract.md). La restricción de implementación de la etapa de diseño queda como historia, superada por la autorización local posterior. Sólo se amplía la exclusión histórica de IA para esta capacidad aceptada.

## Camino manual

El docente puede escribir consignas o subir su PDF/DOCX para un trabajo práctico, asociarlo al contenido del plan y vincular materiales. Para cuestionarios/evaluaciones, mantiene el editor de preguntas y respuestas actual. Adjuntar un PDF no lo convierte automáticamente en preguntas interactivas; esa conversión sería otra capacidad a acordar.

## Camino con IA

1. Elegir tipo de actividad, unidad y temas, según D1.
2. Indicar qué quiere trabajar: objetivo, nivel del grupo, dificultad, duración aproximada y contexto libre. Por ejemplo: «Aplicación a un caso cotidiano, sin derivadas, para resolver en 40 minutos».
3. Revisar las fuentes propuestas: unidad/temas del plan y materiales de Biblioteca asociados, con selección explícita. Puede sumar materiales de otra unidad de la misma aula. El programa delimita el alcance; sus títulos por sí solos no garantizan suficiente contenido didáctico.
4. Configurar extensión: cantidad de consignas para TP o cantidad y combinación de preguntas de desarrollo/selección para cuestionario/evaluación. Los puntos se sugieren para revisión docente.
5. Pulsar «Generar borrador». Mostrar estado y permitir recuperar el resultado al volver. Generar tiene una acción explícita; abrir la pantalla o seleccionar una fuente no dispara consumo.
6. Revisar título, consignas/preguntas y fuentes utilizadas. Mostrar advertencias por contenido insuficiente, parcialmente leído o no compatible. Permitir edición y regeneración explícita sin pisar cambios docentes.
7. Usar el resultado revisado como borrador de actividad. Configurar fecha, entrega y demás ajustes con el editor habitual; previsualizar como estudiante y publicar explícitamente.

## Resultado por tipo

| Tipo | Propuesta de IA | Revisión privada docente |
|---|---|---|
| Trabajo práctico | Título, objetivo y consignas editables; expectativas de entrega | Revisión de las consignas |
| Cuestionario | Preguntas de desarrollo, selección única o múltiple, opciones y puntos | Claves correctas de selección |
| Evaluación | Preguntas y puntos con la misma estructura soportada | Claves correctas de selección |

Las claves y orientaciones docentes no se guardan como materiales de Biblioteca ni se envían a estudiantes antes de la visibilidad de resultados ya autorizada. No se añade corrección por IA. Un TP generado se guarda como texto editable; exportar a PDF no forma parte de esta propuesta inicial.

## Decisiones aceptadas — 2026-10-25

El usuario confirmó: «Si voy con tus recomendaciones para D1, D2 y D3». Se aceptan las tres opciones A. La comparación original se conserva debajo como fundamento; las alternativas B no fueron elegidas.

| ID | Opción A | Opción B | Recomendación propuesta |
|---|---|---|---|
| D1: cobertura | Una actividad puede abarcar varios temas de una misma unidad; amplía asociaciones y exige revisar filtros, Plan y métricas | Un tema por actividad, como hoy; menor cambio pero limita actividades integradoras | A: responde a generar desde una unidad; conservar lectura y significado de actividades existentes y separar seguimiento de temas de calificación |
| D2: conocimiento | Basarse sólo en contenido seleccionado y contexto docente; si falta información, pedir material o aclaraciones | Permitir ampliar con conocimiento general del modelo mediante elección explícita, marcando qué no está respaldado por fuentes | A inicialmente: facilita revisar correspondencia con lo enseñado; ejemplos nuevos deben derivarse del contenido disponible y no introducir temario ajeno |
| D3: formatos | PDF/DOCX como fuentes documentales iniciales; avisar límites de lectura y archivos no utilizables | Incluir además PPTX e imágenes desde el primer alcance; requiere lectores y pruebas adicionales | A: se apoya en experiencia existente; límites IA propios, sin asumir que todo archivo permitido en Biblioteca es procesable |

Las orientaciones generadas de resolución para TP/desarrollo quedan propuestas para una ampliación posterior. Las claves estructuradas de selección son necesarias para los tipos existentes y se incluyen en esta propuesta inicial.

## Arquitectura propuesta y condiciones

- Mantener stack existente. Nueva capacidad de generación de actividades con contratos puros en `src/core/domain` y adaptador de proveedor detrás de un puerto; no acoplar reglas de actividades al SDK ni cambiar extracción a generación implícita.
- Reutilizar infraestructura de trabajos durables, cuotas y presupuesto donde las interfaces lo permitan; contabilidad conjunta para evitar dos presupuestos independientes accidentales. Fijar límites operativos y formatos antes de implementar.
- Contratos conceptuales: solicitud con aula, tipo, selección curricular, fuentes, contexto y parámetros; trabajo con estado y snapshot; propuesta con contenido por tipo, fuentes y advertencias; aplicación explícita con revisión del borrador. D1 fija una unidad y uno o más temas de esa unidad; queda concretar el contrato técnico compatible con actividades existentes antes de RED.
- Sólo docente autorizado en aula activa; fuentes aprobadas, privadas, de la misma aula y accesibles. No datos de estudiantes, notas o entregas en el contexto de IA.
- Capturar identidad/digest de fuentes y revisión curricular; revalidar antes de aplicar y publicar. Un cambio relevante vuelve obsoleto el resultado; no aplicar fuentes borradas o permisos revocados.
- Idempotencia de generar/aplicar: doble clic y recarga no duplican trabajos, actividades, reservas ni despachos locales. No se garantiza facturación exactamente una vez del proveedor. Los reintentos de resultado incierto no son automáticos; explicar estado y consumo posible.
- El modelo propone contenido estructurado; servidor valida tipos, límites, preguntas/opciones/claves/puntos. Las referencias deben corresponder a fragmentos disponibles; mostrar fuentes no certifica exactitud semántica del modelo.
- Tratar instrucciones dentro de documentos como contenido, sin acceso del modelo a herramientas, secretos o navegación externa. Lectura parcial y falta de evidencia se señalan al docente.
- Aplicar sólo sobre borrador editable con revisión vigente; no sobreescribir ediciones, contenido bloqueado tras intento o actividades archivadas. Regenerar un elemento requiere definir alcance y confirmar reemplazo si ya está editado; mantener recuperación de la versión anterior hasta aplicar.
- En futuras pruebas usar datos sintéticos e infraestructura aislada; esta etapa no inicia servicios ni usa configuración privada retenida.

## Criterios para implementación después de aprobación

- RED independiente para permisos, esquema por tipo, selección curricular, privacidad de soluciones, idempotencia, consumo y fallos de proveedor.
- Pruebas de fuente inaccesible/eliminada/cambiada, respuesta inválida, cancelación/timeout y resultado tardío frente a ediciones.
- Aplicar una propuesta crea exactamente un borrador; publicar sigue requiriendo acción explícita. Camino manual funciona con IA desactivada o fallida.
- Demostrar guardado/reapertura, revisión de claves y puntos, ausencia de filtración a estudiantes, archivos seguros y bloqueo tras primer intento.
- Verificar interfaz desktop/móvil y flujo completo con ego(lite), más regresiones de actividades/Plan/biblioteca afectadas por D1.
- Ampliar de forma acotada la exclusión histórica de generación en la especificación funcional sólo cuando el usuario apruebe el diseño.

## Contrato técnico congelado PRE-RED — 2026-10-25

El contrato siguiente concreta la propuesta anterior. No marca implementadas las tareas. Se conserva TypeScript estricto, Node, PostgreSQL, Next y el adaptador Gemini existentes; no se incorpora otro stack, cola ni proveedor. Las decisiones D1–D3 no se vuelven a abrir.

### Selección curricular compatible

- Forma canónica: `unitId: UUID | null`, `topicIds: UUID[]`, sin duplicados, en orden explícito. Borrador permite 0..100 temas; publicación exige una unidad y 1..100 temas existentes de esa unidad/aula. Un tema sin unidad es inválido.
- `save` y `metadata` aceptan `topicIds`; el contrato antiguo con `topicId` sigue aceptado cuando falta `topicIds`. Si llegan ambos, `topicId` debe ser `topicIds[0] ?? null`. Un desacuerdo se rechaza; no se pierde una asociación por interpretar sólo el alias.
- Todas las proyecciones de actividad incluyen `topicIds` reales; `topicId` se conserva como alias del primero. La UI muestra todos los temas en autoría, listado, consulta, preview e historial donde aparece organización. El selector de unidad limpia la selección previa y hace explícita la nueva.
- Tabla `activity_topics(activity_id, topic_id, unit_id, classroom_id, position, created_at, updated_at)`: PK `(activity_id,topic_id)`, UNIQUE `(activity_id,position)`, posición no negativa; FK `(activity_id,unit_id,classroom_id)` a `activities(id,unit_id,classroom_id)` y FK `(topic_id,unit_id,classroom_id)` a `topics(id,unit_id,classroom_id)`, ambas RESTRICT. Añadir UNIQUE compuesto de activities requerido por la FK. Backfill de cada `activities.topic_id` no nulo con posición 0. Conservar la columna legacy y sincronizar su primer tema en toda escritura. La lectura de una fila legacy sin links todavía admite su tema único; nunca reduce links múltiples al alias.
- Reemplazar asociaciones y alias bajo el lock de aula existente y la revisión CAS. Después del primer intento sólo metadata/deadline con los límites actuales; cambiar temas no reconstruye preguntas ni recursos.
- `deleteTopic` comprueba cualquier link en `activity_topics`, además de las referencias legacy/materiales. `deleteUnit` conserva sus bloqueos. Elegibilidad, entregas, calificación efectiva, promedios, Agenda y progreso siguen contando una actividad por `activity.id`; ningún JOIN multiplica filas académicas. El estado TAUGHT del Plan sigue siendo independiente.

### Exportaciones y tipos compartidos

Archivos puros bajo `src/core/domain/`, reexportados por su `index.ts`: `activity-topics.ts`, `activity-generation.ts`, `activity-generation-validation.ts`, `activity-proposal.ts`, `activity-generation-ports.ts` y `activity-proposal-schema.ts`. No importan Prisma, HTTP, SDK ni archivos de infraestructura.

```ts
export const activityGenerationSchemaVersion = 'activity-proposal-v1';
type ActivityWarning = 'DOCX_IMAGES_OMITTED' | 'PARTIAL_CONTENT' | 'GROUNDING_REQUIRES_REVIEW';
type ActivityGenerationState = 'QUEUED' | 'RUNNING' | 'READY' | 'FAILED' | 'STALE' | 'APPLIED';
interface GenerationCounts { assignment: number; development: number; singleChoice: number; multipleChoice: number }
interface StartActivityGeneration {
  revision: string; requestId: string; type: 'ASSIGNMENT' | 'QUESTIONNAIRE' | 'EVALUATION';
  unitId: string; topicIds: string[]; sourceIds: string[];
  objective: string; groupLevel: string; difficulty: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED';
  durationMinutes: number; context: string; counts: GenerationCounts; acknowledgedWarnings: ActivityWarning[];
}
interface ActivityEvidence {
  item: 'assignment' | 'question'; index: number;
  references: { sourceId: string; page: number | null }[];
}
interface ActivityAiProposal {
  schemaVersion: 'activity-proposal-v1'; type: StartActivityGeneration['type'];
  title: string; objective: string; instructions: string; assignmentPrompts: string[];
  questions: AuthoringQuestion[]; evidence: ActivityEvidence[]; warnings: ActivityWarning[];
}
interface ApplyActivityGeneration { revision: string; requestId: string; proposal: ActivityAiProposal }
interface ActivityProposalConstraints {
  type: StartActivityGeneration['type']; counts: GenerationCounts; sourceIds: string[];
  context: string; pdfPageCounts: Record<string, number>;
}
// AuthoringQuestion retains the current type/prompt/points/scoringRule/options contract.
// Exact objects; reject unknown keys. Invalid user input throws code/message INVALID_INPUT.
parseStartActivityGeneration(input: unknown): StartActivityGeneration;
parseApplyActivityGeneration(input: unknown): ApplyActivityGeneration;
parseActivityProposal(input: unknown, constraints: ActivityProposalConstraints): ActivityAiProposal;
```

User IDs, request IDs and curricular IDs are UUIDs. Revision remains the existing canonical nonnegative int64 decimal string. Source identity is `plan:<StudyPlanVersion UUID>` or `material:<Material UUID>`; clients cannot supply arbitrary file IDs, URLs or digests. Evidence may additionally reference `teacher-context` only when trimmed context is nonempty.

Limits, counted in Unicode code points unless bytes are specified: objective 1..1000; groupLevel 0..200; context 0..5000; title 1..200; duration 5..240 whole minutes; selected topics 1..100; sources 0..6 unique. With no sources, context must be nonempty and substantively supply the content; objective/titles alone do not establish adequate grounding. A provider's insufficiency response returns `INSUFFICIENT_CONTENT` and explicit missing-information strings, never invented ungrounded content.

TP requires assignment count 1..20 and all question counts 0. Questionnaire/evaluation requires assignment 0 and 1..30 questions total, each subtype count 0..30. Generated questions have prompt 1..2000, options 2..6 of 1..500, positive canonical decimal points <=100 with at most two decimals; DEVELOPMENT has no options and scoringRule=null, SINGLE_CHOICE has exactly one correct option/EXACT, MULTIPLE_CHOICE at least two correct options/EXACT or PARTIAL. These generation limits do not reduce the existing manual editor's accepted limits.

Proposal arrays match the requested counts/types exactly. TP has no questions; other types have no assignmentPrompts. TP prompt length is 1..2000. Each actual prompt/question has exactly one evidence binding, valid index and at least one unique reference. PDF references require page 1..actual pageCount; DOCX/context use page=null. Reject foreign/omitted source references and extra bindings. Localizers prove structural correspondence only; the UI states that the teacher must check semantic support. Do not invent quotations or claim automatic fact verification.

Map an applied proposal to existing activity instructions as `Objetivo: <objective>`, blank line, `instructions`, then TP prompts numbered in order. The resulting instructions must fit 5000 code points; reject instead of truncating. `attachmentRequired=false`, `deadline=null`, `allowLate=false`, no instruction files; selected material identities become normal safe Library links, not copies. Plan sources never become student Library material automatically. Subsequent authoring configures deadlines/attachments normally.

### Commands, private views and recovery

All paths have prefix `/classrooms/:classroomId/activity-generations`. Existing authenticated teacher, verified email, CSRF/Origin and archived-aula policies apply; GET is teacher-only too.

| Method/path | Input/result |
|---|---|
| GET collection | `{ jobs: ActivityGenerationView[] }`, newest 20 jobs of this teacher/aula; no creation or consumption |
| GET `/sources` | `{ revision, sources: ActivitySourceCandidate[] }`; current plan and all nondeleted same-aula Library materials, including unprocessable candidates and reasons |
| POST collection | `StartActivityGeneration`; `{created,view}` internally, HTTP 202 new / 200 replay with view body |
| GET `/:jobId` | `ActivityGenerationView`, revalidating relevant snapshot and current access |
| POST `/:jobId/regenerate` | Full start input plus `acknowledgePossibleCharge:boolean`; new successor, 202 new / 200 replay; never edits predecessor or local editor |
| POST `/:jobId/apply` | `ApplyActivityGeneration`; `{generationId,activityId,revision}` |

`ActivityGenerationView` contains `id,classroomId,baseRevision,state,type,unitId,topicIds,proposal,error,retryable,missingInformation,sourceReport,appliedActivityId,createdAt`. Proposal is present only READY/APPLIED; STALE hides actionable content. Missing information is a bounded string array (0..10 strings of <=500). `sourceReport` lists every selected sourceId with read status, pageCount|null and warnings; it never contains document text or bytes. Candidate fields: `sourceId,fileId,title,kind:'plan'|'material',extension,sizeBytes,unitId,topicId,available,reason`; `reason` is null or `UNSUPPORTED_FORMAT|AI_INPUT_LIMIT|FILE_NOT_READY`. Size is a safe integer in bytes. Use typed errors, not storage paths or provider exception text.

Apply creates exactly one **new private activity draft**, rather than replacing any manual or AI draft. Validate the edited proposal again against the persisted request and read report. Lock aula/job, require current body revision, revalidate authorization/snapshots and atomically create activity+topics+content+safe links, record APPLIED/idempotency and advance aula revision once. No attempt, grade, eligibility or notification is created. A later explicit existing publication command is required. Persist source provenance privately so the publication command revalidates selected sources/current plan/curriculum; student activity DTOs never expose job/proposal/context/private keys.

The UI edits a local copy of a READY proposal and previews student-facing instructions/options with no correct flags. Teacher review has the private correct/scoring controls. A regenerated result is a separate proposal; accepting it requires explicit replacement if the local copy is dirty. The prior server proposal remains recoverable. Applying always uses the reviewed local copy and then opens normal authoring. Closing/navigation aborts polling only; it does not falsely cancel an already dispatched durable job or discard the prior server result.

Start, regenerate and apply use unique `(owner_id,request_id)` records with a canonical operation+scope+body hash. Identical replay returns the original job/activity even after a response loss; changed body/reused ID is CONFLICT. Check live access before replay. A job is applied at most once: a different request ID cannot create a second activity from it. Refresh/opening/sources selection never enqueue or dispatch. Generation jobs do not advance aula revision until apply.

States: QUEUED→RUNNING→READY|FAILED|STALE; READY→APPLIED|STALE. Apply cannot act on other states. APPLIED is terminal for mutation, and its created draft is recovered by ID. Regenerate is explicit from READY/FAILED/STALE with a fresh valid full request; old proposals/edits remain. A stale predecessor does not authorize reusing its old source grants. Failed jobs never auto-dispatch. `PROVIDER_OUTCOME_UNKNOWN` is not resendable; an explicitly new generation may proceed only with possible-charge acknowledgement and all shared limits. No implicit retry endpoint.

Errors are `SOURCE_UNAVAILABLE|FILE_NOT_READY|AI_INPUT_LIMIT|INSUFFICIENT_CONTENT|INVALID_AI_OUTPUT|AI_UNAVAILABLE|AI_RATE_LIMITED|AI_BUDGET_EXCEEDED|AI_TIMEOUT|PROVIDER_OUTCOME_UNKNOWN`. Request shape errors use 400 INVALID_INPUT, access 403 FORBIDDEN, stale/CAS/idempotency conflicts 409 CONFLICT, disabled runtime 503 AI_UNAVAILABLE. Asynchronous failures are persisted in the view, not misreported as transport success or exposed as raw provider messages. `retryable` means the teacher can explicitly start a new generation; it is false for unknown outcomes until the separate acknowledgement flow.

### Sources, snapshots and provider boundary

Sources are private approved/clean files with matching stored, scanned and validated digests and completed custody/upload state, no deleted blob. Resolve the current plan version and same-aula nondeleted materials on the server. Propose associated materials in the UI, with selection explicit; allow another unit's material in the same aula. Titles delimit scope but never replace the selected document's content. No student identities, submissions, grades or unrelated classroom data enter the generation input.

Every selected source must be read, or generation fails before provider dispatch. No silent truncation, format conversion, omitted selected file or auto-deselection. Each file <=20,000,000 bytes; all selected file bytes <=20,000,000; all PDF pages <=100; all DOCX extracted text <=200,000 characters. Existing parser limits also apply per DOCX: <=1000 ZIP entries, <=32MB decompressed, bounded 3s worker/128MB old-generation memory; no OCR of Word images. Library still accepts its existing 50MB/other formats, but generation candidates show why they are unavailable. DOCX extraction advertises DOCX_IMAGES_OMITTED, requires that known limitation in acknowledgedWarnings, and retains it in result/report. Unknown unreadable content fails or returns explicit insufficiency, rather than asserting full coverage.

Snapshot includes current teacher/aula identity, selected unit/topic IDs+names, latest study-plan version identity, every selected source identity/file/digest and the sanitized pedagogical request. Compare relevant values before read, before provider dispatch, before storing result, apply and publication. Curriculum rename/move/removal, latest-plan replacement, source deletion/replacement/security downgrade or access revocation makes the proposal STALE/unusable. An unrelated classroom revision change requires fresh CAS input but need not invalidate an unchanged relevant snapshot. Never use credentials or user session objects as durable grants.

```ts
interface ActivitySourceGrant { ownerId: string; classroomId: string; sourceId: string; fileId: string; digest: string }
interface ActivitySourceSnapshot { sourceId: string; fileId: string; digest: string; extension: 'pdf'|'docx'; sizeBytes: number }
interface ActivityDocument { sourceId: string; document: PlanDocument; pageCount: number|null; warnings: ActivityWarning[] }
interface ApprovedActivitySourceReader {
  read(grant: ActivitySourceGrant, signal: AbortSignal): Promise<ActivityDocument>;
}
interface ActivityGenerationInput {
  schemaVersion: 'activity-proposal-v1'; type: StartActivityGeneration['type'];
  unit: {id:string;name:string}; topics: {id:string;name:string}[];
  objective:string;groupLevel:string;difficulty:StartActivityGeneration['difficulty'];durationMinutes:number;
  context:string;counts:GenerationCounts;sources:ActivityDocument[];signal:AbortSignal;
}
interface StructuredActivityGenerationPort {
  countActivityTokens(input: ActivityGenerationInput): Promise<number>;
  generateActivity(input: ActivityGenerationInput): Promise<{json:unknown;inputTokens:number|null;outputTokens:number|null}>;
}
```

Infra `AiActivitySource` extends reader with `snapshot(tx,request,classroomId,sourceId):Promise<ActivitySourceSnapshot>` and optional `snapshotWorker(tx,grant,signal)`; tx belongs to the API module, not domain. `apps/api/src/classrooms/activity-ai/index.ts` exports `ActivityAiService`, `ActivityAiWorker`, `ActivityAiOptions`, `AiActivitySource`. Both constructors accept `{classrooms:ActivityAuthoringService,reader:AiActivitySource,provider:StructuredActivityGenerationPort,configuration:Omit<AiConfiguration,'backend'|'apiKey'>}`. The actual final classrooms service is compatible through inheritance. Service methods are `sources(request,classroomId)`, `list(request,classroomId)`, `start(request,classroomId,input)`, `get(request,classroomId,id)`, `regenerate(request,classroomId,id,input)`, `apply(request,classroomId,id,input)`. Worker exposes `runOnce():Promise<boolean>`, `onModuleInit():void`, `onModuleDestroy():Promise<void>`, with a capability-bound `authorizeClaim(grant,signal,tx?)` for the private reader.

`apps/api/src/ai/index.ts` exports `GeminiActivityGenerationAdapter` and `createGeminiActivityGenerationAdapter`. Constructor matches the extraction adapter: `{client:GeminiClient,configuration:Pick<AiConfiguration,'model'|'maxInputTokens'|'maxOutputTokens'|'deadlineMs'>}`. Count and generation use the exact same fingerprinted immutable input, no tools/web/files API or SDK retries/continuations, one candidate and structured JSON. Treat documents/context as untrusted data separated from system instructions. Parse closed server schema after output; omit provider maxItems constraints as in the verified extraction repair, enforce array/count limits locally. Insufficiency envelope is `{status:'INSUFFICIENT_CONTENT',missingInformation:string[]}`; successful provider envelope is `{status:'READY',proposal:ActivityAiProposal}`. Other envelope/status is invalid output. Persist neither raw provider prompts nor document copies in job logs; private stored sanitized input supports recovery.

### Durable model and shared admission

Single schema/migration owner creates the following tables; other workers consume these exact names. PostgreSQL types below are normative (timestamps timestamptz, UUID foreign identities, JSONB for bounded validated snapshots). Prisma mirrors them.

```sql
activity_ai_generations (
  id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(id),
  classroom_id uuid NOT NULL REFERENCES classrooms(id),
  unit_id uuid NOT NULL, type "ActivityType" NOT NULL,
  base_revision bigint NOT NULL CHECK (base_revision>=0),
  request_hash text NOT NULL, input_payload jsonb NOT NULL,
  curriculum_snapshot jsonb NOT NULL, source_snapshot jsonb NOT NULL,
  source_report jsonb NOT NULL DEFAULT '[]',
  schema_version text NOT NULL, prompt_version text NOT NULL, model text NOT NULL,
  generation integer NOT NULL DEFAULT 0 CHECK (generation>=0),
  predecessor_id uuid REFERENCES activity_ai_generations(id),
  state text NOT NULL DEFAULT 'QUEUED' CHECK (state IN ('QUEUED','RUNNING','READY','FAILED','STALE','APPLIED')),
  proposal jsonb, error_code text, missing_information jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(), completed_at timestamptz,
  next_attempt_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  dispatch_count integer NOT NULL DEFAULT 0 CHECK (dispatch_count BETWEEN 0 AND 1),
  lease_nonce uuid, lease_until timestamptz, dispatch_started_at timestamptz,
  apply_request_id uuid, apply_input_hash text, applied_activity_id uuid UNIQUE, applied_revision bigint,
  input_tokens bigint, output_tokens bigint, reserved_microusd bigint NOT NULL DEFAULT 0 CHECK(reserved_microusd>=0),
  usage_day date,
  FOREIGN KEY(applied_activity_id,classroom_id) REFERENCES activities(id,classroom_id),
  UNIQUE(owner_id,apply_request_id)
);
-- All foreign keys RESTRICT / NO ACTION, matching current preservation policy.
-- unit_id is a historical UUID without a live Unit FK: an unapplied/failed job must not pin a deletable unit.
-- Snapshot revalidation makes the proposal STALE if that unit disappears; job history remains intact.
-- Indexes: (state,next_attempt_at), (owner_id,classroom_id,created_at,id), (predecessor_id).
activity_ai_requests (
  owner_id uuid NOT NULL REFERENCES users(id), request_id uuid NOT NULL,
  operation text NOT NULL CHECK(operation IN ('start','regenerate','apply')),
  input_hash text NOT NULL, generation_id uuid NOT NULL REFERENCES activity_ai_generations(id),
  PRIMARY KEY(owner_id,request_id)
);
```

Do not add a second daily budget. Existing `ai_usage_daily` has `(day,scope,capability)` key and existing SQL assumes one row per day/scope. Both capabilities must use the same existing `study-plan-v1` ledger row as a compatibility bucket, or migrate all callers/history atomically to a single shared key; never introduce a parallel capability row. Prefer retaining that bucket in this change. Reservations/settlement accept a narrow job identity rather than hardcode extraction updates. Monetary arithmetic remains conservative integer micro-USD; unknown usage consumes the reservation. Reserve/settle are idempotent and never decrement request count on replay.

Both workers share advisory admission locks 78123001 (quota/budget) and 78123002 (claims), count RUNNING jobs across both tables and enforce one running job per actor across capabilities plus existing global maxConcurrency. Claim with SKIP LOCKED and fenced nonce/lease; process oldest eligible across capabilities without a busy polling loop. No SQL transaction spans file I/O, parser, token count or generation. Renew/revalidate only while the same lease/grant is owned. A lost/expired lease with dispatch_started_at cannot dispatch again and is FAILED/PROVIDER_OUTCOME_UNKNOWN; before dispatch it may be requeued safely. Ignore late output after stale/expired lease. Shutdown aborts/drains workers before storage/database close. All rates/budget/token/deadline values come from existing config; no price discovery or private config reads in this task.

## Implementation units, ownership and DoT

Every unit is <=400 changed production/test lines per local commit; cohesive new files target <200 lines/<40 lines per function. Split a row into successive commits rather than relax invariants. Existing worktree isolates this feature; no additional worktree is needed for disjoint surfaces. Coordinator alone reconciles barrel changes, shared host/proxy glue and roadmap; children keep separate work records and do not overwrite each other. No push/PR is authorized.

| Unit / owner | Files / order | Independent RED and exit evidence |
|---|---|---|
| C0 contracts / AI owner after RED | Shared domain files above; MT owner consumes topic contract and coordinates index.ts | Exact key/type/range/count/evidence/decimal/UUID validation; unsupported source and empty-content cases fail before implementation |
| M1 multi-topic / MT owner | prisma/schema.prisma; one new migration; activity topic association helper; activity-policy.ts | Backfill legacy, DB same-unit/aula FK, duplicate/position rejection; legacy/new consistent parsing; multi-topic RED |
| M2 authoring/projections / MT owner | activity-authoring.ts plus cohesive view/content helpers; plan.ts; affected history/progress/agenda projections | Save/reopen two topics; both selectable/filterable; delete secondary topic CONFLICT; metadata preserves question IDs after first attempt; no double expected/delivered/grade/Agenda rows |
| A1 jobs / AI owner | classrooms/activity-ai/{contracts,database,requests,source,service,queue}.ts, index.ts | Exact service API, teacher isolation/archive/CSRF; snapshots; duplicate start/apply under concurrency; changed-key hash conflict; new draft atomicity |
| A2 sources/provider / AI owner | files/activity-source-reader.ts and durable capability helper; files/index.ts; ai/gemini-activity-adapter.ts, schema/response helpers, ai/index.ts | Approved private PDF/DOCX only, total limits/no silent omission; every selected source reaches token count/input; count fingerprint; closed schema/invalid output/insufficiency/injection controls; no SDK automatic retries |
| A3 worker/shared admission / AI owner | classrooms/activity-ai/{worker,execution,budget,runtime,http}.ts; narrow shared AI admission; existing extraction wrappers/queue | Combined extraction+generation actor/global quota, budget, cross-midnight settlement, maxConcurrency; lease fencing/crash/unknown/late response, stale snapshots, shutdown; no Google calls |
| H1 glue / assigned sole owner | classrooms/{http,host,classrooms.module}.ts, Next route/proxy allowlist as needed | All exact routes accessible/authenticated, body/HTTP mapping, AI off leaves manual endpoints/UI working; source/job cannot be read by students |
| U1 frontend / UI owner after contracts and backend shape frozen | classrooms-ui/{Activities,ActivityAuthoring,types,api}.ts(x); new ActivityGeneration.tsx + source/options/proposal components; scoped styles | Explicit manual/AI choice, topics multiselect and labels, source disabled reasons, no auto generation, truthful recoverable status, guarded dirty replacement, teacher private review, student-safe preview/apply/reopen |
| V1 integration / test_runner | tests/activity-*.test.mjs; scripts/test-activity-ai.mjs; isolated Docker `_test` only | Transactions/rollback for focused DB cases; full API→data→response controlled-provider journey for TP, mixed questionnaire and evaluation; real private file/scanner path and no retained data/config |

`ActivityGeneration` UI export props: `{api:ClassroomClient,room:Detail,onApplied:(activityId:string)=>Promise<void>,onClose:()=>void}`. It uses the source/list/status APIs and existing authoring after apply; it must not reveal key data through preview HTML/JSON.

Mandatory DoT matrix: (1) manual TP PDF/DOCX plus manual questionnaire/evaluation and AI-off regression; (2) all source options, unsupported Library formats/50MB files, selected inaccessible/deleted/digest-changed source, Word image limitation, aggregate limits and insufficient context; (3) each activity type and exact question mix with private keys, points/rules and editable proposal; (4) queued refresh/reopen without new generation, explicit whole-proposal regeneration without losing edited/old proposal; (5) double start/apply, response loss, same key/different body, exactly one draft; (6) teacher changed/revoked, archived room, foreign aula/source/topic, curriculum/plan change at every boundary, blocked post-attempt content; (7) invalid provider output and timeout before/after dispatch, unknown outcome no resend, duplicate claim, expired lease, late output, conservative shared billing; (8) publication revalidation/explicit notification only once, student DTO/attempt/result never leak correct keys, context, jobs or unpublished content; (9) two-theme activity contributes exactly once to eligibility, completion, performance, history and Agenda, with first-confirmed timeliness unchanged.

UI verification uses ego(lite) in one dedicated task Space, controlled provider and synthetic data: desktop and 390/320px layout/screenshots; keyboard/focus; manual vs AI creation; explicit source/warning selection; READY review/edit/preview; dirty regeneration; apply/save/reload; explicit publish/student attempt. Inspect actual captures; DOM-only or failed capture evidence remains explicit. Real Gemini smoke is not required or authorized by this document task. The coordinator may run the already authorized local controlled-provider implementation checks; no retained configuration is read.

Historical PRE-RED checkpoint: contract READY preceded independent RED and implementation. The closure below supersedes that unfinished implementation state; contract and earlier failures remain historical evidence.

## Cierre local verificado — 2026-10-25

Todas las unidades M/A/H/U/V y las nueve filas DoT están implementadas/verificadas en este worktree. [Verificación independiente Sol6.1/xhigh](../../docs/work-log/2026-10-25-activity_independent_verify.md):104PASS sobrebaseline01d1bea y20PASS focalizados después del único delta final hook/regresión, sin cambios de backend/schema. Builds API/Next frescos, PDF/Word reales privados, tipos3, revisión/editado/regen/reapertura, publicación explícita, estudiante/entrega/calificación/progreso/Agenda y conteo único observados. [Capturas reales](../../docs/work-log/evidence/2026-10-25-activity-ai/README.md) desktop/390/320 inspeccionadas; coordinador aceptó las seleccionadas.

Dos jueces cerraron hallazgos y el INFO de recuperación en dos revalidaciones acotadas, sobre árbol final7d47529b560902f82411a53e2f7fc4ebe90ef94e. Doce migraciones históricas intactas; dos nuevas verificadas sólo en bases propias sintéticas. Proveedor controlado en pruebas, sin nueva llamada a Gemini ni configuración retenida. Linter no configurado; compilación/tipos/whitespace observados. Aviso de etiqueta de entrega preexistente permanece atribuido, con hash de fuente sin cambios y actualización correcta; no se amplió el alcance para alterarlo.

La [guía docente](../../docs/activity-ai.md) explica límites y operación. [Entrega y commits locales](../../docs/work-log/2026-10-25-root-activity-ai-implementation.md) son del coordinador; aprobar el código local no autoriza integrar main, push/PR ni despliegue. Primer siguiente paso de producto: revisión humana del resultado local y, si se solicita, un smoke real de Gemini con configuración explícitamente habilitada para ese entorno.
