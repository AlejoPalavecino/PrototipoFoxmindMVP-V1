# 429 de `p6-wall-integration` por la ventana de identidad compartida (24/11/2026)

> **Reemplazado el mismo día.** La espera por test de este registro se retiró. La causa resultó común a todos los recorridos del runtime de P4 y se resolvió ajustando ese runtime: ver [cupo de identidad de los recorridos integrados](2026-11-24-root-journey-identity-budget.md).

- **Alcance autorizado:** el 24/11 el usuario pidió seguir con el 429 de P6, que hacía fallar `integration-owned` en las corridas manuales 45449025234 y 45462128910. Commit y push, sólo si los pide. No incluye despliegue.
- **Rol:** coordinador, único escritor. Rama `main`, worktree raíz, commit inicial `9a11039c`. La sesión no expone su identificador.

## Causa

El subtest 5 ("exclusive roles retain classroom ownership boundaries…") crea un docente nuevo y su primer `POST /classrooms/drafts` recibe 429. La regla `general-identity` permite 240 pedidos por minuto por IP y 120 por sesión (`identity/accounts/infrastructure/security/configuration.ts`). Todo el recorrido sale de `127.0.0.1`. Con una consulta temporal justo antes de ese paso, la ventana de IP estaba en **239/240** a los 37 s de abierta, y una sesión en 110/120. Es el mismo mecanismo que se corrigió en `p5-integration` (`9fcd4a51`). Los límites reales no cambian.

## Cambios

Sólo pruebas:

- `tests/p4-integration-helpers.mjs`: nuevo `waitForIdentityWindows(db, busy = 60)`. Espera a que se reinicie la ventana más reciente de IP o de sesión con al menos `busy` pedidos. Es la misma consulta que tenía P5.
- `tests/p6-wall-integration.test.mjs`: lo llama al empezar el subtest 5.
- `tests/p5-integration.test.mjs`: usa el helper en lugar de su copia propia.

## Verificación

| Comprobación | Resultado |
|---|---|
| `p6-wall-integration` antes del cambio (Windows, Docker) | RED: falla el subtest 5 con `429 !== 200`, igual que en CI; el 6 queda salteado. |
| Consulta temporal antes del paso que falla | IP `general-identity` 239/240 (37 s); sesión 110/120. Se retiró (`git diff` vacío en ese archivo). |
| `p6-wall-integration` después | GREEN 7/0, sin salteados. |
| `p5-integration` con el helper compartido | 13/0. |
| ESLint sobre los tres archivos | Sin errores. |
| `node scripts/run-ci-suite.mjs --suite integration-owned` (igual que CI) | 81 pasan y 0 fallan en los 20 archivos, incluidos los seis que en CI quedaban sin correr después de P6. |

## Límites

- La espera depende de la consulta a `account_action_controls`. Si cambia el nombre de las acciones de identidad, el helper deja de esperar y el 429 vuelve a aparecer.
- Agrega hasta unos 60 s al recorrido de P6.

| CI, `workflow_dispatch` 45480172736 sobre `92c310e1` | `integration-owned` en verde por primera vez desde el 16/11. `owned-db`, `verify`, `fast` y `owned-services` también en verde. Siguen en rojo `owned-browser` (`brujula-browser`) y `wrappers` (`p3-browser`), que se tratan en otros registros. |

**Primer paso pendiente:** ninguno propio.
