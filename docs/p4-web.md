# Private file web integration

The existing P3 account route and transport remain unchanged. The more-specific Pages Router endpoint `api/v1/files/[[...path]].ts` owns only the P4 file allowlist. Configure the same exact trusted `FOXMIND_API_ORIGIN` used by account transport: HTTPS, or HTTP on loopback, with no path, credentials or trailing slash.

The proxy streams binary bodies under Node backpressure. It requires the browser-supplied exact Content-Length for PUT, counts bytes, caps transfers at 50,000,000 bytes and metadata/JSON at 16 KiB, rejects compressed input and redirects, and forwards only Cookie, Origin, CSRF and Content-Type. Forwarded authorization/host headers are ignored. Response cookies and safe file headers survive; no-store/nosniff are enforced. Receive deadlines are 10 seconds and total transport deadlines are 60 seconds, retained through downstream completion. Disconnects cancel the upstream operation. The backend remains the permission authority.

`/files?kind=draft&id=<UUID>&purpose=plan` and `/files?kind=classroom&id=<UUID>&purpose=plan|material` support an existing domain context only. Every query key must occur once; unknown keys, missing purpose and draft material requests show the missing-context message. The view does not create domain records, publish classrooms or implement P5/P7. An ID from a URL never authorizes access.

The browser reads real P3 session state and obtains a fresh `/api/v1/auth/csrf` binding before each metadata POST and binary PUT. It retains the server's pending admission on transfer failure so a retry uses the same file ID and bytes; it never marks a selected file ready. `Actualizar estado` refreshes status and usage. Server rejections, quota errors and Retry-After cooldowns remain visible. PDF/JPEG/PNG can be previewed only after server readiness; every ready file offers download, including Office/ZIP.

## Browser verification contract

Open a context seeded by the coordinator's isolated SQL fixtures, using a real verified P3 session. The file input label is `Seleccionar archivo`; the initial submit button is `Subir archivo`, the retry button is `Reintentar subida`, and refresh is `Actualizar estado`. Readiness text is `Archivo listo`, pending text is `Archivo pendiente de validación`, and rejection text is `Archivo rechazado`. Ready PDF/image actions are `Previsualizar archivo`, iframe title `Vista previa del archivo`, and `Descargar archivo`. Capture the POST response's public `id` to query storage evidence; no internal storage identifier is rendered.

## Checks

`node --test tests/p4-web-proxy.test.mjs tests/p4-web-client.test.mjs` covers the binary allowlist, metadata cap, safe headers/cookies/CSRF, exact length, redirects/configuration, disconnect cancellation and client pending/error semantics. `npm run test:web` checks unchanged P3 web behavior. A real browser/API/SQL/scanner journey remains the coordinator's integrated verification.
