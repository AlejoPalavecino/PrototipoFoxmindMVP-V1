# Expedición: tokens, Acceso, barra lateral, Inicio y documentación (cortes 1 a 5)

- **Fecha:** 2026-11-24
- **Rol:** coordinación y escritura, única sesión. No se expone el identificador de sesión.
- **Rama y worktree:** `claude/auth-home-visual-design-6ba7ad` en `.claude/worktrees/auth-home-visual-design-6ba7ad`.
- **Commit inicial:** `32c93a9c`.
- **Alcance autorizado:** implementar los tokens Expedición (corte 1), el Acceso con registro por paradas (corte 2) y, después de revisarlos, la barra lateral Expedición en toda la app (corte 3) e Inicio de ambos roles (corte 4), con sus pruebas, y la documentación y las capturas (corte 5). Se conserva Nunito. No incluye commits, push ni despliegue. `npm ci` en el worktree se autorizó para verificar en el navegador.
- **Tablero:** [expedition-visual](../../odd/tasks/expedition-visual.md).
- **Maquetas aprobadas:** `design/auth-home-refresh/acceso.html` y `design/auth-home-refresh/expedicion.html`.

## Línea de base

`node --test --test-concurrency=1` sobre las pruebas `folder-platform`, `entry-glass-polish`, `p3-web-client`, `auth-reference-navigation`, `brujula-auth-parity` y `account-avatar-selection`: 24 de 24 pasan antes de cambiar código.

## Cambios

- **Tokens:** `apps/web/src/application/shell/styles/expedition-tokens.css` define la paleta Expedición sobre `:root` y mantiene Nunito. Se importa al final de `product.css`, junto con los estilos del acceso.
- **Acceso:** `identity-screen.tsx` separa la estructura de acceso de la de Mi perfil y Configuración, que no cambian. Las cinco vistas de acceso usan la escena pintada (`xp-auth`, con `data-scene` `sunset` o `river`), la tarjeta, el zorro guía decorativo y el cambio entre ingresar y registrarse. Dejan de usar `brujula-auth` y `br-auth-*`, y dejan de cargar Lexend en el acceso.
- **Registro por paradas:** `features/identity/authentication/register-steps.tsx`. Continuar sin rol avisa «Elegí si tu cuenta es docente o estudiante.» y no avanza. Los campos quedan montados al volver. El envío usa el `submit('/auth/register', …)` existente, con los mismos campos. Un envío aceptado muestra «Revisá tu correo» con la dirección, y la pantalla deja de duplicar ese aviso.
- **Voseo:** textos de inicio de sesión, verificación, recuperación, validaciones de cuenta y `VerificationGuidance`. Mi perfil y Configuración conservan sus textos: no estaban en el alcance.
- **Estilos:** `features/identity/styles/expedition-auth.css`, con clases `xp-`.
- **Pruebas:** nueva `tests/expedition-access.test.mjs`. Se actualizaron `folder-platform` y `entry-glass-polish` (estructura y voseo). Se adaptaron al flujo por paradas `p3-browser`, `p4-integration-helpers`, `p5-integration` y `entry-glass-browser`.

## Comandos y resultados

- `node --test tests/expedition-access.test.mjs` antes de implementar: 0/6, RED por la causa esperada (faltaban la hoja, el componente, la escena y el voseo). Después: 6/6.
- `node --test --test-concurrency=1` sobre `expedition-access`, `folder-platform`, `entry-glass-polish`, `p3-web-client`, `auth-reference-navigation`, `brujula-auth-parity` y `account-avatar-selection`: 30/30.
- `npx tsc -p apps/web/tsconfig.json --noEmit`: sin errores. `npx eslint` sobre los archivos tocados: sin hallazgos.
- `node scripts/check-boundaries.mjs` y `node scripts/check-frontend-architecture.mjs`: OK. `node --test tests/documentation-links.test.mjs`: 11/11.
- Tablero: TASK-001 cerrada con `taskboard.py set … DONE` y huella `sha256:1218253e…`; `check --current`: 5 tareas válidas.

## Verificación en navegador real

Con autorización del usuario se corrió `npm ci --ignore-scripts` en el worktree: 501 paquetes del lockfile, sin cambios en `package.json` ni en `package-lock.json`. Después se levantó `next dev` del worktree contra una API sintética local que responde sesión anónima, registro aceptado (202) e inicio de sesión rechazado. No se usaron datos reales ni proveedores.

- **1440 px:**
  - Paisaje, tarjeta, zorro y cambio de pantalla correctos.
  - Continuar sin rol muestra «Elegí si tu cuenta es docente o estudiante.» y no avanza.
  - Las flechas eligen el rol y Enter avanza. El foco pasa a «Nombre» y el sendero marca «Tus datos».
  - Volver conserva nombre, apellido y correo, y devuelve el foco al rol elegido.
  - El envío hace `POST /api/v1/auth/register` y recibe 202. Aparece «Revisá tu correo» con la dirección y el foco en el título, sin aviso duplicado.
  - El error de inicio de sesión se muestra en rojo con el foco puesto en el aviso.
- **1024 y 375 px:** sin desborde horizontal. En 1024 la burbuja queda dentro de la pantalla. En 375 el zorro asoma detrás de la tarjeta y la burbuja queda a 23 px de ella.

### Defectos encontrados en el navegador y corregidos

1. **Especificidad:** `.fm3d-theme :is(.button-primary, .p5-app button.primary)` (0,3,1) le ganaba a `.xp-auth .button-primary` (0,2,0). El botón quedaba con texto `rgb(56,39,31)` sobre `rgb(174,72,28)` y en Segoe UI. Ahora todos los selectores de `expedition-auth.css` se anclan en `#foxmind-product`. Una prueba nueva exige ese anclaje: falla si se quita de una sola regla y pasa con todas ancladas. Después del cambio, el botón calcula `rgb(196,73,10)` con texto blanco y Nunito.
2. **Frase del zorro:** «contame tu rol» seguía en todas las paradas. Ahora dice «¡Arranquemos! Vamos de a un paso.».
3. **Contador de reenvío:** aparecía arriba del aviso de correo enviado. Se oculta cuando el registro fue aceptado. `p5-integration` ahora espera el título «Revisá tu correo» y sigue comprobando que el contador no pasa a la pantalla de ingreso.
4. **Errores en tuteo:** los mensajes de error de cuenta pasaron a voseo en `account-client.ts`.

Los errores de consola observados son del modo desarrollo: la conexión de recarga en caliente durante el arranque y el tipo MIME de `_clientMiddlewareManifest.js`. No vienen del acceso.

## Barra lateral (TASK-003)

- **Cambios:**
  - `NavbarParts.tsx`: la ayuda pasa a ser una fila «Ayuda» con ícono y abre el mismo diálogo.
  - `ai-quota-indicator.tsx`: el saldo muestra «Saldo de IA» y el porcentaje, con una barra decorativa. Conserva el nombre accesible «IA · N % disponible» y el diálogo, y suma ganchos `data-quota-*` para la versión compacta.
  - `application/navigation/styles/expedition-navigation.css`: fondo lago, sección actual blanca con marca naranja, foco color sol, saldo, ayuda y cuenta al pie, y barra superior y menú en lago en el celular.
  - Tokens nuevos: `--xp-lake-muted`, `--xp-lake-raised` y `--xp-lake-line`.
- **Especificidad:** en esta cabecera las hojas viejas llegan a (1,6,0), por ejemplo `#foxmind-product.fm3d-theme .p5-app .fm3d-shell.fm-navbar-private.fm-home-navigation[data-private="true"]`. Lo detecté en el navegador: el texto claro había quedado sobre fondo claro. Los selectores nuevos se anclan con el id raíz duplicado (`#foxmind-product#foxmind-product`) y una prueba exige ese anclaje. Hay que quitar la duplicación cuando se retiren esas hojas.
- **Pruebas:** `tests/expedition-navigation.test.mjs`. Antes de implementar: 0/4, RED por la causa esperada. Después: 4/4. Suite afectada completa: 73/73. `tsc`, eslint y los controles de arquitectura sin errores.
- **Navegador real** (sesión docente sintética y saldo sintético del 82 %):
  - Inicio y Agenda con la barra en lago (`rgb(27,58,82)`) y la sección actual blanca con texto lago.
  - Foco de 3 px color `rgb(255,201,77)`.
  - «Saldo de IA 82 %» con su barra al 82 %.
  - «Ayuda» abre el diálogo y Escape devuelve el foco.
  - Plegada mide 76 px sin desborde y el saldo queda en «82 %». La ayuda ya se ocultaba en ese modo antes del cambio.
  - A 375 px: barra superior lago, saldo compacto «IA», ícono del menú blanco, menú desplegable en lago y sin desborde.
- **Defectos corregidos en el navegador:**
  - El fondo no aplicaba por especificidad.
  - La ayuda quedaba centrada por un `justify-content` heredado.
  - La versión compacta del saldo no tenía clase, porque los módulos CSS no generan clases sin reglas. Se reemplazó por atributos `data-quota-*`.
  - El ícono del menú tenía un color propio.

## Inicio (TASK-004)

- **Cambios:**
  - `features/home/model/home-expedition.ts`, con funciones puras sobre el contrato de Inicio:
    - `homeRoute`: lo que queda de hoy en `modules.agenda`, como mucho tres.
    - `homeUrgent`: la primera entrega para revisar o la primera actividad abierta. Devuelve null si el módulo no está listo.
    - `reviewProgress`: corregidas, es decir `readyToPublish`, sobre recibidas.
  - `Home.tsx`: exporta `HomeGreeting`, cambia la decoración por el zorro pintado (decorativo, `alt=""`) y suma el recorrido (`ol` «Lo que sigue hoy») y la burbuja.
  - `HomePriorities.tsx`: barras accesibles «X de Y corregidas» y «X de Y preguntas respondidas». No inventa avance cuando falta `questionProgress`.
  - `dashboard/styles/expedition-home.css`: banner pintado por rol, recorrido, botones, pestañas en lago, actividades como paradas, agenda celeste y aulas como destinos con su avance del plan. Anclada con el id raíz duplicado.
- **Decisiones aplicadas:** no hay «x de y entregaron», porque la API no tiene el total esperado. Las aulas muestran `planProgress` y no el próximo tema, como fija la regla vigente. El recorrido no marca paradas cumplidas, porque `modules.agenda` sólo trae lo que todavía no pasó.
- **Pruebas:** `tests/expedition-home.test.mjs`. Antes de implementar: 0/7, RED por la causa esperada. Después: 7/7. Las 89 pruebas de Inicio que ya existían se mantienen. Suite afectada completa: 169/169. `tsc`, eslint y los controles de arquitectura sin errores.
- **Navegador real:** la API simulada devuelve respuestas de Inicio sintéticas que validan con `parseHomeResponse`, para el docente y el estudiante.
  - Docente: banner del atardecer con el zorro sobre el camino, «15:09 Clase… / 16:09 Reunión…», burbuja «Para revisar primero», «2 de 5 corregidas» y aulas con «6 de 14 temas dados».
  - Estudiante: banner del río, recorrido y burbuja en verde pino, «0 de 10 preguntas respondidas».
  - A 375 px: sin desborde, el zorro queda 6 px arriba del texto, el recorrido va en columna y la burbuja se oculta.
- **Defectos corregidos en el navegador:**
  - El zorro flotaba arriba por una altura heredada de 308 px. Ahora se alinea abajo.
  - Los encabezados de actividad seguían en durazno.
  - El recorrido dejaba un tramo punteado colgando en el celular.
- **No visualizado:** la agenda con eventos. La simulación no responde la agenda, así que la tarjeta mostró su estado de error. Su comportamiento lo cubren las pruebas de `home-miniagenda-reference` y `home-daily-agenda`.
- **Tablero:** `product.css` es compartido. Por el import de Inicio se reabrieron TASK-001 y TASK-003 con el motivo explícito y las cuatro tareas se cerraron de nuevo con huellas vigentes. `check --current`: 5 tareas válidas.

## Documentación y capturas (TASK-005)

- **Guías:**
  - `docs/design/README.md`: Expedición como piloto (paleta, contrastes, ilustración, sendero y foco), la nueva sección Acceso, la barra lateral, Inicio y el saldo.
  - `docs/engineering/identity/README.md`: el registro por paradas.
  - `docs/engineering/home/README.md`: de qué datos del contrato sale cada pieza del saludo.
  - `docs/engineering/frontend/README.md`: carga y anclaje de las hojas Expedición.
  - `docs/verification/flows.md`: el bloque del piloto, con lo ensayado y lo no ensayado.
- **Capturas:** se reemplazaron 7 imágenes de la galería (acceso, Inicio de ambos roles a 1440 y 390 px, y los menús móviles) y se sumaron 2 del registro.
  - Se tomaron con Chromium de Playwright sobre `next dev` del worktree y una API sintética que también responde agenda y seguimiento vacíos, para no fotografiar errores simulados.
  - El script espera a que cargue el saldo y oculta el indicador de desarrollo de Next.
  - Cada entrada del catálogo declara su fecha, candidato, entorno y navegador. Las 44 entradas coinciden en sha256 y tamaño con sus archivos. Las imágenes anteriores siguen en el commit `32c93a9c`.
- **Defecto encontrado al capturar:** el ícono de Notificaciones tenía color propio, `rgb(82,103,125)`, sobre el lago. Ahora los íconos de la navegación heredan el color del texto (`rgb(196,214,228)` en escritorio y menú). TASK-003 se reabrió y se volvió a verificar.
- **Comprobación:** `node scripts/check-documentation.mjs` revisó 239 archivos y 1068 enlaces, sin problemas. Suite afectada: 169/169. Tablero: TASK-001 a TASK-005 DONE y `check --current` válido.
- **Roadmap:** `docs/implementation-roadmap.md` no se modificó, porque describe lo integrado en `main` y este piloto todavía no lo está.

## Fallos, omisiones y límites

- **No ejecutadas:** `p3-browser`, `p4-integration-helpers` (con sus consumidores), `p5-integration` y `entry-glass-browser`. Se adaptaron al flujo por paradas, pero necesitan el entorno de integración con base de datos, correo y Docker. `tests/exclusive-account-role.test.mjs` necesita la API compilada en `.build/`.
- **Script histórico:** `tests/helpers/foxmind-3d-ego/round-26.test.mjs` registra sin elegir rol y usa un puerto fijo. No se adaptó.
- **Fuera del alcance:** el cliente de archivos (`features/files/api/client.ts`) conserva sus mensajes en tuteo. Mi perfil y Configuración también conservan los suyos.
- **Material local:** `design/auth-home-refresh/` y `.claude/launch.json` son material de diseño y de vista previa local. No forman parte del corte de código.
- **Tamaño:** el corte supera las 400 líneas de referencia porque la adaptación de las pruebas de navegador tiene que ir junto con el cambio de flujo.

## Primer paso pendiente

1. Commits autorizados el 2026-11-24, sólo en esta rama: `46d22a08` (código y pruebas) y el commit siguiente (documentación, capturas, tablero, registro y las maquetas aprobadas `design/auth-home-refresh/expedicion.html` y `acceso.html`). Quedan sin versionar `.claude/launch.json`, que es configuración local, y las maquetas descartadas (`maqueta.html`, `direcciones.html` y `direcciones-2.html`). Push, PR e integración a `main` siguen pendientes de autorización.
2. Correr en el entorno completo las suites de integración adaptadas (`p3-browser`, `p4`, `p5` y `entry-glass-browser`).
3. Si el piloto convence, planificar la migración de Mis aulas, Agenda, Foxy, Mi estudio, Notificaciones y Perfil, y retirar las hojas Brújula para quitar el anclaje con id duplicado.
