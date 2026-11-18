# Contabilidad mensual de IA

- Agentes `/root/ledger` y `/root/ledger_finish`, escritores de contabilidad. Sesión no expuesta. 2026-11-18, rama `main`, checkout principal en `d02f375c` al retomar.
- Alcance asignado por el coordinador: contabilidad mensual por actor y capacidad, movimientos, recuperación, integración con las reservas existentes y pruebas aisladas.
- Estado al cierre de la unidad: verificada localmente. El coordinador integra la evidencia en TASK-001.

La reserva y sus movimientos quedan vinculados a la operación y la cuenta. El importe en exceso se asigna a FoxMind. Una operación con resultado incierto libera la cuota al vencer y deja exposición estimada. La expiración corre cada cinco segundos en la API, pagina por vencimiento y avanza cuando una cuenta está bloqueada. El mismo ciclo ejecuta la comprobación de integridad una vez por día UTC, coordinada con PostgreSQL.

La reserva conserva proveedor, modelo, tarifas vigentes y día operacional UTC. Las imágenes usan el precio de cada modalidad cuando Gemini devuelve un desglose consistente, con los tokens de razonamiento a precio de texto. Sin evidencia suficiente, el costo de la cuenta queda pendiente. La cuota operacional diaria conserva el cálculo conservador para esas respuestas. La captura del día UTC evita corregir otra jornada si una transacción espera hasta después de medianoche. [Tarifas de Gemini](https://ai.google.dev/gemini-api/docs/pricing)

## Verificación

- `node --experimental-transform-types --test tests/ai-monthly-budget-database.test.mjs` pasó en PostgreSQL descartable. Cubre monto por rol, concurrencia en el cupo compartido, idempotencia, exceso, expiración sin consulta por el dueño, paginación con un dueño bloqueado, conciliación tardía, integridad de titularidad, sonda del indicador y cancelación con cambio de día UTC.
- `node --experimental-transform-types --test --test-concurrency=1 apps/api/src/modules/foxy/visuals/infrastructure/tests/foxy-visual-journey.test.mjs` pasó 6 pruebas en PostgreSQL sintético, incluido exceso real y resultado pendiente sin uso confirmado.
- `node --experimental-transform-types --test tests/ai-foxy-execution-snapshot.test.mjs apps/api/src/modules/foxy/turns/infrastructure/providers/tests/foxy-text-budget.test.mjs` pasó 13 pruebas. Los dobles anteriores fallaban al no reconocer las consultas mensuales. Ahora comprueban también las tarifas fijadas y la liquidación tardía.
- Las pruebas focalizadas de respuesta, adapter y precio de imagen pasaron 27 casos. `tests/architecture-host.test.mjs` pasó 5 casos, incluido montaje del runtime mensual y su cierre.
- `node ./node_modules/typescript/bin/tsc -p apps/api/tsconfig.json --noEmit` y `git diff --check` pasaron. El comando `npm.cmd run api:build` alcanzó el plazo de 30 segundos en una corrida concurrente. Prisma generó el cliente correctamente.

Pruebas con proveedores sintéticos. Sin validación de facturas reales, acceso a datos retenidos ni publicación en esta unidad. Un cierre abrupto entre guardar la reserva y obtener respuesta del proveedor deja el resultado incierto hasta recuperar datos o vencer la ventana. La siguiente comprobación es la integración completa por herramienta y el cotejo independiente del candidato a cargo del coordinador.

## Causas de rechazo de cuota

La guarda diaria mantiene el orden de validación y los límites existentes. `AI_GLOBAL_DAILY_BUDGET_EXCEEDED` identifica el límite global y `AI_BUDGET_EXCEEDED` conserva el código del límite personal. Foxy, actividades, currículum, corrección y análisis individual muestran el motivo persistido. La migración candidata amplía el CHECK de Foxy Visual. El rechazo mensual adjunta saldo disponible y reserva requerida en microdólares, más el próximo inicio de período. Los valores salen de la misma transacción que rechazó la admisión. Mi Estudio persiste esos datos de la decisión para su respuesta y replay.

- La prueba del doble de presupuesto quedó roja antes del cambio porque la guarda global devolvía `false`. Pasaron 20 pruebas focalizadas de la guarda y el trabajador visual después del cambio.
- Pasaron 17 pruebas en PostgreSQL sintético para ledger, Foxy Visual, currículum y actividades. La ronda posterior de Foxy Visual pasó 4 escenarios, incluidos los rechazos global y personal persistidos. El ledger comprueba que sólo una de dos reservas concurrentes se admite y que la otra devuelve el saldo, el importe requerido y la renovación de esa decisión.
- Los chequeos de tipos de API y web y `git diff --check` pasaron después del cambio.
- `npm.cmd run api:build` pasó en la corrida posterior. `node --experimental-transform-types --test --test-concurrency=1 tests/student-ai-integration.test.mjs` pasó 8 pruebas en PostgreSQL sintético. El rechazo global se persistió, se devolvió en la consulta del docente, dejó cero despachos y permitió reintentar al restablecer la guarda.
