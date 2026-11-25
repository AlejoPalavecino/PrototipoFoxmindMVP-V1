# Diagnóstico del registro en los recorridos integrados (24/11/2026)

- **Alcance autorizado:** el 24/11 el usuario pidió resolver cada bloque rojo de la corrida completa de CI hasta dejarlos en verde, con commit, push y nuevas corridas incluidos. No incluye despliegue.
- **Rol:** coordinador, único escritor. Rama `main`, worktree raíz, commit inicial `0d9c2483`. La sesión no expone su identificador.

## Qué pasó

En la corrida manual 45505468221 (sobre `0d9c2483`), seis de siete jobs quedaron en verde, incluidos `wrappers` e `integration-owned`. `owned-browser` pasó 48 tests y falló en `tests/p6-mobile-navigation.test.mjs`. Ese archivo nunca había llegado a correr en CI, porque antes el grupo se cortaba en Brújula.

El fallo fue al crear la cuenta del estudiante, en un contexto de 320 px: `account()` (`tests/p4-integration-helpers.mjs`) esperó 30 s el campo «Nombre» del registro y no lo encontró. La cuenta del docente, creada justo antes, sí se completó.

En la pantalla de identidad, el formulario sólo aparece cuando `GET /auth/session` responde. Mientras carga o durante un `Retry-After`, queda deshabilitado, y `fill` espera igual en los dos casos. El log de CI no dice cuál de las tres situaciones fue. Localmente, en Windows con Docker, no se reprodujo: 4 de 4 corridas en verde.

**Causa:** sin comprobar. No se cambió producto ni se agregaron esperas a ciegas.

## Cambios

Sólo pruebas:

- `tests/p4-integration-helpers.mjs`: si no se puede completar el formulario de registro, `account()` lanza un error que incluye la URL, el texto visible de la página (600 caracteres) y los últimos pedidos `/auth/` o con estado ≥ 400. El error original queda como `cause`.

## Verificación

| Comprobación | Resultado |
|---|---|
| `p6-mobile-navigation` local, 4 corridas | 4/4 en verde; no se reproduce. |
| Fallo forzado (etiqueta inexistente, temporal y retirada) | El error muestra la página completa del registro y `200 GET /api/v1/auth/session`. |
| ESLint sobre el helper | Sin errores. |
| CI 45511454980 sobre `13110f07` | **Regresión propia:** `fast` falló en `p5-integration-controls`, que prueba `account()` con una página falsa sin `on`/`off` (`page.on is not a function`). Antes de publicar se había corrido sólo el recorrido móvil, no las pruebas del helper. |
| Corrección: `page.on?.` / `page.off?.` | `p5-integration-controls`: RED 7/1, GREEN 8/0. `npm run test:complete -- --group fast`: 3102 pasan, 0 fallan. |
| CI 45511454980 (`13110f07`), 45516265693 (`7c01ef3b`) y 45525480336 (`234e046c`) | `p6-mobile-navigation` pasó en las tres; no se repitió el fallo. Queda como intermitente sin causa comprobada. |
| CI, `workflow_dispatch` 45525480336 sobre `234e046c` | Los siete jobs en verde: `verify`, `fast`, `owned-db`, `owned-browser`, `owned-services`, `wrappers` e `integration-owned`. |

## Límites

- Si en CI el test pasa, el fallo queda como intermitente y sin causa comprobada.
- Si vuelve a fallar, el diagnóstico debería mostrar la causa.

**Primer paso pendiente:** ninguno propio. Si `p6-mobile-navigation` vuelve a fallar, el error ya trae el estado de la página.
