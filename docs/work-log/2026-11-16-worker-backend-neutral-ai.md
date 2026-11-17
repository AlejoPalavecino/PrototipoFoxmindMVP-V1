# TASK-021 — protocolo textual neutral

- Agente: /root/backend_identity_capabilities, chuli_worker; fecha 2026-11-16.
- Rama/worktree: codex/backend-capabilities, C:/Users/alejo/.codex/worktrees/069c/ProtipoFoxMind.
- Autorizacion: TASK-021 IN_PROGRESS tras gates 008/011/018/020; plataforma IA y providers de seis capacidades. Runtime academico concurrente fuera de ownership preservado.
- Alcance: un duenio neutral del preflight/fingerprint/ticket/plazo y despacho, manteniendo seis perfiles/snapshots/presupuesto y shim SDK necesario para aceptacion. Sin DB/red/proveedores/secretos/schema/defaults/cuotas/commits ni build global concurrente.
- Baseline: .build/backend-capabilities/policies provisto por root, sin modificar.
- Estado inicial: cinco adapters duplican tickets/fingerprint/deadline sobre un bridge SDK que vuelve a ejecutar el protocolo neutral; Study ya usa executeAiText directamente. Se reemplazara esa superposicion por preflight neutral suspendido entre conteo y despacho, con executeAiText como unico ciclo de ejecucion.

## Implementacion y duenio del protocolo

- Nuevo platform/ai/text-client.ts: AiTextCall/AiTextClient, identidad length-framed de perfil/system/schema/mensajes/bytes, ticket por identidad del input y control de consumo. No vuelve a contar ni reinicia plazo al generar: conserva abierto el MISMO executeAiText desde count hasta dispatch. Los tickets expirados/cancelados se reemplazan por un estado terminal ligero, sin retener la solicitud completa.
- text-execution.ts sigue siendo el unico ejecutor de authorize→count→reserve→authorize→dispatch→generate→authorize. Se agrega un hook preflight opcional e interruptible ANTES de la reserva real. La pausa sin trabajo SQL no mantiene vivo el proceso; cancelacion/vencimiento rechazan y liberan la espera. La reserva real conserva su await drenado, sin carrera contra liquidacion. No se modifican SQL, precios, politica ni snapshot persistente.
- profile-client.ts solo selecciona/cachea configuracion y transporte desde el snapshot. getNeutralAiTextClient es la entrada productiva. getAiTextClient y countForExecution permanecen como compatibilidad; ya no poseen bridge/tickets/temporizadores propios.
- sdk-text-compat.ts conserva los serializers estrictos del API SDK previo, traduce respuestas/usage y entrega vistas SDK al MISMO cliente neutral. Sus WeakMaps son caches de vistas/bindings, no otro protocolo de preflight. Las vistas no crean SDK extra ni cambian proveedor/modelo/perfil. Los serializers oficiales Gemini/Anthropic quedan intactos.

## Consumidores

1. curriculum/generation/providers: construye AiTextRequest de documento+instruccion+schema; parsea resultado neutral. Key conserva la identidad del documento que usaba el contrato previo.
2. activities/generation/providers: prompt produce mensajes/partes neutrales; activityContents conserva serializer SDK para consumidores de aceptacion. No WeakMap/fingerprint/deadline propios.
3. grading/student-analysis/provider: evidencia y schema neutrales; respuesta/usage normalizados. Snapshot y presupuesto del worker no se editaron.
4. grading/assistance/provider: evidencia cerrada y PDF canonico siguen validados; solicitud neutral y parser de propuesta vigente. Se agrega createGradingAiProvider para construccion pinneada. Root adapto las dos construcciones de academic-classrooms.module fuera de mi ownership.
5. foxy/turns/providers: conserva validacion/contexto/sufijo de historial real y parser de referencias, con mensajes neutrales. Un sufijo seleccionado consume exactamente su ticket previo, sin recount.
6. Study ya usaba executeAiText con AiTextRequest y transporte neutral: se conserva su via directa. No invento una migracion adicional ni altero su admision/reserva/liquidacion. Los seis consumidores convergen en el mismo ejecutor neutral.

Los constructores/factories historicos conservan nombres. Aceptacion ai-sdk-clients inspecciona extraction.client, activity.options.client, student.client y foxy.options.client y exige countForGeneration. Se conservaron como vistas SDK delegadas, con aprobacion explicita del coordinador, mientras el flujo productivo usa execution.count/generate. Son deuda de aceptacion/compatibilidad, sin protocolo paralelo. El autoconteo historico de fixtures Plan/Activities/Foxy vive exclusivamente en el mismo cliente neutral y solo para SDK clasico sin countForGeneration; clientes productivos y SDK con preflight bound siguen exigiendo preflight explicito consumible una vez.

## Archivos de la unidad

- platform/ai/profile-client.ts, text-execution.ts; nuevos text-client.ts, sdk-text-compat.ts y text-client.test.mjs.
- curriculum/generation/infrastructure/providers/gemini-adapter.ts y gemini-response.ts.
- activities/generation/infrastructure/providers/activity-adapter.ts, activity-prompt.ts y activity-response.ts.
- grading/student-analysis/infrastructure/student-ai/provider.ts; grading/assistance/infrastructure/grading-ai/provider.ts.
- foxy/turns/infrastructure/providers/foxy-adapter.ts, foxy-prompt.ts y foxy-response.ts.
- docs/engineering/ai/README.md agrega una seccion; este registro propio. No mapas de movimientos nuevos.
- No edite tests compartidos, core, DB policy/snapshot, bootstrap fuera de scope ni runtimes concurrentes. Los imports core posteriores al freeze son remapeos del coordinador.

## RED/GREEN y evidencia

- Baseline source ai-profile-client + ai-text-execution + ai-foxy-preflight-budget: 53/53 PASS antes de cambiar.
- Study-ai-execution baseline2/9, por stubs con profundidad legacy. Se devolvio evidencia a root; root remapeo stubs y el fixture del schema/contexto aprobado017 sin cambiar asserts:9/9 PASS. Snapshots generation/grading tambien remapeados por root:13/13 PASS antes de la ultima corrida.
- RED: nuevo test text-client.test.mjs, plazo de preflight incluye la pausa anterior a generate, fallo0/1 por Missing expected rejection. Antes el SDK inyectado reiniciaba el plazo y despachaba despues del vencimiento. GREEN despues de Foxy neutral, sin generation tardia.
- Migracion uno por uno: Foxy+preflight+nuevo20/20; Actividades y Plan repetidos con profile-client y activity-count-compat37/37 en cada corte; Student analysis con profile-client34/34; despues Grading, conjunto74/74 (incluido Study/core/regresion de plazo). No se afirmo RED nuevo para un movimiento que ya tenia caracterizacion verde.
- Caso de aceptacion privado SDK: primer pase oficial-transports/sdk-clients12/13, porque se habian retirado options.client. Se reporto al coordinador. Con las vistas delegadas conservadas: ai-sdk-clients3/3 y conjunto profile-client+sdk-clients+nuevo46/46 PASS, sin SDK adicional (assert existente conserva construcciones/operaciones).
- Nuevo test adicional del SDK que expone countForGeneration: RED9 PASS/1 FAIL por autoconteo que no correspondia a ese protocolo bound. GREEN con una condicion en el shim. Los10 tests nuevos finales junto con profile-client34, Foxy preflight8 y Foxy text-adapter11:63/63 PASS.
- Los10 casos nuevos verifican plazo total, autorizar antes del count/reserva/dispatch/aplicacion, count externo unico, key/control/schema/PDF bytes, cambio durante count, cancelacion en pausa, reserva SQL en vuelo drenada, revocacion tardia con usage conocido, outcome desconocido sin retry, estructura de los seis consumidores y compatibilidad bound SDK.
- Conjunto fuente anterior al remap core concurrente:136/136 PASS sobre14 archivos, incluidos serializers oficiales y snapshots. Se uso resolver ESM efimero de solo lectura para imports .build/api de official-transports: redirige al TS actual; no escribe build ni modifica tests. La repeticion final ampliada agrega el test bound y Foxy-adapter11:148 casos; aparecio un fallo aislado ajeno al021 en ai-grading-snapshots (READY esperado/FAILED actual), porque runtime ahora importa validateGradingAiProposal de core/domain/grading/grading-ai.ts y el stub conservaba core/domain/index.ts. Aislado:4/5. Se devolvio al coordinador para remapear la clave de stub, sin tocar asserts ni runtime fuera de scope. No se declara ese ultimo conjunto global PASS hasta reconciliarlo.
- ESLint de plataforma y los seis providers: PASS. Guard filtrado al ownership: PASS final. Busqueda de getAiTextClient/countForExecution en fuentes API: solo quedan sus dos definiciones de compatibilidad en profile-client.ts, no consumidores productivos.
- TypeScript createProgram con tsconfig API y noEmit:0 errores propios y0 globales observados despues de la migracion/vistas. No hubo build global concurrente; root ejecuta la compilacion fresca despues del freeze.

### Comandos reproducibles

Los grupos source se ejecutaron con `node --experimental-transform-types --experimental-test-module-mocks --test` y estos paths: nuevo platform/ai/text-client.test.mjs; tests/ai-profile-client.test.mjs, ai-text-execution.test.mjs, ai-foxy-preflight-budget.test.mjs, ai-official-transports.test.mjs, ai-sdk-clients.test.mjs, grading-ai-provider.test.mjs, study-ai-execution.test.mjs, activity-gemini-count-compatibility.test.mjs, classroom-ai-gemini-schema.test.mjs, activity-ai-adapter.test.mjs, ai-generation-snapshots.test.mjs, ai-grading-snapshots.test.mjs y ai-foxy-execution-snapshot.test.mjs; mas foxy/turns/infrastructure/providers/tests/foxy-text-adapter.test.mjs en el pase final ampliado.

Para official-transports se sumo `--import data:text/javascript,<encodeURIComponent(hook)>`. El hook usa registerHooks.resolve y cambia un specifier con .build/api/<ruta>.js por fileURL de cwd/<ruta>.ts, delegando el resto a next. De esa forma el ensayo usa fuente actual sin artefactos stale. En el cierre root puede usar su build fresco y runner normal, sin este resolver.

## Pendiente y reversion

- Unica alta para inventario/runtime: apps/api/src/platform/ai/text-client.test.mjs,10 casos.
- Root ya integro createGradingAiProvider en el host compartido. No resta wiring funcional externo conocido. Conciliar el stub core recien movido; compilar y repetir suites desde build fresco y rutas aplicables.
- No DB, proveedores/red reales, claves/.env, defaults/cuotas/perfiles/tarifas/migraciones, commits/push/deploy. Los tests no certifican calidad educativa ni efectos remotos reales. Las reservas y liquidacion se comprobaron sinteticamente, no con PostgreSQL.
- Revertir solo021 mediante diff revisado: restaurar implementaciones/serializacion anteriores de providers y profile-client, retirar el hook opcional preflight de executeAiText y los tres archivos nuevos; revertir la construccion grading del host en coordinacion con root y retirar solo la seccion nueva de la guia. Preservar layout019/020, runtime012 y remaps core posteriores; no reset global ni datos que restaurar. Tarea no marcada DONE por este agente.
