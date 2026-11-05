# Brújula — paridad integral y base de producto

- Agent / role: root / coordinador.
- Session or task ID: unavailable.
- Date: 2026-11-05.
- Branch / worktree: codex/foxmind-brujula / checkout principal.
- Starting commit: 5ea7f568d485512c88ed626511aef537bcad5704.
- Phase and detailed task/spec links: [Brújula](../../odd/tasks/foxmind-brujula.md).
- Status: completed.

## Request and scope

El usuario solicita revisar todo el HTML aprobado: botones, Inicio, login/registro y campos, creación de actividad y aula, flujos completos y datos visibles. Autoriza completar backend/lógica para datos faltantes y establecer este diseño como base futura. La maqueta define experiencia y dirección visual; sus credenciales, datos de ejemplo y localStorage no definen seguridad o persistencia real. Sin autorización de publicación, secretos, datos retenidos o proveedores pagos.

## Work performed

Estado reconciliado con entrega anterior: mismo HEAD/rama y cambios locales preservados. Se reabre alcance de paridad integral; los PASS anteriores son evidencia histórica, no aprobación del candidato nuevo. Relevamiento paralelo de superficies disjuntas antes de asignar escrituras.

Auditorías read-only atribuidas (persistidas por root, sin escrituras de los revisores): `/root/brujula_auth_audit` (explorer Luna) verificó auth/account: backend existente suficiente, presentación y repetición de contraseña faltantes; `/root/brujula_authoring_audit` (explorer Luna) contrastó wizard4pasos/archivo obligatorio frente a2pasos y plantextual, más objetivo/comentario separados en actividad; `/root/brujula_data_audit` (explorer Luna) identificó studentCount/planProgress catálogo,nextTopic,submitted y agenda mixta; `/root/brujula_surface_audit` (product_designer) señaló puntuación por criterio/snapshot publicado, borradores globales, handoff Foxy→actividad, títuloMuro y jerarquía de controles. Todos inspeccionaron HTML/código de esta rama; no ejecutaron SQL/proveedores/tests ni modificaron fuente. El coordinador conserva su evidencia funcional como pendiente de implementación/verificación.

Decisión humana recibida: aula con plan obligatorio manual o analizado con IA (no aprobar aula vacía); nota sugerida ponderada y final editable. Se conservan políticas de seguridad y notas históricas. La pregunta sobre persistencia se refería a campos del HTML ya incluidos en el alcance; su corrección sobre alta se aplica a los workers. Schema/migración y contratos persistidos a cargo exclusivo de contracts_complete; policy/drafts-operations y wizard a classroom_fidelity; consultas/contratos Home y catálogo a data_complete; auth/cuenta a account_fidelity; root integra UI Home, Agenda, controles y base canónica.

## Verification

Root: Home9 RED→GREEN observado con `node --test tests/brujula-home-complete.test.mjs`; notificaciones2 RED→GREEN con `node --test tests/brujula-notifications-complete.test.mjs`; tipos web PASS después de anotación NotificationPage. Primer intento Home usó loader inexistente y falló antes de ejecutar tests; se corrigió comando plainNode, sin atribuir ese fallo a producto. BackendHome/auth/wizard/contratos/autoría/evaluación tienen registros propios y pruebas focales; aún falta reconciliación final, regresión y QA visual.

Root implementó HomeFocus global/nextTopic, HomeWorkList, HomeMiniagenda con carga de páginas para ambas categorías, etiquetas/callbacks; proxy9módulos; Notifications centro/paginación/readall +ruta /notificaciones; controlesCSS/imports. Búsqueda global a cargo classroom_fidelity; Foxy handoff a contracts_complete; autoría/Wall account_fidelity; grading data_complete. Fuentes disjuntas.

## Commits and outcomes

### Trazabilidad de aceptación del kit

| Recorrido del kit | Evidencia de esta ampliación |
|---|---|
| Aula y plan docente obligatorio | `brujula-wizard-parity`, `brujula-wizard-roundtrip`, `brujula-wizard-database`; aula manual persistida sin archivo inventado en `brujula-complete-browser` |
| Actividad manual/IA y rúbrica pública | `brujula-authoring-complete`, contratos/rúbrica/proxy; manual3pasos con cero escrituras al abrir y borrador→asignación en navegador. Generación/handoff Foxy con fixtures deterministas; proveedor real no ejecutado |
| Intento exacto, privacidad y publicación | `brujula-complete-browser`: entrega específica, sugerencia ponderada/final editable, no visible antes depublicar, snapshot público sin rúbrica privada |
| Persistencia y compatibilidad | `brujula-contract-parity-database/migration/pending`; notas históricas preservadas, snapshots y correcciones publicadas inmutables |
| Inicio y datos reales | `brujula-home-complete/data-database/miniagenda-preview`, SQL autorizado de métricas, borradores, entregadas y NEXT explícito |
| Avisos/Muro/lectura privada | `brujula-notifications-complete/batch/batch-database`, título deMuro real y read-all sinmutar avisos del otroactor en E2E |
| Búsqueda, cuenta y navegación | `brujula-search-contract/transport/ui/database`, `brujula-agenda-account-complete`; navegación teclado/Escape y matriz final aún en ejecución |
| Responsive, Agenda y aislamiento entre compañeros | Recorridos `brujula-browser`, `brujula-responsive-browser` y `p9-home-integration` en verificación final; no se hereda suPASS anterior |

La prueba de nueva generación no acredita calidad de un proveedor real. Se preservan permisos, plazos/recepción, escaneo y privacidad existentes, con regresión rápida completa y seleccionesSQL; no se declara una nueva ejecución de todos los wrappers históricos de la plataforma.

### Verificación y correcciones adicionales de la paridad integral

- Referencia y acceso real comparados en Ego, TaskSpace3, a1440/390px. Misma fuente Lexend del kit, fondo#f4f7fe, columnas43/57, formulario420px, encabezado34px, inputs39px/radio11 y botón37px/radio12/#b8490c comprobados por estilos calculados. Registro/login/verificación y aula con plan manual observados con cuentas sintéticas y servicios propios descartables. Se corrigió la cascada heredada de inputs y selector de rol; vectores de rol/brújula copiados del HTML. Las cuentas demo y sus reglas de autenticación no se portan.
- Revisión independiente `/root/brujula_complete_review`: se detectaron sugerencia mostrada pero no guardada, pendientes manuales ocultos por override, pérdida de nota histórica al leer nueva columna nula, parser de plan ambiguo, batch de notificaciones que excedía120mutaciones y discrepancia del próximo tema. Autores corrigieron grading/parser; root corrigió prioridadNEXT con SQL RED1→GREEN1. Batch en curso. El reviewer ejecutó15pruebas unitarias y14SQL de contratos/migración/wizard/búsqueda/Foxy, todasPASS; atribución independiente sin escrituras del reviewer.
- Regresión serial inicial730PASS/1FAIL; continuación30PASS/1FAIL; resto191archivos838PASS/10FAIL. Fallas conservadas: expectativas anteriores deAgenda/account/Home/archivoobligatorio e inventario durante creación de pruebas. Correcciones focales en curso; no se presenta esta ejecución comoPASS integral. Agenda selección2PASS y formulario14PASS después de verificar ambos rangos nuevos, sin cambiar producción.
- APIbuild y Nextbuild previosPASS; se requiere recompilar tras últimas correcciones. No hubo cambios de presupuesto, permisos ni datos retenidos. Un intento `npm run build:api` falló por nombre inexistente; `npm run api:build` fue el comando correcto y pasó.
- Cierre de regresión rápida: inventario491/53/23; cobertura acumulada de301archivos,20recomprobados tras correcciones,1616PASS/0FAIL/0SKIP. `.test-artifacts/brujula-final-fast-reconcile.log` conserva el cálculo por archivo, sin duplicar casos. BuildAPI y Next final2PASS; lintPASS. Después se corrigió la etiqueta accesible del título deMuro (contador fuera del label) y se repitieron5pruebas deautoríaPASS.
- E2E completo nuevo: primer intento llegó alMuro y falló por nombre accesible que incluía contador; corrección anterior y segundo intento1PASS,53.9s con cleanup0. Acredita aula obligatoria/manual sinarchivo, autoría3pasos/campos/rúbrica, privacidad, entrega, sugerencia6.80/override9.25, publicación y centro/read-all. El segundo archivo del runner usó una expectativa de rúbrica antigua cargada antes de su actualización; timeout preservado y repetición pendiente. No se relajaron tiempos ni aserciones funcionales.
- La repetición del recorrido previo detectó un defecto visual adicional: modal dehistorial560px mantenía dos columnas por el ancho delviewport, comprimiendo a cero la etiqueta de un criterio largo. Captura de fallo inspeccionada; se reabre el CSS de evaluación y se añade verificación de legibilidad/capturas en390/768/1280/1440. Esta falla es real, no una expectativa obsoleta, y debe cerrarse antes deentrega.
- Corrección CSS posterior: una columna por defecto y dos sólo si el contenedor supera760px; etiqueta13px/descriptor12px y puntaje62px como referencia. Se neutralizó cascada heredada y compactaron inputs39px/botones37px. Nextbuild3PASS; comprobado que elCSS compilado contiene el ajuste37px. Regresión de evaluación9PASS; sin cambios de lógica niAPI.
- Cierre visual: `brujula-browser` final1PASS/0FAIL/0SKIP,53.2s;32capturas, incluyendo criterio largo, registro/acceso, Home ambosroles y notificaciones. `brujula-responsive-browser`1PASS/0FAIL/0SKIP,53.0s;64capturas de aulas/Agenda/cuenta/Foxy. Se inspeccionaron muestras reales y guardaron18 en [evidencia](evidence/2026-11-05-brujula-complete/README.md). Ver listado pasó al encabezado deMis entregas; prueba real verifica contención y abre/cierra lista. Nextbuild4PASS, afectadosHome/evaluación29PASS, lint ydiffPASS.
- El Home histórico falló primero por selectorEntrar al aula frente aAbrir tema y luego por prohibir planProgress curricular al alumno. Se corrigieron sólo expectativas para comprobar destino exacto classroom/unit/topic y progreso público, conservando exclusión de notas privadas. Ambos fallos y skips dependientes permanecen registrados; última repetición pendiente.
- Contador faltante deConsultas: `queries.totalItems` ahora cuenta consultas autorizadas sin respuesta docente antes delcursor; cero0 y7paginadas5+2, respuesta docente7→6→0. `materials` conserva totaldesconocido. SQL RED→GREEN2 delautor; rootrepitió repositorioHome+datos15PASS/0FAIL/0SKIP conbuildAPI finalPASS. Sin migración adicional ni cambios de permisos.
- Última compatibilidad del E2E Home: primera ejecución propia del testengineer9PASS/2FAIL/2SKIP por selector histórico «Datos generales» del wizard. Se conserva evidencia de156.4s y se reemplaza por diálogoCrear aula/campoNombre del aula y valor propio exacto; publicación/propiedad se siguen comprobando. Los grupos de permisos, progreso, consultas, archivado, recuperación y geometría habían pasado; repetición completa en curso con tiempo real y presupuestos originales.

- Home final funcional13PASS/0FAIL/0SKIP,128.8s y cleanup0. La inspección de su captura posterior a archivar el aula detectó solapamiento del encabezadoAula en foco con el mensaje vacío: CSS absoluto se aplicaba también sin tarjeta. Se limita el encabezado flotante a módulos con lista y se espacia vacío/error; BRU-10 sigueVERIFYING hasta nueva geometría y captura poblada/vacía. Los guiones en contadores de esa captura correspondían a módulosnot-applicable, no a una consultaCOUNT fallida.

Sin commits.

## Handoff

BRU-06–10 completos y verificados localmente. No queda implementación pendiente dentro de este alcance ni decisiones de producto abiertas. Para retomar, revisar el diff local, la [base Brújula](../design/brujula/README.md) y las [capturas](evidence/2026-11-05-brujula-complete/README.md). Aplicación de migraciones a la base habitual, integración/publicación y despliegue son acciones posteriores no ejecutadas ni autorizadas en esta entrega.

## Evidencia consolidada del candidato

Este resumen distingue resultados finales de los intentos fallidos conservados en la cronología anterior. Las selecciones focales e independientes se superponen; no se suman como casos únicos.

| Control | Comando / evidencia | Resultado observado |
|---|---|---|
| Regresión rápida | Runner serial y reconciliación por archivo `.test-artifacts/brujula-final-fast-reconcile.mjs`, log homónimo | 301 archivos, 20 recomprobados, cobertura acumulada de1616PASS/0FAIL/0SKIP; no se presenta como una sola pasada limpia |
| Últimos cambios Home/evaluación | `.test-artifacts/brujula-final-affected.log` | 29PASS/0FAIL/0SKIP |
| SQL Home y contadores | `node --import ./scripts/register-api-test-build.mjs --test --test-concurrency=1 tests/foxmind-3d-repository.test.mjs tests/brujula-data-database.test.mjs` | 15PASS/0FAIL/0SKIP, log `.test-artifacts/brujula-final-home-sql.log` |
| Revisión independiente | [Registro atribuido del revisor](2026-11-05-brujula-complete-independent-review.md) | Seis defectos corregidos y revalidados; sin hallazgos accionables abiertos dentro de su alcance |
| Flujo completo nuevo | `node .test-artifacts/brujula-complete-browser-run.mjs tests/brujula-complete-browser.test.mjs` | 1PASS, aula manual obligatoria→actividad→entrega→sugerencia/override→publicación→Muro/avisos; cleanup0 |
| Recorrido Brújula | Mismo runner, `tests/brujula-browser.test.mjs` | 1PASS,32capturas, control de rúbrica larga y navegación/listado; cleanup0 |
| Matriz responsive | Mismo runner, `tests/brujula-responsive-browser.test.mjs` | 1PASS,64capturas, ambos roles y390/768/1280/1440px; cleanup0 |
| Inicio integrado | Mismo runner, `tests/p9-home-integration.test.mjs`; `.test-artifacts/brujula-home-empty-and-populated-final.log` | 13PASS/0FAIL/0SKIP,129.43s; COUNT1→0→1, destino/progreso, permisos, archivo, offline, cuenta y geometría de foco vacío320/375/1280; cleanup0 |
| Compilación | `npm run api:build`, `npm run web:build` | PASS; API posterior alCOUNT y webbuild6 posterior alCSS/copy de vacío; tipos incluidos |
| Lint / estructura | `npm run lint:boundaries`, `git diff --check`, `node scripts/run-complete-suite.mjs --check` | PASS; inventario491entradas/53exclusiones/23rutas;127excepciones de fronteras congeladas sin ampliación |
| Documentación final | `npm run docs:check` | 138archivos,1758enlaces,0problemas; diff e inventario repetidos al cierre, salida0 |

Base de implementación futura: [guía Brújula](../design/brujula/README.md). Muestras reales: [evidencia visual](evidence/2026-11-05-brujula-complete/README.md). La comparación combina estilos calculados, capturas y recorridos reales; no certifica identidad píxel a píxel.

Las migraciones aditivas y su compatibilidad histórica se probaron sobre fixtures propios. No se aplicaron a datos retenidos ni se probaron proveedores pagos reales o participantes reales. API y web deben entregarse coordinadamente por la ampliación de contratos Home. Sin commits, push ni despliegue; el checkpoint inicial permanece como referencia, no como hash del diff actual.

### Cierre final

La repetición integrada final aprobó los13casos deInicio y verificó la corrección del foco vacío. Root inspeccionó sus capturas poblada1280 y vacías1280/320; reemplazó la muestra docente anterior por el Inicio poblado con contadorConsultas1. Las18muestras conservadas representan la matriz96capturas más10deInicio, sin afirmar que se inspeccionaron manualmente todas. Luego se corrigió sólo el mensaje vacío a «No hay aulas disponibles en esta vista»: el filtro de foco excluye archivadas y no debe afirmar que no existen. `node --test tests/brujula-home-complete.test.mjs`9PASS y webbuild6PASS tras ese texto; no cambió geometría/lógica ni se repitió innecesariamente el E2E.

Resultado consolidado:16casos integrados aprobados, cobertura rápida acumulada1616PASS, selecciones adicionales y revisión independiente indicadas arriba. Los fallos y esperas anteriores quedan atribuidos a su candidato original. Ego se finalizó con `task.finish({keep:[]})`, los servicios de preview propios se cerraron y todos los últimos runners informaron cleanup0. Sin servicios retenidos modificados ni memoria atribuida escrita: no había identidad de sesión registrada. La rama permanece `codex/foxmind-brujula`, HEAD5ea7f568d485512c88ed626511aef537bcad5704 y diff local preservado.
