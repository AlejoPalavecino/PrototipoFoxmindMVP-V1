# Medición de latencia de Foxy y Estudio

- Agente `metrics`, implementación y pruebas específicas, 2026-11-17. Rama `feature/latencia-ia`, base `6e9c1312`, checkout principal.
- Alcance autorizado por el coordinador: medir etapas de chat y devolución con datos sintéticos. Las mediciones registran etapas, códigos y duraciones por flujo, sin contenido ni identificadores.
- Estado inicial: Estudio ya mide conteo y generación mediante un colector con lista de campos permitidos. Foxy y las etapas fuera del proveedor carecen de esa cobertura.

Los eventos locales del servidor registran `queue`, `prepare`, `admission`, `count`, `generate`, `first_text` cuando aplica y `persist` según cada flujo. La UI mide el intervalo desde el envío hasta que React confirma el contenido de chat o devolución. La [guía de IA](../engineering/ai/README.md#medición-de-latencia) identifica puntos de medición, campos, dónde leerlos y diferencias por dominio.

## Evidencia

- RED observado con `node --experimental-transform-types --test tests/ai-chat-latency.test.mjs`. El colector anterior descartaba las siete etapas de chat de la nueva prueba.
- GREEN observado con 67 pruebas focalizadas que incluyeron colector, temporización de navegador simulada, conteo neutral, adaptadores, preflight, worker de Foxy, controlador de chat y vistas de Estudio. El fixture Foxy cubrió chat corto y PDF con historial, con cola inyectada de 23 ms. El fixture de devolución en Estudio midió 1007 ms de admisión con la primera consulta ocupada y volvió a despachar una sola vez tras liberar la plaza.
- Pasaron nueve pruebas adicionales de composición y cancelación en `tests/study-runtime.test.mjs` y `apps/api/src/modules/study/generation/application/tests/study-generation-cancellation.test.ts`. La cancelación tardía se registra como `persist: CANCELLED`; la pérdida del lease de Foxy se comprueba como `persist: STALE` en el test del worker.
- `npm.cmd run api:build`, `npx.cmd tsc --noEmit -p apps/web/tsconfig.json`, ESLint focalizado, `node scripts/check-boundaries.mjs`, `node scripts/check-frontend-architecture.mjs`, `npm.cmd run docs:check` y los dos chequeos de inventario/rutas pasaron.
- Se corrigieron antes del cierre un fixture PDF incompleto, una importación de plataforma inválida en la capa de aplicación, un hook en una vista probada como función pura y las expectativas del fixture de composición sobre el nuevo campo de instrumentación.

Para repetir los tres escenarios sintéticos:

```powershell
node --experimental-transform-types --test --test-name-pattern='Foxy latency|Study feedback waits' apps/api/src/modules/foxy/turns/infrastructure/tests/foxy-text-worker.test.mjs tests/study-ai-execution.test.mjs
```

Trabajo local verificado con pruebas focalizadas, sin commits propios. Los intervalos sintéticos muestran la atribución de las etapas; el trabajo de este agente no midió latencia de proveedores reales ni ejecutó pruebas de navegador real. El tiempo de presentación marca el commit del contenido en la interfaz.

## Corrección tras QA integrada

- La corrida integrada mostró un turno en `CANCELLED` con métricas `generate/AI_TIMEOUT` y `persist/STALE`. La regresión del worker reprodujo ambas etiquetas antes del cambio y confirmó `generate/CANCELLED` y `persist/CANCELLED` después. Un vencimiento real sigue registrando `generate/AI_TIMEOUT`. La prueba también verifica el `AbortError` y que una respuesta tardía no dispara otro cierre.
- Pasaron 29 pruebas focalizadas en el worker, ciclo de vida, streaming y colector. Se conserva el cierre de la reserva y la transición pública en SQL. Si el worker sólo observa pérdida del lease, el diagnóstico de persistencia sigue siendo `STALE`.
