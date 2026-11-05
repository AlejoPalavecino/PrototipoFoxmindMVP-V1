# Fidelidad de Inicio — pruebas de componente

- Agent / role: test_engineer
- Session or task ID: /root/brujula_fidelity_tests
- Date: 2026-11-05
- Branch / worktree: codex/foxmind-brujula; checkout compartido
- Starting commit: 5ea7f568d485512c88ed626511aef537bcad5704
- Phase and detailed task/spec links: [BRU-03/05](../../odd/tasks/foxmind-brujula.md); referencia `.test-artifacts/brujula-reference-readable.html`
- Status: completed

## Request and scope
Actualizar únicamente tests/home-reference-dashboard.test.mjs y tests/workspace-disclosure.test.mjs al HTML aprobado, por delegación del coordinador. Cubrir navegación contextual por rol, aulas archivadas/no autorizadas, error y reintento, sin tocar producción, E2E ni inventario. Aceptación revisada por /root/brujula_review y coordinador.

## Work performed
Inspeccionados protocolo, roadmap, tarea Brújula, referencia aprobada, Home y HomeShortcuts. Checkout contiene cambios ajenos preservados. Las expectativas antiguas incluyen accesos genéricos, selector inline y módulo classrooms alumno, retirados en la referencia.

## Verification
Pendiente ejecución focal. Pruebas de componente sin base de datos ni servicios externos.

## Commits and outcomes
Sin commits.

## Handoff
Actualizar expectativas y ejecutar selección focal; informar al coordinador cualquier regresión productiva.

## Ampliación autorizada por el coordinador
Durante la tarea /root amplió la superficie a tests/brujula-integration.test.mjs, tests/classroom-activity-redesign.test.mjs, tests/classroom-collection-workspace.test.mjs, tests/classroom-workspace-shell.test.mjs y tests/foxmind-3d-flows-collection.test.mjs. Motivo: dos etapas HTML aprobadas, filtros visibles, contadores en pastilla, badge Archivada y portada panorámica. /root/brujula_review confirmó esas correcciones de aceptación, incluido retiro de «Solo lectura» como texto de la tarjeta; las pruebas de bloqueo funcional se conservan.

## Resultado verificado
- Home: secciones por rol, diálogo Elegí un aula, selección compartida con foco, destinos exactos, exclusión de rol ajeno/archivadas, fallback a colección, errores y reintentos de todas las fuentes visibles.
- Privacidad: subject ajeno rechazado; FORBIDDEN/AUTH_REQUIRED al reintentar quitan módulos y accesos privados. Totales desconocidos no generan ceros inventados.
- Foco: una aula docente activa; selección obsoleta/archivada/ajena vuelve a activa; colección completa sigue accesible; expansión de colas conserva cursor y foco.
- Borradores: GET por aula focal autorizada, recuperación tras fallo, exclusión de publicadas; target exacto abre editor solo para DRAFT docente no archivada, sin escrituras. Archivada/publicada no abre editor.
- Actividad: dos etapas aprobadas, contexto/unidad/temas, guardado independiente y confirmación explícita de publicación conservados.
- Colección: filtros visibles siguen intersectando y se pueden retirar; conteos y orden conservados; portada/títulos y destinos por rol comprobados.
- No se modificó producción, inventario, E2E ni registros ajenos.

## Evidencia de ejecución
1. Antes de cambios: `node --test tests/home-reference-dashboard.test.mjs tests/workspace-disclosure.test.mjs` → exit 1; 16 casos, 11 PASS, 5 FAIL por accesos genéricos/selector/FoxyNote ya retirados. Esta evidencia es discrepancia de aceptación obsoleta, no un RED de comportamiento nuevo.
2. Tras la primera adaptación: mismo comando → exit 0; 17 PASS/0 FAIL/0 SKIP.
3. Durante cambio concurrente autorizado a HomeFocus: mismo comando → exit 1; 18 casos, 14 PASS/4 FAIL por montaje wrapper y expectativas anteriores de colección completa. Se adaptó contrato al foco único, conservando colección y expansión en cola real.
4. Selección ampliada inicial sin brujula-integration → exit 1; 35 casos, 34 PASS/1 FAIL por texto «Archivada · Solo lectura». Revisor confirmó referencia solo «Archivada»; expectativa corregida.
5. `node --experimental-strip-types --test tests/brujula-integration.test.mjs` → exit 0; 4 PASS/0 FAIL/0 SKIP.
6. Final: `node --experimental-strip-types --test tests/home-reference-dashboard.test.mjs tests/workspace-disclosure.test.mjs tests/brujula-integration.test.mjs tests/classroom-activity-redesign.test.mjs tests/classroom-collection-workspace.test.mjs tests/classroom-workspace-shell.test.mjs tests/foxmind-3d-flows-collection.test.mjs` → exit 0; 43 PASS/0 FAIL/0 SKIP (5070.4513 ms).

## Límites y entrega
Pruebas de componente/contrato en memoria sobre código real; sin base de datos, proveedor externo ni navegador. No se afirma aislamiento efectivo de escritores en este checkout compartido. Los casos nuevos se ejecutaron sobre implementación ya corregida por root: no se atribuye un RED nuevo inexistente. El coordinador debe reconciliar QA de navegador y cableado real Classrooms→Home→HomeFocus con api; esta selección comprueba HomeFocus y Activities pero no monta el shell autenticado entero. Sin commits ni publicación.

- Handoff: /root recibe siete archivos de pruebas y este registro; verificar diff final y conservar las evidencias concurrentes de producción y revisión antes de cerrar BRU-05.

7. `git diff --check --` sobre los siete archivos de pruebas y este registro → exit 0, sin errores de whitespace.

## Reapertura: selectores E2E vigentes
- Status: in_progress
- Autorización: /root solicita adaptar solo selectores/helpers actuales por HTML aprobado; no modificar helper histórico congelado, producción ni ejecutar DB en paralelo.
- Inspección: p6 openClassroom necesita nombre accesible contextual del botón; p9 Home conserva heading anterior y regiones/listas retiradas para alumno. p9-home-recovery también conserva un botón Actualizar Inicio retirado; se comunica al coordinador porque sustituirlo exige mantener su objetivo de recuperación.

## Entrega de selectores E2E actuales
- /root autorizó además tests/p9-home-recovery-integration.test.mjs y refresco por foco idéntico al helper vigente de Home, preservando objetivo de reconsulta en documento y umbral 60_001 ms.
- Cambiados tests/p6-integration-helpers.mjs (botón accesible contextual exacto), tests/p9-home-integration.test.mjs (saludo, foco docente, alumno modal→Plan de estudio, archivadas en colección, ausencia de datos privados sobre regiones actuales, consulta con contador), tests/p9-home-recovery-integration.test.mjs (refresh por foco y selectores vigentes).
- Inspeccionado tests/p9-journey-helpers-current.mjs: reutiliza openClassroom central; no requirió cambios adicionales de este agente. tests/p9-journey-helpers.mjs congelado intacto por esta tarea.
- `node --check tests/p6-integration-helpers.mjs`, `node --check tests/p9-home-integration.test.mjs`, `node --check tests/p9-home-recovery-integration.test.mjs`, `node --check tests/p9-journey-helpers-current.mjs` → exit 0.
- `git diff --check -- tests/p6-integration-helpers.mjs tests/p9-home-integration.test.mjs tests/p9-home-recovery-integration.test.mjs` → exit 0.
- Búsqueda con rg sobre helpers actuales y E2E Home: sin referencias operativas a Hola/Tus aulas/Accesos rápidos/Actualizar Inicio; permanece la aserción válida de ausencia de Actualizar Inicio.
- No se ejecutó runtime, navegador ni base de datos: el coordinador repite la integración sobre build final. Aserciones API/errores/privacidad, tolerancias, límites y confirmaciones conservadas; badge archivada se verifica en colección actual y navegación alumno mediante el acceso contextual actual.
- Brecha comunicada: recovery conserva fixture previo que inscribe seed como alumno y luego crea borrador docente con esa misma cuenta. Ese diseño contradice el rol exclusivo vigente y requiere reconciliación de actores independiente de selectores; no se alteró silenciosamente.
- Status: completed (adaptación de selectores y sintaxis); integración real NOT_VERIFIED por este agente.
- Handoff exacto: /root puede ejecutar su runtime principal con los nuevos selectores; resolver fixture de recovery antes de atribuirle aceptación vigente.

## Reapertura: selección rápida de presentación
- /root solicita corregir lectura no recursiva del texto en activity-ai-ui y comprobar pruebas visuales focales Home/Agenda/Foxy. Sin producción ni runtime de DB.
- Alcance inicial: tests/activity-ai-ui.test.mjs; otras pruebas solo por expectativa obsoleta confirmada contra referencia.

## Entrega de selección rápida de presentación
- Cambiados solo tests/activity-ai-ui.test.mjs (map(textOf) recursivo ya existente), tests/agenda-visual-polish.test.mjs (Agenda/Crear evento/sin banner, más callback real), tests/folder-platform.test.mjs (acciones por aula y secciones aprobadas para ambos roles).
- No se cambió producción. Lectura recursiva conserva los objetivos manual/IA y las pruebas student/archived; sin cambios de permisos, acciones, tolerancias ni inventario.
- Primera selección de8archivos tras corregir activity-ai-ui:39casos,36PASS/3FAIL. Los tres fallos eran expectativas visuales obsoletas: header Agenda exigía Mi/Nuevo evento/banner, Home docente pedía enlace Foxy+Aula destino, Home alumno pedía Para entregar+links genéricos. Contraste con referencia HTML confirma nuevos títulos/acciones.
- Comando final: `node --experimental-strip-types --test tests/activity-ai-ui.test.mjs tests/home-miniagenda-reference.test.mjs tests/home-polish-presentation.test.mjs tests/home-reference-summary.test.mjs tests/home-refinement-copy.test.mjs tests/home-warm-navigation.test.mjs tests/agenda-visual-polish.test.mjs tests/folder-platform.test.mjs tests/home-by-role.test.mjs tests/agenda-polish-presentation.test.mjs tests/foxmind-3d-flows.test.mjs tests/foxmind-3d-flows-account.test.mjs tests/foxmind-3d-flows-agenda.test.mjs tests/foxmind-3d-flows-attempt.test.mjs tests/foxmind-3d-flows-collection.test.mjs tests/foxmind-3d-flows-loader.test.mjs tests/foxmind-3d-flows-loading.test.mjs tests/foxmind-3d-flows-plan.test.mjs tests/foxmind-3d-flows-targets.test.mjs` → exit0,86PASS/0FAIL/0SKIP,6319.396ms. Node incluye una entrada del archivo loader sin casos propios; no se atribuyen86pruebas de comportamiento independientes.
- `git diff --check -- tests/activity-ai-ui.test.mjs tests/agenda-visual-polish.test.mjs tests/folder-platform.test.mjs` → exit0.
- Búsqueda de lecturas directas de children en Home/Agenda/Foxy: restantes corresponden a campos propios o texto simple Hoy que no cambió; no se modificaron por ceremonia. No existe archivo denominado foxy-3d; cobertura relacionada obtenida con home-by-role y foxmind-3d-flows*.
- Límite: selección de componentes/contratos en memoria, sin DB, E2E ni QA visual. Ninguna regresión funcional observada en esta selección; suite completa corresponde al coordinador.
- Status: completed.
- Handoff: /root puede repetir fast sobre candidato actual; preservar corrida E2E concurrente y revisar estos tres cambios de aceptación.

## Reapertura: rol de tarjeta y auditoría final de selectores Home
- /root informa que etiqueta Enseño se retiró visualmente y autoriza comprobar rol real desde payload/API junto con heading del aula. Solo tests/p9-home-integration.test.mjs; sin producción/runtime/DB.
- Auditoría: única espera operativa Enseño/Estudio restante en línea236; listas completas de alumno ya migradas a accesos/modales y archivo ya consultado en colección. Se conservan checks de privacidad, revocación, destinos exactos, exclusión de otras aulas y ámbitos por rol.

### Resultado de la auditoría final Home
- Reemplazada la espera visual Enseño por roles de cada fila en payload200 real (teacher/student), IDs docentes activos exactos [roomA.id], heading docente visible, una sola fila focal, sin aula ajena ni indicador Archivada en foco. El selector contextual alumno y la apertura exacta del detalle permanecen.
- Nombre del caso actualizado al objetivo vigente de contexto/permisos por rol.
- `node --check tests/p9-home-integration.test.mjs` → exit0; `git diff --check -- tests/p9-home-integration.test.mjs` → exit0.
- `rg -n 'Enseño|Estudio|Tus aulas|Avance del plan por aula|Aula destino|Accesos rápidos|Hola,|Tus clases, bien organizadas' tests/p9-home-integration.test.mjs` → exit1 por cero coincidencias; sin esperas de etiquetas retiradas identificadas.
- No se ejecutó runtime ni DB; aceptación E2E corresponde a corrida final del coordinador. Ninguna afirmación de integración PASS basada solo en sintaxis.
- Status: completed (ajuste/auditoría de selectores).
- Handoff: /root puede repetir p9-home completo sobre build final; archivo congelado y producción sin cambios por este agente.

## Reapertura: contexto curricular después de elegir método
- /root autoriza actualizar prueba de classroom-activity-redesign al selector HTML de dos tarjetas: el contexto pasa a etapa1 manual/IA. Sin producción; implementación congelada del worker.
- Búsqueda de ActivityAssignment encontró además expectativa vieja después de descartar editor retenido en classroom-interior-redesign; se actualizará al contexto entregado al siguiente método conservando confirmación previa.

### Resultado: contexto curricular en etapa1
- tests/classroom-activity-redesign.test.mjs: elección limpia no contiene ActivityAssignment ni crea borrador; rama IA recibe contexto exacto, etapa1 permite cambiar temas localmente, llamadas solo GET. Editor manual conserva y permite actualizar contexto en etapa1 sin llamadas.
- tests/classroom-interior-redesign.test.mjs: tras confirmar reemplazo de editor, elección sigue limpia y entrega el nuevo contexto a ActivityGeneration. La confirmación antes de descartar y cierre del editor anterior permanecen.
- `rg -n 'ActivityAssignment' tests -g '*.test.mjs'`: restantes corresponden a editor manual o ausencia esperada en elección limpia; sin otra expectativa de selector en choosing identificada.
- `node --experimental-strip-types --test tests/classroom-activity-redesign.test.mjs tests/classroom-interior-redesign.test.mjs tests/activity-ai-ui.test.mjs tests/brujula-fidelity-navigation.test.mjs` → exit0,27PASS/0FAIL/0SKIP,5246.8377ms. Incluye rama manual/IA y edición contextual, roles/archivadas, claves privadas, publicación explícita y rechazo de cambios sin confirmación.
- `git diff --check -- tests/classroom-activity-redesign.test.mjs tests/classroom-interior-redesign.test.mjs` → exit0.
- Sin modificaciones productivas, DB ni ejecución de integración externa.
- Status: completed.
- Handoff: /root puede ejecutar fast completo sobre candidato congelado. Aceptación nueva reemplaza visibilidad antes de elegir por preservación/edición en etapa1.

## Reapertura: E2E sobre candidato congelado
- /root autoriza solo tests/brujula-browser.test.mjs y tests/p9-home-integration.test.mjs, lectura de implementación/log; sin producción y sin debilitar rúbrica, privacidad, publicación, archivo o permisos.
- Log `.test-artifacts/brujula-fidelity-release-e2e.log`: Brújula falla buscando etapa Materiales retirada; Home archive falla esperando Archivadas, pero diagnóstico muestra alerta genérica RATE_LIMITED en /mis-aulas. Selector Archivadas sigue existiendo: segundo fallo requiere investigar admisión, no cambiar selector ni reintentar ciegamente. Comunicado al coordinador.

### Entrega E2E congelado e instrumentación de admisión
- tests/brujula-browser.test.mjs: etapa Materiales retirada reemplazada por espera heading visible «Paso 1 de 2 · Preparar actividad»; creación Agenda usa botón actual Crear evento y conserva diálogo Nuevo evento. Rúbrica pública, nota privada,403 prepublicación, confirmación explícita y SQL color permanecen intactos.
- tests/p9-home-integration.test.mjs: instrumentación autorizada /root desde antes de registros de fixture. Cuenta solicitudes API por actor+método+pathname; captura cada429 con endpoint, estado, Retry-After original, tiempo relativo y código seguro del error. No almacena cuerpos de solicitud/respuesta privada, credenciales ni querystrings. Diagnóstico de fallo incluye snapshot en log y failure-alert-ownership.json.
- Navegación de archivo verifica respuesta real200 /auth/session antes de esperar montaje del catálogo. Si429, falla explícitamente con origen y conteos. Sin retry adicional ni tolerancias ampliadas; el selector Archivadas se conserva porque existe en implementación.
- Hipótesis comunicada: alerta genérica coincide account-client RATE_LIMITED y no la forma «No pudimos cargar tus aulas» de error por módulo; falta endpoint observado de corrida nueva para probar origen exacto o regresión de solicitudes. Coordinador investiga AccountNavbar/catálogo en paralelo solo lectura.
- /root amplía alcance a tests/classroom-sections-redesign.test.mjs: expectativa vieja details se cambia a Dialog Agregar material. Se fortalece fixture de escaneo pending→approved: no MaterialForm ni POST mientras pendiente; confirmación de revisión revela formulario con contexto original, sin publicar automáticamente.
- `node --experimental-strip-types --test tests/classroom-sections-redesign.test.mjs tests/classroom-interior-redesign.test.mjs tests/brujula-integration.test.mjs` → exit0,18PASS/0FAIL/0SKIP,4311.4584ms.
- `node --check tests/brujula-browser.test.mjs` y `node --check tests/p9-home-integration.test.mjs` → exit0.
- `git diff --check -- tests/brujula-browser.test.mjs tests/p9-home-integration.test.mjs tests/classroom-sections-redesign.test.mjs` → exit0.
- Sin modificación productiva ni ejecución nueva DB/E2E. No se atribuye PASS a integración real pendiente.
- Status: completed (selectores e instrumentación).
- Handoff: pruebas congeladas comunicadas a /root. Repetir Home aislado/Brújula para identificar429 antes de decidir recuperación bounded; no ocultar alerta real como obsolescencia.

## Reapertura: recuperación legítima de admisión en navegación de archivo
- /root confirma diagnóstico `.test-artifacts/brujula-home-admission-diagnostic.log`: peer GET /auth/session429, Retry-After39,~21s, cuota generalidentityIP240/min compartida por cuatro cuentas fixture; no bucle detectado.
- Autoriza solo la navegación actual: validar Retry-After1..60, espera real y un reintento visible con nueva sesión200; cuotas y producción intactas. Se mantiene toda instrumentación y evidencia histórica.

### Entrega: un reintento visible de sesión tras429 confirmado
- Único cambio tests/p9-home-integration.test.mjs en navegación de archivo: ante429 exige error RATE_LIMITED y header Retry-After de dígitos que represente entero seguro1..60; espera segundos reales; prepara captura GET /auth/session y pulsa Volver a intentar en alerta visible. La nueva respuesta debe ser200; segundo429 falla sin bucle.
- Sin recarga, mocks de red, cambios de cuotas, cambios productivos ni reducción de controles de archivo/privacidad. Instrumentación anterior intacta.
- `node --check tests/p9-home-integration.test.mjs` → exit0.
- `git diff --check -- tests/p9-home-integration.test.mjs` → exit0.
- No se ejecutó fast en curso, DB ni E2E; /root realiza rerun autorizado de Home.
- Status: completed (recuperación fixture acotada); integración real pendiente por coordinador.
- Handoff: pruebas congeladas; ejecutar Home y verificar evidencia de admisión200, archivo y revocación posterior.

## Reapertura: filtros visibles de colección
- /root autoriza adaptar tests/classrooms-reference-controls.test.mjs a controles visibles HTML, conservando opciones globales, combinación/limpieza de criterios, estados y ausencia de mutaciones. Producción congelada; no se modifica.

### Entrega: controles de colección visibles
- tests/classrooms-reference-controls.test.mjs: selects localizados por aria-label vigente; se retira expectativa de disclosure Más filtros, conserva opciones globales/deduplicadas, conteo real, archivadas, criterios combinados, persistencia en vista lista, limpieza sin alterar búsqueda del padre ni estado archivado. Orden y destinos de entrada intactos.
- Agregada comprobación de inmutabilidad de payload de aulas y ausencia de callbacks de entrada/búsqueda durante filtrado local.
- `node --experimental-strip-types --test tests/classrooms-reference-controls.test.mjs tests/classroom-collection-workspace.test.mjs tests/foxmind-3d-flows-collection.test.mjs` → exit0,11PASS/0FAIL/0SKIP,1094.3283ms.
- `git diff --check -- tests/classrooms-reference-controls.test.mjs` → exit0.
- Auditoría rg de títulos/stages/disclosure viejos: restantes Más filtros son assertions correctas de ausencia. Encontrados tres headings E2E anteriores fuera de alcance: tests/entry-glass-browser.test.mjs:106 y tests/p5-integration.test.mjs:103,228 esperan «Tus clases, bien organizadas.»; informados al coordinador sin editar ni correr DB/E2E.
- Sin cambios productivos; prueba congelada comunicada a /root.
- Status: completed.
- Handoff: /root continúa selección restante/fast y decide si actualiza aquellos E2E históricos actuales; no se atribuye suite completa PASS.

## Reapertura: ritmo de fixture antes de archivo
- /root confirma saturación real de cuota IP compartida por cuatro cuentas y autoriza pausa entre bloques, drenaje de requests y conservación de recuperación429 explícita. Se elige ventana real ociosa completa60_001ms antes de archivo: aumenta la corrida~60s, evita depender de redondeos o del instante exacto de inicio de ventana. No cambia330s ni cuotas.

## Alcance adicional: tres pruebas de aceptación desactualizadas
- /root confirma collector remaining129archivos549PASS/3FAIL y autoriza entry-glass-client, foxmind-3d-flows-loading y p9-home-client. Nuevo catálogo rooms-only en Inicio alimenta sidebar real; no drafts/invitations. Historia archivada accesible desde colección, fuera de foco activo. Se conservan permisos, errores y ausencia de spinner heredado.

### Entrega final de ritmo y tres expectativas restantes
- tests/p9-home-integration.test.mjs: tracker de requests API activos de todos los actores, eliminado al finalizar/fallar cada request. Antes del primer GETdetail de archive se drenan requests activos con presupuesto existente30s y lecturas Home; pausa real completa60_001ms; nuevo drenaje y logs de elapsed Date.now más conteos/429. Evita comprimir tráfico de cuatro usuarios dentro de la misma ventana IP, sin elevar cuota ni simular reloj servidor. Tradeoff: ~60s adicionales al E2E; timeout330s intacto. Recuperación429 de sesión explícita y aserciones200 posteriores de listas/invitaciones permanecen intactas.
- tests/entry-glass-client.test.mjs: Mis entregas/Mis devoluciones y accesos propios alumno; no se exige etiqueta Estudio visualmente retirada, se conserva contexto real y exclusión de herramientas docentes.
- tests/foxmind-3d-flows-loading.test.mjs: catálogo rooms-only exactamente una vez, sin drafts/invitations ni escrituras; agregado Home sigue montado y spinner heredado sigue ausente. Fixture ahora devuelve contrato teach/study real.
- tests/p9-home-client.test.mjs: rol docente explícito, saludo aprobado, historia conservada accesible por callback colección y archivo excluido de foco activo. Escapado de título hostil sigue comprobado sobre tarjeta archivada real, sin script insertado; sin cambio de allowlist ni switch de rol.
- `node --experimental-strip-types --test tests/entry-glass-client.test.mjs tests/foxmind-3d-flows-loading.test.mjs tests/p9-home-client.test.mjs tests/brujula-fidelity-navigation.test.mjs` → exit0,13PASS/0FAIL/0SKIP,1586.8927ms.
- `node --check tests/p9-home-integration.test.mjs` → exit0.
- `git diff --check -- tests/entry-glass-client.test.mjs tests/foxmind-3d-flows-loading.test.mjs tests/p9-home-client.test.mjs tests/p9-home-integration.test.mjs` → exit0.
- No producción, DB, fast o E2E ejecutados por esta tarea; aceptación completa pendiente de corrida final root. Se preservan logs históricos fallidos, instrumentación y decisiones de alcance.
- Status: completed.
- Handoff: tests freeze final comunicado a /root; ejecutar fast completo y E2E Home sobre mismo candidato y comprobar requests+espera+200 observados antes de declarar cierre.

## Corrección del drenaje global de pruebas
- /root observó `.test-artifacts/brujula-fidelity-home-delivery.log`: notification/page perteneciente a documento destruido puede no emitir finish/fail, por lo que el Set global agregado retenía un pendiente fantasma. Es un defecto del observador de prueba; no evidencia de request productivo activo indefinidamente.
- Autorización y corrección: retirados activeAdmissionRequests, listeners de limpieza y drainAdmissionRequests. Se conserva drainHomeReads original con generaciones del documento peer, pausa real60_001ms, diagnóstico de conteos/429 y único retry visible autorizado.
- La entrada anterior de drenaje global describe la versión fallida y queda como historia; no atribuirle PASS E2E.
- `node --check tests/p9-home-integration.test.mjs` y `git diff --check -- tests/p9-home-integration.test.mjs` → exit0.
- Búsqueda rg confirma ausencia de activeAdmission/drainAdmission y permanencia de pacing y drainHomeReads.
- Sin runtime, DB ni producción. Status: completed (corrección observador); Home E2E pendiente por coordinador.
- Handoff: FREEZE comunicado a /root para rerun del candidato corregido.

## Reapertura: geometría de texto efectivo en bienvenida
- /root informa Home archivo/offline PASS y teacher320 textClear falla al comparar cajas transparentes glass.right/foxy.left. Autoriza medir rangos de texto visible de time/h1/p después de fonts.ready; mantener imagen dentro, panel dentro y sin overflow. Si texto real intersecta imagen, sigue siendo fallo y se captura evidencia.

### Entrega: geometría por rangos de texto
- tests/p9-home-integration.test.mjs: espera document.fonts.ready antes de medición. Recorre nodos de texto de time/h1/p dentro de glass, omite whitespace puro/display:none/visibility no visible, recorta espacios extremos y obtiene Range.getClientRects con área positiva.
- textClear exige al menos una caja efectiva y ninguna intersección2D con rect de imagen Foxy, sin tolerancia agregada. Se permite solo superposición de contenedores transparentes sin texto. foxInside, glassInside y overflow permanecen idénticos.
- Si falla cualquier geometría: log de rectángulos hero/image/glass/text por tag sin contenido personal; captura inicio-geometry-failure-<role>-<width>.png antes de assert. Assert incluye los mismos rectángulos para reproducir diagnóstico.
- `node --check tests/p9-home-integration.test.mjs` y `git diff --check -- tests/p9-home-integration.test.mjs` → exit0.
- Sin ejecución E2E, DB ni cambios productivos. No se afirma que el texto real esté despejado antes de observar corrida root.
- Status: completed (prueba geométrica actualizada).
- Handoff: freeze comunicado; /root repite Home. Si textClear siguefalse con rects efectivos, reportar regresión visual productiva sin retirar aserción.
