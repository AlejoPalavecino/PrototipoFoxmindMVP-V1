# Cuelgue de `p3-browser` al reiniciar la API (24/11/2026)

- **Alcance autorizado:** el 24/11 el usuario pidió resolver cada bloque rojo de la corrida completa de CI hasta dejarlos en verde, con commit, push y nuevas corridas incluidos. No incluye despliegue.
- **Rol:** coordinador, único escritor. Rama `main`, worktree raíz, commit inicial `92c310e1`. La sesión no expone su identificador.

## Causa

En CI (corridas 45449025234, 45462128910 y 45480172736), el job `wrappers` falló en `tests/p3-browser.test.mjs`. El subtest "profile persists in SQL across API restart…" pasó unos 200 s sin terminar, hasta que el límite de 210 s del test lo canceló. Después no corrieron 16 rutas de wrappers. Localmente pasó lo mismo: 196 s en ese paso y cancelación.

`restartApi()` en `scripts/p3-browser-runtime.mjs` sólo llamaba a `api.close()`. El servidor HTTP espera a que terminen las conexiones abiertas, y la pestaña del navegador mantiene un stream largo con la API (como el de cuota de IA), que nunca termina. El runtime de P4 ya resolvía esto con `server.closeAllConnections()`, que es lo que pasa en un reinicio real del proceso.

## Cambios

- `scripts/p3-browser-runtime.mjs`: `restartApi()` llama a `closeAllConnections()` sobre el servidor HTTP mientras `api.close()` está en curso, igual que P4. Sólo cambia el harness de prueba, no el producto.

## Verificación

| Comprobación | Resultado |
|---|---|
| `node --test --test-isolation=none tests/p3-browser.test.mjs` antes del cambio (Windows, Docker) | RED: el subtest del reinicio tarda 196 s y se cancela; los siguientes fallan por cancelación. El corte manual (`timeout`) dejó dos contenedores propios de esa corrida (PostgreSQL y Mailpit de P3), que se eliminaron después de verificar etiqueta y hora de creación. |
| Mismo test después del cambio | GREEN 10/10; el reinicio tarda 1,1 s. No quedaron contenedores de la corrida. |
| `npm run test:complete -- --group wrappers` | Las 19 rutas terminan bien, incluidas las 16 que en CI quedaban sin correr. |

## Límites

- Mientras se verificaba, otro proceso que no era de esta sesión corría pruebas de Estudio en la misma máquina (con contenedores `foxmind-agenda-*`). No se tocó.

**Primer paso pendiente:** confirmar `wrappers` en CI.
