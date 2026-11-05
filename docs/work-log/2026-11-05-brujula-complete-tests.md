# Brújula completa — aceptación Home test-first

- Agent / role: test_engineer
- Session or task ID: /root/brujula_fidelity_tests
- Date: 2026-11-05
- Branch / worktree: codex/foxmind-brujula; checkout compartido
- Starting commit: 5ea7f568d485512c88ed626511aef537bcad5704
- Phase and detailed task/spec links: [Brújula](../../odd/tasks/foxmind-brujula.md); [alcance coordinador](2026-11-05-id-unavailable-brujula-complete-base.md)
- Status: in_progress

## Request and scope
FASE_RED: pruebas de aceptación para próximo tema de HomeFocus, borradores globales (preview2 y acceso completo independiente del foco), entregas enviadas del alumno sin calificación privada, mensajes cuando no hay pendientes y miniagenda mixta por rol. Solo tests/brujula-home-complete.test.mjs nuevo, tests/home-by-role.test.mjs para progreso de plan alumno autorizado y este registro. No producción, otros legacy, DB retenida ni secretos. Hay otros escritores sobre contratos/UI; no se revierte trabajo ajeno. Las instrucciones no constituyen aislamiento efectivo.

## Work performed
Leídos contrato Home nuevo, fuente HTML1786–2159, Home/HomeFocus, helpers de hooks y registros. Referencia: classStrip añade próximo tema y destino; draftsWidget toma2 sobre todas aulas; alumno Ver listado incluye Entregadas,en revisión; miniagenda personal2 y docente1plazo (alumno sin plazos en rail); cero pendientes evita contar0 como pendientes.

## Verification
Pendiente ejecución RED sobre implementación UI anterior. Casos de componente/contrato en memoria, sin servicios externos.

## Commits and outcomes
Sin commits.

## Handoff
Comunicar contrato temprano, ejecutar RED y entregar pruebas al coordinador antes de implementar Home.

## Resultado RED y contratos
- Nuevo tests/brujula-home-complete.test.mjs:9casos de aceptación UI y contrato. Helper monta boundariesHome reales con hookView existente; SSR comprueba contenido; callbacks reales comprueban destinos y expansión sin requests de red. Contrato confirmado por /root: drafts usa HomeModulePanel existente; Ver listado alumno incluye submitted; miniagenda diferencia roles exacta HTML.
- RED inicial conjunto: `node --experimental-strip-types --test tests/brujula-home-complete.test.mjs tests/home-by-role.test.mjs` →16casos7PASS/9FAIL. Evidencia `.test-artifacts/brujula-home-complete-red.log`; el shell inicial leyó log después y terminó0, por eso se confirmó explícitamente código de salida luego.
- RED confirmado: `node --experimental-strip-types --test tests/brujula-home-complete.test.mjs` con stdout/stderr conservados en `.test-artifacts/brujula-home-complete-red-confirmed.log` y propagación de LASTEXITCODE →exit1;9FAIL/0PASS/0SKIP,2243.3269ms. Causas esperadas: próximo tema no renderizado; globaldrafts/recuperación ausentes; Ver listado ausente; saludos0pendientes; miniagenda sin separación. Sin error de montaje/importación; los fallos son aserciones del comportamiento faltante antes de UI.
- Tras RED se añadió al mismo caso submitted la comprobación de callback exacto tras Ver entrega/Ver actividad; su primera aserción sigue fallando por Ver listado ausente. Se conserva registro del RED anterior, no se atribuye ejecución de esa línea todavía inalcanzable.
- tests/home-by-role.test.mjs: único cambio de aceptación para planProgress student activo autorizado; archived sigueINVALID y taught>total sigueINVALID.
- /root amplió alcance a2expectativas tests/foxmind-3d-contracts.test.mjs: respuesta anterior de7módulos se normaliza ahora con drafts/submitted not-applicable. No se cambian sus validaciones de identidad/roles/privacidad/counters.
- `node --experimental-strip-types --test tests/foxmind-3d-contracts.test.mjs tests/home-by-role.test.mjs` →exit0,15PASS/0FAIL/0SKIP,1346.4906ms.
- `node --check tests/brujula-home-complete.test.mjs` y `git diff --check -- tests/brujula-home-complete.test.mjs tests/home-by-role.test.mjs tests/foxmind-3d-contracts.test.mjs` →exit0.

## Límites, decisiones y entrega
Datos sintéticos de contrato; sin SQL, DB retenida, secrets ni proveedores. La ausencia de nota privada se prueba mediante rechazo de campos extra en parseHomePage submitted y render sin calificación; no es evidencia nueva de proyección SQL. No se modificó fuente productiva ni otros legacy. Nota sugerida ponderada y plan obligatorio manual/IA aprobados pertenecen a workers de contratos/autoría, fuera de estos tests Home.

- Status: completed (autoría de aceptación y RED; producto NOT_VERIFIED hasta GREEN).
- Handoff: /root recibió RED antes de implementar. Implementar Home, ejecutar estos9casos y conservar evidencia GREEN sin acomodar aceptación a implementación. Si cambia una decisión humana, solicitar revisión antes de editar pruebas.

## Ampliación: flujo vigente de aula/autoría y E2E completo
- /root autoriza adaptar expectativas/harness obsoletos al aula2pasos y autoría3pasos, más nuevo E2E de datos reales. Superficies anunciadas: tests/brujula-fidelity-navigation.test.mjs, tests/classroom-activity-redesign.test.mjs, tests/wizard-reference-navigation.test.mjs, tests/wizard-reference-drop.test.mjs y tests/brujula-browser.test.mjs. p6 classroom y p4 account permanecen intactos: crean aula por API y registro no monta confirmPassword (ese campo nuevo pertenece a reset/settings).
- Extensión explícita posterior root: tests/entry-glass-browser-helpers.mjs, tests/home-warm-navigation.test.mjs y tests/agenda-ui.test.mjs por Mi cuenta modal y AgendaAfterDay. No cambiar fuente ni inventario.
- Leídos registros authoring/auth/wizard/grading2026-11-05 y tipos actuales. Estado de Home GREEN9 observado por root y repetido dentro de selección propia final.

### Fallo observado antes de adaptar
- `node --experimental-strip-types --test tests/brujula-fidelity-navigation.test.mjs tests/classroom-activity-redesign.test.mjs tests/wizard-reference-navigation.test.mjs tests/wizard-reference-suggestions.test.mjs tests/wizard-reference-drop.test.mjs` →exit1,16PASS/6FAIL/0SKIP. Log `.test-artifacts/brujula-complete-legacy-before.log`. Causas:2etapas autoría versus3, disclosures/unidades/review4pasos versus plantextual2, mensaje de archivo rechazado vigente.
- `node --experimental-strip-types --test tests/home-warm-navigation.test.mjs tests/agenda-ui.test.mjs` →exit1,0PASS/14FAIL/0SKIP. Log `.test-artifacts/brujula-account-agenda-legacy-before.log`. Causas: details/summary retirados; Upcoming ya no montado y afterDay consulta rango futuro independiente.
- Primera corrección de navegación wizard tuvo21PASS/1FAIL: mi expectativa eliminaba prefijo «Unidad1» del nombre aunque parser aprobado conserva encabezado completo. Se corrigió esa expectativa adicional no aprobada; no se cambió parser ni validación.

### Cambios de aceptación/harness
- Autoría3etapas: contexto/origen, preparación editable, revisión. Navegación sin escrituras; guardado y confirmación de publicación siguen separados.
- Aula2etapas: plan textual editable/back, guardado explícito confirma revisión, nombres/temas conservados; plan incompleto no llega a publicar; archivo elegido rechazado sigue bloqueando publicación y no se promueve suID.
- Mi cuenta: helper vigente abre botón real y devuelve link del dialog; pruebas conservan perfil/logout, apertura sin navegar y cancel/Escape sin callback. Navegación/foco reales quedan al E2E.
- Agenda: fixtures list(range) distinguen calendario y afterDay; revocación limpia ambas proyecciones aun con refresh fallido, reintentos independientes, apertura tardía de noviembre no restaura ese rango al navegar diciembre. Comprobado rango afterDay2026-12-02..2027-01-02; Upcoming endpoint conservado como fuente auxiliar, sin confundirlo con proyección montada.

### Nuevo E2E preparado
`tests/brujula-complete-browser.test.mjs` reusa withJourney330s y servicios/DB desechables propios. Cubre:
- Aula manual por UI: vacío bloqueado antes dePOSTpublish, plan unidades/temas, cero upload y cero study_plan_versions, ingreso alumno confirmado por código real.
- Autoría manual por UI3etapas: cero writes al elegir/editar/revisar, create+save solo al guardar, objective/comment/instructions separados, rúbrica60/40 y privadoIA,403 alumno antes de publicación y ausencia de notificación.
- Publicación explícita; API y pantalla alumno muestran objetivo/comentario y excluyen instrucción privada.
- Entrega por UI; puntajes8/5→sugerencia6.80, override9.25, guardado privado sin nota/notificación alumno, confirmación de publicación, snapshot/puntajes/nota persistidos y pantalla publicada.
- Muro: título y cuerpo por UI y lectura miembro; centro /notificaciones filtra Resultados, muestra Muro al volver a todos, marca todas como leídas, sin mutar estado de notificaciones docentes.
No se ejecutó todavía ni se lanzó Nextbuild; root construye candidato final e integra el archivo nuevo al inventario.

### Verificación focal final
`node --experimental-strip-types --test tests/brujula-home-complete.test.mjs tests/home-by-role.test.mjs tests/foxmind-3d-contracts.test.mjs tests/brujula-fidelity-navigation.test.mjs tests/classroom-activity-redesign.test.mjs tests/wizard-reference-navigation.test.mjs tests/wizard-reference-suggestions.test.mjs tests/wizard-reference-drop.test.mjs tests/home-warm-navigation.test.mjs tests/agenda-ui.test.mjs tests/brujula-agenda-account-complete.test.mjs tests/brujula-authoring-complete.test.mjs tests/brujula-wizard-parity.test.mjs tests/brujula-grading-ui.test.mjs tests/brujula-notifications-complete.test.mjs tests/brujula-integration.test.mjs tests/activity-ai-ui.test.mjs` →exit0,94PASS/0FAIL/0SKIP,5153.9015ms. Log `.test-artifacts/brujula-complete-test-selection.log`.
- node --check de brujula-complete-browser, brujula-browser y entry-glass-browser-helpers →exit0.
- git diff --check focal de9archivos modificados/nuevo →exit0.
- Sin producción, migración, proveedores, datos retenidos, secretos ni inventario. Sin commits.
- Status: completed (pruebas preparadas y selección local GREEN); E2E nuevo NOT_VERIFIED hasta ejecución root.
- Handoff: pruebas congeladas; root agregar inventario/ruta, hacer build final y correr `node --test tests/brujula-complete-browser.test.mjs tests/brujula-browser.test.mjs` con política serial/servicios propios vigente. Si falla un invariante, reportar regresión; no ajustar aceptación para ocultarla.

## Corrección de aceptación: sugerencia explícita separada de nota final
- /root autoriza únicamente nuevo E2E y este registro tras fix aprobado de GradingEditor. Leídos GradingEditor y último tests/brujula-grading-ui.test.mjs: displayedFinal = override ?? calculated; completar criterios no elige la sugerencia. Usar nota sugerida persiste ese valor como override explícito.
- tests/brujula-complete-browser.test.mjs: tras puntajes8/5 exige output sugerido6,80 y final vacío; pulsa Usar nota sugerida, exige final6,80 y recién después override9,25. Conservados persistencia, privacidad, marcas, pesos, publicación y snapshot sin cambios.
- `node --check tests/brujula-complete-browser.test.mjs` y `git diff --check -- tests/brujula-complete-browser.test.mjs` →exit0.
- No navegador, build ni producción; E2E sigue pendiente de corrida root sobre build final.
- Status: completed (expectativa actualizada). Handoff: freeze informado a /root; ejecutar E2E para observar separación y publicación reales.

## Reconciliación de fallos fast restantes
- /root delegó `.test-artifacts/brujula-complete-fast-rest.log`; ejecución final del collector:191archivos,838PASS/10FAIL/0SKIP. Un fallo es inventario a cargo de root; nueve aserciones fallan en siete archivos de aceptación anterior. Los fallos impresos dentro de pruebas del runner (líneas prefijadas #) son fixtures intencionales, no regresiones del candidato.
- No se identificó bug productivo en los casos inspeccionados; no se modificó producción ni inventario.

### Justificación por archivo
1. tests/entry-glass-client.test.mjs: el control regular de cuenta es un modal cerrado, no links perfil/configuración/logout renderizados antes de abrir. Se comprueba trigger real y notificaciones; navbar restringida sigue excluyendo cuenta, perfil, configuración, notificaciones y logout. Apertura/opciones/cancelación se conservan en home-warm-navigation.
2. tests/folder-platform.test.mjs: SSR auth utiliza visual Brújula con paisaje CSS, no asset auth-reference viejo. Se conservan skip-link/main y carga auténtica; links registro/recuperación se comprueban renderizando AccountFlowForms tras sesión no autenticada comprobada, no exigiéndolos antes de conocer sesión.
3. tests/foxmind-3d-client.test.mjs: respuesta antigua de7módulos normaliza drafts/submitted a not-applicable según contrato aditivo aprobado. Mantiene exactamente un GET agregado, no fanout, same-origin/no-store y señal abortable.
4. tests/foxmind-3d-service.test.mjs: fixture incorpora9módulos reales. Se mantienen una unidad de trabajo readonly, identidad/reloj servidor, participación primero, cursor/zona, errores globales y secuencialidad sin fanout paralelo.
5. tests/home-reference-dashboard.test.mjs: fixture9módulos y reintentos de cada fuente visible actual, incluyendo miniagenda separada y drafts globales. Se reemplaza garantía obsoleta de fetch por aula focal por reintento real de módulo drafts y target exacto de aula autorizada aun sin foco. Permisos de foco/archivadas y revocación siguen cubiertos; ninguna consulta por aula se requiere para datos globales aprobados.
6. tests/p5-policy.test.mjs: retiro únicamente de la exigencia de planFileId obligatorio; se acepta plan manual completo sin archivo explícitamente. Resto de campos obligatorios, currículum no vacío, unidades/temas, UUID de archivo si presente, límites y rechazo de ownerId arbitrario permanecen sin cambios.
7. tests/workspace-disclosure.test.mjs: miniagenda ya no es HomeModule, se comprueba el componente mixto real con rol/datos/callback de reintento; trabajo por rol y acceso contextual siguen visibles, sin recursos legacy ni herramientas ajenas.

### Evidencia posterior
- Selección inicial de seis archivos corregidos:40PASS/0FAIL/0SKIP,exit0.
- Tras revisar fin del collector se detectaron los dos fallos workspace adicionales, ya corregidos.
- `node --experimental-strip-types --test tests/entry-glass-client.test.mjs tests/folder-platform.test.mjs tests/foxmind-3d-client.test.mjs tests/foxmind-3d-service.test.mjs tests/home-reference-dashboard.test.mjs tests/p5-policy.test.mjs tests/workspace-disclosure.test.mjs tests/brujula-home-complete.test.mjs tests/home-warm-navigation.test.mjs tests/brujula-wizard-parity.test.mjs` →exit0,71PASS/0FAIL/0SKIP,6109.2633ms. Log `.test-artifacts/brujula-complete-rest-test-green.log`.
- `git diff --check -- tests/entry-glass-client.test.mjs tests/folder-platform.test.mjs tests/foxmind-3d-client.test.mjs tests/foxmind-3d-service.test.mjs tests/home-reference-dashboard.test.mjs tests/p5-policy.test.mjs tests/workspace-disclosure.test.mjs` →exit0.
- Sin DB, browser, build, secretos, proveedores ni commits. No se declara fast completo ni E2E verificado con esta selección.
- Status: completed (reconciliación de aceptación restante).
- Handoff: pruebas congeladas comunicadas a /root. Repetir fast/selección final y resolver inventario antes de declarar entrega; conservar los fallos y su contraste como historia atribuida.

## Ajuste del E2E histórico y ampliación de capturas
- /root delegó exclusivamente tests/brujula-browser.test.mjs y este registro. Contraste con GradingEditor/brujula-grading-rubric: antes de publicar el docente usa fieldset legend «Corrección con rúbrica»; la sección «Rúbrica de evaluación» correspondía a vista de consulta anterior.
- Expectativa equivalente: group accesible Corrección con rúbrica, criterio Evidencias y claridad,100% y textbox Puntaje de Evidencias y claridad editable. Se conservan criterios API,403 prepublicación, nota privada, publicación explícita y resultado alumno.
- Ampliación autorizada de capturas: contexto browser.newContext propio sin credenciales para sign-in/register/forgot-password, cuatro anchos390/768/1280/1440; espera formulario cargado y fonts.ready, comprueba overflow y guarda PNG. Ese contexto se cierra enfinally y reporta pageerrors propios.
- Inicio conserva sus capturas por ambos roles y4anchos. Se agregan centro /notificaciones ambos roles/4anchos, solo consulta GET y capturas, sin marcar ni mutar datos. Espera fin de carga y ausencia de alertas.
- `node --check tests/brujula-browser.test.mjs` y `git diff --check -- tests/brujula-browser.test.mjs` →exit0.
- Root informó E2E completo nuevo PASS en mensaje posterior; es evidencia atribuida al coordinador, no ejecución propia. Archivo histórico ya escrito y congelado antes de aviso de inicio de su corrida; no se modifica durante ejecución.
- Sin producción, runtime, build ni DB ejecutados por este agente. Capturas nuevas pendientes de observar corrida root.
- Status: completed (preparación). Handoff: /root termina viejo Brújula, revisa screenshots y consolida resultados; no atribuir PASS a este archivo sin resultado.

## Ajuste Home E2E: Abrir tema contextual
- /root aporta fallo comprobado `.test-artifacts/brujula-complete-browser-final.log` en espera Entrar al aula docente. HomeRow ahora usa Abrir tema cuando nextTopic existe y emite classroom/plan/topicId; es comportamiento aprobado y cubierto en Home9.
- Sólo tests/p9-home-integration.test.mjs: nueva lectura Home obtiene nextTopic autorizado, exige su existencia para el fixture de plan activo, pulsa Abrir tema: P9 Teaching A. Mantiene respuesta200 del detalle exacto; añade id de aula, pertenencia unitId/topicId al detalle recién leído, heading visible del tema y valor exacto topicId del selector compartido del plan.
- Asserts de permisos docente/alumno, ausencia de aulas ajenas/archivadas, configuración y navegación global permanecen intactos. Búsqueda no encontró otros selectores Entrar al aula en este E2E.
- `node --check tests/p9-home-integration.test.mjs` y `git diff --check -- tests/p9-home-integration.test.mjs` →exit0.
- Sin build, SQL, navegador ni producción por este agente. E2E pendiente de repetición root sobre build final.
- Status: completed (selector y destino comprobable actualizados). Handoff: freeze informado al coordinador para rerun Home.

## Home E2E: compatibilidad de avance curricular y contador real
- /root delega tests/p9-home-integration.test.mjs y ejecución aislada sobre build API final. Fallo previo observado en `.test-artifacts/brujula-final-affected-browser.log`: esperaba ausencia de planProgress alumno, contradice aprobación de metadatos curriculares públicos.
- Semántica actualizada: alumno miembro ve avance derivado1/2 en aulaA y0/2 en aulaB; se mantiene rechazo de campos de notas/feedback/rubricMarks privados en metadatos de aula, consultas not-applicable para alumno, permisos y ausencia del rail docente.
- Se incorpora contador de consultas reales autorizado:1→0→1 al consultar/responder/retirar respuesta docente. Materiales conserva totalItems:null.
- `node --check tests/p9-home-integration.test.mjs` y `git diff --check -- tests/p9-home-integration.test.mjs` →exit0.
- Estado de ejecución: pendiente confirmación explícita API ready solicitada a /root; no se inició runtime ni build mientras dataworker prepara contador.

### Inicio de ejecución Home propia
- /root confirmó API build final PASS con COUNT queries/materials:null y webbuild4 PASS, sin más cambios productivos planificados. Autoriza runner limpio y fixture propio.
- Comando en ejecución: `node .test-artifacts/brujula-complete-browser-run.mjs tests/p9-home-integration.test.mjs`, stdout/stderr en `.test-artifacts/brujula-home-complete-owned.log` y propagación de LASTEXITCODE. Sin build propio ni lectura de configuración retenida.
- Estado in_progress: runner aún no publica resultado del hijo; no se declara PASS a partir del inicio. La prueba conserva timeout330s, pausa fixture real60_001ms y recuperación429 acotada existente.

### Primera ejecución propia y corrección de selector wizard
- Runner propio terminó exit1:13casos reportados,9PASS/2FAIL/2SKIP (un subtest falló y el padre cuenta como fallo). Duración156395.6494ms; log `.test-artifacts/brujula-home-complete-owned.log`.
- Grupos de puertas, altas, roles/destinos, avisos, progreso público/consultasCOUNT, archivo, offline y geometría pasaron. Único fallo observado: continuación draft esperaba texto viejo Datos generales; diálogo actual Crear aula carga su propio Nombre del aula. No429 ni alerta de aplicación en diagnóstico de fallo; no es bug productivo observado.
- Corrección autorizada root: esperar diálogo Crear aula, textbox Nombre del aula y exigir valor exacto Only my private draft. Permisos restringidos permanecen. Se revisaron los últimos dos grupos login/revocación y cuentaresponsive contra implementación, sin otros selectores obsoletos identificados.
- Artefactos primera corrida: C:/Users/alejo/AppData/Local/Temp/foxmind-p9-home-2UX4Kk; seis PNG Inicio docente/alumno320/375/1280, todos presentes con bytes>0. teacher1280:298467bytes. Reflejan build COUNTfinal pero estado posterior a archivo, no todas las aulas activas del comienzo.
- Segunda ejecución misma orden, log `.test-artifacts/brujula-home-complete-owned-final.log`, en curso; no fuente/build/SQL extra entre corridas. No atribuir PASS hasta terminar.

### Ejecución propia Home final: PASS y límite visual observado
- Segunda corrida `node .test-artifacts/brujula-complete-browser-run.mjs tests/p9-home-integration.test.mjs` →exit0;13PASS/0FAIL/0SKIP,128847.5289ms (subtest padre126146.6705ms). Log `.test-artifacts/brujula-home-complete-owned-final.log`.
- Validado en fixture propio con API/webfinal: avance curricular alumno1/2 y0/2 sin campos privados de calificación; queriesCOUNT1→0→1; materials totalItems:null; roles/topicId exactos, puertas, archivo/revocación, recuperación offline, geometría texto efectivo, login/revocación y navegación de perfil.
- Pacing real observado60013ms, conservado dentro del timeout330s; snapshot de admisión en ese boundary no contiene429. Cleanup real: P4 integrated process cleanup failures0 y P4 owned cleanup failures0. Runtime cerrado por helper; no acciones adicionales después del cierre.
- Artefactos finales: C:/Users/alejo/AppData/Local/Temp/foxmind-p9-home-3zJ4aO. Nueve PNG con bytes>0: inicio-teacher-320/375/1280, inicio-student-320/375/1280 y profile-navigation-320/375/1280. teacher1280 pesa298460bytes.
- LÍMITE confirmado con inspección de inicio-teacher-1280.png: representa ready después de archivar la única aula docente (Tu historial sigue aquí; módulos review/queries not-applicable y contadores—), no una espera de carga ni Inicio poblado. No hay captura poblada en esta corrida; todas las capturas Home se toman después del bloque de archivo. No sustituir muestras pobladas anteriores por ésta para demostrar COUNT poblado.
- Hallazgo visual informado a root: fallback de Aula en foco se superpone al texto vacío. La geometría automática que pasó corresponde a la bienvenida, no a este fallback. PASS funcional no certifica ese estado vacío visual. No se modificó producción ni se retiró evidencia.
- /root tiene ruta PNG/log y decidirá evidencia poblada adicional y corrección visual. Se ofreció capturar antes de archivo sólo con autorización adicional; no se lanzó otro runtime ni build.
- `git diff --check -- tests/p9-home-integration.test.mjs` →exit0.
- Status: completed (Home E2E funcional13PASS). Handoff: superficie de pruebas congelada; conservar primera corrida fallida y limitaciones visuales, coordinar cualquier reapertura antes de mutar candidato.

## Reapertura: defecto geométrico de foco vacío y evidencia poblada
- /root autoriza únicamente test Home y registro: header de aula focal vacía no debe intersectar .fm-home-empty en320/375/1280; captura poblada COUNT1 antes de archivar, con fuentes/imágenes listas. No alterar contratos/budgets.
- Test preparado: screenshot inicio-teacher-populated-1280.png inmediatamente después de assertqueries.totalItems=1, espera fonts.ready y decode de imágenes visibles, exige texto de botón Consultas1 antes de capturar. Capturas posteriores al archivo se conservan como estado vacío.
- Geometría por viewport ahora exige .fm-home-empty docente visible y header/noempty rects sin intersección; incluye ambos rectángulos en diagnóstico/captura de fallo. Sin epsilon ni tolerancia nueva. Mantiene overflow, bienvenida, imagen y texto efectivos.
- /root confirmó CSS corregido y webbuild5 PASS en `.test-artifacts/brujula-complete-final-web-build5.log`, sin más producción planificada. Ejecutar fixture propio mismo timeout330s/pacing60_001ms; no se lanza build.
- node --check y git diff --check focal Home →exit0.

### Cierre propio: geometría de vacío y captura poblada verificados
- Comando: `node .test-artifacts/brujula-complete-browser-run.mjs tests/p9-home-integration.test.mjs` con salida completa en `.test-artifacts/brujula-home-empty-and-populated-final.log` →exit0,13PASS/0FAIL/0SKIP;129429.608ms. Subtest padre126721.9894ms.
- Home usa API COUNTfinal y webbuild5 confirmados por root antes de iniciar. Ninguna fuente productiva ni build modificados por este agente.
- Nuevo invariante observado PASS: docente archivado muestra vacío y rectángulos header vs fm-home-empty no intersectan en320/375/1280. Mantiene bienvenida/texto efectivo/Foxy dentro/panel dentro/nooverflow y todos los controles funcionales de la corrida.
- Carpeta final: C:/Users/alejo/AppData/Local/Temp/foxmind-p9-home-fwvyiG. Diez capturas: inicio-teacher-populated-1280.png; docente/alumno vacíos/historia320/375/1280 y perfil320/375/1280. Son escenarios diferentes deliberados, no intercambiables.
- Inspección visual local ejecutada sobre inicio-teacher-populated-1280.png e inicio-teacher-1280.png: la primera es poblada y muestra Consultas1, aula activa, progreso1/2 y próximo tema; la segunda es ready después de archivo y el título Aula en foco está separado del párrafo vacío, sin el solapamiento anterior.
- La captura poblada espera fuentes, decode de imágenes visibles y contador1 real antes del screenshot; no es un loading capturado por carrera. La corrida también observa1→0→1 enCOUNT y materials:null.
- Cleanup observado: P4 integrated process cleanup failures0, P4 owned cleanup failures0. Runtime cerrado; no nuevas acciones de app, servicios o SQL después del cierre.
- `git diff --check -- tests/p9-home-integration.test.mjs` →exit0.
- Status: completed (Home funcional y defecto geométrico de vacío verificados en candidato build5).
- Handoff: superficie de pruebas congelada. Root puede preservar poblada y vacía por separado en evidencia versionada; conservar corrida anterior y fallo visual como historia. No commit/push/deploy por este agente.
