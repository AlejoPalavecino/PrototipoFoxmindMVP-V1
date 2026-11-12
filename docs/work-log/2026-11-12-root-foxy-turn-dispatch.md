# Inicio de turnos de Foxy AI al liberar capacidad

- Fecha y candidato. 2026-11-12, rama `main`, base `734845b` y cambios locales de las entregas anteriores.
- Coordinador Codex. Identificador de sesión no expuesto.
- Alcance autorizado. Eliminar la espera fija del procesamiento de turnos de texto y repetir el escenario de dos chats simultáneos con una respuesta y un indicador por chat.
- Evidencia de partida. [Informe E2E](../verification/2026-11-12-foxy-study-e2e.md#hallazgos-de-la-corrida-inicial-y-correcciones-publicadas).
- Estado. Implementado y verificado localmente.

## Cambio

El servicio despierta al procesador después de confirmar en PostgreSQL un turno nuevo. El procesador toma trabajo hasta llenar la capacidad y vuelve a comprobarla al terminar un turno. El respaldo de un segundo cubre trabajo pendiente tras un reinicio y cupos liberados por otros procesos. PostgreSQL conserva la admisión global, el límite por docente y la recuperación de turnos vencidos.

## Evidencia

Chromium y Playwright contra la web, la API y PostgreSQL aislados. El proveedor sintético introdujo 1,4 s por llamada para medir el solapamiento. El inicio se mide desde el clic más temprano hasta la entrada al proveedor. El tiempo visible incluye el sondeo de la interfaz.

| Escenario | Inicio del primer trabajo | Comportamiento del segundo | Respuesta visible |
|---|---:|---|---|
| Un docente, dos apuntes simultáneos | 221 ms | Entró al proveedor 46 ms después de terminar la primera llamada | 2,55 s y 4,63 s |
| Dos docentes, dos chats simultáneos | 220 ms | Entró al proveedor 12 ms después del primero, con ambas llamadas activas | 2,55 s en ambos |

En los cuatro chats, el máximo fue un indicador de espera simultáneo por conversación. Cada uno mostró una respuesta, persistió un turno `READY` y volvió a mostrar una sola respuesta al recargar y reabrir desde el historial. Se verificó en 1440 y 390 px. El primer intento del guion llegó a la respuesta, pero falló al reabrir el historial móvil hasta incorporar el paso de abrir su diálogo.

- RED. Las dos regresiones de reanudación inmediata fallaron con el procesador previo.
- GREEN. 47 pruebas de ciclo de vida, cola, servicio y aplicación de texto. Cinco pruebas de composición, citas y visuales también pasaron.
- Compilación. `npm run api:build` y `npm run web:build` pasaron.
- Recibos locales en `.test-artifacts/foxy-turn-dispatch-20261112/`, incluidos `browser-results.json`, `worker-red.log`, `api-tests.log` y `runtime-tests.log`.

La medición cubre admisión y espera en el entorno aislado. La latencia con Gemini real queda sin medir.
