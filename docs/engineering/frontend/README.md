# Frontend y composición visual

Next Pages Router conserva las rutas y proxies `/api/v1`; el backend mantiene autorización y publicación. El frontend se organiza por dominio y caso de uso, con composición global separada. La organización por casos de uso está integrada en `main`. El [diseño UX/UI](../../design/README.md) conserva la experiencia vigente.

El candidato de origen `codex/frontend-cohesion` conserva su [recibo](../../verification/frontend-cohesion.json) de 1.288 pruebas y recorridos propios. La [integración con backend](../../verification/refactor-integration.json) tiene evidencia nueva del conjunto y registra su entrega local; los resultados originales no se atribuyen al combinado.

## Dónde ubicar un cambio

| Superficie | Responsabilidad |
|---|---|
| `apps/web/pages` | Adaptadores Next de páginas y rutas HTTP |
| `apps/web/src/screens` | Pantallas que coordinan sesión y features públicas |
| `apps/web/src/application/shell` | Tema, foco global y composición ordenada de estilos de producto |
| `apps/web/src/application/navigation` | Destinos, continuaciones y navbar |
| `apps/web/src/application/clients` y `transport` | Composición de clientes autenticados y transporte HTTP genérico |
| `apps/web/src/application/workflows` | Coordinación entre capacidades: colección/creación/interior de aula, sesión de actividad, Foxy y avisos |
| `apps/web/src/application/server` | Proxies Node, SSR privado y captura estática de enlaces de prueba |
| `apps/web/src/features/<dominio>/<caso>` | Componentes, estado, reglas y estilos del caso; pruebas próximas cuando corresponda |
| `features/<dominio>/api` y `model` | Adaptadores HTTP y contratos/reglas compartidos dentro del dominio |
| `apps/shared-ui` | Controles, feedback, Markdown, fechas, portadas y estilos genéricos |

Las features son identity, agenda, classrooms, curriculum, materials, communication, activity-authoring, participation, grading, home, notifications, foxy, study y files. Exponen entradas explícitas `index.ts`; cuando se necesita transporte puro, `api.ts` evita cargar TSX/CSS. Otra feature no importa sus archivos internos. Shared no importa features ni composición. Los directorios anteriores `apps/classrooms-ui`, `apps/agenda-ui`, `apps/web/src/components` y `apps/web/src/lib` están retirados.

`application` se usa porque `src/app` está reservado para App Router y es incompatible con la ubicación actual de `pages`. Los antiguos componentes planos `academic-*` están agrupados en workflows. La coordinación entre dominios permanece allí; las reglas y el estado de cada capacidad pertenecen a su feature. No crear carpetas para funcionalidades pequeñas ni reemplazar un componente grande por un hook que concentre las mismas responsabilidades.

| Dominio | Casos principales |
|---|---|
| materials | catalog, reader, publishing |
| study | folders, conversations, creations, practice |
| activity-authoring | drafting, generation, publication |
| grading | editing, ai-review, publication, results, progress |
| classrooms | collection, enrollment, creation, workspace, members, settings |
| foxy | conversations, context, collections, resources, publication, visuals, tools, workspace |
| agenda | calendar, event-editor, event-details, upcoming |
| curriculum | plan, extraction |
| identity | authentication, profile, settings y controles internos compartidos |
| home / notifications | dashboard y cola / inbox |
| participation | questionnaire, practical, receipts y revisión |
| communication / files | Piezas pequeñas conservadas sin subdivisión ceremonial |

## Composición y contratos

`application/navigation/destinations.ts` define continuaciones y destinos globales; `account-navbar.tsx` compone cuenta, búsqueda, aulas y notificaciones. `application/shell/ApplicationShell.tsx` conserva tema, foco y cleanup. `_app` incorpora `application/shell/styles/product.css` y captura inicial de documento Foxy; `_document` mantiene el orden del script de prueba mediante `application/server/token-capture.ts`. La CSP de páginas no admite `'unsafe-inline'` en scripts. `proxy.ts` genera un nonce por request con `application/server/content-security-policy.ts`, y `_document` lo aplica a los scripts de Next y al de captura. Por eso `_app` define `getInitialProps` y todas las páginas se renderizan por request. `/api` y `/_next` conservan la política de `next.config.mjs`. `style-src` conserva `'unsafe-inline'` a propósito: Next inyecta elementos `<style>` sin nonce en `next dev` y en su página 404 por defecto, y React escribe atributos `style`; restringirlo rompería esas vistas a cambio de poco, porque no hay puntos de inyección de HTML y los scripts ya exigen nonce (comprobado en Chromium el 23/11/2026). `next.config.mjs` agrega a todas las rutas `Permissions-Policy` (cámara, micrófono, geolocalización, pagos, USB y Topics desactivados; pantalla completa y portapapeles quedan permitidos porque los usan el visor de PDF en iframe y la copia del código de invitación) y `Cross-Origin-Opener-Policy: same-origin`, posible porque no hay flujos con ventanas emergentes que necesiten `window.opener`. `Strict-Transport-Security` sólo sale cuando la request trae `x-forwarded-proto: https`, que pone el borde TLS; el desarrollo local por HTTP no la recibe. `public/` sirve sólo recursos que consume la web: los prompts de generación de imágenes y los PNG originales de los que salen las versiones WebP viven en `design/foxmind-ui-lab/assets/`.

Las pantallas reúnen sesión, ruta y capacidades públicas. `application/clients/agenda-client.ts` adapta el caller autenticado de Agenda. Biblioteca, Autoría y Corrección reciben operaciones tipadas; sus adaptadores conocen las rutas HTTP. El transporte genérico conserva CSRF, timeout, abort y cabeceras del editor; la validación histórica de respuestas académicas se inyecta desde la composición, fuera del transporte genérico. El transporte Node queda fuera de las entradas de navegador. Los proxies limitan destino, método y payload; ocultar controles no sustituye permisos.

En Estudio, reemplazar el contexto invalida resultados tardíos y su recuperación; una escritura confirmada sigue confirmada aunque falle el refresh. El intento creado se obtiene de su recibo, sin inferirlo por orden de la colección. En Corrección, recarga y navegación comparten la decisión de reemplazar o conservar el borrador. Guardar y publicar siguen siendo operaciones distintas.

Los rechazos de Aulas/Foxy descartan el cuerpo pendiente sin retener chunks, dentro de un presupuesto adicional finito y de la ventana metadata absoluta de 10 s desde la entrada. Se conserva el tamaño JSON aceptado. Una vez drenado, entregan el error completo; si se exceden descarte/plazo o se cancela, abortan el transporte y liberan listeners y timer. No se garantiza JSON de error para un cuerpo arbitrariamente grande. Implementación compartida: [ciclo del cuerpo rechazado](../../../apps/web/src/application/server/rejected-request-body.ts).

### Transporte común de los proxies

Los proxies del servidor web usan un núcleo común, [api-transport](../../../apps/web/src/application/server/transport/api-transport.ts): validación del destino (https, o http sólo a loopback, sin credenciales), cabeceras permitidas hacia la API más la dirección del cliente firmada, lectura acotada de cuerpos, descarte de cuerpos rechazados con presupuesto y plazo, cierre de la conexión, y una única forma de error `{ error: { code, requestId } }` con `Content-Type: application/json; charset=utf-8`, `X-Request-Id` y `Retry-After` en 503. Sólo el proxy de identidad reenvía cualquier `Set-Cookie`; el resto reenvía únicamente el borrado exacto de `foxmind_session`, así una ruta fuera de identidad no puede fijar cookies en el navegador. Los códigos de error conservan sus nombres. Cada proxy declara sus rutas, métodos y límites. Un cuerpo rechazado mientras llega se descarta sin guardarlo, dentro de un presupuesto y la ventana de 10 s, y recién entonces se responde; si se pasa, se corta la conexión. Un cuerpo cuyo tamaño declarado ya excede el límite (subidas binarias) no se lee: se responde y se cierra. Las descargas binarias de archivos sólo conservan los tipos que sirve la API (PDF, PNG, JPEG, ZIP, DOC, DOCX, PPT, PPTX, XLSX); otro tipo se entrega como `application/octet-stream`. Los límites de 50 MB salen de `FILE_MAX_BYTES` (`src/core/domain/documents/document-formats.ts`), el mismo valor decimal que aplica la API. Migrados: home, agenda, cupo de IA, archivos, estudio, adjuntos de chat y Foxy. Identidad conserva su transporte con `fetch` y la API `Request`/`Response`, que fijan sus pruebas, y usa del núcleo el destino; también rechaza `content-encoding` distinto de `identity`. Aulas, según el [tablero](../../../odd/tasks/audit-shared-transport.md).

Notice/Dialog viven en `apps/shared-ui/feedback.tsx`; Button/Input/Label, clases y portadas son genéricos. La navegación específica de aula pertenece a classrooms. El diseño vigente usa Nunito y navegación compacta hasta 1000 px; la reorganización conserva esos valores. Los estilos específicos viven en su dominio; los temas que coordinan varias capacidades, en shell/navigation. `product.css` conserva el orden de importación global. Las hojas Expedición se importan al final: los tokens ([expedition-tokens.css](../../../apps/web/src/application/shell/styles/expedition-tokens.css)), el acceso, la navegación y el Inicio. Para ganarle a las hojas Brújula sin `!important`, el acceso ancla sus selectores en `#foxmind-product`. La navegación e Inicio necesitan `#foxmind-product#foxmind-product`, porque ahí las hojas anteriores llegan a (1,6,0). Una prueba por superficie exige ese anclaje; hay que retirarlo cuando se retiren esas hojas. Para ganchos globales sobre componentes con módulos CSS se usan atributos `data-*`, como los `data-quota-*` del saldo, y no nombres de clase con hash. Se retiraron únicamente reglas exactamente repetidas con prueba de orden; los overrides distintos no se eliminan por parecido. Recursos de producción: `apps/web/public`. Los nombres fm3d/p5 aún utilizados no autorizan borrar sus recursos.

## Comprobar una pantalla

Revisar roles, carga/vacío/error, confirmación, foco/teclado, mobile/tablet/desktop, contraste y movimiento reducido. Una captura acredita lo visible; no demuestra transacción o persistencia. El guard AST existente comprueba entradas y ciclos; `check-frontend-architecture.mjs` añade imports por dominio, transporte fuera de presentación tipada y estilos genéricos sin dependencia de features. El inventario y rutas explícitas de suites deben acompañar cada movimiento o prueba nueva.

Fuentes: [páginas](../../../apps/web/pages/), [pantallas](../../../apps/web/src/screens/), [features](../../../apps/web/src/features/), [composición](../../../apps/web/src/application/), [controles](../../../apps/web/src/application/shell/styles/brujula-controls.css), [navegación de aula](../../../apps/web/src/features/classrooms/workspace/ClassroomNavigation.tsx). [Política documental](../../documentation-policy.md).
