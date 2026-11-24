# Flake de la espera de admisión de la devolución de Estudio (24/11/2026)

- **Alcance autorizado:** el 24/11 el usuario pidió arreglar el test intermitente que hizo fallar el CI del push `220820b9`. No incluye despliegue. Commit y push, sólo si los pide.
- **Rol:** coordinador, único escritor. Rama `main`, worktree raíz, commit inicial `168ca1b7`. La sesión no expone su identificador.

## Causa

En el job `verify` de la corrida 45321699327 (`220820b9`) falló `tests/study-ai-execution.test.mjs` ("stops waiting within its deadline…", línea 136): esperaba que no hubiera eventos y apareció `['authorize']`. En `study-ai-execution.ts`, la espera de admisión duerme todo el tiempo que queda y después recalcula cuánto falta con `Math.floor`. Si el timer vuelve un instante antes de que `performance.now()` llegue al vencimiento, queda 1 ms y el ciclo reautoriza y vuelve a pedir cupo cuando el plazo ya se consumió. En la respuesta no cambia nada (sigue siendo `AI_BUSY`, sin reserva ni despacho), pero el test falla a veces.

## Cambios

- `apps/api/src/modules/study/generation/infrastructure/providers/study-ai-execution.ts`: si la espera llega al vencimiento (`beforeWait <= 1000`), al terminarla responde `AI_BUSY` sin reautorizar ni volver a pedir cupo. Las esperas intermedias de 1 s no cambian.
- `tests/study-ai-execution.test.mjs`: test nuevo que hace determinista el timer que vuelve antes de tiempo, con un `performance.now()` que avanza a la mitad de velocidad.
- `docs/engineering/study/README.md`: frase sobre el vencimiento de la espera.

## Verificación

| Comprobación | Resultado |
|---|---|
| Test original, 40 corridas (5 tandas de 8 en paralelo), antes del cambio | 0 fallas; no se reproduce en esta máquina. |
| `tests/study-ai-execution.test.mjs` con el test nuevo, antes del cambio | RED: 18/19; `admissionChecks` 3 en vez de 1, por la causa esperada. |
| Mismo archivo después del cambio | GREEN 19/19. |
| `ai-generation-snapshots` y `platform/ai/text-client` (con los flags del runner) | 23/23. |
| ESLint sobre los dos archivos tocados | Sin errores. |
| `npm run test:complete -- --group fast`, primera pasada | 143/1: la cortó `pdf-inflate-bomb` (límite de 3000 ms; tardó 4039 ms), que no está relacionado con el cambio. Solo pasa 3/3. |
| `npm run test:complete -- --group fast`, segunda pasada | 3100 pasan y 0 fallan (línea base 3098 + test nuevo). |
| `docs:check` | 0 problemas. |

| Más tarde, con Docker activo (sobre `c1eeb1c0`): `tests/ai-study-reservation-database.test.mjs` | 2/2 contra PostgreSQL, incluida la devolución que espera cupo y despacha una vez. |
| `npm run test:complete -- --group owned-db` | 957 pasan y 0 fallan, en los 158 archivos. No quedaron contenedores de prueba. |

## Límites

- La primera sesión no pudo correr `owned-db` porque Docker Desktop no estaba activo. Se completó después, con los resultados de la tabla. CI no corre este grupo en los push a `main`.
- `pdf-inflate-bomb` también depende del tiempo y puede fallar con la máquina cargada. No se tocó.
- Las tres corridas de PR fallidas anteriores (`02b7395e`, `ae045cfc`, `d50b651a`) no se revisaron.

**Primer paso pendiente:** ninguno.
