# Cierre de la migración por dominios

## Contexto, autoridad y estado

- Coordinador: `/root`. Fecha: 2026-11-10. Rama: `codex/architecture-foundation`.
- Base de este trabajo: `29fda64`, identidad y composición global ya verificadas y cerradas. La referencia Git sirve para comparar comportamiento; no concede permisos.
- Autorización humana vigente: terminar las cinco tareas pendientes con pruebas y commits locales. El usuario también autorizó ajustes mínimos de accesibilidad y la corrección del cierre prematuro HTTP 413 encontrada durante aceptación. Sin push, PR, merge, despliegue, proveedores reales ni acceso a datos retenidos.
- Runtime de memoria sin registro autoritativo: no se invocó escritura Engram ni se inventó una identidad de sesión.
- Fuentes: [diseño aprobado](../engineering/architecture-migration.md), [tablero único](../../odd/tasks/architecture-migration.md) y especificación vigente. El coordinador es el único escritor del tablero.
- Estado actual: migración, retiro y ampliaciones autorizadas verificados localmente. Incluye 44 archivos de navegador y suite rápida completa posterior al arreglo HTTP. Commits de código cerrados; este registro y el tablero forman el recibo documental de entrega.

## Resultado estructural

Se conservan stack, esquema, SQL, HTTP, permisos y reglas. El frontend reúne features con contratos públicos, screens de composición y application para navegación, sesión y adaptadores de servidor. El backend usa módulos por capacidad, puertos de aplicación, infraestructura y bootstrap; platform reúne soporte técnico. Core agrupa reglas por dominio y separa DTO/SQL en contracts. No se agregan jerarquías GoF decorativas: fábricas, estrategias y adaptadores resuelven dependencias existentes.

Los mapas y comparaciones mecánicas están en `.test-artifacts/architecture-finish/`. Son evidencia local; la organización canónica y los cambios quedan en código y Git. El relevamiento inicial clasificó 373 fuentes backend, 110 aristas legadas y ocho componentes fuertemente conectados; no constituía aceptación.

- Frontend: retiro de 232 rutas anteriores, incluyendo apps/classrooms-ui, apps/agenda-ui y web components/lib. Declaraciones, JSX/CSS y aserciones funcionales se compararon con la base.
- Backend: el writer de retiro eliminó 368 puentes y movió 105 tests; el coordinador terminó las entradas de configuración/composición adicionales. Main/application/configuration son entradas permanentes del host.
- Core: 53 puentes retirados, reglas agrupadas y seis tests movidos. SQL y diagnósticos salen del dominio de negocio. Se conserva la identidad de errores y funciones.
- Guard AST: cero excepciones congeladas, sin whitelist nueva. Se retiró agenda-compatibility. Contratos web api.ts no importan UI, Node, React o Next; los tests no pueden convertirse en dependencias de producción.
- Inventario actual: 530 entradas, 53 exclusiones explícitas, 23 rutas. Los guards nuevos conservan su registro y el ciclo HTTP está en fast/transport; no se elimina cobertura histórica.

## Evidencia reconciliada

| Control | Resultado observado | Procedencia y límite |
|---|---|---|
| Fast completo inicial | 334/334 archivos, 1859 PASS, 0 FAIL, 0 SKIP | fast-reconciled.json; luego se agregaron pruebas de infraestructura, por lo que se repite la ruta actual |
| Fast ampliado intermedio | 335/335 archivos, 1864 PASS, 0 FAIL, 0 SKIP | complete-fast-final.log, antes de ampliar los cinco casos P8 y tres casos del observer |
| Fast de entrega actual | 335/335 archivos, 1881 PASS, 0 FAIL/CANCEL/SKIP | complete-fast-final-frozen-candidate.log y fast-delivery-reconciled.json, una corrida completa con conjunto y contadores cotejados |
| Fast tras ampliar aceptación P7 | 335/335 archivos, 1904 PASS, 0 FAIL/CANCEL/SKIP reconciliados | Se reemplazan los cuatro casos previos del control P7 por sus 27 actuales, ejecutados también por root. Los otros 334 no cambiaron. fast-current-reconciled.json; no se afirma otra corrida completa de 335 archivos |
| Fast completo después del cierre HTTP | 336/336 archivos, 1918 PASS, 0 FAIL/CANCEL/SKIP | complete-fast-after-rejection-fix.log y fast-after-rejection-reconciled.json; conjunto exacto y contadores comprobados por root |
| PostgreSQL propio | 131/131 archivos, 847 PASS, 0 FAIL, 0 SKIP | owned-db-reconciled.json: última ejecución completa por archivo, sin duplicar intentos parciales |
| Servicios propios | 9/9 archivos, 52 PASS, 0 FAIL, 0 SKIP | owned-services-reconciled.json: almacenamiento, escáner y correo capturado |
| Wrappers | 19/19 rutas, 153 PASS, 0 FAIL/CANCEL/SKIP | wrappers-final/final-report.json, IDs y comandos cotejados con el manifiesto |
| Builds/tipos | API y web de producción PASS; tipos API/web/preview PASS | Web posterior al cierre HTTP: web-build-after-rejection-fix.log; tipos de entrega de los tres proyectos PASS |
| Lint/fronteras | PASS, cero excepciones | lint-after-rejection-fix.log y check-boundaries |
| Documentación/TTP | 101 archivos y 916 enlaces sin problemas; 28 tareas válidas | docs-delivery-final.log; 19 pruebas documentales/discovery adicionales PASS, sin fallos ni omisiones |
| Navegador integrado | 44/44 archivos, 174 PASS, 0 FAIL/CANCEL/SKIP reconciliados | browser-final-reconciled.json; root cotejó conjunto exacto, fuentes actuales, TAP y cohortes atribuidas. initial-coverage.json permanece sólo diagnóstico |

La ruta DB se retomó desde los fallos exactos. Se conservan los logs de 520 PASS/1 FAIL, 55 PASS/2 FAIL y 280 PASS/0 FAIL. La reconciliación comprueba el conjunto completo de 131 archivos y toma su última ejecución exitosa. Entre checkpoints no cambió el comportamiento backend; se completaron fakes de puertos sin alterar aserciones.

El grupo wrappers canónico inicial terminó rojo en P3. Se conservó y se ejecutaron los comandos canónicos pendientes por ruta, repitiendo P3 y recuperación hasta verde. No se presenta esto como una nueva corrida completa del grupo. La copia de fuentes tuvo compilación/Prisma propios y dependencias compartidas por junction; no constituye aislamiento de seguridad. Producción/configuración y los diez tests ejecutados coincidían con el candidato. La última P3 incluyó los estilos actuales.

## Revisiones y QA independientes

- Técnica backend: 44 pruebas sintéticas, 68 SQL y 288 aserciones equivalentes. Revisión académica: 85 pruebas y comparación de 154 consultas delegadas en 20 unidades, preservando SQL, argumentos y orden. Los controles cubren tx/actor, locks, propiedad, revisión, calificación exacta, publicación y auditoría.
- Frontend: 843 PASS en 148 archivos; 388 declaraciones y 3220 aserciones cotejadas, salvo rutas y compatibilidad temporal retiradas explícitamente. Los últimos movimientos conservaron 17 declaraciones runtime.
- QA sintética real: 31 recibos y nueve capturas observadas; ambos roles, navegación, foco/Escape, Agenda CRUD y conflicto, Markdown seguro, errores de Foxy/Estudio y Files. TaskSpace4 se cerró y su preview quedó detenido. No acredita persistencia DB ni generación real.
- CSS autorizado: 12 focales y cinco capturas independientes. Bordes auth 3,097:1 y botones 5,255:1. Inicio sin desborde a 320/390/768/1440; ocho clics con destino correcto y teclado visible. En el mismo DOM: regla anterior scroll405, candidata scroll390. El ancho clickeable aumenta y la altura sigue en 32 px; no se afirma un mínimo de 44 px. TaskSpace5 y previews cerrados.
- La ventana Ego inicialmente minimizada y dos arranques de preview con junctions dificultaron la instrumentación; los fallos se conservaron. La QA CSS definitiva usó copia física acotada y CSSOM de las fuentes actuales. No es una auditoría integral WCAG ni de lectores de pantalla.

## Fallos encontrados y correcciones

1. FilesModule inyectaba la clase de aplicación mientras IdentityModule exportaba el runtime host. Se corrigió el token y se agregó regresión Nest con RED/GREEN, sin DB real.
2. Dos workers PDF/diagrama tenían un sufijo de archivo remapeado por error. Se restauró endsWith('.ts'); 21 pruebas reales de workers pasaron y la revisión independiente confirmó el delta.
3. La composición de publicación de materiales delegaba advanceRevision recibido; la base siempre usaba la operación compartida. Se restauró ese contrato, conservando readyClassroomFile.bind(deps), tx y actor. RED DB preservado; focal y cuatro casos independientes verdes.
4. Un import type precedía use client en academic-cover. El build limpio lo detectó; la directiva volvió al primer statement y el build web pasó.
5. Mocks apuntaban a facades retiradas y queries de import refrescaban una fachada en lugar de la implementación. Se corrigieron destinos y aislamiento de los tests, conservando aserciones.
6. Fakes de Prototype.call y stores parciales no declaraban repositorios/operaciones nuevos. Ahora usan adaptadores reales sobre el mismo tx fake o puertos que fallan ante un uso inesperado. Las aserciones de roles y permisos siguen intactas.
7. La primera agrupación core interpretó una fila descriptiva del inventario como destino. Se restauró el barrel y se eliminó sólo el archivo accidental propio. Un remapeo regex omitía import() de tipos; se sustituyó por AST.
8. Compilaciones API simultáneas con tests produjeron una lectura transitoria de JS parcialmente emitido. El focal pasó sin cambios; desde entonces las rutas usan preparación secuencial o compilación propia, sin emitir sobre los archivos que otro runner consume.
9. La política automática rechazó borrar outputs. Se archivaron únicamente los directorios .build propios mediante Move-Item, con rutas y ausencia de reparse points verificadas. Los builds canónicos empezaron sin outputs antiguos.
10. Los guards SHA de archivos grandes se ajustaron tras revisión independiente: sólo dos URLs de worker y un rol explícito se normalizan para reconstruir exactamente los 19358 bytes originales. Diez mutaciones negativas se rechazan. Payloads, generadores y límites originales quedan protegidos.

## Aceptaciones históricas desalineadas

Las adaptaciones se contrastaron con especificación y UI anterior 29fda64; no se cambió producto para satisfacer controles que ya no existían.

- La especificación permite salida propia de un aula archivada. Se corrigió el 409 antiguo a 200, se conserva lectura autorizada antes de salir y se agrega denegación después. Remoción docente archivada sigue siendo CONFLICT.
- La UI de creación exige documento aprobado en ambos métodos y cuatro pasos. El escenario manual ahora prueba archivo/digest, una subida y una versión, además de impedir publicación sin unidad/tema. La API manual sin archivo conserva su compatibilidad.
- Los actores tienen roles exclusivos y avatar inicial explícito. Se actualizaron fixtures y actores separados, manteniendo deepEqual y negativos de permisos.
- La UI actual tiene overview, gesto explícito de responder/preparar, preguntas simultáneas y lectura confirmada por historial. Se conservan inicio cero antes del gesto, contenido privado sin claves, persistencia y ausencia de edición confirmada. La descripción inicial del coordinador sobre preguntas visibles antes de iniciar fue corregida: el alumno ve resumen, sin prompts/opciones/inputs.
- Progreso no expone el antiguo botón de refresh. El test usa reentrada real, aria-busy, ausencia de métricas durante error/carga y reintento; no afirma refresco de la misma instancia. La carga individual requiere gesto después de la ficha.
- Los controles de upload de instrucciones y Descargar plan no existían en la UI base. El archivo de instrucciones se prepara por HTTP público real y se exige descarga UI real del enlace que sí existe; Plan conserva unidades/temas visibles y contratos de archivo/digest. No se inventan controles de producto.
- TP usa el campo actual de nota efectiva manual; cuestionarios/evaluaciones conservan puntos y cálculo. Números, precisión, auditoría, versiones y permisos no se relajan.

## Contratos de los propios helpers

Checkpoint navegador final: ocho archivos P8 reconciliados con 34 PASS, sin fallos ni omisiones; cohorte mixta explícita en p8-browser-final/final-summary.json. Los cinco verdes iniciales no recorrieron la rama P6 de retry cambiada y la extracción de factory conservó semántica, comprobada por QC. Grading final acreditó GET CSRF 429/RATE_LIMITED, espera real y un único POST submit 200, sin submit previo. Las alertas se acotaron a su región y se esperó habilitación del botón después del finally de React.

Otros trece archivos estables cerraron con 37 PASS y cero fallos, omisiones o cancelaciones. Root cotejó conjunto exacto, SHA de fuente actual e igualdad de cinco helpers antes/después, TAP y cleanup P4 de procesos/recursos propios cero por archivo. Tres usaron el build anterior al ajuste de nav; sus viewports quedan registrados y el contraste CSSOM confirma que el delta no afecta esos anchos. Los diez siguientes usaron el build actual. No se presenta como igualdad binaria ni como cierre de los 44 archivos. Cuatro verdes previos se conservan mediante análisis de dependencias en prior-green-dependency-reconciliation.json; el resto continúa en final-owned.

La revisión detectó y reprodujo falsos verdes antes de aceptar sus resultados:

- Inicio automático anterior al gesto, incluso 429, podía quedar fuera del contador.
- Lecturas anteriores al guardado podían satisfacer el waiter y ocultar un error posterior.
- Un retry de upload podía aceptar método CSRF incorrecto o una respuesta anterior a su fase.

Se escribieron primero cinco pruebas protegidas, luego casos adicionales hasta 17. El implementador no editó esos tests; la protección es por rol, no un sandbox real. La revisión independiente ejecutó 17/17 PASS con aceptación SHA0b7e73fccc8cc125415bdddda8026b1cafe40d3b5abd627b66f744cf42fbe5fa y helper SHA98371fd22d3f688106ee7e72eec5af77f1306036091f4aac2bc88ed9ea72ddbd.

El helper exige requests causales por fase, lecturas iniciadas después del guardado confirmado y un único retry de GET CSRF 429/RATE_LIMITED con Retry-After entero 1–60, antes de cualquier mutación de archivos. Espera el valor real y repite la misma acción/archivo; no reintenta otros errores ni una segunda limitación. Casos reales XIVix6/w6Jatu acreditaron ese 429 sin POST/PUT posterior antes de autorizar la recuperación.

Otro bloqueo provenía del observador: cuatro subtests P7 pasaban, pero el top-level agotaba 330 s al esperar cuerpos JSON antes de cerrar el browser. El código espera response.json, no response.finished. Se agregó snapshot parcial explícito no bloqueante, sin cambiar el default, y cierre detach → browser.close → drain → recibo final. Tres tests nuevos mantienen el prefijo anterior; 29+17=46 PASS independientes. Aceptación observer SHA171bd38c90e6233f193fea7e4821e28fbd1d68eb923a69aa862005e8d3fe8f41; helper SHA3e4310c852323bae8e50051d7f27401c203e2f6603b9d8776f7747f1416ff12a. La causa dinámica y los errores originales de cada journey deben quedar visibles en los reruns.

La consulta de una tarea cerrada encontró GET session 429 antes de cualquier POST start. Se creó un helper privado del escenario P7; no se alteran los helpers compartidos congelados. La primera propuesta fue rechazada por un probe independiente: POST start 200 podía ocultar una lectura 429 tardía del mismo gesto. La versión corregida espera las respuestas de los requests causales pendientes, rechaza cualquier POST previo al retry de lectura y exige exactamente un inicio confirmado; GET 200 solo nunca es éxito. Se conservan RED y matrices independientes. Los 23 probes quedaron versionados en p7-integration-controls junto con sus cuatro casos anteriores byteidénticos; 27/27 PASS del revisor y de root, formato legible y AST del append preservado. SHA del control:7590536b6405cda25a1fcc0994b18d6c0758dd5c1b038d989abc041f97ee8b03; helper:8ee1449ddfbb93b999368189000fd97c317a89a352e5b62592c24061615b34db. El primer retake completo detectó además un import del helper anterior omitido en la integración del test; se restaura sin cambiar aserciones y se exige repetir todo el archivo.

## Recursos, desviaciones y límites

La corrección HTTP fue aprobada explícitamente después del diagnóstico y quedó en un corte propio. Aceptación escrita por revisor separado: 14 FAIL causales antes de producción; 14 nuevas y 22 originales PASS de implementador y revisor; 48/48 fronteras reales repetidas con respuesta 413 completa y upstream cero. Se conservan tamaños aceptados, rutas, validaciones, permisos y headers. El descarte no retiene chunks y usa presupuesto adicional JSONlimit+1 con deadline monotónico absoluto de 10 s desde entrada, sin renovar el plazo tras parsear; los defaults upstream siguen iguales. Cap, deadline o cancelación abortan ambos extremos y limpian recursos. No garantiza JSON completo para cuerpos arbitrarios. Los tests protegidos conservan SHA317a8ab62088fa7350beccf9fca52af0e022c5d431781f5dc12a6a191b8cd0a1. Build web, tipos API/web/preview y lint/AST pasaron; la suite rápida completa posterior pasó sus 336 archivos y 1918 casos.

Las cohortes DB/servicios/browser/wrappers anteriores no se presentan como nuevas ejecuciones después del arreglo HTTP. API y esquema no cambiaron; las rutas, esquemas y headers de los proxies conservan equivalencia AST independiente y los caminos modificados tienen sus regresiones específicas. El build raíz posterior incorpora las tres fuentes nuevas/afectadas. La discrepancia documental de breakpoints 801/1024 queda señalada en la guía frontend: esta migración conserva el comportamiento responsive y no decide una política UX nueva.

El validador TTP rechazó transitoriamente TASK-023 al agregar su nueva dependencia TASK-028 todavía en verificación. Tras comprobar la suite completa y cerrar TASK-028, el tablero volvió a validar; no se omitió esa dependencia para ocultar trabajo pendiente.

En los últimos recorridos P8, la recuperación tras CSRF limitado necesitó esperar que React habilitara el mismo botón y acotar el alert a la región de entrega. Se mantienen la condición, el deadline y la prohibición de mutaciones antes del retry. P9 storage/scanner se separan en fixtures secuenciales con actores nuevos: cada fase conserva su baseline no vacío y todos los controles; no se reintenta una subida después de asignar fileId. Esto evita que la admisión acumulada de un escenario tape la indisponibilidad del servicio que se está probando.

El preview sintético de resumen presentó módulos pendientes con Vite dev aun después de acotar la entrada y esperar requests idle. Se autorizó compilar únicamente esa fixture a Temp propio y servirla estática, con los mismos componentes/CSS, deadline y aserciones. El bundle alcanzó el control real y reprodujo una oclusión a 894 px: el nav heredaba position fixed e inset de la navegación inferior dentro de la sidebar Brújula. Dentro de la autorización de accesibilidad mínima, se restablecen sólo position static e inset auto del nav interior; sin cambiar breakpoints ni destinos. TASK-027 quedó verificada: GREEN final 1/1, geometría/clic/teclado y actualización sin recentrado a 894; navegación/foco sin oclusión a 800/801/1023/1024 y cuatro capturas. CSSOM y geometría permanecen idénticos al quitar/restaurar esas propiedades a 768/1280. Las fixtures se pausaron entre archivos y el build web raíz actual pasó. Recibos summary-static-final-results/extra-receipt y summary-boundaries-and-cssom; fuentes y helpers iguales antes/después.

La repetición rápida de entrega encontró un fetch failed en el rechazo de JSON excesivo del proxy P5; el mismo archivo pasó sus seis casos inmediatamente sin cambios. Una repetición completa posterior encontró un fetch failed equivalente en Foxy. Se conservan ambas corridas. El diagnóstico independiente reprodujo ECONNRESET en 3 de 24 peticiones de cada proxy con el tamaño exacto de sus tests: response finish 413 y cierre de socket antes de request complete. El AST runtime de ambos proxies, excluidos imports/terminadores, es idéntico a 29fda64; Connection close y resume ya existían. No se declara esa repetición verde ni se cambia producción. Se evalúa un cliente HTTP de fixture que deje de enviar al recibir una respuesta completa, conservando tamaño, status, cuerpo/error y cero upstream; no se presenta como corrección de fetch/browser.

Dos timeouts dejaron fixtures de esta corrida: ae0e7946c67cc4c5 y d0a134465530833e. Se corroboraron labels/nombres/creación y se retiraron sólo sus contenedores, redes vacías y cuatro volúmenes descartables creados por esos tests, sin consumidores. El código normal de las fixtures también elimina esos volúmenes al finalizar; no son volúmenes retenidos del usuario. No se operó sobre P3/P4 antiguos, local-app, Mailpit o PIDs sin atribución suficiente. Logs de cleanup conservados.

Tres ampliaciones delegadas ejecutaron helpers DB pese al límite NoDB de sus subtareas (frontend, técnico y core). Está registrado en sus devoluciones: recursos aleatorios propios, rollback/finally y sin error de cleanup observado. La integración DB estaba autorizada al coordinador; eso no borra la desviación del alcance delegado ni permite llamarlas pruebas puras.

Se normalizaron únicamente terminadores de línea de un helper outbox y whitespace de 13 fuentes; sin cambios de lógica ni valores. No se tocaron los guards SHA sensibles mediante formateo genérico. Node/checks de diff pasaron.

## Entrega Git y próximo paso

- Identidad/global: 29fda64, cierre previo.
- CSS autorizado: f7c8a4ce42082eb00cc12a5148c3c74461908fff, dos reglas y validación independiente, build raíz actual PASS.
- Navegación sin oclusión: fb6035ba3c68cc211f2b9f229197263d60e65dea, dos propiedades de CSS, regresión real y comprobación de breakpoints PASS.
- Migración por dominios: d09fc24701296a61542ab8e877dfda082e7f808b, 1389 archivos con 12636 altas y 7936 bajas incluyendo movimientos y pruebas. El retiro y sus consumidores forman un corte atómico; dividirlos dejaría imports/contratos ausentes. Se comprobó que los dos proxies incluidos en el índice eran idénticos a sus snapshots previos al arreglo HTTP, preservando el trabajo concurrente del implementador fuera de ese commit.
- Cierre HTTP: 2b6ff79a3e52de16d3c767facb22a8d833eb6794, nueve archivos, 322 altas y 37 bajas, con código, aceptación protegida, registro CI y documentación juntos.
- [Recibo versionado](../verification/architecture-migration.json): grupos completos, cohortes, hashes y límites. Los logs completos permanecen en artefactos locales ignorados. La comprobación Git del commit documental se registra en .test-artifacts/architecture-finish/delivery-git-check.log; no se inventa un hash autorreferente.
- No quedó implementación pendiente al terminar el cierre local. En ese checkpoint, integración a main, publicación y despliegue requerían autorización aparte y sólo se habían creado commits locales.

Autorización posterior: el usuario pidió integrar a main, publicar y retirar las demás ramas. Su ejecución y comprobaciones posteriores a este cierre local se conservan en el [registro de publicación](2026-11-10-root-architecture-publication.md). No implica despliegue.
