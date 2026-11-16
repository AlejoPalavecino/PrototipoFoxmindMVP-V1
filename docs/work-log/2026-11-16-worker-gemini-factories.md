# Clientes Gemini compartidos por configuración

- Agente: `/root/gemini_factories`, implementador; identificador de sesión no expuesto.
- Fecha: 2026-11-16. Rama: `codex/foxmind-ai-runtime`.
- Worktree: `C:/Users/alejo/.codex/worktrees/foxmind-ai-runtime/ProtipoFoxMind`.
- Commit inicial: `ef6828b96084b0fcaf9a883e4afb95e0871cf1d6`.
- Alcance autorizado: helper SDK Gemini y factories textuales asignadas; conservar contratos, inyección, opciones, prompts y errores. Sin proveedor externo ni lectura de secretos.
- Superficies: `platform/ai/sdk-clients.ts`; factories curriculum, activities, student-ai, Foxy textual; composición academic-classrooms; prueba propia `tests/ai-sdk-clients.test.mjs`.
- Criterios: reutilizar por identidad del objeto de configuración; invalidar con cambios de apiKey/plazo; separar objetos/configuraciones; construir sin conteo/generación; conservar Developer API y un intento por llamada.
- Estado: implementación y prueba propia GREEN; regresión focal GREEN. Compilación y regresión ampliada pendientes de reconciliación concurrente. Sin commits ni publicación. El coordinador mantiene documentación canónica y tablero.

## Evidencia

- RED inicial: `node --test tests/ai-sdk-clients.test.mjs`, exit 1 por helper inexistente. Con helper que replicaba construcción por llamada: exit 1, 0/3; fallos esperados de igualdad por referencia en reutilización/factories.
- GREEN: mismo comando tras WeakMap/integración, exit 0, 3/3. Constructor SDK sustituido mediante hook del runner; cero operaciones de conteo/generación. Sin transporte externo.
- Regresión focal: `node --experimental-transform-types --disable-warning=ExperimentalWarning --test tests/ai-sdk-clients.test.mjs tests/activity-gemini-count-compatibility.test.mjs tests/classroom-ai-gemini-schema.test.mjs tests/grading-ai-provider.test.mjs tests/student-ai-contract.test.mjs tests/foxy-feature.test.mjs`, exit 0, 31/31. El grupo compatibility usa SDK oficial con fetch sintético.
- `git diff --check`: exit 0; aviso Git de conversión LF/CRLF en archivo concurrente Study.
- Primera regresión ampliada sin `--experimental-transform-types`: falló grading por parameter properties preexistentes; se corrigió la invocación conforme al runner canónico.
- Regresión ampliada con ese flag y los dos archivos `tests/activity-ai-adapter.test.mjs tests/classroom-ai-adapter.test.mjs`: 31/50 pasan, 19 fallan por importación concurrente `gemini-text-transport.ts` → `usage.js` inexistente en ejecución TS. Notificado al coordinador; no se alteró superficie ajena. En corrida previa a ese cambio los casos A2/C2 habían pasado.
- `node node_modules/typescript/bin/tsc -p apps/api/tsconfig.json --noEmit`: exit 1 por cliente Prisma aún no generado y error concurrente de unión `text` en `anthropic-text-transport.ts(52,91)`; ninguno señala al helper. Notificado al coordinador para comprobación integrada tras completar instalación/generación.

## Resultado y límites

Export añadido: `getGeminiClient(configuration: Pick<AiConfiguration, 'apiKey' | 'deadlineMs'>): GeminiClient`.
La caché usa identidad débil del objeto y compara clave/plazo; no mantiene un mapa global de strings de credenciales. Cambiar modelo no reconstruye cliente. Cada constructor de adaptador conserva su cliente inyectable. Curriculum, activities, student-ai, Foxy textual y composición grading comparten el helper. Imágenes y Study fuera de esta unidad.

No se ensayó proveedor real ni servicios. Pendiente del coordinador: build integrado y repetir regresión ampliada tras estabilizar archivos concurrentes. El registro informa evidencia local, no integración/publicación ni aprobación de cierre.

## Segunda unidad: preflight Foxy con presupuesto

Encargo posterior del coordinador, mismo agente/worktree: optimizar historial largo preservando fuentes, pares completos y objeto prevalidado. Superficies exclusivas: `turn-preparation.ts`, nuevo `tests/ai-foxy-preflight-budget.test.mjs` y este registro. La aceptación anterior queda reservada al coordinador.

- Preparación de fixture: primer intento rechazado correctamente con `INVALID_INPUT` porque faltaban campos sintéticos de fuentes/documentos; se completó la fixture antes de acreditar RED conductual.
- RED: `node --test tests/ai-foxy-preflight-budget.test.mjs`, exit 1, 3/5. Caso base excedida contó 11 veces en lugar de 2; caso cuatro pares aptos contó 7 en lugar del máximo 6 exigido.
- Implementación: hasta cinco pares conserva recorte secuencial. Para más de cinco prueba original, base sin historia y búsqueda binaria de sufijos. Cada intento mantiene revalidación/cancelación; errores ajenos a límite no reintentan. Retorna exactamente el objeto de un conteo exitoso, conservando ticket WeakMap.
- GREEN: mismo comando, exit 0, 7/7. Incluye integración con adaptador Gemini inyectado: generación no suma conteo después de seleccionar el sufijo. Casos negativos: revocación de fuente antes del segundo conteo; modelo pendiente incompatible sin conteos; errores y cantidades inválidas sin retries.
- Benchmark sintético reportado por la prueba, sin contenidos ni claves: base excedida **11 → 2** conteos; cuatro pares aptos **7 → 6**. No representa medición de latencia/calidad de proveedor real.
- Aceptación previa sin editar: `node --test apps/api/src/modules/foxy/infrastructure/tests/foxy-history-preflight.test.mjs`, exit 1, 4/5. Único fallo: expectativa anterior de 11 conteos obtiene 2. Requiere revisión del coordinador; restantes pruebas de proyección, historial corto, cancelación/versiones y ticket Gemini pasan.
- `node node_modules/typescript/bin/tsc -p apps/api/tsconfig.json --noEmit`: exit 0 en esta segunda unidad, tras preparación concurrente de dependencias.
- `git diff --check`: exit 0, aviso LF/CRLF ajeno en Study.

Límite: con tokenización no monotónica no se garantiza el sufijo maximal; siempre se retorna un input efectivamente contado dentro del presupuesto. No se quitan fuentes ni se aproxima el conteo. Sin servicios externos, commits ni publicación.

Pendiente: revisión del único criterio anterior de conteos por el coordinador. Reversión independiente: revertir sólo hunks de `turn-preparation.ts`, retirar `tests/ai-foxy-preflight-budget.test.mjs` y esta sección; conservar unidad SDK y cambios concurrentes.

## Tercera unidad: snapshots de extracción y actividades

Encargo posterior: aprobación humana de instantánea persistente y drenaje legacy comunicada por el coordinador. Misma rama/worktree. Superficies: contratos curriculum application y activities infrastructure; servicios, queues y workers de ambas capacidades; `academic-curriculum-ai-runtime.ts`, `academic-activity-ai-runtime.ts`; nueva prueba `tests/ai-generation-snapshots.test.mjs`. Contrato neutral y helper/migración/policy/guard/cliente de perfiles pertenecen al coordinador. No se alteraron schema, migraciones, otros bootstraps, platform, manifiestos ni tableros en esta unidad.

- RED: `node --experimental-test-module-mocks --experimental-transform-types --disable-warning=ExperimentalWarning --test tests/ai-generation-snapshots.test.mjs`, exit 1, 0/7. Fallos por callback de proveedor no usado, snapshot inválido que alcanzaba proveedor, perfil legacy ignorado e INSERT sin snapshot.
- GREEN: mismo comando, exit 0, 8/8. Valida identidad del proveedor efectivo para conteo/generación, config de reserva/liquidación, límites/modelo/plazo guardados, configuración compartida intacta, rechazo sin factory/count ante snapshot inválido, baseline legacy y overrides. Queue real importada separadamente prueba lease con deadline guardado y admisión con concurrencia operacional.
- Regresión focal: `node --experimental-transform-types --disable-warning=ExperimentalWarning --test tests/audit-public-ports-import.test.mjs tests/classroom-ai-contracts.test.mjs tests/activity-ai-contracts.test.mjs tests/activity-ai-adapter.test.mjs tests/classroom-ai-adapter.test.mjs`, exit 0, 33/33. Sin servicios externos.
- `git diff --check`: exit 0; aviso LF/CRLF del archivo Study concurrente.
- Se inició `node node_modules/typescript/bin/tsc -p apps/api/tsconfig.json --noEmit`; seguía sin resultado tras las pruebas focales. Se interrumpió sólo esa sesión propia con Ctrl+C (exit 1 sin diagnósticos) al coordinar compilación única. No acredita tipos. El coordinador realizará el build integrado y solicitó evitar nuevas compilaciones paralelas.

Resultado: cada INSERT agrega `execution_profile` desde `ai_execution_policy.active_profiles` y toma `model` con COALESCE sobre el mismo perfil; mantiene parámetros existentes (10 curriculum, 14 activities), sin consultas auxiliares. Rows exponen `execution_profile?: AiExecutionSnapshot | null`. `ClassroomAiConfiguration` extiende `AiExecutionSettings` importado sólo como tipo neutral.

Callbacks añadidos:

```ts
// ClassroomAiOptions
providerForExecution?: (configuration: ClassroomAiConfiguration) => StructuredExtractionPort;
// ActivityAiOptions
providerForExecution?: (configuration: ClassroomAiConfiguration) => StructuredActivityGenerationPort;
```

Bootstrap agrega callbacks sólo sin override. Cada worker resuelve `configurationForJob` en una copia por trabajo y conserva el mismo provider para conteo/generación; no cambia `this.options`. Reserva y liquidación reciben configuración efectiva. Deadline de timer y lease se pinnea; concurrencia/edad/cuotas siguen operacionales. Metadata inválida permite sólo claim con plazo operacional para cerrar `FAILED/AI_UNAVAILABLE`; no inicia factory ni conteo. Se preservan verificaciones de fuentes y fences.

Límites: pruebas de workers usan stubs de permisos/fences/presupuesto; acreditan wiring y selección, no SQL real ni persistencia. No se iniciaron servicios o DB. Migración, trigger inmutable, precios globales, policy y soporte proveedor neutral requieren comprobación integrada del coordinador. No se accedió a datos retenidos/secretos, ni hubo commits o publicación.

Reversión: revertir únicamente hunks de esta tercera unidad en contratos/servicios/queues/workers y dos bootstraps, retirar la nueva prueba y esta sección. Conservar unidades SDK/Foxy y cambios concurrentes de factories por el coordinador. Coordinar con migración/policy antes de cualquier reversión de un despliegue persistente.

## Reversión

Retirar el helper y prueba nuevos; revertir únicamente los hunks de importación/construcción asignados y este registro. Conservar cambios concurrentes ajenos.
