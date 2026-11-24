# Flake de la prueba del adaptador de Actividades (24/11/2026)

- **Alcance autorizado:** el 24/11 el usuario pidió arreglar el flake de `tests/activity-ai-adapter.test.mjs`, que cortó la suite `fast` al verificar el [arreglo de la bomba de PDF](2026-11-24-root-pdf-bomb-flake.md). Commit y push, sólo si los pide. No incluye despliegue.
- **Rol:** coordinador, único escritor. Rama `main`, worktree raíz, commit inicial `32c93a9c`. La sesión no expone su identificador.

## Causa

"A2 unreliable and excessive token counts block generation before dispatch" esperaba `AI_INPUT_LIMIT` o `AI_UNAVAILABLE` y recibió `AI_TIMEOUT`. El fixture le da a cada adaptador un plazo de 50 ms, aunque ninguna de esas pruebas trata del plazo. Con la máquina cargada, armar la solicitud y contar tokens supera los 50 ms. El único caso que prueba un vencimiento (generación colgada) usaba 10 ms, que tiene que alcanzar para el conteo y vencer durante la generación: la misma debilidad.

## Cambios

Sólo en `tests/activity-ai-adapter.test.mjs`, sin cambios de producto:

- Plazo por defecto del fixture: de 50 a 5000 ms, igual que el fixture de Estudio.
- Caso de generación colgada: de 10 a 300 ms. Mantiene el control de que el rechazo llega en menos de 1000 ms.

## Verificación

| Comprobación | Resultado |
|---|---|
| Archivo con 80 ms de demora inyectados temporalmente en `countTokens`, antes del cambio | RED: 0/11. |
| Mismo experimento, con sólo el plazo por defecto corregido | 10/11; falla el caso de generación colgada (10 ms). |
| Mismo experimento, con los dos cambios | 11/11. |
| Archivo sin demora, con los dos cambios | 11/11. La demora se retiró (`git diff` muestra sólo las tres líneas del cambio). |
| ESLint sobre la prueba | Sin errores. |
| `npm run test:complete -- --group fast` | 3100 pasan y 0 fallan. |

## Límites

- Si en el caso colgado el conteo tarda más de 300 ms, la prueba todavía puede fallar.

**Primer paso pendiente:** ninguno. `owned-db` se completó en 957/0 (ver [registro de admisión de Estudio](2026-11-24-root-study-admission-flake.md)).
