# Brújula — datos derivados de Inicio y catálogo

- Agent / role: worker.
- Session or task ID: /root/brujula_data_complete.
- Date: 2026-11-05.
- Branch / worktree: codex/foxmind-brujula / compartido.
- Starting commit: 5ea7f568d485512c88ed626511aef537bcad5704.
- Phase and detailed task/spec links: [Brújula](../../odd/tasks/foxmind-brujula.md).
- Status: completed.

## Request and scope

Datos derivados autorizados por usuario y coordinador: métricas catálogo, próximo tema, borradores globales docentes y entregas propias en revisión. Sin tablas nuevas, secretos, proveedores ni datos retenidos. Superficies de otros agentes preservadas.

## Work performed

Inspección de contratos Home, SQL de aulas y maqueta aprobada. Contrato propuesto y aprobado por coordinador:

- `drafts`: actividades DRAFT de todas las aulas docentes activas, título, tipo, aula y actualización. Total exacto y cursor 5+1 mediante la lectura SQL existente.
- `submitted`: último intento por actividad del alumno actual, exclusivamente SUBMITTED sin nota publicada; un nuevo DRAFT lo devuelve a pending. No proyecta notas privadas. Conserva historial y datos persistidos.
- `ClassroomItem.planProgress` en ambos roles activos y `nextTopic` (IDs/nombres de unidad y tema, orden unidad/tema, null si no queda tema). `HomeTarget` de aula admite `topicId` opcional UUID para navegación exacta.
- Validación Home antigua compatible: ausencia de los dos módulos aditivos normaliza a not-applicable. El servidor nuevo los devuelve completos. Requiere sincronizar clientes/publicación posteriormente.
- Catálogo: `planProgress` ambos roles; `studentCount` exclusivo docente con períodos de membresía activos. Todo en un SELECT, sin consultas por aula desde el cliente.
- Tarjeta del catálogo con estudiantes reales, avance accesible y estados Sin temas/No disponible sin porcentaje inventado.

Archivos: `apps/api/src/home/{http,queries-content,queries-desk,read-port,sql-page}.ts`, `apps/api/src/classrooms/classroom-queries.ts`, `src/core/domain/{home,home-validation,home-rows-validation,home-target}.ts`, interfaz Classroom en `apps/classrooms-ui/api.ts`, `ClassroomCollectionCard.tsx` y cuatro pruebas nuevas `tests/brujula-data-*.test.mjs`. No se modificaron tablas, credenciales, Home.tsx ni CSS.

## Verification

- RED observado: `node --experimental-transform-types --test tests/brujula-data-contract.test.mjs` → 0 PASS/3 FAIL por módulos/campos faltantes. RED HTTP → 404 para los nuevos módulos.
- GREEN: `node --import ./scripts/register-api-test-build.mjs --experimental-transform-types --test tests/brujula-data-contract.test.mjs tests/brujula-data-http.test.mjs tests/brujula-data-card.test.mjs tests/brujula-data-database.test.mjs` → 7 PASS/0 FAIL/0 SKIP, salida 0.
- La prueba SQL usa `withAgendaDatabase`: contenedor propio efímero, migraciones actuales, rollback y eliminación. Cubre permisos de service por rol, 7 borradores paginados, ajenos/archivados excluidos, intentos propios/último/privacidad/publicación, próximo tema y fin de plan, métricas catálogo y pérdida de membresía. Corrida adicional tras sumar permisos de service → 1 PASS/0 FAIL.
- `npm run api:build` → generación Prisma y TypeScript API salida 0 (dos corridas; la última refrescó la ruta HTTP).
- `npx eslint apps/api/src/home apps/api/src/classrooms/classroom-queries.ts src/core/domain/home*.ts apps/classrooms-ui/ClassroomCollectionCard.tsx` → salida 0.
- `npx tsc --noEmit -p apps/web/tsconfig.json` → falló durante integración concurrente: faltaban drafts/submitted en home-labels y HomeModule (ownership root, avisado). No se declara verificado web.
- Regresión dirigida `foxmind-3d-contracts` + `foxmind-3d-http`: 9 PASS/2 FAIL por deepEqual histórico que esperaba identidad del payload sin módulos normalizados; informado al coordinador para actualizar la expectativa. `home-by-role` contiene rechazo histórico del progreso alumno que ahora contradice el requisito; informado sin editar pruebas ajenas.
- Experimento SQL inicial falló por fixture de fin de membresía sin ended_by_id; fixture corregido y GREEN. Primer GREEN HTTP con hook compilado todavía produjo 404 por build anterior; build fresco y GREEN confirmados.

## Commits and outcomes

Sin commits.

## Handoff

Superficie worker congelada tras pruebas. Coordinador debe integrar consumo de los módulos, navegación por topicId y regex de proxy web (`apps/web/src/lib/home-proxy.ts`), actualizar expectativas históricas y ejecutar tipos/recorridos completos. Los nuevos archivos de pruebas requieren registrarse en el inventario central por su propietario. No se marca la fase Brújula completa; no hubo commit, push ni despliegue.


## Contador real de consultas sin respuesta — 2026-11-05

El coordinador autorizó completar `queries.totalItems`, anteriormente null deliberado. `sql-page.ts` ahora ejecuta COUNT sobre la misma fuente autorizada de consultas sin respuesta docente antes del cursor, devolviendo el total en todas las páginas y cero real si no hay pendientes. Materials conserva totalItems null. No se cambió UI, CSS, privacidad ni reglas de selección.

RED: `node --experimental-transform-types --test tests/brujula-data-database.test.mjs` →1PASS/1FAIL por null!==0. GREEN tras implementar: mismo comando→2PASS/0FAIL/0SKIP, salida0. Prueba SQL ampliada en contenedor propio efímero cubre total7 con páginas5+2, actor ajeno0, exclusión archivados/ajenos/retirados/avisos, respuesta alumno conserva7, respuesta docente reduce6 y quita fila, todas respondidas total0, materials conserva null. `npx eslint apps/api/src/home/sql-page.ts`→salida0.

La expectativa histórica en `tests/foxmind-3d-repository.test.mjs` se actualizó de queries.totalItems null a1 según su fixture de una consulta. Sin build por instrucción del coordinador mientras E2E está activo. Superficie congelada; root debe refrescar build API cuando termine el proceso actual. Sin commits ni publicación.
