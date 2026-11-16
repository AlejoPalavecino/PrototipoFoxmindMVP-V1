# Diseño de ejecución IA con Gemini y Claude

- Coordinador: Codex `/root`; identificador de sesión no expuesto. Fecha: 2026-11-16.
- Rama: `codex/foxmind-ai-runtime`. Worktree: `C:/Users/alejo/.codex/worktrees/foxmind-ai-runtime/ProtipoFoxMind`.
- Base: `ef6828b96084b0fcaf9a883e4afb95e0871cf1d6`. Sin commits propios.
- Alcance confirmado: reducir demoras y consumo, proteger datos enviados, mejorar confiabilidad; Gemini inicial y preparación para Claude futuro.
- Restricción: preservar main y todos los worktrees previos. No leer `.env`, copiar credenciales, arrancar servicios retenidos ni ejecutar proveedores reales en este relevamiento.
- Estado: diseño e implementación aprobados por el usuario; SDK oficiales confirmados el 2026-11-16. Ejecución en worktree propio, sin autorización Git de publicación para esta entrega.

## Evidencia inicial

- `git status --short --branch`, `git log -1 --oneline`, `git worktree list --porcelain`: main con cambios previos de diseño/documentación; worktrees de paridad y UI registrados. Conservados.
- `git worktree add -b codex/foxmind-ai-runtime ... HEAD`: éxito; worktree propio desde la base indicada.
- Inspección de `platform/ai`, composición y adaptadores de curriculum, activities, grading, foxy y study: configuración textual compartida, clientes creados en varios módulos y diferencias en errores/consumo. Study combina transporte con admisión y presupuesto SQL.
- `foxy/infrastructure/turn-preparation.ts`: el preflight puede repetir conteo externo al quitar historial de a un turno. Oportunidad a medir, sin atribuir mejora de rendimiento aún.
- `study-adapter.ts` toma `candidatesTokenCount`; grading agrega además `thoughtsTokenCount`. La normalización debe verificar la semántica específica de cada proveedor y evitar dobles conteos.
- Documentación oficial consultada: conteo de tokens y salida estructurada de Claude; proveedores Google/Anthropic y reintentos de AI SDK. No se comprobó una integración real de Claude.

## Entrega inicial de diseño

- Diseño y aceptación propuestos: [ejecución IA](../engineering/ai/runtime-proposal.md).
- Durante esa entrega inicial sólo se escribieron documentos y su mapa en este worktree; la implementación autorizada posterior se detalla abajo.
- Tablero de implementación: `odd/tasks/ai-runtime.md`; aprobación resuelta, evidencia y estado por unidad.
- `node scripts/check-documentation.mjs`: 145 archivos y 861 enlaces, 0 incidencias. `git diff --check`: éxito, sin errores de whitespace.
- `git status --short --branch`: sólo propuesta, registro y mapa documental modificados en el worktree propio. El estado de main coincide con el observado al inicio; no se escribió en los otros worktrees.
- La inspección inicial no ejecutó pruebas de aplicación ni proveedores; las verificaciones siguientes usan fixtures. El incidente de intento HTTP con credencial sintética se documenta en la ampliación posterior.

## Implementación autorizada y atribución

- Root: contrato/perfiles/ejecutor neutral, copia y validación de solicitudes, métricas seguras, regresiones de privacidad/concurrencia, inventario y documentación.
- `official_transports`: Gemini/Anthropic oficiales y normalización de consumo. [Registro](2026-11-16-worker-official-transports.md).
- `study_execution`: separar presupuesto/admisión de transporte de Estudio, preservar firma y overrides. [Registro](2026-11-16-worker-study-ai-execution.md).
- `gemini_factories`: fábrica compartida y preflight Foxy acotado. [Registro](2026-11-16-worker-gemini-factories.md).
- Delegación proporcional por superficies independientes y verificación separada debido a datos privados, concurrencia y presupuesto. No se afirma aislamiento de escritura efectivo: agentes comparten filesystem y root reconcilió el candidato.
- Dependencia añadida con versión exacta: `@anthropic-ai/sdk@1.8.0`; `npm install --save-exact ... --ignore-scripts --no-audit --no-fund` terminó exitosamente. No se cambió el SDK Gemini ni configuración privada.

## RED, correcciones y aceptación revisada

- Contrato/ejecutor: RED por módulo ausente, luego GREEN. Tests añadidos por root para permisos, capacidades, clonación de contexto, plazos, no reintentos y salida inválida.
- Revisor independiente `ai_runtime_review` reprodujo reserva tardía después de liquidar; root obtuvo RED `settlement must await the known reservation outcome`, drenó callback de reserva antes del cierre y acotó las tres transacciones SQL. GREEN unitario y PostgreSQL con advisory lock real: reserva/consumo final cero, FAILED y ninguna generación tras vencimiento.
- Mismo revisor reprodujo MATERIAL de aula sin adjuntos enviado otra vez después de revocación. RED esperaba CONFLICT y recibió AI_INPUT_LIMIT; root extendió revalidación a CLASSROOM, GREEN y reproducción independiente sin transmisiones posteriores a revocar.
- Root revisó fixture existente de Estudio: agregó finalización STOP y parte textual a la respuesta SDK sintética, reautorización posterior y consumo exacto de razonamiento. La respuesta antigua sin candidates no representaba el contrato aprobado. Implementador delegado no modificó esa aceptación.
- Root revisó la expectativa de once conteos del antiguo test Foxy: ahora espera dos para contexto base excesivo; conserva prueba de error no reintentable y recorte de historias pequeñas. Nueva suite verifica identidad del ticket real, fuente revocada, modelo incompatible y conteos no monótonos.
- Métrica de salida rechazada: RED registraba success; root movió validación técnica y reautorización dentro de la etapa medida. GREEN.
- Transportes rechazan credenciales vacías sin cliente inyectado y Gemini fija `vertexai:false`; no se recurre implícitamente a credenciales/backend del entorno.

## Comprobaciones observadas del primer corte

- Nuevas suites finales: `node --experimental-transform-types --disable-warning=ExperimentalWarning --test tests/ai-text-execution.test.mjs tests/ai-official-transports.test.mjs tests/ai-sdk-clients.test.mjs tests/study-ai-execution.test.mjs tests/ai-foxy-preflight-budget.test.mjs`: 41/41.
- `node scripts/run-ci-suite.mjs --suite pure`: 347/347. `--suite transport`: 87/87. Ejecutadas con build emitido; luego delta de cierre cubierto por las 41 pruebas anteriores. Totales superpuestos; no sumar como cobertura única.
- Regresión focal de ocho suites existentes de extracción/configuración/actividades/analysis/grading/Foxy: 54/54, con flags y loader del runner canónico.
- `apps/api/src/modules/study/infrastructure/tests/integrations.test.mjs`: 4/4 con PostgreSQL propio descartable; incluye presupuesto/duplicación/revocación usando SDK Gemini sintético. `tests/ai-study-reservation-database.test.mjs`: 1/1 con lock real demorado más allá del plazo, sin servicios retenidos.
- `npm run lint:boundaries`: éxito, cero excepciones congeladas. `node --test tests/dependency-security.test.mjs`: 8/8 (regresiones existentes, no auditoría npm completa).
- `node scripts/run-complete-suite.mjs --check`: 557 entradas, 53 exclusiones y 24 rutas válidas; no se ejecutó la suite completa. Las seis pruebas nuevas están clasificadas, ninguna excluida.
- `node scripts/check-documentation.mjs`: 149 archivos, 872 enlaces, 0 incidencias antes del cierre de este registro. `git diff --check`: éxito; avisos LF/CRLF no son fallos funcionales.
- Revisión independiente: dos P1 corregidos/reverificados, sin bloqueantes posteriores; última revisión incluyó métricas, credenciales y documentación. Revisor sólo lectura, sin llamadas reales ni escrituras.

## Fallos de entorno y límites del primer corte

- Un comando Git inicial quedó bloqueado por sandbox; consulta fuera de sandbox autorizada, sin escrituras en worktrees ajenos. Permisos posteriores cambiaron a acceso completo por el usuario.
- Primeras verificaciones concurrentes detectaron imports .js desde fuente .ts, narrowing SDK y build obsoleto; reconciliados, corregidos o recompilados. No se atribuyen esos resultados al candidato final.
- `npm run api:build` tuvo ejecuciones exitosas iniciales y posteriores timeouts de su presupuesto general de 30 s. Compilación directa final con `--extendedDiagnostics`: exit 0, 29,73 s de TypeScript (30,39 s de proceso), más generación Prisma excede ese presupuesto. El wrapper local de 90 s también agotó el tiempo en otra ejecución. No se alteraron límites ni sus pruebas. Repetición instrumentada del mismo `buildApi` con presupuesto explícito de 180000 ms: exit 0, Prisma 12936,94 ms y TypeScript 62742,18 ms (aprox. 76 s total). Código compilado sin errores; presupuestos cortos siguen siendo un límite operativo de este entorno.
- Una primera prueba SQL propia detectó options de transacción mal colocadas por root; corregidas y prueba repetida 1/1.
- No se ejecutaron Gemini/Claude reales, navegador ni medición de costo/latencia externa. El benchmark es reducción de llamadas sintéticas 11→2 y 7→6, no ahorro monetario garantizado.
- Al cerrar el primer corte, la integración neutral alcanzaba Estudio. Las demás capacidades conservan sus puertos y comparten cliente técnico Gemini. Claude tiene transporte probado sintéticamente, sin selección en el host. No se acredita pinning universal, perfiles persistentes ni activación general de Claude; cualquier migración de datos sigue pendiente de diseño/aprobación.
- `node scripts/run-ci-suite.mjs --suite study`: 77/77 sobre el candidato de cierre; proveedor sintético y servicios PostgreSQL descartables con ownership. No se atribuye a `npm run test:study`, cuyo build general mantiene 30 s.
- Cierre de documentación: guías canónicas de IA, arquitectura, Estudio, Foxy y pruebas actualizadas. El diseño conserva alcance futuro; las guías describen sólo el corte realizado. Primer paso posterior: extender el ejecutor a los demás puertos y diseñar identidad persistente de perfiles antes de habilitar selección general de Claude. No se declara esa migración terminada.
- La entrega actual es local, sin integración en main, commits, push, PR ni despliegue. Main conserva exactamente su estado observado al inicio. Los otros worktrees no recibieron escrituras ni operaciones sobre servicios propios.
- Para completar la migración general sin inferir una autorización de datos, se preparó ampliación revisable en Spec: instantánea por trabajo (proveedor/modelo/perfil/versiones/límites/tarifas, sin contenido ni claves) y finalizar pendientes legacy con Gemini antes de habilitar un cambio de perfil. TASK-006 quedó BLOCKED por esa decisión humana en ese momento; las cinco tareas del corte técnico anterior tenían evidencia verificada. La aprobación y el trabajo posterior se registran a continuación.

## Ampliación aprobada y candidato actual

El usuario confirmó «Bien vamos con eso»: aprobó identidad persistente por trabajo, drenar pendientes antiguos antes de cambiar perfiles y completar la selección neutral en los seis dominios. Esta sección sustituye las limitaciones de alcance del primer corte; no amplía permisos de publicación ni acceso a datos retenidos.

- Root implementó contrato `AiExecutionSnapshot`, lector de perfiles/opt-in, política de arranque, migración aditiva y guardas SQL, presupuesto con tarifas persistidas, integración de composición/Estudio y puente neutral. Workers mantuvieron sus superficies de dominios descritas en sus registros. Se conservaron puertos e invariantes educativos.
- Cada trabajo guarda proveedor/modelo, identidad/versiones, límites y tarifas; ninguna clave ni contenido. Los workers resuelven el perfil guardado y no redirigen al cambiar configuración. Los límites diarios y concurrencia conservan configuración operativa actual. Claude requiere habilitación, clave y perfil explícitos; no se activó en un entorno real.
- Política SQL y arranque rechazan la primera inicialización con cualquier legacy pendiente. Tras crear política no se admite nuevo NULL ni reactivación legacy; baseline/snapshot son inmutables. Advisory lock real cubre ambas órdenes de carrera. `application_name` bloquea ejecutores incompatibles, sin presentarse como control de autenticación SQL.
- Revisión independiente detectó y cerró riesgos de inferir modelo legacy, reactivar legacy, worker viejo sobre snapshot, reducción de capacidad PDF de corrección y tickets compartidos entre trabajos. Corrección conserva 20 PDFs de hasta20MB con agregado400MB; otras tareas mantienen límites propios. Digest incremental evita convertir bytes de PDF a JSON numérico expansivo. Cada trabajo tiene tickets propios y comparte sólo el cliente SDK técnico.
- La primera repetición root de migración final y el nuevo test Study SQL detectaron SQLSTATE42601 por CASE sin paréntesis en condición PL/pgSQL. Se corrigió la migración nueva; no se reescribieron migraciones históricas. Nueva ejecución de policy/inventario14/14. No se ocultó el RED con cambios de aceptación.
- El control de arquitectura detectó ciclo mixto entre lectura de configuración y tipos. Se extrajo `configuration-types.ts`, conservando imports/reexport públicos; lint final pasa con cero excepciones y build Prisma/TS final exit0 con presupuesto180000ms.
- Un ensayo delegado inicial de Anthropic instaló el fetch sintético después de construir el SDK: falló preflight e intentó HTTP con clave exclusivamente sintética inválida. No se cargaron claves reales ni archivos privados ni se obtuvo salida paga. Se corrigió la fixture instalando fetch antes de construir cualquier SDK; pruebas finales interceptan ambas rutas. Ver registro de transportes para atribución y límite exacto.

## Evidencia de cierre de la ampliación

- `node scripts/run-ci-suite.mjs --suite pure`:408 aprobadas,0 fallidas,0 omitidas, con runner/build canónico.
- `tests/ai-execution-policy-database.test.mjs` + `tests/activity-migration-inventory.test.mjs`:14/14; upgrade, validación, inmutabilidad, pendientes, tarifas y dos órdenes de bloqueo con PostgreSQL propio descartable.
- `tests/ai-profile-client.test.mjs` + `tests/ai-sdk-clients.test.mjs`:37/37; dos trabajos idénticos cuentan/generan independientemente con el SDK técnico compartido.
- `tests/ai-study-profile-database.test.mjs`:4/4 atribuidas a study_execution, runner canónico. Ambos SDK con transporte sintético, SQL real, perfil/tarifas guardados al mutar live, sin clave Claude falla sin HTTP ni fallback. Fixtures tmpfs eliminadas por helper propio.
- `tests/grading-ai-pdf.test.mjs` caso aprobado/revocaciones:5/5 en ejecución focal root. La repetición ampliada de dominios dio92 aprobadas y1 fallo de preparación de migrate/deploy, antes de ejecutar el caso PDF. El helper sanitiza el diagnóstico y no permite atribuir una causa exacta. Repetición posterior del archivo PDF completo sin carga paralela:6/6, incluido STALE por revocación en vuelo; no se modificaron pruebas ni producción para ese resultado.
- Build final completo mediante `buildApi({budgetMs:180000})`: generación Prisma y compilación TypeScript exit0. No se cambió el presupuesto corto general.
- `npm run lint:boundaries`:éxito,0 excepciones congeladas. Inventario/rutas:564 entradas,53 exclusiones,23 rutas; las pruebas owned nuevas se incorporaron a `owned-db`, que sí ejecuta el runner completo.
- Revisión independiente final: VERIFIED para las rutas críticas, sin hallazgos bloqueantes abiertos. Verificó logs root y pruebas propias finales6/6 más configuración1/1; conteos se superponen con otras suites y no se suman como cobertura única.

## Entrega y límites vigentes

El resultado permanece exclusivamente en el worktree propio, sin commits, integración, push, PR ni despliegue. No se aplicó la migración a datos retenidos, no se leyó `.env` ni se activó un proveedor real. La operación de actualización exige detener admisión, drenar con la versión/configuración Gemini anterior y detener workers anteriores antes del primer arranque con política nueva. La calidad educativa, latencia remota, precios y acceso real de cada modelo necesitan sus pruebas autorizadas; fixtures no los acreditan.

Cierre final de ampliación: suite Study77/77 sobre build final; suites de dominios cubrieron actividad, análisis individual, corrección y Foxy con los resultados y la repetición PDF anteriores. `docs:check`149 archivos896 enlaces sin incidencias; taskboard9 tareas válidas y diff check correcto. Main cotejado al cerrar: conserva las nueve bajas de diseño y los tres documentos sin seguimiento presentes al inicio, sin nuevas escrituras propias. La suite completa de repositorio y proveedores remotos no se ejecutaron. No quedan tareas de implementación o verificación local exigidas pendientes; la migración sobre datos retenidos y la activación real futura conservan su autorización separada.
