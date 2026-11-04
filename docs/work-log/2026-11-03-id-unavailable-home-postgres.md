# Verificación de Inicio con PostgreSQL
- Agent / role: root
- Session or task ID: unavailable
- Date: 2026-11-03
- Branch: main
- Starting commit: faf9aec, con el rediseño local pendiente de verificación
- Phase: [Inicio por rol](../../odd/tasks/home-by-role.md)
- Status: completed

## Request and scope
Levantar Docker Desktop y comprobar avance, Muro y recorrido de ambos roles con PostgreSQL descartable. Docker Server 29.9.2 respondió tras iniciar Desktop.

## Work performed
El fixture P9 usa el nombre actualizado del widget docente. Agrega un escenario con operaciones reales de plan y Muro: 1/2 temas dados y barra visible para docente, ausencia de avance en la respuesta del alumno y en el aula archivada, y consulta que persiste con una aclaración del alumno, desaparece con respuesta docente y reaparece al eliminarla. Verifica ambos recorridos y restringe los reintentos de listas a respuestas 429 con espera válida y ejecución secuencial.

## Verification
- npm run api:build y npm run web:build: exit 0. PostgreSQL descartable con migración y diff Prisma: exit 0.
- node --test --test-isolation=none --test-concurrency=1 tests/p9-home-integration.test.mjs: corrida final exit 0, 13 PASS, 0 FAIL, 0 SKIP en 102956 ms. Incluye cuentas docente/alumno, avance, Muro, archivo, recuperación sin red, navegación, borrador y sesión revocada.
- Las dos corridas anteriores registraron 9 PASS, 2 FAIL (incluido el padre) y 2 SKIP. La primera agotó el plazo en borradores. La segunda confirmó 429 y agotó la espera al reintentar listas en paralelo. La final respetó Retry-After=34s y esperó el resultado de cada lista antes de iniciar la siguiente.
- Evidencia en .test-artifacts/home-postgres-p9.log, home-postgres-p9-retry.log y home-postgres-p9-final.log. Procesos y recursos del fixture limpiados sin errores.

## Commits and outcomes
Verificado en el árbol local, con Docker Desktop activo. Sin commit, push ni despliegue.

## Handoff
Verificación de Inicio cerrada. El trabajo local queda disponible para revisión.
