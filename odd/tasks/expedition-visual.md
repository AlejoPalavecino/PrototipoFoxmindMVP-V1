# Feature: Dirección visual Expedición (piloto en Acceso e Inicio)

- **Spec:** #especificacion
- **Design:** #diseno
- **Approval:** approved
- **Evidence mode:** candidate-v1
- **Trace mode:** requirements-v1

Aprobación del usuario del 2026-11-24 sobre las maquetas `design/auth-home-refresh/expedicion.html` y `design/auth-home-refresh/acceso.html`. La ejecución autorizada cubre los cortes 1 (tokens) y 2 (Acceso). Inicio y la documentación de diseño (TASK-004 y TASK-005) esperan una revisión con el usuario. No hay autorización de commits, push ni despliegue.

## Especificacion

- **REQ-001:** La paleta Expedición queda disponible como tokens compartidos (lago, pino, cielo, niebla, sol, sendero y naranja), con un naranja de botón que da al menos 4,5:1 con texto blanco. La tipografía sigue siendo Nunito: no se agregan fuentes.
- **REQ-002:** Iniciar sesión, Crear cuenta, Verificar correo, Recuperar acceso y Nueva contraseña muestran el paisaje pintado a pantalla completa, con el formulario en una tarjeta, el zorro guía y un acceso para pasar entre ingresar y registrarse. Los textos de estas pantallas usan voseo.
- **REQ-003:** Crear cuenta se recorre en tres paradas: el rol, después los datos y al final el aviso de correo enviado. No se puede avanzar sin elegir un rol, volver conserva lo cargado y el envío manda los mismos campos que antes (`accountRole`, `firstName`, `lastName`, `email` y `password`).
- **REQ-004:** Inicio de docente y estudiante usa el banner pintado por rol y el recorrido del día, con entregas como paradas y aulas con el avance del plan. Usa sólo datos que ya existen en el contrato de Inicio y no muestra el próximo tema.
- **REQ-005:** La barra lateral privada adopta Expedición en toda la app.

## Diseno

Decisiones del usuario del 2026-11-24:

- El registro va por paradas.
- La barra lateral pasa a Expedición en toda la app.
- El avance docente se arma con `needsReview` y `readyToPublish`, sin «x de y entregaron».
- Las tarjetas de aulas muestran `planProgress`.
- Se conserva Nunito.

Los estilos nuevos usan clases propias con el prefijo `xp-` y no se apilan sobre las hojas Brújula. El acceso deja de usar las clases `brujula-auth` y `br-auth-*`. El flujo de cuenta, la sesión, CSRF y las validaciones no cambian.

## Seguimiento Git

Rama `claude/auth-home-visual-design-6ba7ad` (worktree), base `32c93a9c`. El 2026-11-24 el usuario autorizó commitear en esta rama, sin push ni integración a `main`. `46d22a08`: código y pruebas de TASK-001 a TASK-004. El commit siguiente reúne la documentación, las capturas, este tablero, el registro y las maquetas aprobadas (TASK-005). Pendiente de autorización: push, PR o integración.

## Tasks

### TASK-001 — Tokens Expedición disponibles sin fuentes nuevas
- **State:** DONE
- **Depends on:** none
- **Owner:** orchestrator
- **Requirements:** REQ-001
- **Verification:** tests/expedition-access.test.mjs::tokens
- **Acceptance:** La hoja de tokens forma parte de la cascada real de la app, define los colores de la paleta, el naranja de botón contra blanco da al menos 4,5:1 y la familia es Nunito.
- **Scope:** ["apps/web/src/application/shell/styles/expedition-tokens.css", "apps/web/src/application/shell/styles/product.css", "tests/expedition-access.test.mjs"]
- **Evidence:** {"command": "node --test --test-concurrency=1 (expedition-home, expedition-navigation, expedition-access, 17 pruebas de Inicio, navegacion, cuenta, cuota y documentacion)", "result": "pass 169, fail 0; tsc, eslint, check-boundaries y check-frontend-architecture sin errores; tokens en la cascada real, contraste 4,88:1 del boton y lago con texto 7,94:1", "candidate": "sha256:0039fd5ed1c8d216790735ee9b56cd3e7bc397a27427c4e29f1eee320dc63406"}
- **Blocker:** none

### TASK-002 — Acceso Expedición con registro por paradas
- **State:** DONE
- **Depends on:** TASK-001
- **Owner:** orchestrator
- **Requirements:** REQ-002, REQ-003
- **Verification:** tests/expedition-access.test.mjs; tests/folder-platform.test.mjs; navegador real a 1440, 1024 y 375 px
- **Acceptance:** Con la sesión anónima, `/sign-in` y `/register` muestran escena, tarjeta, zorro y cambio de pantalla. En el registro, Continuar sin rol muestra un aviso y no avanza; con rol avanza a los datos, Volver conserva los valores y el envío produce exactamente los cinco campos. Después de un envío aceptado aparece «Revisá tu correo» con la dirección enviada. Los textos del acceso están en voseo y dicen «Estudiante».
- **Scope:** ["apps/web/src/screens/identity-screen.tsx", "apps/web/src/features/identity/authentication/account-flow-forms.tsx", "apps/web/src/features/identity/authentication/register-steps.tsx", "apps/web/src/features/identity/index.ts", "apps/web/src/features/identity/model/account-view.ts", "apps/web/src/features/identity/api/account-client.ts", "apps/web/src/features/identity/styles/expedition-auth.css", "apps/shared-ui/VerificationGuidance.tsx", "tests/expedition-access.test.mjs", "tests/folder-platform.test.mjs", "tests/entry-glass-polish.test.mjs", "tests/entry-glass-browser.test.mjs", "tests/p3-browser.test.mjs", "tests/p4-integration-helpers.mjs", "tests/p5-integration.test.mjs"]
- **Evidence:** {"command": "node --test --test-concurrency=1 (expedition-home, expedition-navigation, expedition-access, 17 pruebas de Inicio, navegacion, cuenta, cuota y documentacion)", "result": "pass 169, fail 0; tsc, eslint, check-boundaries y check-frontend-architecture sin errores; en navegador: registro por paradas con teclado, 202 y Revisa tu correo, error de ingreso, sin desbordes a 1440, 1024 y 375; integracion p3, p4, p5 y entry-glass-browser adaptadas sin ejecutar", "candidate": "sha256:36a8c70aadc4e56956e18673eabad352eec86b72e468ffb9d0ac947f5a36115f"}
- **Blocker:** none

### TASK-003 — Barra lateral Expedición en toda la app
- **State:** DONE
- **Depends on:** TASK-002
- **Owner:** orchestrator
- **Requirements:** REQ-005
- **Verification:** tests/expedition-navigation.test.mjs; pruebas de navegación existentes; navegador real expandida, plegada y móvil
- **Acceptance:** En las pantallas privadas, la barra lateral tiene fondo lago. Los textos de navegación y de las secciones dan al menos 4,5:1 contra el fondo y la sección actual se distingue con fondo blanco y marca naranja. El foco es visible sobre el lago, con un contraste de al menos 3:1. El saldo de IA ocupa una sola fila con su porcentaje y una barra, y conserva el nombre accesible y el diálogo. La ayuda es una fila «Ayuda» que abre el mismo diálogo. Saldo, ayuda y cuenta quedan al pie. Los modos plegado y móvil siguen funcionando sin desbordes. Cada regla de la hoja nueva está anclada en `#foxmind-product.fm3d-theme`.
- **Scope:** ["apps/shared-ui/NavbarParts.tsx", "apps/web/src/application/navigation/ai-quota-indicator.tsx", "apps/web/src/application/navigation/ai-quota-indicator.module.css", "apps/web/src/application/navigation/styles/expedition-navigation.css", "apps/web/src/application/shell/styles/expedition-tokens.css", "apps/web/src/application/shell/styles/product.css", "tests/expedition-navigation.test.mjs"]
- **Evidence:** {"command": "node --test --test-concurrency=1 (expedition-home, expedition-navigation, expedition-access, 17 pruebas de Inicio, navegacion, cuenta, cuota y documentacion)", "result": "pass 169, fail 0; en navegador (Playwright): iconos de notificaciones rgb(196,214,228) en escritorio y menu movil; barra lago, foco sol, Saldo de IA, Ayuda, plegada y movil sin desborde", "candidate": "sha256:633f2325f289f0fd774b8fba380075de11b58aca4c177111e6fe226fe60177e2"}
- **Blocker:** none

### TASK-004 — Inicio Expedición para docente y estudiante
- **State:** DONE
- **Depends on:** TASK-003
- **Owner:** orchestrator
- **Requirements:** REQ-004
- **Verification:** tests/expedition-home.test.mjs; pruebas de Inicio existentes; navegador real con sesión docente y estudiante sintéticas
- **Acceptance:** El saludo de cada rol muestra el paisaje pintado y el zorro decorativo, sin texto alternativo. El recorrido muestra sólo los eventos y entregas de hoy que trae `modules.agenda`, como mucho tres, y se oculta si no hay. La burbuja muestra lo más urgente: la primera entrega para revisar del docente, o la primera actividad abierta del estudiante con su cierre. Si no hay nada, dice que está todo al día, y no aparece cuando el módulo no está listo. Cada grupo de entregas docente muestra «X de Y corregidas» con `readyToPublish` y `needsReview`. Cada actividad del estudiante con `questionProgress` muestra «X de Y preguntas respondidas». Las aulas conservan el avance del plan y no muestran el próximo tema. Los textos y comportamientos que cubren las pruebas de Inicio se mantienen. Cada regla de la hoja nueva se ancla con el id raíz duplicado.
- **Scope:** ["apps/web/src/features/home/model/home-expedition.ts", "apps/web/src/features/home/dashboard/Home.tsx", "apps/web/src/features/home/queue/HomePriorities.tsx", "apps/web/src/features/home/dashboard/styles/expedition-home.css", "apps/web/src/application/shell/styles/product.css", "tests/expedition-home.test.mjs"]
- **Evidence:** {"command": "node --test --test-concurrency=1 (expedition-home, expedition-navigation, expedition-access, 17 pruebas de Inicio, navegacion, cuenta, cuota y documentacion)", "result": "pass 169, fail 0; en navegador con datos sinteticos validados por parseHomeResponse: banner por rol, recorrido de hoy, burbuja, 2 de 5 corregidas, 0 de 10 preguntas, aulas con avance del plan, movil sin desborde", "candidate": "sha256:594a5d46392182a9bde7db73a40dd95e37986662309e9e5e52b04686c58ef0af"}
- **Blocker:** none

### TASK-005 — Documentación de diseño y capturas
- **State:** DONE
- **Depends on:** TASK-004
- **Owner:** orchestrator
- **Requirements:** REQ-001, REQ-002, REQ-003, REQ-004, REQ-005
- **Verification:** node scripts/check-documentation.mjs; tests/documentation-links.test.mjs; hashes del catálogo contra los archivos
- **Acceptance:** La guía de diseño describe Expedición y su alcance de piloto, el acceso y el registro por paradas, la barra lateral, Inicio y el saldo. Las guías de identidad, Inicio e interfaz describen el registro, el origen de los datos de Inicio y el anclaje de estilos. La matriz de flujos registra el resultado y lo no ensayado. La galería reemplaza las capturas afectadas, suma las del registro y declara su entorno y candidato. Cada entrada del catálogo coincide en hash y tamaño con su archivo, y la verificación de enlaces no encuentra problemas.
- **Scope:** ["docs/design/README.md", "docs/design/current/README.md", "docs/design/current/catalog.json", "docs/design/current/vigente-acceso-publico-1440.png", "docs/design/current/vigente-registro-publico-1440.png", "docs/design/current/vigente-registro-datos-publico-390.png", "docs/design/current/vigente-inicio-docente-1440.png", "docs/design/current/vigente-inicio-docente-390.png", "docs/design/current/vigente-inicio-estudiante-1440.png", "docs/design/current/vigente-inicio-estudiante-390.png", "docs/design/current/vigente-menu-docente-390.png", "docs/design/current/vigente-menu-estudiante-390.png", "docs/engineering/identity/README.md", "docs/engineering/home/README.md", "docs/engineering/frontend/README.md", "docs/verification/flows.md"]
- **Evidence:** {"command": "node scripts/check-documentation.mjs; node --test tests/documentation-links.test.mjs; verificacion de sha256 del catalogo", "result": "check-documentation: 239 archivos y 1068 enlaces, 0 problemas; documentation-links incluido en la suite (pass 169, fail 0); catalogo: 44 capturas con sha256 y bytes coincidentes; 9 capturas nuevas sin alertas visibles", "candidate": "sha256:c262825245df172fa576a092654a4a3b81da851934ebea21c47b34415e32fe2b"}
- **Blocker:** none
