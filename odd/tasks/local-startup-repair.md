# Reparación del presupuesto de arranque local
Objetivo: presupuesto de compilación API90s sólo en arranque habitual local; helper general conserva30s. Rama codex/agenda-complete-polish, base0112a64c7f88822b1d86c4e98565cc64c435f76d.
Entrega: unidad separada de entorno, auto-chain/main ya autorizado para Agenda; runner Node sintético + verificación independiente; aceptación real sólo tras reparar controles.

## Specs

- S1: «Si» — respuesta a «¿autorizás reparar el arranque local como tarea separada para destrabar esa verificación?».
- S2: «Si» — respuesta a «¿Autorizás ese cambio de presupuesto local?», cuya propuesta exacta fue «90 segundos de compilación sólo en el arranque local, manteniendo los 30 segundos por defecto del helper y todos los controles actuales».

## Tasks

- R1 | S1-S2 | DONE | ruta: corrección acotada del writer | reloj callable/lecturas finitas validadas en cada lectura; RED2fallos→GREEN19/19, parent2focalesPASS; commit: pendiente.
- R2 | S1-S2 | DONE | ruta: mismo verificador independiente, recheck focalizado | bloqueo cerrado;2tests/48probesPASS,12fallos originales rechazados,30/90 compartidos preservados; commit: pendiente.
- R3 | S1-S2 | DONE | ruta: coordinador | local:restart job-3exit0/36s, API/webready3000/3001, compilación y arranque reales con90s autorizado; AgendaQA retomado; commit: pendiente.

## Log

L1 — Pedido humano original de esta reparación: «Si», ante la pregunta de reparar arranque por separado. El trabajo de Agenda está implementado y pasa32pruebas UI/tipos/lint/docs; no aceptado en navegador ni publicado.

L2 — Decisión numérica vigente: propuesta del coordinador «90 segundos de compilación sólo en el arranque local, manteniendo los 30 segundos por defecto del helper y todos los controles actuales»; pregunta «¿Autorizás ese cambio de presupuesto local?»; humano «Si». Se autoriza implementación de este opt-in; no cambia retrospectivamente el resultado de intentos agotados ni concede aumentos adicionales.

L3 — Evidencia previa preservada: local:restart exit1/58s con diagnóstico descartado por wrapper; compilación directa con helper sin modificar exit1/30s, Prisma9216ms exit0 y TypeScript20841ms SIGTERM/ETIMEDOUT. Dos exploraciones de sólo lectura confirmaron deadline30s compartido y ninguna optimización segura demostrada: API tsconfig no incluye web/tests accidentalmente, generar+compilar en cada invocación es contrato probado. Todos los hijos previos completos/cancelados, sin estado incierto antes de nueva implementación.

L4 — Invariantes de alcance: conservar helper general30s, generar Prisma y compilar TypeScript estricto siempre, secuencia y deadline único de cada invocación, fallo/timeout impide etapas siguientes. Presupuesto90s exclusivamente al llamador de arranque local, con margen de wrapper justificado sin ampliar trabajo del build. No caché persistente/reuso, omisión de etapa, debilitamiento de tipos, migración de datos, cambios de dependencias, secretos o acceso a proveedor. No cambiar el código UI pendiente de Agenda ni video social ajeno. El arranque real y migraciones propias siguen sólo a cargo del coordinador bajo guía vigente, nunca del writer/verificador.

L5 — Superficies previstas: scripts/build-api.mjs, scripts/local-app.mjs, posible pequeño adaptador local/testable, tests/api-build-pipeline.test.mjs y pruebas locales sintéticas, docs/engineering/local-development/README.md y registros propios. No edición de tsconfig, package/lock, .env, cuentas, volúmenes o configuración privada. Riesgo item5: cambia orquestación de entorno; revisión/verificación independiente requerida. Pronóstico150–300líneas de código/pruebas/doc, unidad revisable separada; sin PR ni despliegue.

L6 — Writer mwe49jr8-7-lq60 implementó buildApi budgetMs/now inyectables (default30000), adaptador local-api-build con90000 fijo, wrapper95000 y opt-in sólo para llamada API de local-app. Prisma→TypeScript conserva orden/deadline único; agotamiento antes de etapa impide ejecutar. Pruebas sintéticas17/17 (RED12PASS/5FAIL inicial), docs137archivos/835enlaces y diff PASS. Sin compilador/servicios reales. Parent leyó ambos scripts/diff local-app y repitió17/17 PASS en19.7s,0skip. ASSESS con escalate item5 declaró high y verificador independiente obligatorio; evaluación nativa base sigue no evaluable por untracked, no veredicto de review. R2 ahora verifica sólo este diff; no copias grandes de repo/node_modules ni nuevos builds reales antes de comprobar la reparación.

L7 — Verificador independiente mwe4hn36-8-jwox: S1 satisfecho; S2 bloqueado sólo por nuevo reloj inyectable. Suite17/17PASS en9.97s, probes55PASS/12FAIL, baseline/candidate reprodujo now string concatenando y ampliando timeout (general100029000ms,local100089000ms); NaN/infinitos/undefined/null tampoco rechazados. Riesgo candidato, no fallo previo. R1 reabierto; una corrección acotada mwe4ntrp-9-ih0r validará forma callable y lecturas numéricas finitas antes de aritmética y de cada etapa, con pruebaRED/GREEN; ningún cambio de límites ni nuevos builds reales. Después sólo recheck independiente de ese bloqueo, no nuevo barrido. Verificador dejó scratch mínimo propio con evidencia; no copias grandes ni repo mutado. Servicios/compiladores/proveedores no ejecutados.

L8 — Tanda acotada mwe4ntrp-9-ih0r: helper valida callable y cada valor typeof number/Number.isFinite antes de aritmética/runner; nuevas pruebas iniciales/intermedias/tardías en amboshelpers. RED2fallos esperados; GREEN19/19exit0/8.87s; parent repitió2focalesPASS (91ms) y diff PASS. Presupuestos/CLI/etapas/streams originales intactos. ASSESS high(item5) sigue exigiendoverificador, nativo no evaluable por untracked. R2 retoma sólo el bloqueo reportado, no auditoría nueva. No se ejecutó compilación ni arranque real.

L9 — Recheck independiente mwe4sm9t-a-dqee cerró el bloqueo original:2/2tests y48probesPASS,12fallos previos ahora rechazan TypeError, streams/cero llamadas antes de generar y no compilación tras lectura inválida tardía. Preservados30000→29983ms y90000→89983ms en casos válidos. Sin nuevo barrido/servicios/compiladores; estado repo intacto. R2 completo. Parent inició aceptación real R3 mediante npm run local:restart job-3 usando la reparación ya verificada y el presupuesto90s expresamente aprobado. Resultado aún pendiente; respeta90s interno/95s wrapper y180s web, sin aumento adicional ni reintento automático si falla.

L10 — Aceptación real job-3exit0 tras36s: helper local arrancó recursos propios, migraciones existentes, API/web compiladas y estadoREADY con origin127.0.0.1:3000/API3001. Sin generacionesIA. El resultado no borra los dos fallos previos ni amplía futuros presupuestos. R3 completo y AgendaQA real retomado mediante mwe4y7jn-b-4y8r; publicación aún pendiente de sus pruebas. Riesgo item5 verificado independientemente; evaluación nativa previa no produjo veredicto por untracked.
