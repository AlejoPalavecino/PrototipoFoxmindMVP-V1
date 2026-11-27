# Feature: Cabeceras de navegador y recursos públicos de la web (S13, S16)

- **Spec:** #especificacion
- **Design:** #diseno
- **Approval:** approved
- **Evidence mode:** candidate-v1
- **Trace mode:** requirements-v1

El 2026-11-26 la sesión coordinadora de la [auditoría](../../docs/work-log/2026-11-26-root-full-stack-audit.md) encargó resolver S13 y S16 en la rama `claude/audit-web-headers-3443a0`, con commit sólo en esa rama. No concede push, PR, merge ni despliegue, y excluye `apps/web/src/application/server/`.

## Seguimiento Git

Base `main` en `a06c9214`. Commit en la rama del worktree; integración a cargo de la sesión coordinadora.

## Especificacion

- **REQ-001:** (S13) Toda respuesta de la web incluye `Permissions-Policy` que desactiva cámara, micrófono, geolocalización, pagos, USB y Topics, sin desactivar pantalla completa ni portapapeles, y `Cross-Origin-Opener-Policy: same-origin`.
- **REQ-002:** (S13) `Strict-Transport-Security` (dos años, `includeSubDomains`) sale sólo cuando la request trae `x-forwarded-proto: https`; una request HTTP local no la recibe.
- **REQ-003:** (S16) `apps/web/public/` no contiene `*.prompt.txt`; los prompts siguen disponibles en `design/foxmind-ui-lab/assets/` y sus enlaces resuelven.
- **REQ-004:** Después, el usuario pidió retirar también los PNG originales sin uso: `apps/web/public/` no contiene `*-original.png` y las copias siguen en `design/foxmind-ui-lab/assets/`.

## Diseno

Las cabeceras se declaran en `next.config.mjs`, que ya cubre páginas, `/api` y `/_next`; `proxy.ts` sigue emitiendo sólo la CSP con nonce. HSTS usa una regla `has` sobre `x-forwarded-proto`: el borde TLS la fija y Next la completa con el protocolo real del socket. Sin `preload`, que es difícil de revertir. Las tres copias en `public/` eran idénticas byte a byte a las de `design/foxmind-ui-lab/assets/`, así que se eliminan sin mover nada. Los manifiestos de `docs/verification/product-parity/` que listan esas rutas son evidencia histórica con hashes y no se reescriben.

## Tasks

### TASK-001 — Toda respuesta desactiva funciones sensibles y aísla su ventana
- **State:** DONE
- **Depends on:** none
- **Owner:** orchestrator
- **Requirements:** REQ-001, REQ-002
- **Verification:** tests/web-security-headers.test.mjs
- **Acceptance:** La regla global trae `Permissions-Policy` y COOP `same-origin`; la única regla con HSTS exige `x-forwarded-proto: https`; con `next start` en puerto propio, una request HTTP no recibe HSTS y una con `x-forwarded-proto: https` sí; la CSP con nonce y la vista previa de PDF siguen funcionando.
- **Scope:** ["apps/web/next.config.mjs", "tests/web-security-headers.test.mjs", "docs/engineering/frontend/README.md"]
- **Evidence:** {"command": "node --test tests/web-security-headers.test.mjs; next start apps/web --port 3471 + curl", "result": "RED: COOP ausente, 0 reglas HSTS; GREEN: 3/3; curl: HTTP sin HSTS, x-forwarded-proto https con HSTS, Permissions-Policy y COOP en pagina, /api y estatico, CSP con nonce intacta; run-complete-suite --group fast 3227/3227; reverificado tras retirar los PNG originales", "candidate": "sha256:d73dc1ba6679c0a80197fa01325643648d090cb96381ed90d832c84283bb756f"}
- **Blocker:** none

### TASK-002 — Los prompts de generación no se publican
- **State:** DONE
- **Depends on:** none
- **Owner:** orchestrator
- **Requirements:** REQ-003
- **Verification:** tests/web-security-headers.test.mjs
- **Acceptance:** No hay `*.prompt.txt` bajo `apps/web/public/`; las tres copias de diseño existen y el README de diseño las enlaza; `GET /foxmind/classroom-world.prompt.txt` responde 404.
- **Scope:** ["tests/web-security-headers.test.mjs", "design/foxmind-ui-lab/README.md", "docs/engineering/frontend/README.md"]
- **Evidence:** {"command": "node --test tests/web-security-headers.test.mjs; curl /foxmind/classroom-world.prompt.txt", "result": "RED: 3 prompt.txt en public; GREEN: 3/3; curl 404; docs:check 0 problemas", "candidate": "sha256:7cc4abb8d7543625b922857408c4cda1302bd9dd85beebd0559ba9a6a986bf81"}
- **Blocker:** none

### TASK-003 — Los PNG originales sin uso no se publican
- **State:** DONE
- **Depends on:** TASK-002
- **Owner:** orchestrator
- **Requirements:** REQ-004
- **Verification:** tests/web-security-headers.test.mjs
- **Acceptance:** No hay `*-original.png` bajo `apps/web/public/`; las tres copias de diseño existen; ningún código de la web ni prueba los referencia; `GET /foxmind/classroom-world-original.png` responde 404.
- **Scope:** ["tests/web-security-headers.test.mjs", "design/foxmind-ui-lab/README.md", "docs/engineering/frontend/README.md"]
- **Evidence:** {"command": "node --test tests/web-security-headers.test.mjs; next start apps/web --port 3471 + curl", "result": "RED: 3 -original.png en public; GREEN: 3/3; curl: originales 404, WebP 200; tsc, web:build, lint:boundaries exit 0; run-complete-suite --group fast 3227/3227", "candidate": "sha256:7cc4abb8d7543625b922857408c4cda1302bd9dd85beebd0559ba9a6a986bf81"}
- **Blocker:** none
