# Migración backend académico, Foxy, Estudio e Inicio

Agente: academic_backend (worker delegado; identidad de sesión no expuesta). Fecha: 2026-11-10. Base del encargo: 29fda64. Workspace compartido; cambios concurrentes preservados.

## Alcance y autorización
TASK-019/020, migración por responsabilidades y puertos sin cambiar HTTP, SQL, reglas, locks, transacciones ni proveedores. Sin Git writes, Docker, DB, secretos ni servicios reales. El coordinador posee tablero y documentación canónica.

## Estado
VERIFYING; producción propia congelada para integración del coordinador. Primer RED de frontera: 3 fallos ENOENT esperados. GREEN posterior: 3/3; la prueba se amplió a cuatro controles de aplicación sin SQL/infra.

El movimiento mecánico inicial trasladó 230 cuerpos con puentes explícitos; luego se extrajeron aplicación, repositorios y capacidades. Participación/calificación fueron transferidas a otro escritor por el coordinador; este registro no atribuye sus extracciones ni pruebas a este agente.

## Evidencia y límites
- `node --test tests/academic-backend-modules.test.mjs`: RED inicial 3/3 por ausencia de contratos; GREEN final 4/4.
- `node --experimental-transform-types --test apps/api/src/study-folders/service.test.ts apps/api/src/study-folders/policy.test.ts apps/api/src/study-engine/engine.test.ts tests/academic-backend-modules.test.mjs`: 45/45 en la ejecución anterior a agregar el cuarto control de frontera. Incluye generación fuera de tx, recibos durables, revocación/fuentes, ventana contextual y cuota UTF-8.
- `node --experimental-transform-types --test apps/api/src/modules/classrooms/infrastructure/context-run.test.ts apps/api/src/modules/curriculum/application/plan.test.ts tests/academic-backend-modules.test.mjs`: 8/8. Cubre locks/reautenticación/reloj/presupuesto, revocación después de esperar, tx recibido y revisión obsoleta antes de escritura.
- `node node_modules/typescript/bin/tsc -p apps/api/tsconfig.json --noEmit --incremental false`: PASS al congelar. Ejecuciones intermedias detectaron errores transitorios propios y concurrentes; fueron corregidos, sin tocar aceptación para ocultarlos.
- `node node_modules/eslint/bin/eslint.js apps/api/src/modules/classrooms apps/api/src/modules/curriculum apps/api/src/modules/materials apps/api/src/modules/communication apps/api/src/modules/activities apps/api/src/modules/foxy apps/api/src/modules/study apps/api/src/modules/home`: PASS.
- `inspectBoundaries` filtrado por archivo origen en esos ocho módulos: 0 hallazgos, incluidos ciclos. No se añadieron excepciones.
- Comparación AST contra `git archive 29fda64 apps/api/src/classrooms apps/api/src/foxy-ai apps/api/src/study-folders apps/api/src/home`: 531 consultas/plantillas SQL únicas, 0 faltantes en canónicos actuales (incluyendo proyección Agenda preservada). Se normalizaron espacios y se compararon segmentos estáticos de interpolación. Cuatro SQL adicionales pertenecen a `study/infrastructure/providers/study-adapter.ts`, trasladado por el coordinador desde AI; no son consultas nuevas de esta unidad.
- El intento de ejecutar `foxy-management-contract.test.ts` como test runtime falló con `ReferenceError: repositoryView is not defined`: es un contrato exclusivamente de compilación con `declare const`, no una prueba runtime. Se conserva intacto; el typecheck sí lo verificó.

No se ejecutaron DB, Docker, proveedor real, build global ni acciones Git por este agente. El coordinador realiza build/integración/suites completas. La comparación SQL es estática y no acredita concurrencia real ni persistencia.

## Cambios y contratos

- `modules/classrooms/application/{contracts,ports,transaction-mode}.ts`: Actor/Transaction/ClassroomRow, ClassroomAccess, AcademicFeatureContext, RevisionPort, PreviewTokenPort y EnrollmentPort estructurales. Un solo WeakMap conserva identidad de tx. Contexto/runner siguen adaptadores técnicos.
- `modules/classrooms/application/{drafts,memberships,invitations}.ts`: reglas CRUD/pertenencia y repositorios inyectados. Validación de mailbox y promoción de archivo son capacidades explícitas; FileStore dejó de ser contrato académico. Los helpers transaccionales de publicación de borrador/confirmación/pertenencia conservan su cuerpo y orden en adaptadores recibidos por bootstrap.
- `modules/curriculum/application/plan.ts` y TopicProgressRepository: acceso docente, revisión y cambio de estado temático; SQL/locks en infraestructura. Contratos de generación/servicio acotados para presentation; runtime/proveedor montado por bootstrap.
- `modules/activities/application/activity-authoring.ts`: reglas y DTOs de autoría; 15 SQL expresiones en AuthoringRepository. ActivityReadPort público mantiene lectura transaccional sin importar clase concreta de infraestructura. ActivityDraftWriterPort habilita el handoff Foxy por bootstrap.
- `modules/materials/application/{library,library-publication}.ts`: biblioteca/publicación con LibraryRepository y MaterialPublicationRepository; hash/ID/archivo/revisión inyectados. 15 SQL de biblioteca y consultas de publicación permanecen en infraestructura.
- `modules/communication/application/wall.ts`: reglas de muro/notificaciones, 13 SQL expresiones en WallRepository y proyecciones mediante WallReadPort. SQL de selección queda en infraestructura.
- `modules/home/application/{service,notification-targets}.ts`: proyección Inicio y destinos puros. Proyecciones SQL autorizadas agregadas siguen en infraestructura; sin N+1 introducido.
- `modules/foxy/application`: diez servicios de aplicación con repositorios explícitos, contratos de cola/leases/autoridad/lectura. SHA256, grounding SQL, permisos activos, readers, custodia y publicación se inyectan. WeakMaps de capability/signal/nonce y cuerpos de cola/presupuesto permanecen en sus adaptadores.
- `modules/study/application/{service,commands,contracts,ports}.ts`: idempotencia, generación, estados y comandos privados; StudentUnitOfWork y FolderRepository conservan SQL y opciones transaccionales. Agenda continúa recibiendo el tx vigente. `StudyUploadOperations.receive` usa entrada `unknown` y conserva el guard Buffer runtime original, sin publicar tipos Node en la interfaz.

Los símbolos de errores permanecen únicos: ClassroomError y reglas neutrales fueron extraídos por el coordinador; FileIdentityError por el escritor técnico. Los imports nuevos usan sus entradas públicas. Ninguna fábrica de infraestructura se reexporta desde los públicos nuevos.

### Composición canónica y remapeo de consumidores

| Construcción anterior | Canónico para composición/consumidores de host |
| --- | --- |
| ClassroomService | `bootstrap/academic-composition.ts` |
| DraftService, MembershipService, InvitationService | `bootstrap/academic-management-composition.ts` |
| ActivityAuthoringService | `bootstrap/academic-authoring-composition.ts` |
| PlanService | `bootstrap/academic-curriculum-composition.ts` |
| LibraryService, createLibraryMaterialPublisher | `bootstrap/academic-materials-composition.ts` |
| WallService | `bootstrap/academic-communication-composition.ts` |
| ClassroomAiRuntime | `bootstrap/academic-curriculum-ai-runtime.ts` |
| ActivityAiRuntime | `bootstrap/academic-activity-ai-runtime.ts` |
| InvitationDeliveryWorker, localInvitationSender | `bootstrap/academic-delivery-composition.ts` |
| createFoxyRuntime/createFoxyVisualRuntime | `bootstrap/foxy-runtime.ts`, `bootstrap/foxy-visual-runtime.ts` |
| createFoxyConversationService/Turn/Resource/Citation/Visual y prepareFoxyActivity compatibles | `bootstrap/foxy-service-factories.ts` |
| selectFoxyVisualProviders | `bootstrap/foxy-visual-host-providers.ts` |
| createFoxyUnitOfWork/createFoxyPublicationFileAllocator para integración técnica | `bootstrap/foxy-file-connections.ts` |
| createStudyService compatible (StudyOptions) | `bootstrap/study-composition.ts` |
| createStudyAuthentication/installStudyTransport | `bootstrap/study-transport.ts` |
| installHomeTransport | `bootstrap/home-host.ts` |

Rutas bajo `modules/*/public.ts` exponen aplicación/dominio y contratos nombrados. Sus constructores/fábricas nuevos reciben puertos: no son sustitutos de los constructores técnicos de bootstrap. Los originales `classrooms`, `foxy-ai`, `study-folders`, `study-engine`, `home` conservan únicamente puentes nombrados provisionales para consumidores que el coordinador remapea y retira; los wrappers provisionales host-only introducidos dentro de módulos nuevos ya fueron retirados.

### Firmas deliberadas

- ClassroomPorts.files: load/loadAuthorized y promoteDraftPlanInTransaction explícitos, en lugar de FileStore; validateMailbox se inyecta. La compatibilidad de construcción se concentra en bootstrap.
- Casos de uso app académicos: parámetros de repositorio/operaciones adicionales; constructors de bootstrap conservan firma anterior.
- Foxy app: repositorios estructurales y capacidades SHA256/grounding/authority/readers/handoff; factories compatibles en bootstrap.
- Estudio app: StudyApplicationPorts; factory técnica compatible sigue aceptando StudyOptions.

## Límites e incidencia de coordinación

Una pasada de remapeo recorrió `bootstrap/*.ts` y escribió archivos aunque no cambiara imports, en lugar de limitar el recorrido a prefijos propios. Se avisó al coordinador: pudo normalizar CRLF a LF en cinco archivos técnicos fuera de la superficie; no se pretendía cambiar su código. No se volvió a escribir fuera de los prefijos autorizados. El coordinador/revisor técnico debe cotejar contra su freeze; este registro no atribuye aceptación de esos deltas.

Aceptación pendiente: build y suites integradas del candidato, remapeo/retiro final de consumidores legacy, verificación independiente y reconciliación documental por el coordinador. No se marca DONE ni se escribe el tablero.

## Reversión
Revertir exclusivamente los archivos propios enumerados por este registro/diff; retirar módulos nuevos y restaurar puentes desde la base, preservando cambios ajenos. No tocar datos.


## Primer paso pendiente

El coordinador integra consumidores root y ejecuta build API/suites con este candidato congelado; cualquier hallazgo debe devolverse con archivo/criterio antes de reabrir escritura.
