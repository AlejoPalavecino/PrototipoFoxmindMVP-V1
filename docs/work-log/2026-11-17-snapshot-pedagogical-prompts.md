# Identidad de prompts pedagógicos

- Agente `/root/snapshot`, implementación focalizada. La sesión individual no está expuesta.
- Base `6e9c1312`, rama `feature/latencia-ia`, checkout principal. Cambios concurrentes de latencia y pedagogía.
- Alcance delegado: versionar prompts de Mi Estudio y Actividades, mantener la identidad de trabajos anteriores y comprobar los caminos de despacho con fixtures sintéticos.
- Superficies: perfiles de ejecución, persistencia y procesamiento de Actividades, admisión en Mi Estudio y pruebas focalizadas.

## Cambios

- Actividades conserva el prompt original para `activity-proposal-v1` y usa las reglas pedagógicas para `activity-proposal-v2`. El formato de respuesta sigue en `activity-proposal-v1`. Al encolar, la columna de prompt toma la identidad del mismo perfil activo que se guarda en el snapshot. Si la fila contradice al snapshot, el worker la cierra con `AI_UNAVAILABLE` antes del proveedor.
- Mi Estudio registra `study-v2` con formato de respuesta `study-v1`. Un pedido síncrono preparado con el prompt actual y admitido con un perfil viejo falla con `AI_UNAVAILABLE` antes de seleccionar transporte. El perfil histórico sigue siendo legible para inicializar la política sin modificar el baseline.
- El esquema de PostgreSQL admite ambas identidades con el formato de snapshot ya vigente.

## Evidencia

- RED reproducido con `node --experimental-transform-types --experimental-test-module-mocks --disable-warning=ExperimentalWarning --test tests/ai-generation-snapshots.test.mjs`: cuatro fallos por identidad inicial, metadatos discordantes, admisión de Study y persistencia de identidad de Actividades. El primer intento sin `--experimental-transform-types` falló al interpretar TypeScript. La prueba focalizada de `tests/ai-profile-client.test.mjs` también dio RED para el prompt histórico en ambos SDK.
- El mismo runner sobre `tests/ai-generation-snapshots.test.mjs`, `tests/ai-profile-client.test.mjs`, `tests/study-ai-execution.test.mjs`, `tests/activity-ai-adapter.test.mjs` y la prueba del repositorio de Actividades dio 75 verdes.
- `npm run api:build` y ESLint focalizado terminaron con código 0. `git diff --check` focalizado terminó sin errores.
- Los archivos `tests/activity-parity-database.test.mjs` y `tests/ai-execution-policy-database.test.mjs` pasaron 18 pruebas en PostgreSQL descartable. El upgrade verificó baseline histórico, filas V1 y V2 con ambos metadatos coherentes y procesamiento de ambas sin perder trabajos. `tests/ai-study-profile-database.test.mjs` y `tests/ai-study-reservation-database.test.mjs` pasaron 6 pruebas adicionales en PostgreSQL descartable. El runner usó `--import ./scripts/register-api-test-build.mjs` y `--test-concurrency=1`.

Unidad verificada con proveedores simulados y datos sintéticos. No se ejecutaron llamados a proveedores externos ni se tocaron datos retenidos. En una futura puesta en marcha con versiones de aplicación mezcladas, un ejecutor viejo puede rechazar un snapshot nuevo, o la admisión de Study puede bloquearse mientras la política activa siga en V1. Integración y verificación del candidato completo a cargo del coordinador.
