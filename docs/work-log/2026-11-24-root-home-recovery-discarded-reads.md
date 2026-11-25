# Lecturas de un documento descartado en `p9-home-recovery-integration` (24/11/2026)

- **Alcance autorizado:** el 24/11 el usuario pidió resolver cada bloque rojo de la corrida completa de CI hasta dejarlos en verde, con commit, push y nuevas corridas incluidos. No incluye despliegue.
- **Rol:** coordinador, único escritor. Rama `main`, worktree raíz, commit inicial `7c01ef3b`. La sesión no expone su identificador.

## Qué pasó

En la corrida manual 45516265693 (sobre `7c01ef3b`), seis de siete jobs quedaron en verde. `owned-browser` pasó 156 tests y falló en el subtest 4 de `tests/p9-home-recovery-integration.test.mjs` ("ordinary login lands on Inicio…"). La aserción fue `Previous reads for /api/v1/home must finish before changing transport`. En la corrida anterior, 45511454980, ese mismo test había pasado. Localmente falló 1 de cada 3 a 5 corridas.

## Causa

`drainReads` espera hasta 30 s a que terminen las lecturas observadas antes de cerrar sesión. Un registro temporal (retirado después) de todos los pedidos sin terminar mostró tres en el momento del fallo:

| Inicio | Pedido | ¿Respondió? |
|---|---|---|
| 714 ms | `eventsource /api/v1/ai-quota/events` | sí |
| 852 ms | `fetch /api/v1/home` | no |
| 1558 ms | `eventsource /api/v1/ai-quota/events` | sí |

El stream de 714 ms y la lectura de `/home` de 852 ms son del primer documento de `/inicio`. El test lo deja con `page.goto('/sign-in')`, pero el documento viejo sigue ejecutándose hasta que la navegación se confirma (*commit*). En ese intervalo pidió `/home`. Al confirmarse la navegación, el navegador descartó ese documento y sus pedidos, y Playwright no emitió ni `requestfinished` ni `requestfailed`. El observador del test seguía contando esa lectura como pendiente, aunque ya no podía competir con el cierre de sesión.

No es un agotamiento de conexiones (había tres pedidos abiertos). Tampoco es una falla del producto.

## Cambios

Sólo pruebas, en `tests/p9-home-recovery-integration.test.mjs`:

- `observeReads` marca cuándo empieza una navegación de documento del marco principal. En el siguiente `framenavigated` de ese marco (el commit), registra las lecturas pendientes como `discarded: 'document-navigation'` y deja de esperarlas.
- El mensaje de `drainReads` indica si cada lectura pendiente tenía respuesta o no.

Un primer intento descartaba al *empezar* la navegación. No alcanzaba: la lectura colgada se pidió después de ese momento, y el fallo se reprodujo igual (con `pending: no response`).

## Verificación

| Comprobación | Resultado |
|---|---|
| Test sin cambios, local (Windows, Docker) | Intermitente: falló 1 de 3 y 1 de 2 corridas. |
| Registro temporal de pedidos abiertos | Tabla de arriba. Se retiró. |
| Con el descarte al empezar la navegación | Falló 1 de 5 (`pending: no response`). |
| Con el descarte en el commit, 8 corridas locales | 8/8 en verde, 6/6 subtests cada una. Con la tasa anterior (alrededor de 1 de 4), pasar 8 seguidas por azar tiene cerca de un 10 % de probabilidad: buena evidencia, no definitiva. |
| ESLint | Sin errores. |

## Límites

- Si una navegación de documento se aborta sin confirmarse, el siguiente `framenavigated` del marco principal (aunque sea una navegación dentro del mismo documento) descartaría lecturas reales. En este test no ocurre.

**Primer paso pendiente:** confirmación en CI.
