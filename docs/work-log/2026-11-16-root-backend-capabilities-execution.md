# Ejecución del backend por capacidades

- Agente: `/root`, orquestador; identificador de sesión no expuesto.
- Fecha: 2026-11-16.
- Rama: `codex/backend-capabilities`.
- Worktree: `C:/Users/alejo/.codex/worktrees/069c/ProtipoFoxMind`.
- Base: `dd6f4bc92b959cce0e2c68343291614270c4a17e`.
- Autorización: diseño y ejecución del plan en rama distinta, conservando trabajo frontend concurrente. No autoriza commits/publicación/despliegue ni uso de datos/proveedores reales.
- Fuente: [plan aprobado](../engineering/backend-capabilities-plan.md); estado único en [tablero](../../odd/tasks/backend-capabilities.md).

## Preparación

Worktree administrado creado sobre la base explícita; rama propia confirmada. Se copiaron únicamente los cuatro documentos propios del plan desde el checkout principal; el trabajo ajeno y el checkout principal permanecen intactos. `node_modules` es junction a las dependencias existentes para lectura/ejecución; no se instala ni modifica su contenido. `.env`, datos locales y secretos no se copian ni se leen. Build y artefactos se crean en el worktree backend.

## Evidencia y siguiente paso

TASK-001 en ejecución: inventario por capacidad, build fresco y baseline de límites/suites. Cada resultado y fallo se agregará aquí antes de marcar DONE. Sin modificaciones de producto ni commits.

## TASK-001 — Base verificada

- Mapa inicial generado de 487 archivos API y 13 dominios en `docs/verification/backend-capabilities-map.json`, con origen/destino propuesto, rol y hash de origen. El dueño se afina durante cada corte; no es prueba de una migración terminada.
- `npm.cmd run test:ci`: primer intento exit 1; generación Prisma PASS pero compilación agotó el budget de 30 s (`exit unavailable`). No se atribuye a un fallo de código ni se elimina esa evidencia.
- Build repetido con `buildApi({budgetMs:120000})`: generación y TypeScript exit 0, con configuración sintética y sin conexión a DB.
- `npm.cmd run lint:boundaries`: PASS, 0 excepciones. Inventario completo `--check`: 636 entradas, 54 exclusiones explícitas, 23 rutas. Validador TTP: 24 tareas válidas.
- Suite `pure`: 413 PASS/0 FAIL/0 SKIP. Suite `transport`: 88 PASS/0 FAIL/0 SKIP. Logs en `.test-artifacts/backend-capabilities/baseline-*.log`, ignorados.
- Docker no disponible: daemon Desktop apagado. No se ejecutaron pruebas PostgreSQL ni se operó sobre contenedores/datos retenidos. Se prepararán recursos propios al verificar persistencia.

TASK-002 en ejecución: extender controles sin debilitar capas o APIs privadas. Se permite una entrada pública nombrada por capacidad cuando sea necesaria para contratos entre hermanas; evita importar el agregador del propio módulo y crear ciclos. Las exportaciones de infraestructura continúan prohibidas.

## TASK-002 y TASK-003 — Controles y piloto Plan

Carver implementó sólo guard/fixtures y su registro propio: RED 26 PASS/3 FAIL; GREEN 29/29 y 0 excepciones. El coordinador releyó el diff y repitió 29/29 más guard global PASS, manteniendo las reglas de frontend. TASK-002 DONE.

Plan: 4 archivos movidos con sus dependencias y 9 consumidores remapeados, entrada `curriculum/plan/public.ts`, inventarios remapeados sin excluir pruebas. La inspección de aplicación usa ahora rutas explícitas que pueden seguir cada capacidad, conservando sus 13 casos y aserciones.

Una orden de limpieza de `.build/api` con comprobación de ruta fue rechazada automáticamente por política; no se ejecutó. Se usó una alternativa sin borrados: compilar con `--outDir .build/backend-capabilities/plan` y resolver los imports de prueba hacia esa salida nueva. Compilación PASS; pruebas de Plan/arquitectura 10/10 PASS; límites PASS/0 excepciones; inventario conserva 636 entradas/54 exclusiones/23 rutas. No se altera el build/loader canónico para esta alternativa. TASK-003 DONE.

Docker Desktop se inició oculto y el daemon respondió versión 29.9.2. Todavía no se usaron bases o contenedores para integración.

## TASK-004 — Autoría ubicada

Se movieron 4 contratos/caso de uso de aplicación y su repositorio SQL a `activities/authoring`, con API nombrada; 12 consumidores remapeados. Los helpers SQL compartidos con generación permanecen en su ubicación legacy hasta migrar esa colaboración en TASK-008: el caso de uso los recibe por `AuthoringOperations` y no importa sus implementaciones. No se agregó un puente duplicado ni una excepción.

Compilación en salida nueva `authoring-move` PASS; arquitectura y configuración/rúbrica 15/15 PASS; límites 0 excepciones e inventario 636/54/23 conservado. TASK-005 inicia el reemplazo de contratos SQL implícitos, sin mezclar ese cambio con el movimiento anterior.

## TASK-005 y Foundation — Contratos y primera integración

Euler reemplazó 15 métodos numerados por comandos/resultados concretos, conservando SQL/argumentos/tx y acotando modo share/update. RED 16 fallos esperados; GREEN worker y root 18/18, incluidos seis negativos TS y variaciones omitted/null/empty. Tipos globales sin emitir PASS. TASK-005 DONE.

Kepler entregó Identity y Helmholtz Files/Agenda con mapas de 92 movimientos combinados. Root remapeó 132 consumidores, luego tres stubs relativos; actualizó tres tsconfigs parciales de identidad y el símbolo Nest AccountMailService a bootstrap/identity-mail.module.ts. Se registraron cinco pruebas nuevas sin quitar entradas: 641 runtime entries, 54 exclusiones, 23 rutas.

- Build nuevo `.build/backend-capabilities/foundation`: PASS; 57 pruebas focalizadas conjuntas PASS.
- PostgreSQL descartable Agenda: 12/12 PASS, fixtures con owner aleatorio y cleanup propio.
- Primera tanda lifecycle: 11 casos de FileService real/publicación con PostgreSQL propio PASS; dos fallos de resolución del loader temporal y una entrada mail-deadline rechazada por exigir su runner aislado. Se conserva el log; mail-deadline no se atribuye como fallo de producto ni prueba funcional ejecutada.
- Se corrigió el loader temporal para redirigir rutas .build/api antes de resolver las que aún no existen allí, preservando query de módulo. Repetición de startup-close y mailer: 10/10 PASS, incluyendo close SMTP/Nest. No se repitieron innecesariamente los 11 casos de publicación ya verdes.
- Revisión independiente Dewey: 12/12 source dos veces, 137 fuentes estables y comparación de nueve archivos base extraídos por root con hashes. Sin bloqueantes de permisos/tx/lifecycle. Encontró P3 real: puerto FileHttpPort.receive aceptaba Uint8Array aunque FileService exige Buffer. Root añadió negativo de tipos (RED 2 PASS/1 FAIL) y estrechó sólo el puerto a Buffer: GREEN 6/6 con HTTP. No se amplía comportamiento.

TASK-013/014/015 DONE para sus unidades verificadas; la aceptación global y suites restantes pertenecen a TASK-024. Académicos avanzan en superficies disjuntas; frontend sigue sin cambios en este worktree. El snapshot de build Foundation conserva el candidato compilado de esas pruebas.

## TASK-006–011, TASK-016 y TASK-025 — Integración académica

- Aulas: 34 movimientos, 72 pruebas source del escritor, SQL77/77 idéntico y seis negativos TS. Catálogo se inyecta en el único ClassroomCore; código de acceso recibe digest/encrypt; el host ensambla esas dependencias.
- Currículo/Materiales/generación: 49 movimientos, 40 pruebas source; Library15 operaciones tipadas, 24 casos SQL exacto. Las decisiones de request/hash/aplicación IA están en application. Helpers compartidos se conectan desde composición; revisión pertenece a Classroom.
- Participation/Grading: 48 movimientos y 93 contratos de persistencia con objetos tipados. 107 casos SQL/contratos del escritor; se retiraron sus cinco caracterizaciones temporales duplicadas y se conservaron los 35 tests compartidos, remapeando mocks y argumentos al nuevo contrato sin quitar garantías.
- Communication/Home: 32 movimientos, Inbox separado; Muro conserva inserción de aviso en tx. 29 pruebas del escritor, 13 operaciones SQL en 16 casos y seis negativos TS. La fachada transitoria ya delega sus cinco métodos de bandeja a NotificationInboxService.
- HTTP incremental: 54 ramas equivalentes AST en 14 segmentos ordenados; ocho puertos de consumidor. Worker83/83. Bootstrap pasa de 425 a199 líneas y no define reglas de cada capacidad. TASK-025 se separó de TASK-012 para reflejar el inicio incremental ya aprobado de P07.

Root integró los mapas y consumidores, completó CatalogOperations en ClassroomCore y wrappers de host. Build nuevo `capabilities` PASS, límites0. Tanda académica: 389/391 PASS inicialmente; falló una expectativa estructural antigua de Home/public y la identidad de ClassroomError en un stub de Settings. Se mantuvieron las garantías de ambos tests y se ajustaron sus referencias: repetición de los dos archivos, 13/13 PASS. Ningún fallo de esa tanda quedó sin resolver. TASK-006/007/008/009/010/011/016/025 DONE para sus cortes locales; DB/concurrencia y aceptación global siguen en024.

## TASK-017–020 — Estudio y Foxy

Estudio: 38 entradas de mapa, estado v1 conocido tipado y schema por contexto estructurado independiente del prompt. Caracterización root sobre build nuevo: 78/78 más2 schema; gate017 DONE. El corte018 eliminó sentinela/captura/replay del dispatcher y separó preparar/reservar/validar/ejecutar/aplicar, conservando PENDING y resultados tardíos. Root compiló `policies` y ejecutó 99/99 conjuntas más6/6 de protocolo (preparación sin efectos, revocación, replay y texto predeterminado). Worker90/90; sin migración ni parser nuevo para JSON previo.

Foxy: 206 movimientos (103 fuentes y103 tests), 278 expresiones SQL y secuencia2823 asserts conservadas. Root27/27 caracterización antes del gate019, globaltypes/límites PASS; wrappers host conectan grounding/autoridad/assets. En020 se extrajeron políticas editoriales y la consulta de adjuntos de citas al adaptador. Worker103/103; los19 casos nuevos están incluidos en la tanda root99/99. SQL y locks permanecen en sus fronteras originales.

Revisión independiente Dewey sobre018/020:60/60 source y45/45 caracterización contra snapshot017/019; 64 fuentes/pruebas estables, huella de56 consultas SQL idéntica. Sin hallazgos nuevos. También repitió6/6 del puerto Buffer y cerró su P3 Foundation. Esta revisión no cubre021 ni el nuevo runtime académico.

Root corrigió los stubs relativos de Study al nuevo nivel de carpeta. Un test de adapter además debía pasar el contexto estructurado aprobado en017, manteniendo prompt y todas sus aserciones:9/9 PASS. Se conserva el intento8/9 previo como error de fixture desactualizado, no se relajan validaciones.

TASK-018/020 DONE por sus cortes verificados. Empiezan012 (runtime agrupado, compatibilidad plana sólo en fixtures) y021 (un único protocolo neutral IA), con superficies disjuntas.

## Coordinación con frontend

El relevamiento de Mill encontró52 consumidores web del barrel global, además de consumidores backend y pruebas. La rama frontend visible es `codex/frontend-cohesion`; no se inspeccionaron sus datos ni conversaciones. Se consultó al usuario cómo repartir los imports compartidos; mientras se resuelve, el backend no modifica apps/web/shared-ui. Se prepara remap por símbolo de los248 exports/40 dueños neutrales. La entrada global debe conservarse mientras tenga consumidores frontend, sin declarar que ya fue retirada.

## Revisión independiente privada y controles de ejecución

Dewey cerró018/020:60/60 source propios,45/45 de caracterización contra snapshot anterior,64 fuentes estables y56 consultas SQL con huella idéntica. Sin hallazgos nuevos. El cierre P3 Buffer fue repetido por el revisor:6/6 PASS. Los snapshots y logs previos permanecen atribuidos a root; no se afirma aislamiento estricto.

Root detectó un riesgo del entorno sin limpieza: un JS viejo de `.build/api` podía seguir siendo importable después de retirar su fuente. Se agregó control explícito en el loader canónico para builds API/P33; los snapshots históricos deliberados tienen otro root. Test RED por función ausente y GREEN1/1, sin borrar artefactos ni omitir aserciones existentes. Este control protege la verificación de movimientos, no cambia el producto.

Revisión de aceptación estructural para012: se autorizó sustituir el assert `InvitationService.useExisting === ClassroomService` por selección exacta de la instancia de invitaciones del runtime agrupado, conservando identidad y pruebas de P4/sesión/worker. El diseño aprobado retira la fachada productiva; no se modifica la regla de invitación ni se debilita su aceptación. El fixture plano quedará sólo en infraestructura de pruebas y reutilizará composición real.

## TASK-012 y TASK-021 — Cierre de composición y protocolo IA

Runtime académico: producción usa `ACADEMIC_RUNTIME`, un Core y17 servicios agrupados. HTTP recibe ocho puertos; Foxy, Student AI y Activity AI reciben proyecciones mínimas. La fachada plana queda en `tests/helpers/academic-fixture.ts` y reutiliza la factory productiva. Se remapearon32 imports de fixtures y se revisaron tres comprobaciones estructurales para conservar identidad y wiring del nuevo diseño.

IA: cinco adaptadores usan `platform/ai/text-client.ts`; Estudio conserva su ejecutor neutral directo. Fingerprint, tickets, conteo y generación tienen un único dueño, con plazo continuo. La pausa de preflight es cancelable; una reserva SQL ya iniciada se drena. Las vistas SDK necesarias para clientes inyectados delegan al mismo protocolo; no construyen otro cliente ni otro juego de tickets. Compatibilidad automática sólo para SDK clásico sin `countForGeneration`; el SDK bound conserva preflight explícito. El último borde tuvo RED por falta de rechazo y GREEN con10 casos nuevos/63 totales.

Root generó Prisma y compiló API estricta a `.build/api`: PASS; volvió a compilar tras remap core y nombres: PASS. Verificación integrada focalizada de12 archivos:176/176 PASS, sin omitidas, con loader canónico. Incluye runtime/HTTP, P5 host, publicación IA, puertos, cliente neutral, SDK, transportes oficiales sintéticos, snapshots y compatibilidad del dominio. El test de snapshot grading conservaba dos claves de stub al barrel retirado: se remapearon al dueño, sin cambiar aserciones ni payload.

Revisión independiente Dewey:01290/90 source más dos probes register/integrated con identidad exacta de invitaciones;02164/64 source más probes de despacho simultáneo único y cancelación posterior al conteo. Presupuesto, admisión, snapshot y política conservan cuerpos respecto del snapshot `policies`, ignorando imports/CRLF. Huellas propias estables:012 `15e2b3eab07717c22d7df20fd75f842aa7ce64dfd63055653e8662773727e0a8`;021 `0fd926f077fc2298eb20cdd2f00883210f667119e0b8d0e07a589a9841a99659`. No ejecutó Nest real, DB, build global ni proveedores reales; root no atribuye esas verificaciones al revisor.

## TASK-022 y TASK-023 — Dueños, controles y documentación

Root remapeó155 declaraciones en142 archivos backend a los dueños de248 exports neutrales/40 archivos. No cambió reglas ni frontend. El guard prohíbe la entrada global desde cualquier fuente API, incluido bootstrap: RED por regla ausente y GREEN30/30. El barrel conserva52 consumidores web y sus pruebas explícitas de identidad. Su retiro completo queda coordinado con frontend, sin afirmar que ya ocurrió. Esta conservación responde a consumidores actuales y a la separación de ramas solicitada; no introduce otro puente ni duplica reglas.

Se renombraron seis archivos numerados de Membership a `membership-code-operations` y `membership-lifecycle-operations`, incluidos sus contratos y adaptadores; los consumidores se remapearon mecánicamente. Los contratos compartidos de módulo y el transporte común de Foxy permanecen por su responsabilidad explícita. No se crean capas vacías ni una clase por ruta.

Mapa reconciliado:487 fuentes productivas de base,368 reubicadas,128 altas y615 fuentes actuales; cada origen tiene destino existente. Conserva SHA original y SHA del candidato. Inventario673 entradas/57 exclusiones/23 rutas, sin pruebas retiradas; los tres negativos de tipos nuevos permanecen como compilación, no runtime. Arquitectura, guías, loaders e inventarios actualizados. `npm.cmd run lint:boundaries` PASS,0 excepciones; docs:184 archivos/1103 vínculos,0 problemas; TTP25 tareas válido.

La primera tanda global fast quedó845 PASS/1 FAIL por claves antiguas de stub de errores Identity en `agenda-client-http`, tras mover configuración y transporte. Se remapearon dos claves conservando todas las comprobaciones Origin/CSRF/permisos y se repite la tanda. Se corrigieron también finales de línea duplicados en la guía de Identidad y un blanco al final de composición; sin cambio semántico. La aceptación global sigue abierta hasta cerrar los runners aplicables y sus fallos.

## TASK-024 — Aceptación global en curso

El usuario confirmó explícitamente la conservación de compatibilidad y asignó al agente frontend la migración de sus imports. TASK-022 no incluye retirar esa entrada con consumidores vigentes.

Ruta fast completa:462 archivos,2802 pruebas,0 fallos/0 omitidas al reconciliar resultados por archivo. Se continuó desde los archivos pendientes y se repitieron sólo los fixtures afectados; no se excluyeron fallos para cerrar el conteo. Los intentos anteriores y sus errores quedan registrados. Correcciones adicionales: catálogo usa la factory y repositorio reales; invitaciones usa nombres y objeto de comando tipados; FileHost implementa authorizeReceive en su puerto; workflow issue2 apunta a nuevas rutas y conserva el rechazo al faltar cobertura sensible. Issue2:15/15 repetidas PASS. Los tres archivos finales corregidos tienen9/9 y pin/generador6/6 PASS.

El pin de `p9-positive-max-files.test.mjs` conserva el SHA esperado original. La única dirección cambiada se normaliza después de exigir conteo1; no se actualizó el SHA para aceptar contenido diferente. Dewey revisó esta adaptación por separado: hash normalizado exacto, generador intacto y cuatro negativos para ausencia/duplicación/otros bytes. Sin cambios en tamaños, payloads ni límites.

Runners no navegador:18 rutas completadas. Base:38/38 y smoke Prisma; backend:8/8. Deadline SMTP primero falló porque la instrumentación seguía sobre el wrapper Nest mientras el lifecycle usa el adapter SMTP: se remapeó el import al adapter, sin tocar condiciones/tiempos, y pasó con el runner aislado real. Identidad, outbox, registro/perfil, verificación, recuperación y cambios de contraseña completaron sus rutas con cleanup propio. Los conteos internos se conservan en logs; el wrapper reporta estado y no inventa una suma de casos.

Build web: el intento Turbopack rechazó la junction de dependencias que apuntaba fuera del worktree; el intento Webpack tampoco compiló TS externo al app. Se conservan ambos fallos de entorno. Se copió la instalación existente (sin instalar/cambiar versiones) a una carpeta física propia, se guardaron las junctions como artefactos ignorados y se activó esa copia en la raíz del worktree. La instalación original permanece intacta. El build normal Turbopack pasó, sin cambios de configuración ni fuentes frontend. Esta separación es de archivos, no un sandbox estricto.

Servicios: el runner público outbox descubrió una entrada faltante en su closure scratch: el nuevo contrato mail-delivery/application/ports.ts. Se agrega sólo ese input; siguen exigiéndose14 casos, sin paquetes locales, deadline y cleanup. DB/servicios/navegador continúan; no se marca aceptación global completa todavía.

### Resultados reconciliados de backend

- Fast completo:462 archivos/2802 PASS,0 FAIL/0 SKIP, con correspondencia por archivo y huella actual en el ledger ignorado; ningún archivo perdido al continuar tras errores.
- Owned DB completo:148 archivos/914 PASS,0 FAIL/0 SKIP. Primera tanda83 archivos verdes/541 casos antes de un import retirado del catálogo; los65 pendientes, incluido ese archivo, corrieron de2 en2 con recursos y nombres de owner independientes y concurrencia1 dentro de cada archivo. Se registró cada resultado real, incluidos tres fallos de fixtures, antes de corregirlos.
- Owned services completo:9 archivos/52 PASS,0 FAIL/0 SKIP al conciliar prefijo y continuación. Incluye S3/ClamAV reales propios, correo capturado y host P5; no proveedor IA real.
-19 rutas wrapper PASS:18 no navegador más P3 browser. El wrapper de P3 recompiló API y web y ejecutó10/10 casos reales de identidad/correo/sesión/recuperación/reinicio y responsive/foco. Los wrappers mantienen su reporte de estado; no se presenta una suma ficticia de sus conteos internos.
- API estricta, web normal Turbopack, lint/AST0 excepciones, inventario673/57/23, documentación y TTP pasan en el candidato registrado. Las fuentes web/shared-ui/diseño, Prisma y manifiestos de paquetes no tienen diff.

Correcciones DB de aceptación, revisadas independientemente por Dewey antes de aplicarlas: el catálogo de base ya devolvía studentCount a estudiantes, y otro test de base exigía ese campo; se corrigió la expectativa contradictoria a1, conservando producto. La bandeja usa NotificationInboxService desde la factory productiva y compara revisiones SQL reales antes/después; conserva121+, rollback, revocación concurrente, locks, presupuesto e idempotencia. Resultado conjunto6/6. Estudio ahora pasa el mismo contexto estructurado que serializa en el prompt a su adapter, manteniendo todos los asserts de schema, autorización, deduplicación y liquidación:4/4.

### Navegador y pendiente de coordinación frontend

Ego Lite, TaskSpace3 propio, finalizado sin conservar páginas: cuenta estudiante sintética registrada y verificada con correo capturado; login, guardado de borrador de Estudio, recarga y recuperación de nombre/materia/año:PASS. Dos errores del guion se corrigieron: esperar input type=email cuando el campo usa name=email y un texto de verificación ambiguo; no hubo cambio de producto. Fixture de API/web/PG/S3/ClamAV/correo cerrada con0 fallos de cleanup. IA estuvo deshabilitada.

Se ejecutaron11 archivos seleccionados de la ruta owned-browser, manteniendo33 fuera de esta selección proporcional. Cinco quedaron completos: P5 integrado, Plan (tras adaptar selector al botón actual), Biblioteca, Muro y Autoría. Plan conserva POST200, aviso, TAUGHT persistido y ausencia de control para estudiante; adaptación aprobada por Dewey y repetición1/1 PASS.

Quedan seis E2E activos con fallos y subcasos omitidos por sus prerequisitos; no se afirma PASS global ni se retiran de CI:

| Archivo | Evidencia y primer paso |
|---|---|
| tests/p7-questionnaire-integration.test.mjs | Espera Responder actividad; el overview vigente ofrece Empezar actividad. Conservar giro explícito, CAS y controles de guardado/transferencia. |
| tests/p8-grading-integration.test.mjs | La misma etiqueta de inicio está desactualizada en p8-current-ui-helpers; preserva comprobaciones de corrección privada y DTO seguro. |
| tests/p8-publication-integration.test.mjs | Mismo helper de inicio; no se da por ejecutada publicación cuando falló su prerequisito. |
| tests/p8-progress-integration.test.mjs | Espera estructura anterior de tres regiones. La UI vigente separa métricas, anillo, promedio y avance por unidad; requiere adaptar recorrido y selectores manteniendo las tres medidas. |
| tests/p9-home-integration.test.mjs | Saludo y expectativas de carga anteriores; timeout del guion y respuesta429 observada. Reconciliar con Inicio vigente y admisión real. |
| tests/p7-practical-integration.test.mjs | La fase de quitar adjunto no emite POST; se observan GET session200 y429 y luego timeout del observador. El mismo fallo se reprodujo con el snapshot backend temprano anterior a la reorganización académica/IA. |

Caracterización de TP: se usó `.build/backend-capabilities/plan`, construido al inicio tras mover únicamente Plan sin alterar su comportamiento, con loader efímero que resuelve rutas nuevas a sus ubicaciones originales. No es un checkout base recién recompilado; la evidencia se limita a ese snapshot registrado. Ambos candidatos conservan los dos primeros subcasos PASS y presentan idéntica secuencia sin POST de retirada, GET200/429 y timeout; cleanup0 en ambos. Se retiró la instrumentación temporal del test después de conservar logs. No se cambian cuotas ni se imputa ese fallo a una consulta SQL no enviada.

Dewey verificó el handoff por fuente y27 pruebas sintéticas, sin DB/E2E propio: Empezar actividad aplica sólo a cuestionarios nuevos; Continuar borrador y Preparar entrega se conservan. Progreso debe esperar por scope classroom/self/member y usar sus métricas actuales. La reentrega propia se comprueba en DTO y tarjeta de Actividades, porque el registro de actividades del progreso pertenece a member. Conservar negativos403, privacidad, hashes sin escritura, responsive, recarga/reinicio y revocación. Handoff E2E:NOT_VERIFIED hasta implementación y ejecución.

Se consultó al usuario quién adapta estos seis recorridos, recomendando el agente frontend para respetar el refactor concurrente. El backend queda implementado y con sus rutas de prueba completas en verde; la aceptación global de aplicación permanece pendiente de esa coordinación. No hay commits, integración, push ni despliegue del refactor.

### Ampliación E2E autorizada

El usuario resolvió: «Adaptá también esos E2E en la rama backend, sin cambiar la UI». TASK-026–028 implementan esa ampliación con tres superficies disjuntas: Kepler cuestionarios/helper/corrección/publicación, Carver Progreso/Inicio y root entrega práctica. Se preservan fuentes frontend, contratos, cuotas y todos los invariantes de los casos. TASK-024 espera sus dependencias; el trabajo continúa y no se declara aceptación global.

Root revisó el ajuste visual de Inicio solicitado por Carver: las tarjetas actuales muestran avance público del plan en ambos roles; comprobar valor exacto por aula y privacidad sustituye la ausencia de progressbars obsoleta. El destino vigente es tarjeta→Plan→selección explícita del próximo tema, manteniendo DTO/autoridad/id. Consultas conserva conteos y post mediante Pendientes docentes. Ausencia de tarjetas durante error/loading se comprueba sobre elementos actuales, sin asserts vacuos de regiones retiradas. Kepler obtuvo RED15/2→GREEN17/17 al actualizar etiqueta del helper y mock, conservando gesto único y admisión.

### Entrega práctica verificada y revisión de recuperaciones

Root completó `e2e028-practical-04.log`:5/5 PASS,0 FAIL/0 SKIP,cleanup0. La tercera fase recibió CSRF429 real con Retry-After51s antes de emitir retirada; se exigió ausencia de POST, error visible del editor y botón habilitado tras la espera real. El observador se dispone y rearma para cada gesto y se comprueba una única mutación. La lectura posterior sólo se recupera ante429 real. Se conserva transferencia durante scanner pausado, CAS, privacidad y restricción después de entregar.

El recibo actual es Comprobante/Entrega confirmada. Revisión docente usa Ver entregas→Revisar entrega · Intento1 y exige GETgrading200 del mismo intento, exactamente el adjunto reemplazado, grade.id/finalGrade nulos e isPublished falso. Descarga y hash, adjunto retirado403, retirada tras entrega409, ausencia de tokens y countSQLdecalificaciones0 después de visitar continúan activos. Dewey revisó esta correspondencia por fuente. Su intento de E2E independiente fue rechazado al crear el log solicitado por UnauthorizedAccessException antes de Node; no hubo runner ni recursos, ni un PASS propio. No se reintentó por otra ruta. La revisión independiente se limita a fuente y pruebas sintéticas propias; no se afirma aislamiento estricto.

Kepler había completado helper17/17, cuestionarios8/8, corrección5/5 y publicación5/5 sin fallos/omisiones. Dewey encontró luego una debilidad real del guion: una respuesta429 de GETsecundario podía habilitar reintento después de un error de selector ajeno. Lo reprodujo ejecutando la función extraída sin modificarla, con visits2 y delay1000. TASK-026 permanece IN_PROGRESS; se exige path/fase de lectura pertinente y error UI correspondiente, fallando ante desconocidos, y repetir los E2E afectados. El backend productivo permanece congelado.

Progreso completó7/7 sin omitidas. Inicio sigue abierto: se preservan intentos fallidos, correcciones de selectores según fuente y subcasos pendientes. Root autorizó calcular geometría de contenido renderizado con naturalWidth/Height, object-fit y object-position comprobados, conservando verificaciones de caja, texto legible, foco, overflow y tamaños. No se modificó UI ni se agregó tolerancia arbitraria para ocultar el fallo.

La revisión adicional encontró otro borde de fase en la admisión de TP: un requestCSRF anterior cuya respuesta429 llegaba tarde podía satisfacer el observer. Dewey lo reprodujo con el predicado real y watchResponse, sin red/escritura. Root agregó un WeakSet nuevo por gesto para admitir sólo requestsCSRFGET/removePOST iniciados en esa fase; el helper y sus reglas de RATE_LIMITED/Retry-After/errorUI permanecen intactos. TASK-028 vuelve a VERIFYING y la repetición05 corre sobre el candidato actualizado. Se pidió el mismo control de método, fase, path, código y header estricto para todas las recuperaciones nuevas de Inicio.

TASK-028 cierra después de la repetición05: exit0,5/5 PASS,0 FAIL/0 SKIP,111293ms,cleanup0. La esperaCSRF fue51s reales, sin POST antes de admisión. Dewey ejecutó el negativo actualizado con captureRequest/predicado extraídos y watchResponse real: oldEligible=false,newEligible=true,acceptedNew=true; SHAestable `19705f1134408c2d6f9f2f59dd4d6d75dcb1bf1edcb0ba8136b523ccad0afe2a`. Esta evidencia independiente es sintética; la ejecución completa pertenece a root.

Guard026 corregido por Kepler: paths y fases exactos, request nuevo, TimeoutError de navegación, aviso UI del dueño y destino esperado aún ausente antes de autorizar un único retry. Cinco casos nuevos en el archivo unitario existente llevan helper17→22; no hay alta de archivo runtime. Dewey reprodujo por su cuenta unrelated429,auth429sinUI y429tardío de faseprevia:1visita,0delays,rechazo; positivoauthactual+UI+expectedausente:2visitas,1delay1000,éxito. Listeners limpios en todos; huellaP7estable `1ea24c91fd64c7808dab1745d19843dba6266bb2eb2ed57bc943efd3a0478373`. Corrección y publicación tienen cerco equivalente revisado por fuente. Repetición de los tres E2E en curso; las corridas previas verdes no sustituyen esta aceptación actual.

Inicio: root inspeccionó la captura375 y confirmó texto legible separado del zorro; Range incluye espacio de ascenso sin tinta. El ajuste conserva X completo de cadaRange y usa cota vertical de glifos del summary fijo actual, fonts.ready/font exacta y guard que exige fontBBoxsum igual a Rangealto con epsilon1e-6 de representación. Conserva todos los controles de caja, h1/time/botones/foco/overflow; no usa margen de diseño arbitrario. Dewey retiró la objeción para esas frases españolas fijas; no se generaliza esta medición a textos/scripts arbitrarios. El runner07 registra requested/effective y métricas para cotejo posterior. La UI sigue intacta.

Runner07 conservó8 PASS/2 FAIL/3 SKIP: mapeo de fuente exacto demostrado (Range20=ascent15+descent5), pero summary tinta y218.046875 coincide0.953125px con rect de imagen hasta219. El asset contiene25píxeles alpha1/255 en la última fila de esa intersección; no se ignora alpha con un umbral ni se agrega margen. Ese resultado demuestra que exigir disjunción geométrica completa del summary no describe el diseño móvil actual.

Root reconcilió ese criterio con fuente y captura actuales: `parity-home.css`42 define hero relative/isolation:isolate,43 copyrelativez2 y56 illustrationabsolutez1/pointer-eventsnone; ambos son hijos directos del hero en Home.tsx45–49 y la decoración es aria-hidden. El foxchildz2 queda encerrado bajo copyz2, con texto opaco #594333/#335540. Dewey verificó esa jerarquía por su cuenta. Se autoriza sólo para summary que intersecte comprobar texto completo/visible y foreground real en ese contexto; h1/time/controles, cajas, recorte, foco y overflow conservan sus controles geométricos. Desktop sigue usando disjunción. No se afirma que summary e imagen no se crucen, ni se modifica producto para cumplir el test retirado. Se retira la medición de tinta si deja de aportar al guion; capturas y fallos previos permanecen como evidencia.

TASK-026 DONE: runner conjunto actual read-guard-e2es-01 exit0,18/18 sin omitidas,463133ms; sus subárboles P7(8) y corrección(5) son los vigentes. Tras ese runner, publicación cambió sólo sus tres capturas a watchActionResponse existente con dispose previo, para excluir requests anteriores; repetición publication-phase-final exit0,5/5,177344ms,cleanup0. Destino history429/53s real, aviso UI, mismo resultado e intento y ningún POSTopen repetido. Huellas finales y comandos quedan en el registro propio de Kepler.

La aceptación unitaria final es23/23 (seis casos nuevos frente17), repetida por root en final-ui-helper.log y por Dewey independientemente; helper de implementación conserva SHA64177151d2113204959c10235066b5cf9908dead7e37ab2f8b89789ff67a377c, testSHA06d8c38831ed9ef4e038879ea3968aff92ded4e8a85925d67841d3109a6102fe. El ledger fast actualiza sólo ese archivo y suma2808/462 sin fallos/omitidas; los demás resultados no se vuelven a atribuir a ejecuciones nuevas. Dewey cerró todos sus hallazgos026 por fuente/probes/23unitarias propias; E2E reales atribuidos a Kepler. Diez archivos/62 casos browser seleccionados completos; Inicio es el único pendiente de adaptación/verificación.

### Seis E2E adaptados: cierre funcional local

TASK-027 DONE: Home09 exit0,13/13 PASS,0 FAIL/0 SKIP,175509ms,cleanup0. Las seis geometrías por rol/ancho, drawer/centro/Escape/foco, wizard privado y Shift+Tab, login/revocación y cuenta responsive se ejecutaron completos. El ajuste final reduced-motion exige exactamente0.00001s (.01ms de parity-foundation.css77/folders-shell.css75), mediareduce verdadera y scrollBehaviorauto; root y Dewey confirmaron fuente. No se sustituyó por un rango ni se cambió CSS. Progreso conserva7/7 sobre fuente congelada desde su corrida individual y el subárbol completo capturado en combinado03.

Se reconciliaron los11 archivos browser seleccionados:75 PASS,0 FAIL/0 SKIP. No se suman dos veces repeticiones ni subárboles; se registra resultado final por archivo, conSHA de fuente y log, en browser-final-ledger.json ignorado. Los33 archivos browser no seleccionados siguen en inventario/CI y fuera de esta verificación proporcional; no se afirma ruta completa de44. La evidencia P3browser10 y el recorrido EgoEstudio permanecen separados, sin sumar wrappers como casos ficticios.

Verificador final: rama/HEAD esperados,615 fuentes API idénticas al manifiesto del candidato compilado,134 tests movidos/37runtime nuevos,248 dueños, ledgersfast462/2808 yDB148/914 ybrowser11/75 con SHA actual:PASS. UI, Prisma y manifiestos sin diff ni altas. La comprobación inicial de docs/design detectó un diff: son exclusivamente cuatro referencias a archivos backend reubicados en classroom-teacher-redesign.md; al normalizar sólo esos cuatro links, coincide exactamente con base. Se ajustó la comprobación para distinguir referencias documentales de cambio de diseño, sin ignorar otros bytes. Mapa y documentos se cierran bajo TASK-024; ocho fuentes E2E/helper exportadas con base verificada y huellas finales para el dictamen independiente.

### TASK-024 — Cierre del alcance autorizado

Dictamen independiente final de Dewey:VERIFIED para fuente y pruebas sintéticas, sin hallazgos bloqueantes pendientes. Cotejó8/8 originalesBASE y8/8 actuales contra metadata final; final.diff156643bytes,SHAe283e661535909807711728b717a536044c247e110ef440f29ec9b0af0d1d882. Repitió23/23 unitarias con huellas estables y probes de requests/fase/path/UI/header/listeners. Comparación AST no retira ninguna aserción de Grading/Publicación; los otros reemplazos corresponden a mappings de UI/recibos/medidas y aceptación de stacking/reduced-motion ya explicitados. E2E reales son evidencia de root/Kepler/Carver; el intento real del revisor bloqueado antes deNode permanece NOT_RUN, sin atribuir independencia funcional ni aislamiento estricto.

Gates finales del candidato congelado: docs186 archivos/1106 vínculos/0problemas, diff-check, validadorTTP28 y verificador de huellas/ledgers/superficies protegidas:PASS. Lint/boundaries0 excepciones e inventario673/57/23 tambiénPASS. API615 fuentes no cambió desde buildsAPI/web y suites completas. Resultados reconciliados vigentes:fast462/2808,DB148/914,servicios9/52,browserseleccionado11/75, todos0FAIL/0SKIP;19 rutas wrapperPASS, incluyendoP3browser10 separado. ManualEgoEstudioPASS; fixtures propios reportan cleanup0.

TASK-024 DONE y28 tareas completas para este refactor. La aceptación es local y proporcional al alcance:33 browser no seleccionados, proveedores reales y producción/datos retenidos fuera de verificación. No se afirma publicación ni despliegue. Las fuentes UI y esquema/dependencias permanecen sin cambios; la entrada global conserva compatibilidad mientras frontend migra sus imports por decisión del usuario. Rama codex/backend-capabilities yHEADdd6f4bc92b959cce0e2c68343291614270c4a17e, cambios sin commits, push, PR o merge. No hay trabajo autorizado pendiente de implementación/verificación; una eventual entregaGit conserva su autorización específica.

