# TASK-012 — Composición académica y consumidores acotados

Agente `/root/backend_capability_guards`. Fecha 2026-11-16. Worktree `069c`, rama `codex/backend-capabilities`. Ejecución autorizada por el coordinador: reemplazar la fachada productiva por AcademicRuntime agrupado; conservar API plana sólo en fixtures. Ownership: composición/host/módulo/application/HTTP académicos, factories host nuevas, helper de fixtures, remaps de tests y p5-runtime, sección de composición de arquitectura y este registro. No módulos/core/CI/proveedores ni build global mientras TASK-021 escribe.

Revisión del coordinador: autorizó actualizar los contratos DI estructurales de p5-host y activity-ai-publication para seleccionar el runtime y la instancia concreta de invitaciones/autoría; se preservan asserts de negocio y negativos.

Estado final de la unidad: fuentes congeladas para reconciliación/build del coordinador; implementación y controles propios finalizados. No se marca DONE ni se afirma verificación global mientras TASK-021 escribe.

## Composición y consumidores

- `academic-composition.ts` exporta `ACADEMIC_RUNTIME`, `createAcademicRuntime`, `AcademicRuntimeInput` y `AcademicRuntime`. Retira la clase productiva de 75 métodos, bindings/delegadores y mantiene una sola normalización de puertos, un ClassroomCore y los mismos 17 servicios con callbacks enlazados.
- El runtime agrupa access, classrooms/catalog/drafts/memberships/invitations, curriculum/plan, materials/library, communication/wall, home/notifications, activities/authoring, participation/attempts/practicalSubmissions/questionnaires/history y grading/review/assistance/publication/corrections/progress. No mueve reglas o SQL ni construye servicios en los consumidores.
- Nuevo `academic-consumer-ports.ts`: Foxy recibe sólo run/classroom; Student AI sólo progressView; Activity AI recibe sólo database/authenticate y classroom. Tres tokens de proyección seleccionan estos objetos desde el único runtime. Los métodos se enlazan al dueño original, incluyendo authenticate a sus puertos originales.
- Nuevo `academic-http-services.ts`: selecciona referencias enlazadas para los ocho puertos de HTTP. Los puertos de una sola capacidad apuntan directamente a su instancia. Los puertos agregados de transición combinan sólo los métodos requeridos mediante Pick tipado, sin clase nueva de 75 delegadores. `academic-http.ts` admite grupos y conserva entrada plana para los fixtures de transporte existentes; no cambia rutas ni lectura/errores/límites.
- `academic-classrooms.module.ts`: registra/exporta el token runtime, las proyecciones requeridas y el provider de InvitationService que devuelve exactamente runtime.classrooms.invitations. Mantiene workers, cierre, archivos, proveedores y condiciones IA existentes. `register` construye el runtime una vez; `integrated` lo construye una vez por resolución Nest.
- `application.ts` inyecta ACADEMIC_FOXY_ACCESS para Foxy y resuelve ACADEMIC_RUNTIME para conectar HTTP. `academic-host.ts` acepta los ocho grupos sin alterar admisión o lifecycle. No se editaron los otros bootstrap de proveedores activos bajo TASK-021.

## Compatibilidad de fixtures y migración mecánica

- Nuevo `tests/helpers/academic-fixture.ts`: constructor ClassroomService exclusivo de pruebas, tabla tipada método → servicio, métodos de prototipo reales y binding por instancia. Conserva los 75 métodos y sus firmas/retornos concretos, incluido run genérico; no copia composición ni reglas.
- El helper carga perezosamente createAcademicRuntime del build estricto mediante createRequire. Así los tests y scripts/p5-runtime conservan ejecución nativa y flags existentes; se requiere recompilar API antes de construir fixtures de esta versión. Los imports de tipos siguen apuntando a fuente. La carga del helper/prototipo no construye el runtime ni carga ese build anticipadamente.
- Remap AST de imports en 32 archivos: 31 archivos de tests y scripts/p5-runtime.mjs. Sólo se modificaron specifiers que importaban la antigua composición/fachada; no asserts ni escenarios.
- Cambios estructurales revisados por root, TASK-012: p5-host ahora busca ACADEMIC_RUNTIME y verifica que el provider de InvitationService selecciona la instancia concreta, distinta del agregado; todas las comprobaciones de worker, archivos/tx/binding y autenticación se conservaron remapeando access.ports. activity-ai-publication selecciona runtime.activities.authoring, conservando la prueba de provenance/publicación/permiso y su negativo CONFLICT. audit-public-ports-import prueba la factory productiva en lugar de la clase retirada, sin debilitar el control de importación nativa sin Nest/DB.
- Son 35 archivos de consumidores existentes: 32 remaps mecánicos y tres contratos estructurales revisados. La sección de composición de architecture.md se actualizó, conservando el resto del documento.

## Evidencia propia

- RED: `node --test tests/backend-academic-runtime.test.mjs`: **0 PASS/3 FAIL**, porque la composición existente exponía la fachada plana, no access/grupos/token. No fue un fallo de datos o proveedor.
- GREEN final: `node --test tests/backend-academic-runtime.test.mjs tests/backend-academic-routes.test.mjs`: **90/90 PASS**, 0 skips. Siete tests de runtime y 83 regresiones de transporte, todos fuente/transpile sin sockets ni servicios externos.
- Prueba de composición con clases sintéticas: exactamente un core, todos los servicios reciben esa misma instancia, mismas referencias de ready-file/revisión y receptores correctos de enroll/activity/activityView/grading/sessionView.
- Prueba con la factory y ClassroomCore reales, SQL sintético: dos operaciones (lectura/escritura) usan el database proporcionado y mantienen FOR SHARE/FOR UPDATE y opciones maxWait=2000/timeout=6000. No se llamó a una DB real ni a archivos/proveedores.
- Proyecciones: claves exactas y bindings de Foxy/Student/Activity; no exponen otras capacidades. Fixture: una llamada a la factory por constructor, 75 métodos en prototype, referencias ports/tokens del runtime y callbacks utilizables separados de la instancia.
- Negativos de tipos con fixture TypeScript virtual: retorno concreto de Plan, run genérico Promise<number>, rechazo de resultado arbitrario y rechazo de capacidades ajenas desde los puertos estrechos. PASS dentro de las siete pruebas.
- TypeScript noEmit con opciones reales y diagnósticos filtrados a los siete bootstrap propios más helper: **0 diagnósticos**. No es una declaración de tipos globales. Se corrigió un salto inválido antes de `as` en el helper; el test fuente detectó además colisión de un binding local require con el loader CJS, corregida renombrándolo fixtureRequire. Son fallos de implementación corregidos, no RED funcional.
- Importación nativa del helper sin nuevos flags: PASS; 75 métodos de prototipo. No se construyó un fixture contra el build anterior.
- `node scripts/check-boundaries.mjs`: PASS, **0 frozen exceptions**.
- `git diff --check -- <bootstrap/helper/test/docs propios>`: PASS; sólo avisos de normalización LF/CRLF.

## Pendientes, tamaño y reversión

- Root debe recompilar API estricto después de estabilizar TASK-021 y ejecutar fixtures/suites, especialmente p5-host, activity-ai-publication y los consumidores remapeados. La verificación real del provider Nest revisado está pendiente de ese build; no se infiere desde las proyecciones sintéticas.
- No se ejecutaron DB, red, proveedores, migraciones ni build global. Tampoco se modificaron inventarios/CI/tablero. Nuevos archivos a inventariar: dos factories bootstrap, un helper de tests y tests/backend-academic-runtime.test.mjs.
- La unidad excede 400 líneas por el traslado de compatibilidad (tabla tipada de 75 métodos), wiring y pruebas. Distinguir autoría de factory/proyecciones/puertos/tests de los 32 remaps de specifiers. Mantener factory, token DI y helper juntos evita una fase con composición duplicada o sin consumidores resolubles; los remaps se revisan mecánicamente aparte.
- Reversión coordinada: invertir únicamente el diff de esta unidad en los cinco bootstrap existentes, retirar las dos factories nuevas/helper/test nuevo y el párrafo de composición, y devolver los 35 consumidores a su destino previo. No restaurar desde HEAD indiscriminadamente: antes de esta unidad ya existían cambios de otros agentes en esos archivos. Si root ya integró inventarios o wiring adicional, reconciliarlos antes de invertir el corte. Sin commits propios.
