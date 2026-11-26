# CI local y escala de topes de prueba (25/11/2026)

- **Alcance autorizado:** el 25/11 GitHub Actions quedó sin minutos hasta el 30/11. El usuario eligió validar los PR con «CI local + estado en GitHub» y, después de ver fallar `wrappers` por tiempos, pidió un «tope ajustable local». Commit, push y PR, sólo si los pide. No incluye despliegue ni cambios de producto.
- **Rol:** coordinador, único escritor. Rama `claude/local-ci-runner`, creada desde `origin/main` en `1be56400`.

## Cambios

- `scripts/ci-local.mjs`: corre los trabajos de `issue2-ci.yml` (`verify`, `integration-owned`, la matriz `complete-suite`) y de `secret-scan.yml` (`gitleaks`, con la imagen fijada, sobre un `git archive HEAD`). Con `--publish` publica `local/<trabajo>` como estado del commit, con `pending` al empezar. Rechaza publicar si hay cambios versionados. Guarda los logs en `.test-artifacts/ci-local/`. El build web tiene un tope local de 10 min, contra 180 s en CI.
- `scripts/test-timeout-scale.mjs`: `FOXMIND_TEST_TIMEOUT_SCALE`, de 1 a 10. Si no está definida vale 1, y rechaza valores que acorten o anulen un tope.
- La escala se aplica sólo a los dos topes que fallaron: la compilación de la API y el plazo de las suites de identidad (`scripts/p33-identity-test-env.mjs`, 30 s), y la espera de arranque de la CLI en `tests/backend.test.mjs` (4 s).
- `ci-local --timeout-scale N` define la variable y agrega «(tiempos xN)» a cada estado publicado y al resumen JSON.
- Pruebas `tests/ci-local.test.mjs` y `tests/test-timeout-scale.test.mjs`, registradas en los tres inventarios de suites. Guía: `docs/engineering/testing/README.md`.

## Causa medida

Sobre el commit `3b8d552a` del PR 18, el trabajo `wrappers` falló tres veces, cada vez por un tiempo vencido distinto:

1. La compilación de `p33-verification-resend` terminó con `exit unavailable`.
2. `compiled CLI starts on loopback` agotó su espera de 4 s.
3. Con la máquina libre, la compilación de `wrapper-backend` volvió a terminar con `exit unavailable`.

`tsc -p apps/api/tsconfig.json`, corrido solo con la máquina en reposo, tardó 38 s y luego 20 s.

## Verificación

| Comprobación | Resultado |
|---|---|
| `tests/test-timeout-scale.test.mjs` antes del módulo | RED: `ERR_MODULE_NOT_FOUND` |
| Escala + ci-local | 8/8 |
| `run-complete-suite --check` | 731 pruebas clasificadas |
| `docs:check` y ESLint sobre los archivos tocados | 0 problemas |
| `ci-local --timeout-scale 3 --jobs "complete-suite (wrappers)"`, sin publicar, sobre `1be56400` más estos cambios sin commitear | PASS en 8,6 min. Corrieron los 24 wrappers; todas las compilaciones de la API terminaron con `exit 0`. |

## Límites

- La escala no acelera nada: sólo evita que una máquina lenta corte una prueba sana. Un estado con «tiempos xN» no prueba que el código entre en los topes de CI.
- Los PR que no tengan este cambio no pueden usar la escala hasta que integren `main` con él.
