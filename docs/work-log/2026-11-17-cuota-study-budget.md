# Cupo de IA en Mi Estudio

Agente `cuota`, 2026-11-17, rama `feature/latencia-ia`, checkout principal, base `6e9c1312`. Alcance autorizado por el coordinador: diagnosticar el error observado en la aplicación habitual, corregir la señalización y verificar con cuentas sintéticas. Mantener las cuotas y preservar datos y trabajo concurrente.

El log local registró preparación, admisión y conteo completos, sin ejecución de la generación, seguidos por `QUOTA_EXCEEDED`. La reserva del cupo de IA emitía el mismo código usado para límites de la carpeta.

## Diagnóstico

- 23:45 UTC: consulta de sólo lectura al agregado del día y a la carpeta sintética «QA Ego · Escalas». La cuenta tenía 22 solicitudes con tope vigente de 5. El ámbito global tenía 42 de 50. Gasto acumulado de la cuenta 0,147534 USD y global 0,579319 USD frente al tope de 2 USD. Reserva pendiente cero en ambos ámbitos. El estado serializado de la carpeta ocupaba 1.208 bytes.
- El presupuesto diario se indexa por fecha UTC. Se abre el cupo del día siguiente a las 00:00 UTC (21:00 en Buenos Aires). `AI_BUDGET_EXCEEDED` usa el contrato existente de otras familias de IA. La API responde 429 y el cliente conserva el mensaje, muestra la renovación y asigna otra identidad al reintento conocido como terminal.
- El fallo ocurre antes de la generación. El conteo Gemini se completa antes de evaluar la reserva. Los límites de carpeta, los contadores y la configuración se conservaron.

## Pruebas del candidato

- RED focalizado: 5 fallos esperados de código, mapeo HTTP y texto de renovación.
- GREEN focalizado: 5 PASS. La corrida conjunta inicial tuvo un fallo intermitente en el plazo de 40 ms de admisión concurrente de feedback; pasó aislado.
- `node --test --test-concurrency=1 tests/study-ai-execution.test.mjs apps/web/src/features/study/api/study-client.test.mjs apps/api/src/modules/study/generation/application/tests/conversation-generation.test.ts`: 37 PASS.
- ESLint de los cinco archivos TypeScript que implementan el cambio: PASS. `npm run docs:check`: PASS, 211 archivos, 1134 enlaces.
- El primer arranque habitual fue exitoso. Dos reinicios del candidato se bloquearon en una incompatibilidad de tipos de feedback paralela (TS2339 en `study-runtime.ts`). El coordinador corrigió el tipo.
- El tercer reinicio quedó READY con Gemini real a las 23:51 UTC. El sondeo a Estudio a través del proxy web respondió HTTP 429 con el código y el mensaje de renovación esperados. Conservó las referencias del PDF y el historial. Los agregados siguieron iguales (22 solicitudes de la cuenta, 42 globales, reservas cero). El log mostró preparación, admisión y conteo exitosos seguidos por el rechazo de presupuesto.
- A las 00:00:05 UTC, el nuevo día mostró 0/5 solicitudes de la cuenta y 0/50 globales, sin gasto ni reservas nuevas. La aplicación siguió en marcha y la carpeta conservó su estado activo.
- El coordinador envió el primer chat por Ego Lite tras la renovación a las 00:01:30 UTC y vio una pista de Gemini en la conversación. A las 00:01:36 UTC, el log verificó conteo, generación y persistencia completos. La cuenta tenía 1/5 solicitudes usadas y 3.584 microdólares liquidados, con reserva pendiente cero. Se comprobó la recuperación con la misma cuenta y carpeta, sin cambios de límites ni reinicio durante el cambio de día.

## Cierre de la app habitual

- En la práctica de Ego, la devolución falló en preparación con `SOURCE_UNAVAILABLE` y cupo disponible. Se reprodujo por la diferencia de historial al leer el PDF antes y después de cargar sus bytes. Tras reiniciar con la corrección, la devolución de la misma práctica completó preparación, admisión, conteo, generación y persistencia.
- Tras el ensayo final del coordinador en V4, a las 00:09:05 UTC el agregado del día contenía 8 solicitudes liquidadas y 36.375 microdólares (0,036375 USD) según las tarifas configuradas. El alumno sintético registró 4 solicitudes y 19.668 microdólares, y el docente sintético registró 4 solicitudes y 16.707 microdólares. La suma coincide con el total global del día, con reservas pendientes cero. La cifra es contable y no coteja la factura del proveedor.
- Por pedido del coordinador, `npm run local:stop` detuvo API, web y contenedores propios y conservó volúmenes y datos. Sin commits.
