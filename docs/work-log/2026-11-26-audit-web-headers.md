# Cabeceras de navegador y recursos públicos de la web

Sesión lateral iniciada por la coordinadora de la [auditoría del mismo día](2026-11-26-root-full-stack-audit.md), 2026-11-26, sin identificador expuesto. Rama `claude/audit-web-headers-3443a0`, worktree propio, commit inicial `a06c9214`. Encargo: resolver S13 y S16, commit sólo en la rama; sin push, PR, merge ni despliegue, y sin tocar `apps/web/src/application/server/` (lo reescribe la coordinadora para F1/D2). Tablero: [audit-web-headers](../../odd/tasks/audit-web-headers.md).

## Qué cambió

- **S13.** [`next.config.mjs`](../../apps/web/next.config.mjs) agrega a todas las rutas `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()` y `Cross-Origin-Opener-Policy: same-origin`. Pantalla completa y portapapeles quedan permitidos: el visor de PDF del iframe de vista previa puede usar pantalla completa y Aulas copia el código de invitación. COOP `same-origin` no rompe nada porque la web no abre ventanas que necesiten `window.opener` (todos los `target="_blank"` llevan `noopener`). `Strict-Transport-Security: max-age=63072000; includeSubDomains` sale sólo con una regla `has` sobre `x-forwarded-proto: https`. Sin `preload`, que no se deshace rápido. [`proxy.ts`](../../apps/web/proxy.ts) no cambió: sigue emitiendo sólo la CSP con nonce y las cabeceras de `next.config.mjs` también se aplican a las páginas que pasan por él.
- **S16.** Se eliminaron `classroom-world`, `profile-docente` y `profile-estudiante` `.prompt.txt` de `apps/web/public/foxmind/`. Ningún código ni hoja de estilos los referenciaba, y las tres copias eran idénticas byte a byte (`cmp`) a las de `design/foxmind-ui-lab/assets/`, que ya enlaza el [README de diseño](../../design/foxmind-ui-lab/README.md). No hizo falta mover nada. Los manifiestos de `docs/verification/product-parity/` que listan esas rutas con hash quedan como evidencia histórica del candidato que describen.
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

El worktree no tenía dependencias propias: Node las encontraba subiendo al checkout principal, pero Turbopack rechaza rutas fuera de la raíz del worktree, también por junction. Se instaló con `npm ci` dentro del worktree; el cliente Prisma se genera en `.generated/` del propio worktree.

## Límites

- La vista previa de PDF en iframe no se ejercitó de punta a punta: requiere API, sesión y un archivo. Se razonó sobre sus cabeceras: el iframe es del mismo origen, COOP sólo actúa entre ventanas de nivel superior y `Permissions-Policy` no restringe pantalla completa. La respuesta enmarcada recibe su CSP de los proxies de `apps/web/src/application/server/`, que no se tocaron.
- HSTS depende de que el borde TLS fije `x-forwarded-proto`. Si en producción la web se sirve con TLS directo sin proxy, Next completa la cabecera con el protocolo del socket, pero eso no se probó con un certificado real. Un cliente puede enviar `x-forwarded-proto: https` por HTTP; el navegador ignora HSTS en respuestas sin TLS, así que no tiene efecto.
- No hay configuración de producción en el árbol; esta fila de la auditoría ya advertía que HSTS y TLS pueden estar resueltos fuera del repositorio.
- Fuera de alcance, sin cambio: `public/foxmind/` sigue publicando los PNG `*-original.png` (unos 2 MB cada uno) y una búsqueda en `apps/web/src`, `apps/web/pages` y `apps/shared-ui` no encontró quién los use. Retirarlos queda como seguimiento.

## Pendiente

Primer paso: que la sesión coordinadora revise e integre la rama `claude/audit-web-headers-3443a0` (commit local, sin push) y marque S13 y S16 en la auditoría. Push, PR o merge necesitan autorización explícita del usuario.
