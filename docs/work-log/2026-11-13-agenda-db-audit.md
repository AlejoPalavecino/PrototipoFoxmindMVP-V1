# Auditoría de invariantes físicos de Agenda — S3 / T2

- Agente: implementation writer de base de datos/documentación; identificador de sesión no expuesto.
- Fecha: 2026-11-13. Rama inicial: `fix/architecture-audit`. Worktree: raíz del repositorio. Commit inicial: `95fef894becd8de082e8c9f61235c6d0a0a213f8`.
- Autorización: «Bien resolve entonces esos 4 hallazgos»; alcance delegado S3/T2 de [la tarea](../../odd/tasks/architecture-audit-remediation.md).
- Superficies propias: `tests/agenda-database.test.mjs`, `tests/agenda-event-color-database.test.mjs`, `docs/engineering/data-model.md` y este registro. Tarea/mirror/roadmap pertenecen al coordinador.
- Estado inicial: dos archivos ajenos sin seguimiento (`docs/work-log/2026-architecture-audit-root.md`, `odd/tasks/architecture-audit-remediation.md`); preservados.

## Plan y límites

Inspeccionadas las cinco migraciones de Agenda, `AgendaEvent` en Prisma, pruebas y helper existentes. Faltan casos SQL directos de forma/coherencia de horarios, límites de recurrencia y forma/tamaño de excepciones. La cobertura de colores omite GRAPHITE; el caso cuyo nombre menciona categoría no intenta una categoría inválida.

Se agregarán controles válidos, SQLSTATE de rechazo y comparación del estado persistido tras rechazo, reutilizando setup/migraciones/transacciones/cleanup de `withAgendaDatabase`. Primera ejecución esperada GREEN: son pruebas de caracterización de DDL ya aplicado, no una regla nueva que requiera RED artificial. Si falta una restricción, se informará sin modificar SQL.

Sin cambios de esquema, migraciones, runtime ni recursos retenidos. Sin `.env`, secretos, proveedores externos, instalaciones, commits o publicación. El helper crea PostgreSQL vacío propio en tmpfs y verifica ownership antes de limpiar; no se ejecuta Compose. No se crea scratch propio.

## Evidencia y cierre

- Implementados cuatro subtests nuevos: formas y fechas ALL_DAY; coherencia TIMED (UTC/no UTC, nulos, locales, instantes, offsets); límites NONE/DAILY/WEEKLY/MONTHLY; default/tipo/tamaño/NOT NULL de excepciones. Cada rechazo verifica SQLSTATE (23514 o 23502), restricción/columna correspondiente y estado persistido sin cambios tras recuperar el savepoint.
- Completada cobertura existente de título/descripción/categoría/revisión/FK y GRAPHITE; controles válidos y comparación de filas completas tras rechazos, incluido 23503 para dueño inexistente. Conservadas pruebas de privacidad, recarga, retry, CAS y migración incremental de color.
- Añadida matriz invariante → Prisma/DDL → prueba y límites físicos en `docs/engineering/data-model.md`. No se descubrió una restricción esperada ausente: se documentan explícitamente los límites ya existentes (offset no cotejado contra zona, ventana mensual sin conteo de ocurrencias, elementos de excepciones sin validar).
- `node --test tests/agenda-database.test.mjs tests/agenda-event-color-database.test.mjs`: exit 0; 11 pruebas PASS (2 contenedores y 9 subtests), 0 FAIL, 0 skipped/cancelled/todo; 15706.9681 ms. Primera ejecución GREEN esperada y observada, sin correcciones ni fallos de setup. Ambas fixtures ejecutaron migraciones/rollback/cleanup propios; no se omitió PostgreSQL.
- `git diff --check -- tests/agenda-database.test.mjs tests/agenda-event-color-database.test.mjs docs/engineering/data-model.md docs/work-log/2026-11-13-agenda-db-audit.md`: exit 0, sin errores. Diff tracked observado: 133 inserciones / 7 eliminaciones en tres archivos; este registro nuevo se contabiliza aparte.
- Autorrepaso S3: filas de la matriz contrastadas con Prisma y las cinco migraciones; casos válidos y bordes de rechazo revisados; enlaces nuevos apuntan a archivos inspeccionados. No se afirma cobertura exhaustiva de calendario, dominio, HTTP, resto del esquema o actualización de datos retenidos.
- `git status --short`: sólo superficies propias y trabajo concurrente ajeno (registros/pruebas de contrato y host/runtime, tarea y registro raíz); ningún cache/scratch propio. No se modificaron archivos ajenos.
- Gate documental común no ejecutado por este escritor; lo ejecutará el coordinador conforme a la delegación. Sin cambios de runtime, esquema o migración; sin commits. Riesgo del cambio: ninguno (sólo tests/documentación).
- Estado: S3/T2 implementado y verificado localmente. Primer paso pendiente: reconciliación del coordinador y gate documental común; no implica integración, publicación o despliegue.
