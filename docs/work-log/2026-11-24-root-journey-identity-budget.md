# Cupo de identidad de los recorridos integrados con navegador (24/11/2026)

- **Alcance autorizado:** el 24/11 el usuario pidió resolver cada bloque rojo de la corrida completa de CI hasta dejarlos en verde, con commit, push y nuevas corridas incluidos. No incluye despliegue.
- **Rol:** coordinador, único escritor. Rama `main`, worktree raíz, commit inicial `92c310e1`. La sesión no expone su identificador.

## Causa

En CI, `owned-browser` falló tres veces seguidas en `tests/brujula-browser.test.mjs`. Localmente, al abrir `/notificaciones`, `GET /api/v1/auth/session` volvió con **429** a los 166 ms (registro temporal de pedidos, retirado después). Sin sesión, la página no monta la bandeja y el test espera un pedido que nunca sale. Una vez superado Brújula con una espera, el grupo cayó en el archivo siguiente: `p7-history-integration` también recibía 429 `RATE_LIMITED`, y detrás quedaban 30 archivos sin correr.

Es el mismo mecanismo de [P6](2026-11-24-root-p6-rate-window.md) y de `p5-integration` (`9fcd4a51`). La regla `general-identity` admite 240 pedidos por minuto por IP y 120 por sesión. Los recorridos programados hacen muchos más pedidos por minuto que una persona, y todos los actores comparten `127.0.0.1`. **21 de los 46 archivos** de `owned-browser` ya tenían parches propios para el 429 (esperan `Retry-After` y reintentan una vez).

Los runtimes de identidad P33 (`p33-recovery`, `p33-verification`, `p33-password-change`, `p33-registration-profile`) ya suben `general-identity` a 1000 con `AUTH_RATE_LIMITS_JSON`. El presupuesto real se prueba aparte en `p33-identity-http`, con límite 1. Al runtime compartido de P4 le faltaba ese ajuste.

## Cambios

- `scripts/p4-integration-runtime.mjs`: pasa `AUTH_RATE_LIMITS_JSON` con `general-identity` en 1000 por IP y 1000 por sesión. Login, registro, recuperación, verificación, cambio de contraseña, perfil y los cupos propios de códigos e invitaciones de aula conservan sus valores reales.
- Se retiraron las esperas que el ajuste vuelve innecesarias: `waitForIdentityWindows` (agregado hoy en `92c310e1`) en `tests/p4-integration-helpers.mjs`, sus usos en P6 y P5, y la espera en línea de P5 de `9fcd4a51`. La espera en Brújula se probó localmente y se retiró antes de publicar.
- Ningún test de los que usan este runtime exige que salte el límite general: los manejadores de 429 que tienen son condicionales y quedan como respaldo.

## Verificación

| Comprobación | Resultado |
|---|---|
| `brujula-browser` con el runtime anterior | RED: vence `waitForResponse` en la línea 119, como en CI. |
| `owned-browser` completo con Brújula arreglado por espera, antes del ajuste | 66/2/2: falla `p7-history-integration` (subtest 2) con 429 `RATE_LIMITED` y quedan 30 archivos sin correr. |
| Con el ajuste: `brujula-browser`, `p7-history-integration`, `p6-wall-integration`, `p5-integration` | 1/0, 5/0, 7/0 y 13/0, sin ninguna espera de `Retry-After`. |
| ESLint sobre los archivos tocados | Sin errores. |
| `npm run test:complete -- --group owned-browser` (Windows, Docker) | 187 pasan, 0 fallan, 0 salteados en los 46 archivos. |
| `node scripts/run-ci-suite.mjs --suite integration-owned` | 81 pasan, 0 fallan. |

## Límites

- En estos recorridos ya no se ejercita el límite general por IP o sesión. Ese comportamiento sigue cubierto por `p33-identity-http`.

**Primer paso pendiente:** confirmar `owned-browser` e `integration-owned` en la corrida manual de CI.
