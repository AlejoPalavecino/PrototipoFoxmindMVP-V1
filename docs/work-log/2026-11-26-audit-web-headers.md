# Cabeceras de navegador y recursos públicos de la web

Sesión lateral iniciada por la coordinadora de la [auditoría del mismo día](2026-11-26-root-full-stack-audit.md), 2026-11-26, sin identificador expuesto. Rama `claude/audit-web-headers-3443a0`, worktree propio, commit inicial `a06c9214`. Encargo: resolver S13 y S16, commit sólo en la rama; sin push, PR, merge ni despliegue, y sin tocar `apps/web/src/application/server/` (lo reescribe la coordinadora para F1/D2). Tablero: [audit-web-headers](../../odd/tasks/audit-web-headers.md).

## Qué cambió

- **S13.** [`next.config.mjs`](../../apps/web/next.config.mjs) agrega a todas las rutas `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()` y `Cross-Origin-Opener-Policy: same-origin`. Pantalla completa y portapapeles quedan permitidos: el visor de PDF del iframe de vista previa puede usar pantalla completa y Aulas copia el código de invitación. COOP `same-origin` no rompe nada porque la web no abre ventanas que necesiten `window.opener` (todos los `target="_blank"` llevan `noopener`). `Strict-Transport-Security: max-age=63072000; includeSubDomains` sale sólo con una regla `has` sobre `x-forwarded-proto: https`. Sin `preload`, que no se deshace rápido. [`proxy.ts`](../../apps/web/proxy.ts) no cambió: sigue emitiendo sólo la CSP con nonce y las cabeceras de `next.config.mjs` también se aplican a las páginas que pasan por él.
- **S16.** Se eliminaron `classroom-world`, `profile-docente` y `profile-estudiante` `.prompt.txt` de `apps/web/public/foxmind/`. Ningún código ni hoja de estilos los referenciaba, y las tres copias eran idénticas byte a byte (`cmp`) a las de `design/foxmind-ui-lab/assets/`, que ya enlaza el [README de diseño](../../design/foxmind-ui-lab/README.md). No hizo falta mover nada. Los manifiestos de `docs/verification/product-parity/` que listan esas rutas con hash quedan como evidencia histórica del candidato que describen.
- **PNG originales, a pedido del usuario después del primer commit.** Se retiraron `classroom-world`, `profile-docente` y `profile-estudiante` `-original.png` de `apps/web/public/foxmind/` (unos 6,9 MB en total). Ningún código de la web ni prueba los referencia: la web usa las versiones WebP, y `review/classrooms/prepare-asset.mjs` ya escribe el original en `design/foxmind-ui-lab/assets/`, donde están las tres copias idénticas (`cmp`) que enlaza el README de diseño. El arnés `wizard-reference` copia `public/` entero, sin nombrar archivos.
- Prueba nueva [`tests/web-security-headers.test.mjs`](../../tests/web-security-headers.test.mjs), registrada en el inventario y en la ruta `fast` de la suite completa y en `scripts/ci-suites.mjs`. Guía actualizada: [frontend](../engineering/frontend/README.md).

## Comprobaciones

RED antes de la corrección con `node --test tests/web-security-headers.test.mjs`: 0/3, por las causas esperadas (COOP `undefined`, ninguna regla con HSTS, tres `*.prompt.txt` bajo `public/`). GREEN: 3/3. `tests/p3-web-proxy.test.mjs`, que ya leía las reglas de `next.config.mjs` y la CSP con nonce: 11/11.

| Comando | Resultado |
| --- | --- |
| `npx tsc --noEmit -p apps/web/tsconfig.json` | exit 0 |
| `npm run web:build` | exit 0 |
| `npm run test:complete -- --group fast` | 3227/3227, incluida la prueba nueva (las líneas «1 failed» del log son las fallas intencionales dentro de las pruebas del propio ejecutor) |
| `npm run lint:boundaries` | exit 0 |
| `node scripts/run-complete-suite.mjs --check` | 748 entradas, 23 rutas |
| `npm run docs:check` | 0 problemas |
| `taskboard.py check odd/tasks/audit-web-headers.md --current` | 2 tareas válidas, huellas iguales a las capturadas antes de verificar |

Cabeceras reales con `next start apps/web --port 3471`, sin API: `GET /sign-in` por HTTP trae `Permissions-Policy`, `Cross-Origin-Opener-Policy: same-origin`, `X-Frame-Options` y la CSP con nonce, sin HSTS; con `x-forwarded-proto: https` agrega `Strict-Transport-Security`. `/api/v1/files/x` y `/foxmind/logo.webp` llevan las mismas cabeceras nuevas. `/foxmind/classroom-world.prompt.txt` responde 404. En el navegador integrado, `/sign-in` hidrató sin violaciones de CSP; `document.featurePolicy` informa cámara bloqueada y pantalla completa y `clipboard-write` permitidos. El único error de consola fue el 503 esperable de la sesión, porque no había API.

Retiro de los PNG originales: la prueba ampliada falló primero con los tres `-original.png` bajo `public/` y pasó 3/3 después. Se repitieron `tsc` (exit 0), `web:build` (exit 0), la suite `fast` (3227/3227) y `lint:boundaries` (exit 0). Con `next start` en el puerto 3471, los tres originales responden 404 y `classroom-world.webp` y `profile-docente.webp` siguen en 200. Las huellas del tablero se recalcularon antes de esta verificación y coinciden al cerrarla.

Antes de publicar, la rama se rebasó sobre `7e192110` (F1, corte 1, de la coordinadora). Hubo conflictos sólo en `docs/documentation-map.json` y `scripts/ci-suites.mjs`, y se conservaron las entradas de ambos lados. Sobre esa base: `run-complete-suite --check` 749 entradas, `docs:check` 0 problemas, `tsc` y `web:build` exit 0, `fast` 3230/3230 y `lint:boundaries` exit 0. Las huellas del tablero se recalcularon porque la guía de frontend incorporó el texto de la coordinadora.

A pedido de la coordinadora, la rama incorporó `490105ff` (F1, corte 2) con un merge sin conflictos; el push forzado que exigía un rebase quedó bloqueado por permisos y el usuario eligió el merge. El árbol resultante es idéntico al del rebase verificado. Sobre esa base: `run-complete-suite --check` con 749 entradas, `docs:check` sin problemas, `tsc` y `web:build` exit 0, `fast` 3231/3231 y `lint:boundaries` exit 0. Con `next start` en el puerto 3471, HSTS sale sólo con `x-forwarded-proto: https`, Permissions-Policy y COOP aparecen en páginas y `/api`, la CSP con nonce sigue igual, prompts y PNG originales dan 404 y el WebP 200. Las huellas se recalcularon porque cambió la guía de frontend.

El worktree no tenía dependencias propias: Node las encontraba subiendo al checkout principal, pero Turbopack rechaza rutas fuera de la raíz del worktree, también por junction. Se instaló con `npm ci` dentro del worktree; el cliente Prisma se genera en `.generated/` del propio worktree.

## Límites

- La vista previa de PDF en iframe no se ejercitó de punta a punta: requiere API, sesión y un archivo. Se razonó sobre sus cabeceras: el iframe es del mismo origen, COOP sólo actúa entre ventanas de nivel superior y `Permissions-Policy` no restringe pantalla completa. La respuesta enmarcada recibe su CSP de los proxies de `apps/web/src/application/server/`, que no se tocaron.
- HSTS depende de que el borde TLS fije `x-forwarded-proto`. Si en producción la web se sirve con TLS directo sin proxy, Next completa la cabecera con el protocolo del socket, pero eso no se probó con un certificado real. Un cliente puede enviar `x-forwarded-proto: https` por HTTP; el navegador ignora HSTS en respuestas sin TLS, así que no tiene efecto.
- No hay configuración de producción en el árbol; esta fila de la auditoría ya advertía que HSTS y TLS pueden estar resueltos fuera del repositorio.

## Pendiente

Primer paso: que la sesión coordinadora revise e integre la rama `claude/audit-web-headers-3443a0` (publicada con PR a pedido del usuario) y marque S13 y S16 en la auditoría. Push, PR o merge necesitan autorización explícita del usuario.
