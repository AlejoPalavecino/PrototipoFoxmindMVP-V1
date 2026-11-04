# Rediseño de Inicio por rol
- Agent / role: root
- Session or task ID: unavailable
- Date: 2026-11-03
- Branch: main
- Starting commit: faf9aec
- Phase: [Inicio por rol](../../odd/tasks/home-by-role.md)
- Status: in_progress

## Request and scope
Dirección visual y funcional aprobada. Implementación autorizada con Foxy basado en reglas. El árbol inicial contiene cambios previos de fixtures de navegador que se deben preservar.

## Work performed
Cambios en Home, accesos, widgets y estilos de FoxMind3D. Sugerencias deterministas por rol. Resumen docente con temas dados sobre el total y consultas sin respuesta visible del docente, sobre el alcance autorizado existente. Contrato opcional para compatibilidad de respuestas anteriores. Se actualizaron dos casos del dashboard para la jerarquía y destinos aprobados.

## Verification
- RED inicial de Foxy: export ausente. GREEN final: 26 PASS, 0 FAIL con `node --test tests/home-*.test.mjs tests/p9-home-client.test.mjs`.
- `npm run api:build`, tipos web con `npx tsc --noEmit --incremental false -p apps/web/tsconfig.json`, `npm run lint:boundaries` y `git diff --check` aprobados.
- Edge mediante Playwright, fixture Next aislado: ambos roles a 320 y 1440 px. Fecha visible, imagen cargada, cuatro rutas declaradas, módulo prioritario exclusivo del rol, foco visible y sin desborde horizontal. Capturas en .test-artifacts/home-by-role-*.png. El primer intento del fixture falló por un enlace ausente hacia apps/web/src, corregido solo en los artefactos ignorados. La inspección móvil encontró fecha oculta y un rótulo partido, corregidos y revalidados.
- Docker no disponible (named pipe ausente). La integración API/PostgreSQL de las consultas nuevas y los recorridos con cuentas reales de prueba quedan pendientes.

## Commits and outcomes
Cambios locales en el árbol de trabajo.

## Handoff
Iniciar PostgreSQL aislado de pruebas y verificar conteo de temas TAUGHT, exclusión de planes para alumno/archivado y consultas con respuesta docente visible, eliminada o de otro alumno. Luego ejecutar el recorrido P9 Inicio.
