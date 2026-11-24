# Pendientes de estabilidad posteriores al endurecimiento de seguridad (23/11/2026)

- **Alcance autorizado:** resolver los tres pendientes que dejó el [registro de seguridad](2026-11-22-root-security-hardening.md): dirección real del cliente detrás de un proxy de borde local, 503 intermitente en `/home` y verificaciones de CSP y del ingreso por código. El 24/11 el usuario pidió además corregir los dos hallazgos de abajo y después hacer commit y push a `main`. No incluye despliegue.
- **Rol:** coordinador (sesión única, sin agentes escritores). Sesión no expuesta.
- **Rama y base:** `main` en `3a6c1478`, sobre el checkout principal.
- **Tablero:** [odd/tasks/stability-followups.md](../../odd/tasks/stability-followups.md).

## Cambios

- **Dirección del cliente detrás de Caddy o nginx.** Se implementó la decisión del 22/11 sobre la firma que ya existía. La web lee `X-Forwarded-For` sólo si el par TCP está en `WEB_TRUSTED_PROXY_CIDRS`, de derecha a izquierda. Si el borde de confianza no identifica al cliente, firma `unresolved` y la API responde 503. Las direcciones IPv6 se agrupan por /64. Sin la variable, todo sigue igual. Ver [guía de identidad](../engineering/identity/README.md#dirección-del-cliente-en-los-límites-por-ip).
- **503 intermitente en `/home`.** No se reprodujo. El diagnóstico anterior descartaba el error real y `/home` no registraba nada. Ahora el runner de aulas agrega `cause` (código Prisma `Pnnnn` o SQLSTATE; si no, `other`, nunca mensajes ni valores) y `/home` emite `home.read UNEXPECTED` con su causa.
- **`p5-integration`.** Un sondeo temporal mostró que el test agota su propio cupo: la sesión del docente llega a 120/120 en unos 38 s y el balde compartido de `127.0.0.1` a 233/240, por llamadas de API programadas. Ahora, antes del tramo final, el test espera a que se reinicien esas ventanas. Los límites reales no cambian.
- **Presupuesto del build de la API.** `buildApi` pasa de 30 s a 90 s, el mismo valor que ya usaba el arranque local. Los prerrequisitos de `test:complete` permiten 95 s para el build y 90 s para cada `tsc`.
- **CSP.** Se verificó en el navegador y no hizo falta cambiar código. `style-src` conserva `'unsafe-inline'`, y la razón quedó en la [guía de frontend](../engineering/frontend/README.md).

## Verificación

| Comprobación | Resultado |
|---|---|
| `tests/proxy-client-address.test.mjs` | RED 4 fallas por la causa esperada; GREEN 12/12. |
| `tests/client-address.test.mjs` | RED 1 (el `unresolved` firmado se aceptaba); GREEN 4/4. |
| `tests/home-diagnostics.test.mjs`, `tests/audit-scheduler-diagnostics.test.mjs` | RED (sin export ni evento); GREEN 7/7. |
| `login-inicio-integration` | 12 corridas, todas 6/6: 5 secuenciales, 2 rondas de 3 copias en paralelo y 1 final. |
| Chromium sobre `next start` y `next dev` (7 rutas) | Todas se hidratan; 0 violaciones de CSP. |
| `p5-integration` | El ingreso por código en el navegador pasa. El archivo da 11/13 por un 429 en el logout (línea 271), igual que sobre `3a6c1478` sin estos cambios. |
| Grupo `fast` | 3098 pasan y 0 fallan (línea base 3091). Con el runner oficial `npm run test:complete -- --group fast`, después del cambio de presupuesto: 3098/0 en 631 s. |
| `p5-integration` con el arreglo | 13/13. |
| `local-api-build`, `api-build-pipeline`, `audit-complete-suite` | 31/31. |
| `web:build`, `lint:boundaries`, `docs:check` | Salida 0; docs sin problemas. |

Antes del cambio de presupuesto, `test:complete` se cortaba en su prerrequisito `build-api.mjs` (tope de 30 s; en esta máquina tarda unos 38 s). La primera medición del grupo `fast` se hizo con un driver local ignorado por Git que usa las mismas funciones del runner. Después del cambio, el runner oficial completó el grupo.

## Límites

- La causa del 503 sigue sin confirmar. Si se repite, la salida de error de la API va a mostrar `cause`.
- `p5-integration` no forma parte de ningún grupo de la suite, así que la integración continua no lo ejecuta.
- `next dev` muestra un rechazo por `nosniff` de `_clientMiddlewareManifest.js`. No es de CSP y no impide la hidratación.
- No hubo prueba con un Caddy o nginx real; el comportamiento se verificó con pedidos sintéticos.
- Sin despliegue. Para activar el borde en el VPS hay que definir `WEB_TRUSTED_PROXY_CIDRS` y `FOXMIND_PROXY_CLIENT_KEY` en el servidor.

**Primer paso pendiente:** si el 503 de `/home` vuelve a aparecer, leer el campo `cause` en la salida de error de la API.
