# Búsqueda global Brújula — implementación

- Agent / role: worker de búsqueda
- Session or task ID: /root/brujula_classroom_fidelity
- Date: 2026-11-05
- Branch / worktree: codex/foxmind-brujula / compartido
- Starting commit: 5ea7f568d485512c88ed626511aef537bcad5704
- Phase and detailed task/spec links: [Brújula](../../odd/tasks/foxmind-brujula.md); [coordinador](2026-11-05-id-unavailable-brujula-complete-base.md)
- Status: in_progress

## Request and scope
Completar búsqueda global HTML sobre aulas, temas, materiales y actividades autorizados. Endpoint de lectura acotado, sin índice ni tabla nueva. Sin contenidos privados en resultados, alumno sólo actividades publicadas, destinos revalidan acceso existente. Sin secretos, publicación o datos retenidos.

## Work performed
Inspeccionada referencia matchSearch en .test-artifacts/brujula-reference-readable.html3023–3026, NavigationSearch, shell, controlador HTTP/proxy, clientes y permisos/consultas de aulas. Leídas reglas Next locales y guía Pages API antes de tocar web.

## Verification
Pendiente RED/GREEN, tipos/lint y SQL desechable.

## Commits and outcomes
Sin commits.

## Handoff
Implementar servicio paginado y contratos, conectar búsqueda de todos los shells privados y comprobar privacidad/destinos exactos.

## Implementación y contrato
- Endpoint nuevo GET /api/v1/classrooms/search?q=<texto>&cursor=<opcional>. API interna /classrooms/search. Hasta12 resultados/página, sin conteo global ni índice/tabla nueva. Orden estable por familia/UUID; cursor HMAC namespace search ligado a actor/consulta. Query≤120 caracteres, sin controles, llaves ajenas, duplicados ni cursores arbitrarios. Comparación Unicode NFD sin acentos y substring literal (%, _ no son comodines).
- Nueva consulta en apps/api/src/classrooms/brujula-search.ts: CTE de aulas autorizadas según rol vigente (propias docente / membresía activa alumno). Une aulas/temas/materiales/actividades. Material sólo no borrado y archivo íntegramente listo. Alumno sólo actividad PUBLISHED; docente también borradores/retiradas propias. Proyección limitada a título/familia/aula/división/target; no rúbrica, consignas, entregas, archivos privados ni datos de otros integrantes.
- Domain brujula-search.ts define query/page/targets validados y href canónico. Usa HomeTarget topicId ya implementado por worker datos/root; no se modificaron Home* ni ClassroomView.
- composition.ts/composition-bindings.ts/http.ts/signed-page-cursor.ts integran lectura con admisión/autenticación y límites de transacción vigentes.
- classroom-proxy.ts admite exclusivamente GET/search, valida query antes de upstream. Encodificación de consulta UTF8 permitida sólo en esta ruta; path codificado/traversal y otras rutas conservan rechazo previo. Sin cambios al archivo Pages API catchall ni CSRF/mutaciones.
- NavigationSearch conserva CtrlK/Escape/foco y búsqueda de navegación, incorpora contenido autorizado, debounce180ms, AbortSignal, descarte de respuestas viejas, carga/error/reintento, más resultados y enlaces exactos. Datos previos se ocultan al cambiar cliente/sujeto o consulta; no se carga masivamente contenido de aulas en browser.
- brujula-search-client.ts usa ClassroomClient.call GET y valida payload; AppNavbar recibe client opcional, Classrooms y AccountNavbar pasan client real. Classrooms enruta resultados por target antes de interpretar link genérico de aula. AccountNavbar reinicia client al cambiar identidad.
- Pedido paralelo de root/accountworker: tubería accountEmail opcional AppNavbar→ShellAccount y desde sesión en account-navbar/ClassroomsScreen→Classrooms; NavbarParts pertenece a accountworker y no se tocó. Pedido QA root: logo de Classrooms dirige a /inicio.

## Archivos
src/core/domain/brujula-search.ts; apps/api/src/classrooms/{brujula-search,composition,composition-bindings,http,signed-page-cursor}.ts; apps/shared-ui/{NavigationSearch,AppNavbar}.tsx y brujula-search-client.ts; apps/classrooms-ui/Classrooms.tsx; apps/web/src/components/{account-navbar,classrooms-screen}.tsx; apps/web/src/lib/classroom-proxy.ts; tests/brujula-search-{contract,ui,transport,database}.test.mjs.

## RED/GREEN y evidencia
- RED observado: test nuevo de contrato falla por módulo de búsqueda aún inexistente. Luego2 contratos GREEN.
- Durante preparación SQL se registraron fallos de fixture (columna instructions antigua, casteo ActivityStatus, campos requeridos de publicación y fin de membresía). Se corrigió el fixture conforme a contratos reales; revocación final usa servicio real remove. No se relajó producción ni constraints.
- `node --test tests/brujula-search-contract.test.mjs tests/brujula-search-ui.test.mjs tests/brujula-search-transport.test.mjs tests/brujula-search-database.test.mjs`:11 PASS/0 FAIL final.
- SQL usa PostgreSQL desechable propio/rollback:4 familias,20 temas en2páginas sin pérdidas/duplicados, acentos, comodín literal, cursor ligado a actor/consulta/tamper, extraño sin acceso, alumno sin borradores/retiradas, ninguna rúbrica, materiales pendientes/borrados excluidos y revocación inmediata incluso con cursor anterior. Fixture propio retirado.
- UI verifica cancelación al cambiar query/desmontar, ignora respuesta tardía y navegación exacta a topicId. Cliente rechaza payload inesperado y construye sólo destino local canónico.
- HTTP/proxy verifica UTF8/query, cookies transportadas, admisión read, no-store, rechazo de autoridad/duplicados/límites/POST/path codificado. Admisión de este test es fixture, no prueba de sesión P3 real.
- `node --test ...contrato/UI/transporte... tests/audit-wall-proxy.test.mjs tests/p5-web-proxy.test.mjs`:13 PASS (5nuevos+8regresiones).
- `npx tsc --noEmit -p apps/web/tsconfig.json`, `npx tsc -p apps/api/tsconfig.json`: PASS; API compilada fresca.
- eslint13 archivos tocados: PASS. `node scripts/check-boundaries.mjs`: PASS127excepciones previas. git diff --check focal: PASS.

## Límites / handoff final
Código congelado comunicado a root. Falta navegador real sobre build final y revisión independiente del nuevo candidato; no se afirma pixelparity ni sesión real a partir de tests sintéticos. Búsqueda literal sobre aulas autorizadas sin índice nuevo: resultado/red acotados, sin medición de carga productiva. Paginación estable por UUID, no ranking semántico. Datos pueden cambiar entre páginas; cada página revalida permisos actuales.
Root coordina QA/inventario de los4archivos de tests (fast3 + SQL1). No se cambió esquema, no servicios externos ni proveedores, sin publicación, commits o secretos/datos retenidos. Estado del registro permanece in_progress hasta aceptación/revisión del coordinador.
