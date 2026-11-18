# Verificar con evidencia proporcional

Elegir pruebas por contrato/permiso/datos/capas afectados. No atribuir una suite completa a un conjunto focal ni transformar fixture/proveedor sintético en aceptación externa.

| Nivel | Entrada |
|---|---|
| Carpetas de estudio | npm run test:study (build fresco, motor/cliente/proxy, permisos HTTP, PostgreSQL aislado, uploads/Agenda/avisos y presupuesto IA sintético) |
| Documentación | npm run docs:check |
| Parser/compatibilidad documental | node --test tests/documentation-links.test.mjs |
| Contrato de identidad | node --test tests/p31-contracts.test.mjs |
| Guard de CI de corrección IA | node --test tests/issue2-ci-workflow.test.mjs |
| Límites de módulos | npm run lint:boundaries |
| Ejecución y SDK IA | Tests ai-text-execution, ai-official-transports, ai-sdk-clients, study-ai-execution y ai-foxy-preflight-budget incluidos en suite pure; build fresco antes del runner |
| Cuota mensual | `tests/ai-monthly-budget-database.test.mjs`, `tests/monthly-ai-quota-database.test.mjs`, `tests/monthly-ai-quota-transport.test.mjs` y `tests/monthly-ai-quota-client.test.mjs` cubren reservas, saldo y transporte. Consultá los prerrequisitos de cada suite. |
| Reserva IA concurrente | tests/ai-study-reservation-database.test.mjs: PostgreSQL descartable, advisory lock retenido hasta vencer plazo; sin generación externa |
| API fresca | node scripts/build-api.mjs |
| Web | npm run web:build; typecheck del proyecto apps/web |
| Selección de suites | scripts/ci-suites.mjs y scripts/complete-suite-inventory.json |
| Suite completa | npm run test:complete; leer admisión, grupos y recursos antes de ejecutarla |

Los runners pueden crear PostgreSQL/S3/escáner/correo propios; otros requieren activación explícita de entorno/proveedor. Revisar el inventario y los guards antes de ejecutar. No descubrir secretos ni usar una base persistente como fixture.

El helper de fuentes `tests/helpers/load-ts-module.mjs` pasa el nombre real del archivo a TypeScript para distinguir genéricos `.ts` de JSX `.tsx`. Las pruebas de inventario mantienen una lista explícita de [las migraciones versionadas](../../../tests/helpers/migration-inventory.mjs) y un conjunto de hashes históricos; agregar una migración exige actualizar la fixture deliberadamente, sin sustituirla por descubrimiento dinámico ni reescribir SQL.

Las fixtures de upgrade siembran únicamente columnas presentes en su baseline histórico. `aiFixture` conserva `account_role='teacher'` por defecto para el esquema actual; sólo el escenario anterior a la migración de rol exclusivo usa `accountRoleColumn: false`. Esto no omite permisos ni altera snapshots o aserciones del upgrade.

## Arnés pedagógico y uso

Los recorridos con fixtures verifican permisos, contratos, persistencia y compatibilidad de archivos. Las corridas con Gemini real y las lecturas de muestras tienen resultados por escenario. El piloto con participantes sigue por coordinar y mide transferencia, retención, utilidad, accesibilidad y tiempo docente. [Tablero del arnés](../../../odd/tasks/pedagogical-harness.md) · [Cierre y límites](../../work-log/2026-11-17-root-cierre-arnes.md) · [Guion del piloto](../../verification/piloto-con-participantes.md).

La consulta manual de métricas agrega las dos últimas semanas completas, de lunes a lunes en UTC. Informa turnos docentes por estado, solicitudes de Estudio, recursos docentes editados y repasos agendados. Usá una base autorizada y una sesión de solo lectura. La consulta devuelve totales de la instalación y excluye nombres, identificadores y contenidos. [Consulta SQL](../../../scripts/metricas-uso-pedagogico.sql) · [Definiciones y prueba aislada](../../work-log/2026-11-18-root-metricas-de-uso.md).

## Navegador

Usar una sola TaskSpace de Ego Lite por objetivo, cuentas sintéticas de ambos roles y recursos autorizados. Registrar estado inicial, acción, resultado y evidencia; una captura demuestra apariencia, no una transacción por sí sola.

Comprobar navegación, persistencia, permisos, estados vacíos/errores y confirmaciones. Revisar desktop/tablet/mobile, foco/teclado, accesibilidad y movimiento según el cambio. Diferenciar errores de selectores/scroll de fallas de producto; no ocultar pasos que necesitaron recuperación.

El [recorrido vigente](../../verification/flows.md) contiene capturas actuales y recibos de cierre, acciones reales y limitaciones. El número final se obtiene del catálogo actual, no de esta descripción. [Política de documentación](../../documentation-policy.md).
