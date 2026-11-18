# Mis aulas: maqueta integral y frontend

- Agente: root; identidad runtime no registrada, sin escrituras Engram.
- Fecha: 2026-11-11. Base: main, 3895f4ded6884641872c5950c39c54215406d6d6.
- Worktree propio: FoxMind-classrooms-ux; rama codex/classrooms-ux-unification.
- Autorización: revisar/pulir maqueta docente/estudiante y luego implementar frontend; worktree separado, merge condicionado a validación posterior. Sin push, commit, merge o deploy solicitado en esta ejecución.
- Fuentes: diseño aprobado y maqueta, guías de aula/participación/grading y AGENTS. Se conserva el stack y contratos; cambios backend/modelo/proveedor no se infieren desde una maqueta.
- Alcance/evidencia persistente: `odd/tasks/classrooms-ux-unification.md`.

## Inicio

Árbol original contenía documentación/maqueta no confirmadas. Se copiaron sólo esos 12 archivos al worktree nuevo; no se movieron ni borraron archivos originales, secretos o configuración. Existen otros worktrees ajenos y no se operó sobre ellos. `npm ci --no-audit --no-fund`: 491 paquetes; npm bloqueó scripts de cuatro dependencias según configuración local, sin cambiar esa política.

Delegación de lectura: map_classroom_frontend (chuli_explorer) cubre aulas/contenidos; map_activity_frontend (chuli_explorer) cubre autoría/participación/grading. No escriben archivos; evidencias a reconciliar por root. Skills: harness-specification, harness-tdd-qa, harness-ux-ui y ego-browser; contratos mínimos de delegación. No se atribuye verificación a una promesa del agente.

## Resultado del candidato

El usuario amplió explícitamente el alcance a backend de códigos e invitaciones. Se completaron la auditoría de maqueta y la implementación en el worktree separado. No se creó commit ni se hizo push, merge o deploy; main conserva el commit base.

- UI compartida docente/estudiante: catálogo, filtros, navegación, creación con archivo en paso 2 y revisión completa de unidades/temas, Plan con filtros y deshacer, Muro y Biblioteca con estados de carga/error y recuperación de foco.
- Autoría manual/IA con editor y revisión comunes; consignas y rúbrica claras. Participación conserva borradores entre pestañas y separa seleccionar, cargar y entregar; confirmación final y recibo explícitos para TP y cuestionarios.
- Corrección privada con rúbrica, puntos, nota, asistencia IA y revisión antes de publicar. Devolución compartida con fortalezas, mejoras y próximo paso, conservando comentarios anteriores y el contrato de servidor.
- Código numérico de seis dígitos, ceros iniciales, sin vencimiento automático; rotación explícita y compatibilidad con códigos anteriores. Lotes de hasta 50 destinatarios con resultado individual, pausa, idempotencia y recuperación sin reenvíos duplicados.

La revisión independiente detectó y permitió corregir el proxy que rechazaba arrays, el recibo ausente, las cuotas compartidas del lote y variantes de recuperación. Root corrigió además el parseo/validación de destinatarios con el mismo validador del servidor y probó el caso 503 seguido de 404. La última regresión integrada detectó publicación habilitada durante el escaneo de Biblioteca: fue corregida conservando la prueba de aceptación.

Registros de superficies: [contenidos](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/blob/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/work-log/2026-11-11-content-ui.md), [actividades](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/blob/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/work-log/2026-11-11-activities-ui.md), [corrección](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/blob/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/work-log/2026-11-11-grading-ui.md), [códigos y lotes](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/blob/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/work-log/2026-11-11-codes-batch.md). Root reconcilió sus resultados con la regresión integrada y las evidencias visuales.

## Evidencia

- `npm run web:build`, build API, TypeScript web y `npm run lint:boundaries`: PASS.
- Regresión final de frontend, 32 archivos: 157/157, sin skips. Log local `.test-artifacts/classrooms-ux/frontend-regression-final.log`.
- `node scripts/run-ci-suite.mjs --suite transport`: 79/79.
- Suite pure: 178 pruebas pasaron antes de que Agenda no pudiera inspeccionar su base Docker. Las restantes se ejecutaron por separado: 99/99. La suite completa no se declara verde.
- Backend con PostgreSQL 17 aislado: P5 39/39 y P7/P8 SQL/HTTP 45/45; inventario de migraciones 6/6. Revisión independiente P5 6/6, más ejercicio HTTP con sesiones sintéticas, CSRF, permisos negativos, 32 cuentas con socket compartido, límite por cuenta y repetición de lote archivado sin duplicar outbox.
- `node scripts/run-complete-suite.mjs --check`: 538 pruebas, 23 rutas explícitas; inventario CI: 538 entradas y 53 exclusiones. Las pruebas nuevas tienen ruta asignada.
- Ego Lite TaskSpace 10: maqueta completa y componentes reales con adaptadores sintéticos, docente/estudiante, escritorio y 375/390 px, teclado, foco y movimiento reducido. Se corrigieron espacios vacíos del catálogo móvil, selectores CSS heredados, controles solapados de IA, tipografía y vista previa de devolución.
- [17 capturas catalogadas](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/blob/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/design/current/README.md), con origen, dimensiones y límites. [Recibo del candidato](../verification/classrooms-ux-unification.json) identifica 89 archivos de código/pruebas mediante SHA-256. Una captura acredita sólo la UI visible; permisos y persistencia tienen evidencia separada.
- `git -c core.safecrlf=false diff --check`, validador TTP y `npm run docs:check`: PASS al cierre.

## Límites y continuidad

Docker no estuvo disponible: falta E2E completo con S3, ClamAV y Mailpit. Las pruebas SQL usaron únicamente clústeres PostgreSQL propios, ya detenidos. No se llamó Gemini, no se enviaron correos reales ni se copiaron secretos o `.env`; no se operó sobre datos retenidos o producción.

Los límites por cuenta y socket se probaron localmente. No se implementó ni certificó detección distribuida de enumeración; el límite general por socket todavía afecta admisiones estudiantiles detrás del proxy. La carga de múltiples aulas y la observabilidad operativa necesitan validación antes de producción.

La revisión automática rechazó borrar `.test-artifacts/task-006/pg-zKjQ46`. El clúster está detenido y la carpeta permanece ignorada por Git; no se intentó evadir el rechazo.

Se deja el servidor de revisión propio en `http://127.0.0.1:53210`: `/classroom?mode=interactive` (docente), `/classroom?mode=student` (estudiante), `/wizard?mode=prepared` (creación) y `/activity-qa?mode=practical` o `questionnaire` (entregas sintéticas). Son componentes del frontend con datos de prueba, no una instancia integrada a servicios reales. El adaptador extra de actividades es efímero y está en `.test-artifacts`.

Primer paso pendiente: revisión humana de UI y flujos sobre el candidato; resolver observaciones antes de autorizar integración a main. El worktree original y los recursos ajenos se conservaron. La aceptación local de las seis tareas no implica publicación ni elimina los límites de integración indicados.

## Continuación: aplicación completa y Docker

2026-11-11: el usuario solicita iniciar la app completa desde este worktree y completar las pruebas pendientes con Docker antes de integrar. TASK-005 vuelve a VERIFYING. Docker estaba apagado; se inicia Docker Desktop. El worktree no contiene `.env`; se prepara un entorno propio reutilizando únicamente la configuración Gemini autorizada de la raíz original, sin trasladar conexiones a recursos retenidos. La configuración privada y cuentas quedan ignoradas; las suites automatizadas mantienen proveedores sintéticos. Sin autorización nueva de merge o publicación.

`npm run local:up` creó infraestructura propia `foxmind-local-73f294d0e80e5a05`. El primer arranque falló porque la selección de variables AI omitía `FOXY_PRIVATE_ASSET_QUOTA_BYTES`; se restauró esa cuota existente, sin cambiar claves o conexiones originales. Segundo arranque y posterior restart: READY, web 3000/API 3001, cuentas sintéticas en el archivo privado habitual. Gemini queda configurado para uso manual; el arranque y la verificación no realizaron generaciones.

Ego TaskSpace 11, aplicación completa: inicio de sesión de ambos roles; marcar tema docente, recargar y verificar persistencia; estudiante observa el mismo avance y no tiene checkbox docente; móvil 390 px sin overflow horizontal. Lote real con un integrante existente y otro destinatario sintético: resultados `already_member`/`created` visibles. Correo capturado sólo en Mailpit. Dos esperas del guion usaron rutas demasiado exactas (`/home` frente a `/inicio`, y logout con `next`); se corrigieron las esperas sin repetir escrituras. Otro selector de texto se resolvió mediante la referencia accesible actual del botón.

Pruebas de continuación: `run-ci-suite --suite pure` 278/278 sin skips; `agenda-recurrence`, `classroom-ai-migration` y `activity-review-regressions` 11/11 sobre Docker. P5 integrado 13/13 y correos internacionales 4/4. El primer P5 detectó que el texto auxiliar estaba dentro del label de Código del aula: se separó conservando `aria-describedby` y pasó el test original. La navegación de invitación se actualizó al diálogo múltiple y su recibo, manteniendo aserciones de correo, persistencia, permisos y reinicios. Los resultados restantes y la corrección de hitboxes de actividades se registran al terminar.

P6 Plan 1/1, Biblioteca 5/5 y Muro/navegación móvil 8/8; nuevo contrato de códigos/lotes 6/6 también con PostgreSQL Docker. Todos sin skips y con cleanup de recursos propios exitoso. La reconstrucción concurrente de Next durante el primer recorrido de Muro produjo un timeout de registro; se repitió completo sobre build fijo y pasó. Igual interferencia detectada en P7 practical/recovery se conserva en sus logs y exige repetición, no se atribuye al producto.

El verificador `docker_activity_verification` confirmó el solapamiento real de actividades: fila de 76 px, margin-top de acciones 52.766 px, botón extendido cuyo centro caía dentro de la fila siguiente. Root agregó altura automática, margen cero y botón mínimo de 44 px en el módulo de Actividades. El build fijo posterior es `dQwQUOz8X44ST7litETCl`; pruebas focales 29/29 y lint/boundaries PASS. El verificador adapta únicamente interacción de pruebas a la rúbrica plegada; no cambia aserciones de negocio. `docker_p7_recheck` repite P7 independientemente mientras el primero completa P8, ambos con recursos sintéticos disjuntos.

Durante la verificación, `main` avanzó por otro trabajo hasta `e35e1a3` (Inicio docente). No se incorporó ni modificó ese trabajo. El candidato sigue basado en `3895f4d`; antes de integrar deberán reconciliarse cambios y repetirse los controles afectados por esa integración.

## Cierre de la continuación

Las 21 corridas finales de integración suman **106/106 pruebas, cero fallos y cero skips**: P5 17, P6 14, P7 45, P8 30. Se verificaron aulas/códigos/invitaciones/correo capturado, Plan, Biblioteca, Muro, navegación móvil, autoría, entregas y transferencias, corrección privada/publicada, progreso, reinicios y revocación. `docs/verification/classrooms-ux-unification.json` enumera cada log y su SHA-256. Los registros rojos se conservaron; no se eliminaron comprobaciones de aceptación ni se forzaron clics para pasar los recorridos.

Los verificadores `docker_activity_verification` y `docker_p7_recheck` aportaron resultados disjuntos y evidencia de cleanup. Root cotejó los resúmenes de cada log con un agregador que rechaza fallos/skips o ausencia de conteos. PostgreSQL/S3/ClamAV/Mailpit fueron reales y propios; las cuentas y proveedores automatizados, sintéticos. Los fixtures creados por las pruebas quedaron sin contenedores/redes/volúmenes propios. Los recursos locales persistentes y los retenidos anteriores se conservaron.

Además del ajuste de hitboxes, el cierre corrigió los textos de resultado según docente/estudiante (prueba focal RED por dirigirse al docente como alumno, luego GREEN) y el doble aviso durante publicación. El aviso del editor permanece hasta abrir la ficha; el aviso global sólo aparece cuando el editor se cierra. La espera E2E se acotó al aviso persistente para continuar después de la transición. Ajustes de pruebas: abrir rúbrica plegada, esperar el mensaje de validación actual y entrar a Compañeros para salir del aula; mismos controles de permisos, persistencia y datos.

Build de la mayor parte de la integración: `dQwQUOz8X44ST7litETCl`. Build final: `3lPKN7ICF5X1reosoaMrq`, con el ajuste de textos por rol y aviso único. API/web y tipos compilaron; lint/boundaries pasó. Regresión focal final autoría/resultado: 25/25; autoría E2E final: 6/6 en el build final. La suite pure completa pasó 278/278; DB/migraciones/regresión 11/11 y códigos/lotes 6/6. Los avisos de futura deprecación de consultas concurrentes de pg provienen de fixtures existentes y no alteraron esos resultados.

`npm run local:restart` dejó la aplicación final READY en `http://127.0.0.1:3000`, API 3001. Cuenta docente abierta en Ego TaskSpace 11, finalizado conservando la pestaña para revisión; recargarla carga el último build. Las credenciales sintéticas permanecen únicamente en `.test-artifacts/local-app/accounts.json`. Gemini usa la configuración autorizada; no se hicieron generaciones ni envíos de correo externos durante la verificación. Se catalogaron dos capturas de la app completa, además de las 17 del primer corte.

Pendiente humano: validar la UI y decidir la integración. No hay commit/push/merge/deploy propio. La falta inicial de Docker ya quedó resuelta; subsisten únicamente los límites operativos de carga/monitoreo distribuido y la necesidad de reconciliar este candidato con el main posterior antes de integrar.

## Integración autorizada

2026-11-11: el usuario autoriza llevar los cambios a main y dejarla como única rama. Incluye commits, publicación y retiro de referencias integradas; no despliegue ni eliminación de datos o archivos de worktrees. `origin/main` y main coinciden inicialmente en `e35e1a3`. La rama antigua `redise_o_aula_docente` está limpia y no tiene commits exclusivos. El checkout de main conserva 12 archivos de la maqueta/documentación inicial; se preservarán antes de actualizarlo y se reconciliarán con el candidato.

Se organizan commits por comportamiento: códigos/lotes y persistencia; aulas/contenidos compartidos; actividades/entregas/devolución y referencia integral. Estos cortes exceden 400 líneas porque incluyen superficies compartidas y sus pruebas; no se eliminan controles ni se fragmentan artificialmente contratos que requieren cambios coordinados. La evidencia previa de 106 pruebas integradas se conserva; se repiten controles afectados por la integración con Inicio.

La implementación quedó en f5377e2 (códigos/lotes), a6d1d94 (aulas/contenidos) y f16538e (actividades/devolución). `git merge --no-commit main` incorporó e35e1a3; se resolvieron únicamente conflictos en docs/design/current/README.md, docs/documentation-map.json y docs/verification/flows.md conservando ambas mejoras. El trabajo inicial del checkout principal quedó preservado con `git stash push --include-untracked`, sin eliminarlo ni aplicar una versión anterior sobre la nueva maqueta.

Durante la integración, `run-complete-suite --check` detectó tres pruebas de Inicio registradas en inventario pero sin ruta. Se agregaron teacher-home-polish/home-order a fast y home-order-database a owned-db. Resultado GREEN: 541 pruebas, 53 exclusiones explícitas, 23 rutas. No se alteraron las pruebas. Se quitó también un salto vacío final de invitation-batches.ts detectado por `git diff --cached --check`; sin cambio de comportamiento.

Reconstrucción conjunta con `npm run local:restart`: READY, build jl-zWmKYFGo9EbZ71F-P3. Suite pure 292/292, PostgreSQL Docker home-order 1/1, lint/boundaries PASS, docs 117 archivos/1010 enlaces sin errores antes del cierre. Los controles se ejecutaron sobre el código combinado; E2E Inicio/autoría todavía en curso en este punto.

Verificación focal adicional: 27/27 pruebas de miniagenda, dashboard, disclosures y ejecutor CI. `git diff main --` sobre el módulo Home y teacher-home.css queda vacío: la integración conserva exactamente esa implementación. Rama antigua redise_o_aula_docente retirada con `git branch -d` tras comprobar árbol limpio y ausencia de commits exclusivos; su worktree quedó detached en 3895f4d, sin eliminar archivos.

Candidato combinado verificado: E2E P7 autoría/navegación 6/6 + P9 Inicio 13/13 = 19/19, cero fallos/skips; cleanup de procesos y servicios propios sin fallos. Incluye roles exclusivos, alta/ingreso/plan, Muro, permisos, archivo, recuperación offline, borrador, login/sesión revocada y responsive 320/375/1280. Logs finales y hashes registrados en el recibo. Se procede a integrar y publicar según autorización vigente.

## Integración y publicación comprobadas

Merge de reconciliación: `122daaa586aff558196a974e46071d40d0574c84`. Main actualizada mediante `git merge --ff-only codex/classrooms-ux-unification` y publicada con `git push origin main`. La implementación previa de Inicio conserva sus commits y código. Ambas ramas auxiliares se retiraron con `git branch -d`, sin forzar ni perder commits.

Comprobación posterior: `git rev-parse HEAD origin/main` y `git ls-remote --heads origin` coinciden en 122daaa. `git branch --list` y heads remotos contienen exclusivamente main. Original main limpio; tres worktrees auxiliares conservados detached, incluido el entorno ejecutable de Mis aulas. Stash de la maqueta inicial preservado. No se eliminaron directorios, datos, volúmenes, configuración privada ni credenciales.

Este cierre documental actualiza el estado recuperable después de la publicación comprobada. No modifica producto; se verifican docs, TTP y hashes antes de publicarlo. La app continúa READY en http://127.0.0.1:3000 desde el worktree conservado. Sin despliegue ni generaciones reales durante las pruebas. Las limitaciones de carga/monitoreo productivo permanecen explícitas en el recibo.

El cierre documental 69cfc1c se publicó después de 122daaa. Al ejecutar el verificador original de bytes desde el checkout principal, falló el hash de academic-composition.ts: core.autocrlf=true convirtió los saltos mixtos del worktree a CRLF. Se comprobó para los 91 archivos que el contenido normalizado coincide entre el worktree ensayado, main y el blob Git; las 19 imágenes/metadatos también coinciden. No hubo cambio semántico ni productivo. El recibo conserva el hash original de los bytes ensayados y agrega gitBlobSha256, independiente de la conversión local. Este ajuste documental no requiere repetir pruebas de comportamiento.
