# Rol exclusivo por cuenta — implementación

- Agent / role: /root, coordinación
- Session or task ID: /root; runtime session ID unavailable
- Date: 2026-10-31
- Branch / worktree: main, workspace original
- Starting commit: 5d9fbc74095ae73c7ccf67bbe785df00ab5c12fa
- Phase and detailed task/spec links: nueva funcionalidad; [especificación](../foxmind-v1-functional-spec.md)
- Status: completed

## Request and scope
Implementar rol global exclusivo elegido al registrarse. El usuario autoriza reiniciar desde cero la base de desarrollo y crear una cuenta docente y otra estudiante para pruebas. No se autorizó publicación ni despliegue.

## Work performed
Inspección inicial del estado Git y protocolo de trabajo. Se creó la rama `codex/exclusive-account-roles`. /root/explorer comprobó la topología documentada sin inspeccionar configuración privada. /root/architect definió el contrato `accountRole: teacher | student`, obligatorio, sin cambio autoservicio; los permisos por aula continúan vigentes. /root/role_tests creó pruebas en `tests/exclusive-account-role.test.mjs` y devolvió el resultado atribuido abajo; no escribió este registro por sus restricciones de rol. Implementación backend y frontend asignadas a agentes distintos.

## Verification
`git status --short --branch`: main limpio al inicio. /root/role_tests: `node --test --test-reporter=spec tests/exclusive-account-role.test.mjs` produjo cinco fallos esperados por comportamiento aún ausente. Fixture de duplicado simulado, sin prueba DB. Docker no respondió inicialmente; motor y pruebas integradas pendientes. El reinicio está pendiente.

Actualización: Docker Desktop inició. La prueba de roles pasó 6/6, incluido PostgreSQL efímero. P5 drafts/enrollment pasó 21/21; registro D2 7/7; identidad HTTP 21/21 en repetición aislada tras un primer timeout de proceso; verificación confirm 8/8; recovery request 4/4. El chequeo documental pasó 137 archivos/1660 enlaces. No se reinició la base persistente.

`npm test --silent`: 20 migraciones aplicadas, drift vacío y cliente generado en DB efímera; 1/38 PASS y 37 fallaron porque `tests/database.test.mjs` crea usuarios sin `account_role`. Se asignó corrección de fixtures y repetición; no es un PASS de base integral.

Repetición atribuida a `/root/regression_fixtures`: `npm test -- --silent` PASS 38/38 tras adaptar el fixture; primer fallo conservado arriba. `npm run test:ci --silent` falló en el contrato histórico que exigía `globalClassroomRole: false` (8 PASS/1 FAIL; resto no ejecutado); se asignó adaptar la expectativa al nuevo contrato y repetir.

Después de adaptar P31, `/root/role_tests` observó 9/9 P31, 100/100 CI pure y 35/35 CI transport. `/root/regression_fixtures` observó P4, lotes P6/P7/agenda/grading y 24 pruebas SQL FoxMind 3D aprobadas; el live controlado no alcanzó readiness y no pasó. API build, web build, fronteras y `docs:check` pasaron. `/root/visual_roles` verificó en preview P5 que cada rol ve su acción correspondiente y que Enter abre el diálogo; detectó y se corrigió un botón visible para docente. Registro/inicio/responsive de producción no se verificaron en esa preview. Space cerrado; revisión automática rechazó `blocked by policy` la limpieza forzada del proceso/recursos temporales P5, que permanecen.

`/root/dev_reset` informó reinicio de `classroom_main_dev`, respaldo privado validado, 20 migraciones y drift cero; creó y verificó dos cuentas sintéticas con roles opuestos, contraseñas protegidas con DPAPI y visor local. Aplicación en `http://127.0.0.1:52171`. Su primer arranque falló por guard histórico de 17 migraciones; lo actualizó a 20 y el segundo arrancó. No se borraron los volúmenes de almacenamiento ni correo. Pendiente cierre de registro y revisión final.

Revisión adicional de `/root/review_roles`: UI y OpenAPI sin hallazgos actuales; 14 pruebas web PASS. Cuatro harnesses sin rol fueron corregidos por `/root/frontend_roles` y verificados por inspección/tipos. `/root/role_tests` adaptó accesos por perfil y observó 20/20 en pruebas focales; scripts de navegador históricos están pendientes de adaptación y ejecución. Registro y responsive reales no se pudieron comprobar en ego porque el Space único ya había finalizado. [Reinicio y verificación](2026-10-31-dev-reset.md).

Revisión atribuida a `/root/review_roles` (solo lectura): sin hallazgos en backend y migración; 6/6 focal y `git diff --check` aprobados. Una prueba SQL aislada confirmó inmutabilidad y rechazo de propietario estudiante y matrícula docente. El primer experimento de matrícula encontró primero la restricción histórica; se repitió con otro docente y pasó. La revisión detectó fixtures sin rol, cuya corrección estaba en curso; `aiFixture` pasó después. No revisó UI, suite integral ni secretos y no accedió a datos persistentes.

## Commits and outcomes
El cierre parcial anterior quedó sin commit; la validación posterior y la corrección accesible se registran en [validación final](2026-10-31-root-role-visual-final.md). El commit local se registra en Git al cierre; no se autorizó publicación.

## Handoff
La aplicación de desarrollo y las dos cuentas verificadas están disponibles según el registro de reinicio. Registro e Inicio se verificaron visualmente; el [menú móvil](2026-10-31-root-mobile-menu.md) se verificó después con ambos roles. Los guiones visuales históricos que utilizan el actor mixto requieren adaptación antes de reutilizarse. La revisión automática rechazó el cierre forzado de los recursos temporales P5 con `blocked by policy`; no se intentó eludir.
