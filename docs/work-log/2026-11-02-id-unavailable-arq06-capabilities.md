# ARQ-06 — capacidades de Classrooms

- Agent / role: /root, coordinación e implementación.
- Session or task ID: no disponible.
- Date: 2026-11-02.
- Branch / worktree: main, C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind.
- Starting commit: add38ec16a6f03e4e4332288b198036161e4cf58.
- Phase and detailed task/spec links: [ARQ-06](../../odd/tasks/architecture-consolidation.md#arq-06--reducir-acoplamiento-de-classrooms), [diseño aprobado](../../odd/tasks/architecture-consolidation-arq03-design.md).
- Status: completed.

## Request and scope

Reducir acoplamiento por capacidades y verificar paridad de permisos y contratos. El checkout incluye cambios previos de ARQ-02/04/05 y de otras tareas. Se preservan sus superficies ajenas.

## Work performed

Inventario inicial: token InvitationService usado para la fachada, referencias de autoría/participación/corrección al servicio de Plan, uso de la fachada y sus puertos en IA y lectores con transacción autorizada. Inicio y Agenda conservan su proyección y autorización.

- Aulas y participación. La emisión de códigos tiene una operación compartida entre publicación inicial y rotación. El parser de revisión dejó de depender de Drafts. Se eliminó el ciclo Drafts/publicación mediante un contrato estrecho de escritura y lectura bloqueada. El lock y la transacción de cada llamador se conservan.
- Enseñanza y evaluación. Plan, biblioteca, autoría, participación, historial, muro y evaluación reciben operaciones de revisión y archivo listo según necesidad. Publicación de biblioteca normal y desde Foxy comparten validación de archivo y actualización de revisión. Se conserva el CAS especial de publicación y su rango de revisión.
- Composición. `ClassroomService` es el token de Nest y `InvitationService` conserva un alias a la misma instancia. El transporte tipa solo operaciones de rutas. Activity AI recibe acceso de transacción y autorización. Student AI recibe base de sus trabajos y proyección de progreso. Foxy recibe únicamente dos operaciones del contexto de lectura, sin importar la fachada. El acceso genérico que requiere SQL de proyección sigue localizado. El contrato transitorio de la fachada se conserva para los llamadores existentes.
- Límites. 146 entradas activas frente a 155 iniciales, con nueve retiradas y cero añadidas. Se retiró el ciclo de ejecución de Drafts/publicación, accesos privados redundantes y referencias a barrels amplios. La separación completa de persistencia y la coordinación entre colas quedan para sus unidades posteriores.

## Verification

- RED focal del token en `tests/p5-host.test.mjs`: 0/1 antes del cambio, porque faltaba el provider `ClassroomService`. El mismo caso pasó en la selección final de transporte.
- `npm run api:build`: generación Prisma y compilación estricta exit 0. `npm run lint:boundaries`: exit 0 con 146 entradas activas.
- Selección host, HTTP aulas/autoría/evaluación/Agenda, guard y catálogo/snapshot de Foxy con preload del build: 44 PASS, 0 FAIL, 0 SKIP. Incluye permisos de docente y conversación, revalidación y PostgreSQL desechable en el snapshot de Foxy.
- PostgreSQL 17.6 temporal mediante `.test-artifacts/arq06-native-postgres.mjs`: `tests/p5-drafts.test.mjs`, `tests/p5-enrollment.test.mjs`, `tests/p6-plan.test.mjs`, `tests/p6-library.test.mjs`, `tests/p7-authoring.test.mjs` y `tests/p8-grading.test.mjs`. 56 PASS, 0 FAIL, 0 SKIP. Incluye caducidad y rotación, archivo/egreso, autenticación tras espera, concurrencia, privacidad y CAS. Las fixtures académicas ejecutaron migraciones vigentes y borraron clústeres propios.
- Tanda final con Docker y preload del build: `tests/activity-ai-host.test.mjs`, `apps/api/src/classrooms/library-publication.test.mjs`, `apps/api/src/foxy-ai/foxy-shared-admission.test.mjs` y `apps/api/src/foxy-ai/foxy-visual-cross-admission.test.mjs`. 56 PASS, 0 FAIL, 0 SKIP. El host arrancó Nest con sesiones persistidas y verificó 401/403, Origin/CSRF, permisos de docente y 202/200. El publicador preservó rollback, exclusión por dueño, revisiones de 19 dígitos y receptor del callback. El caso del receptor fue RED contra el build anterior y pasó en el final.
- Tandas intermedias conservadas como diagnóstico. La selección Docker previa dio 46 PASS y 13 FAIL por dos fixtures que todavía pasaban `classrooms.ports` al claim Activity AI. Se migraron al puerto nuevo y pasaron en la tanda final. El lanzador nativo exploratorio de IA dio 11 PASS y 11 FAIL porque el reemplazo de Agenda no reprodujo el nombre `_test` y el rollback entre casos. La tanda final usó los helpers Docker originales y reemplaza esa evidencia exploratoria para las rutas de admisión.
- [Revisión independiente](2026-11-02-arq06_review-independent.md) sin bloqueantes. Coinciden las siete huellas de componentes cotejadas. La revisión encontró la regresión de receptor y verificó su corrección.
- Preservación: 20 de 21 archivos del manifiesto ARQ-02 coinciden. La diferencia es la migración intencional de la fixture Foxy a los puertos de ARQ-06. De los 12 archivos revisados de ARQ-05, solo cambian el cableado de aplicación y la línea base de excepciones, según el alcance de ARQ-06.
- Tanda final de procedencia con IA desactivada, locks de listados y reportes estudiantiles con Docker: `tests/activity-ai-publication.test.mjs`, `tests/audit-activity-ai-lock.test.mjs` y `tests/student-ai-integration.test.mjs`. 9 PASS, 0 FAIL, 0 SKIP. La prueba del worker usa proveedor sintético y cubre revocación de pertenencia durante el trabajo.
- Navegador, proveedores reales y recorrido completo con almacenamiento y escáner quedaron fuera de la selección. La evidencia del host usa sesión persistida real y los adaptadores de archivo e IA de la fixture.
- Cierre: 0 clústeres ARQ-06 y 0 contenedores de fixtures con las etiquetas IA o Agenda. HEAD coincide con el inicial. `git diff --check` exit 0 con avisos LF/CRLF. Validador focal: 4 documentos, 276 enlaces, 0 problemas. `npm run docs:check`: 138 documentos, 1707 enlaces, 0 problemas.

## Commits and outcomes

ARQ-06 completada localmente. Se actualizaron plan y roadmap. Sin cambios de esquema, datos retenidos, commits ni publicación.

## Handoff

ARQ-07 queda pendiente de asignación. El transporte actual conserva la fachada compatible. Al consolidar contratos, tomar como base las operaciones acotadas y mantener la autorización del servidor y los lectores de Inicio/Agenda.
