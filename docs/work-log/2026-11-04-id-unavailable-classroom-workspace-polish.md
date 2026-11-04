# Mis aulas y aula — coordinación

- Agent / role: root, orquestador e implementador.
- Session or task ID: unavailable.
- Date: 2026-11-04.
- Branch / worktree: codex/classroom-workspace-polish, checkout principal.
- Starting commit: b0393247ba104f275fd6c4b2296fdee591ca7661.
- Phase and detailed task/spec links: R2, [plan único](../../odd/tasks/classroom-workspace-polish.md).
- Status: completed.

## Request and scope

Implementar la propuesta UI/UX aceptada para Mis aulas e interior con sus ocho pestañas. Autoriza plan y ejecución local. Mantener roles, contratos, navbar común y datos de demo; sin cambios de backend, migraciones, proveedores reales, commits/push/deploy. Persistir filtros al volver y nuevas URLs por pestaña siguen fuera de este alcance, como se distinguió en la propuesta.

## Work performed

Roadmap/protocolo/contratos/código reconciliados. main limpio sincronizado b039324 al comenzar; rama propia creada. Se aplican ui-ux-pro-max (ya consultada para la propuesta), harness-specification y harness-tdd-qa. Plan persistente y cinco hitos nativos. Delegación justificada por superficies disjuntas: colección versus contenido de pestañas; root mantiene cabecera/navegación, Plan/Biblioteca/Muro e integración de estilos. Revisión independiente prevista por la extensión de la UI compartida y permisos académicos.

- Worker /root/collection_polish: colección, filtros, tarjetas y reubicación de pendientes; [registro propio](2026-11-04-collection-polish-workspace.md). Tras primer GREEN, root solicitó retirar de JSX los controles de rol obsoletos en vez de ocultarlos con CSS. El worker mantuvo contratos puros del filtro y actualizó únicamente expectativas de UI por el nuevo alcance aprobado.
- Worker /root/classroom_content: Actividades, Progreso, Alumnos/Compañeros, Historial y ajustes; [registro propio](2026-11-04-classroom-content-workspace.md). Root integra CSS e incorpora retoques por QA; los workers no escribieron roadmap ni plan.
- Root: ClassroomNavigation explícito y puro con cinco secciones de trabajo/tres de gestión docente, seis alumno; cabecera pequeña, título de sección accesible sin duplicarlo visualmente, sidebar global intacto. Plan con acciones breves y nombre accesible completo; selección conserva autoridad. Muro con guía plegable y composición de lectura; Biblioteca con estilos compactos y acceso predominante. CSS nuevos acotados al contexto de aula, importados en workspace.css. Cuatro pruebas nuevas clasificadas en fast.

## Verification

Plan de verificación inicial: RED/GREEN focal, tipos/lint/build aislado e inventario, QA con fixture sintética real en cuatro anchos y revisión independiente. Los resultados finales están en Cierre verificado. No se afirma aislamiento estricto de TDD: procesos comparten workspace; propiedad por archivos y revisión, sin garantía de sandbox.

Resultados parciales observados:
- Root shell RED 0/3 y GREEN 3/3; currículo RED 0/1 y GREEN 1/1. Workers devolvieron RED/GREEN atribuidos en sus registros. Dos pruebas históricas que buscaban literalmente el array de tabs inline se actualizaron a la navegación extraída conservando claves, etiquetas y restricciones. La prueba Plan pasó a localizar la acción por su nombre accesible completo, manteniendo destino y ausencia de escrituras.
- Selección integrada de 17 archivos: primera 67 PASS/1 FAIL por selector antiguo de texto Plan; después de adaptar nombre accesible, 68 PASS/0 FAIL/0 SKIP. Tipos web integrados y lint: exit 0; 129 excepciones de arquitectura intactas. Inventario: 451 entradas/53 exclusiones/23 rutas. El tsc aislado classrooms-ui falló en workers por tipos CSS de su config; no se ocultó ni cambió ese proyecto. La compilación web sí incluye esas declaraciones.
- Fixture propia en .test-artifacts/classroom-workspace, Vite loopback53257, componentes reales y APIs sintéticas existentes adaptadas sin datos privados. Se normaliza la respuesta histórica incompleta del Muro al contrato vigente de paginación/replies y se provee historial ficticio; no es respuesta de backend real.
- Ego-browser Space6: primer intento de captura bloqueado por ventana minimizada; se restauró solo Ego y continuó mismo Space. Primer barrido interior: 56 combinaciones (ocho docente/seis alumno en320/390/768/1440), cero overflow global, cero errores de recursos y seleccionado visible. Se detectaron summary inferiores a44px y huellas heredadas de card alta/Biblioteca y formulario estrecho/Muro; root los corrige. Checkbox se evalúa por su label asociado, no por el glifo22px.
- QA colección detectó un objetivo interceptado por header sticky al desplazarse después de filtros; se incorpora scroll-padding/margin y se corrige el recorrido con scroll visible. No se afirma PASS de esa primera corrida. Resultados finales y build/revisión pendientes.

## Commits and outcomes

Sin commits ni publicación. Candidato local de31 archivos identificado por SHA256 en [manifiesto](evidence/2026-11-04-classroom-workspace/candidate.json); base b039324, rama codex/classroom-workspace-polish. La app dev conserva su supervisor y disponibilidad en loopback52171; HTTP GET /sign-in200 al cierre. Stash histórico fcef243 intacto.

## Cierre verificado

- Selección integrada final de17 archivos:68 PASS/0 FAIL/0 SKIP. Comando: `node --experimental-transform-types --disable-warning=ExperimentalWarning --test` sobre classroom-{collection,content,curriculum}-workspace, classroom-workspace-shell, classrooms-reference-{controls,filter}, foxmind-3d-flows-{collection,plan}, classroom-library-search, p6-{library,wall}-client, p8-progress-client, folder-platform, education-experience, grading-ai-ui, home-warm-navigation y notifications-presentation (todos tests/*.test.mjs).
- El primer build aislado encontró dos remanentes del último cambio del worker: state ClassroomFilter y props role/onRole obsoletos. Root los eliminó, sin modificar el filtro puro. Nuevo build fresco `.test-artifacts/classroom-workspace/build-verified.mjs` exit0, TypeScript y todas las rutas Next completas. Los fallos previos permanecen atribuidos; no equivalen a un PASS anterior.
- `npm run lint:boundaries` exit0/129 excepciones históricas; `node scripts/run-complete-suite.mjs --check` exit0/451 entradas53 exclusiones23 rutas; `npm run docs:check` exit0/138 archivos1739links0issues antes del cierre documental. `git diff --check` exit0. Revisión independiente ejecutó además tsc sin incremental exit0.
- [Evidencia durable](evidence/2026-11-04-classroom-workspace/README.md): interior final56 combinaciones, colección8, estados20 y13 interacciones. Se corrigió la dirección flex heredada que convertía flex-basis en altura y separaba Biblioteca de sus acciones; captura final inspeccionada. Selección Plan sin writes, búsqueda local sin requests, menú y bloqueo de borrado vinculado, teclado/foco, reduced motion, guardado fallido conserva input, ajustes archivados deshabilitados y salida voluntaria conservada. Cuatro errores parciales mantienen navegación.
- Ego Space6 finalizado exactamente una vez, sin conservar pestañas propias. Vite53257/PID28204 propio identificado y detenido; supervisor22556 de la app existente preservado. No lectura de configuración privada, mutaciones retenidas ni proveedor real.
- [Revisión independiente atribuida](2026-11-04-classroom-review-workspace.md): VERIFIED del manifiesto exacto31/31, sin bloqueantes.39 pruebas focales propias PASS, tipos/lint focal/diff propios exit0. Root persiste la atribución; el reviewer no modificó código.

Control documental final tras incorporar cierre:138 archivos/1742 enlaces/0 issues; taskboard check:6 tareas válidas, todas DONE. Límites: QA de componentes reales con APIs sintéticas; no prueba de persistencia autenticada ni nueva ejecución completa SQL/servicios. Estados adicionales a390px; matriz de pestañas completa en cuatro anchos. Sin auditoría exhaustiva de accesibilidad. El tsc aislado de classrooms-ui no pasa por sus declaraciones CSS históricas; tipos integrados y build web sí pasan. Este cierre es implementación y verificación local, no integración en main ni despliegue.

## Handoff

Alcance aprobado implementado y verificado. No tareas de producto pendientes en este plan. Usuario puede probar app local52171; una futura integración/commit/push requiere instrucción nueva. No restaurar stash histórico ni tocar otros worktrees. Las evidencias y el plan conservan el estado sin depender del chat.
