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

En GitHub, el workflow `FoxMind checks` (`.github/workflows/issue2-ci.yml`) tiene tres disparadores. Cada push a `main` corre sólo el job liviano `verify` (build, typecheck, lint, docs y suites puras). Los pull requests y las corridas manuales desde la pestaña Actions (`workflow_dispatch`) corren además `integration-owned` y `complete-suite`, que incluyen los recorridos con navegador como `p5-integration`.

Cuando GitHub Actions no está disponible (por ejemplo, sin minutos), [`scripts/ci-local.mjs`](../../../scripts/ci-local.mjs) corre en esta máquina los mismos trabajos de `issue2-ci.yml` y `secret-scan.yml`. Con `--publish` deja cada resultado como estado `local/<trabajo>` en el commit probado; se niega a publicar si hay archivos versionados con cambios. `--jobs` elige trabajos y `--install` corre `npm ci` antes. Algunas suites de identidad tienen topes que una máquina lenta no alcanza aunque el código esté bien: la compilación de la API tiene 30 s y en una notebook Windows tarda de 20 a 38 s. `--timeout-scale N` (de 1 a 10) define `FOXMIND_TEST_TIMEOUT_SCALE` y estira sólo los topes que leen [`test-timeout-scale.mjs`](../../../scripts/test-timeout-scale.mjs). Cada estado publicado lo anota como «tiempos xN». En CI la variable no existe y los topes quedan iguales.

Los runners pueden crear PostgreSQL/S3/escáner/correo propios; otros requieren activación explícita de entorno/proveedor. Revisar el inventario y los guards antes de ejecutar. No descubrir secretos ni usar una base persistente como fixture.

Los recorridos integrados con navegador (runtime de [P4](../../../scripts/p4-integration-runtime.mjs), grupos `owned-browser` e `integration-owned`) y las suites de identidad P33 suben sólo el cupo `general-identity` a 1000 por IP y por sesión con `AUTH_RATE_LIMITS_JSON`. Todos sus actores comparten `127.0.0.1` y hacen muchos más pedidos por minuto que una persona; con el cupo real (240 y 120 por minuto) reciben 429 en pasos que no tienen que ver con el límite. El cupo real se prueba en `tests/p33-identity-http.test.mjs`, y el resto de los límites (login, registro, recuperación, códigos de aula) conserva sus valores. Un runtime nuevo que encadene muchos pedidos debería seguir esta misma regla, en lugar de agregar esperas por test.

Las pruebas de acompañamiento docente, escritura y estrategias compartidas no usan Docker: [`teacher-support-test-runtime.mjs`](../../../scripts/teacher-support-test-runtime.mjs) levanta un cluster nativo descartable con `initdb` y `pg_ctl` (de `pg_config`, `FOXMIND_TEST_POSTGRES_BIN` o la instalación de Windows). Fuera de Windows, el socket Unix queda en la carpeta temporal del cluster, porque los paquetes de Debian/Ubuntu apuntan a `/var/run/postgresql` y el usuario del runner no puede escribir ahí. Si `pg_ctl` no arranca, el error incluye el final del log de PostgreSQL.

El helper de fuentes `tests/helpers/load-ts-module.mjs` pasa el nombre real del archivo a TypeScript para distinguir genéricos `.ts` de JSX `.tsx`. Las pruebas de inventario mantienen una lista explícita de [las migraciones versionadas](../../../tests/helpers/migration-inventory.mjs) y un conjunto de hashes históricos; agregar una migración exige actualizar la fixture deliberadamente, sin sustituirla por descubrimiento dinámico ni reescribir SQL.

Las fixtures de upgrade siembran únicamente columnas presentes en su baseline histórico. `aiFixture` conserva `account_role='teacher'` por defecto para el esquema actual; sólo el escenario anterior a la migración de rol exclusivo usa `accountRoleColumn: false`. Esto no omite permisos ni altera snapshots o aserciones del upgrade.

## Arnés pedagógico y uso

Los recorridos con fixtures verifican permisos, contratos, persistencia y compatibilidad de archivos. Las corridas con Gemini real y las lecturas de muestras tienen resultados por escenario. El piloto con participantes sigue por coordinar y mide transferencia, retención, utilidad, accesibilidad y tiempo docente. [Tablero del arnés](../../../odd/tasks/pedagogical-harness.md) · [Cierre y límites](../../work-log/2026-11-17-root-cierre-arnes.md) · [Guion del piloto](../../verification/piloto-con-participantes.md).

La consulta manual de métricas agrega las dos últimas semanas completas, de lunes a lunes en UTC. Informa turnos docentes por estado, solicitudes de Estudio, recursos docentes editados y repasos agendados. Usá una base autorizada y una sesión de solo lectura. La consulta devuelve totales de la instalación y excluye nombres, identificadores y contenidos. [Consulta SQL](../../../scripts/metricas-uso-pedagogico.sql) · [Definiciones y prueba aislada](../../work-log/2026-11-18-root-metricas-de-uso.md).

## Navegador

Usar una sola TaskSpace de Ego Lite por objetivo, cuentas sintéticas de ambos roles y recursos autorizados. Registrar estado inicial, acción, resultado y evidencia; una captura demuestra apariencia, no una transacción por sí sola.

Comprobar navegación, persistencia, permisos, estados vacíos/errores y confirmaciones. Revisar desktop/tablet/mobile, foco/teclado, accesibilidad y movimiento según el cambio. Diferenciar errores de selectores/scroll de fallas de producto; no ocultar pasos que necesitaron recuperación.

El [recorrido vigente](../../verification/flows.md) contiene capturas actuales y recibos de cierre, acciones reales y limitaciones. El número final se obtiene del catálogo actual, no de esta descripción. [Política de documentación](../../documentation-policy.md).
