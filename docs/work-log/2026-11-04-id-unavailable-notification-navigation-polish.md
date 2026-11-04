# Nitidez del saludo, notificaciones y navegación común

- Agent / role: root, implementación y verificación.
- Session or task ID: unavailable.
- Date: 2026-11-04.
- Branch / worktree: codex/notification-navigation-polish, checkout principal.
- Starting commit: f8b1df562075e0270da864ada5252e6dd466521e.
- Phase and detailed task/spec links: R1, pulido solicitado; [Inicio](../../odd/tasks/home-by-role.md), [navegación](../engineering/home/home.md).
- Status: completed.

## Request and scope

Tres modificaciones explícitas del usuario: banner sin desenfoque y tarjeta liquid glass más opaca para lectura; notificaciones con jerarquía y botones comprensibles; configuración de cuenta/notificaciones de Inicio como regla común en todas las pantallas actuales y futuras que usan AppNavbar. Mantener datos, permisos, filtros, paginación, acciones y destinos existentes. No nuevos flujos ni cambios de backend. Sin commits/push/deploy autorizados en este pedido.

## Diseño y criterios

Se conserva la identidad aprobada (crema, naranja, Fredoka/Segoe UI), recursos originales y flujos. La imagen ocupa todo el banner sin copia desenfocada ni máscara; el contraste se aplica únicamente al panel del texto, mediante opacidad/borde/reflejo sin filtro borroso. Navegación privada común por defecto, sin ubicación/campana/avatar superiores; notificaciones y menú de cuenta con nombre dentro de la barra lateral o drawer móvil. Restricciones del asistente de creación permanecen.

Notificaciones: responder primero qué pasó y en qué aula; título destacado, aula secundaria, fecha legible y señal explícita de sin leer; filtro segmentado, actualización independiente y botones primario/secundario diferenciados. Mantener estados de carga, vacío, error, ocupado y paginación. Es pulido del flujo existente, sin rediseño de permisos/acciones. Skills consultadas: design-taste-frontend (app screens), landing-page-design y harness-ux-ui; prevalece la identidad y dirección vigente del usuario. Comprobación responsive 320/390/768/1440, foco/teclado, notificaciones anidadas y navegación en Inicio/Mis aulas/Agenda con fixtures sintéticas, sin modificar los datos de demo.

## Work performed

Checkout limpio al inicio. Causa visual observada: pseudo-elemento de saludo duplica la imagen con blur(10px), panorama con máscara y regla de navegación activada solo para Inicio; estilos de acciones del navbar alcanzan botones del diálogo. Se inspeccionan los componentes y helpers de prueba existentes antes de editar. Aplicación local del usuario permanece activa; datos retenidos no son fixtures.

- Se retiraron pseudoimagen desenfocada, máscara y backdrop blur. Se conserva el recurso original y el encuadre completo de escritorio con object-fit fill como en la composición anterior; la tarjeta del texto usa mayor opacidad, borde y reflejo. Ventana móvil original conservada.
- AppNavbar aplica la configuración de Inicio por defecto a toda navegación privada, incluida una ruta futura; se cierra el drawer al cambiar currentPath. Se generalizaron estilos compartidos y se retiró el espacio de toolbar en escritorio. Se mantiene navegación pública y modo restringido.
- Notificaciones: título semántico por novedad, iconos existentes, aula y actividad cuando está disponible, fecha, estado de lectura, filtros segmentados, actualización y dos botones claramente diferenciados. CSS compartido independiente. Estados y handlers de permisos/cancelación/paginación/destinos conservados. Error/carga no afirman «Estás al día».
- Se acotaron las reglas de color/hover de cuenta a controles directos en sky-theme, workspace-navigation y classrooms-surface. Así no contaminan el diálogo anidado. Se documenta el patrón común para pantallas futuras en la guía frontend.
- Pruebas nuevas incluidas en inventario y ruta fast, sin ampliar exclusiones ni modificar contratos de backend. No se editaron imágenes, dependencias, datos ni esquemas.

## Verification

- RED antes de producción: `node --test tests/home-warm-navigation.test.mjs tests/notifications-presentation.test.mjs`: 4 PASS/9 FAIL. GREEN posterior: 13/13. RED adicional para falsa afirmación «Estás al día» tras error: 3 PASS/1 FAIL, corregido sin alterar expectativas.
- Selección final: `node --experimental-transform-types --disable-warning=ExperimentalWarning --test tests/home-warm-navigation.test.mjs tests/notifications-presentation.test.mjs tests/home-by-role.test.mjs tests/home-reference-dashboard.test.mjs tests/home-miniagenda-reference.test.mjs tests/entry-glass-client.test.mjs tests/folder-platform.test.mjs tests/agenda-ui.test.mjs`: 51 PASS/0 FAIL/0 SKIP. Cubre destinos, lectura, filtro vacío, error/reintento, roles, navegación pública y restringida.
- `npx tsc --noEmit --incremental false -p apps/web/tsconfig.json`: exit 0. `npm run lint:boundaries`: exit 0, 129 excepciones históricas intactas. `node scripts/run-complete-suite.mjs --check`: 447 entradas/53 exclusiones/23 rutas, exit 0.
- `node .test-artifacts/notification-polish/build-isolated.mjs`: build final exit 0, tipos y 6 páginas estáticas, límite 180 s. Copia aislada en .test-artifacts/notification-polish/build-final, con turbopack.root solo en staging. Primera compilación aislada también aprobó antes de correcciones finales; no se confundió con prueba del último candidato. Sin interferir con el servidor del usuario.
- Ego-browser Space 5, componentes reales y API sintética: ocho vistas por rol a 320/390/768/1440; cuatro diálogos sin overflow ni botones fuera del panel, mínimo 44 px; lectura y conteo, Escape anidado con foco, menú de cuenta y 16 combinaciones de contexto/ancho. Estados vacío/error/carga/lista extensa comprobados. Ocho contextos finales de color aprobados en Inicio/Mis aulas/Agenda/Perfil a 390/1440. Capturas representativas inspeccionadas visualmente y [evidencia conservada](evidence/2026-11-04-notification-navigation/README.md).
- Historial QA preservado: primera captura bloqueada por ventana Ego minimizada; se restauró solo esa ventana. Browser.getWindowForTarget falló sin web contents. Un wait sobre el botón de notificaciones bajo el modal no lo encontró por quedar inerte; se corrigió la espera a la propiedad DOM del mismo control. Las primeras capturas estaban en transición; las finales esperan opacity=1. Se detectó y corrigió una regla de color de Mis aulas y luego sky-theme que oscurecían el primario; resultado final blanco sobre naranja en todos los contextos. Al generalizar navegación se recuperó especificidad para ocultar la barra móvil duplicada. Fallos de fixture/QA no se presentan como resultados aprobados iniciales.
- Space finalizado con finish keep=[] y resultado confirmado. Sin login en demo, cambios de lectura retenidos, proveedores reales ni prueba completa DB/E2E; el alcance es UI y callbacks existentes. No se afirma revisión independiente ni nueva aceptación P9.
- App del usuario sigue disponible: web sign-in HTTP 200 y API readiness HTTP 200. No se cambió el supervisor ni su configuración privada. `npm run docs:check`: 138 archivos/1738 enlaces/0 issues; `git diff --check`: exit 0.
- Cierre: Vite sintético en 53255 detenido después de comprobar su comando exacto; app real conservada. Último ajuste de especificidad de hover añade :enabled para ganar a reglas genéricas de botones de otras superficies. Se recompiló la copia de build-final con ese CSS actualizado: exit 0, seis páginas estáticas. No altera el estado normal ya capturado; no se afirma captura nueva de hover. Sin suite funcional adicional por documentación o esos dos selectores.

## Commits and outcomes

Sin commits/push/deploy. Cambios locales en codex/notification-navigation-polish, visibles por HMR en la app del usuario. Registro propio de trabajo, sin modificar historia ajena; stash y otras ramas preservados.

## Handoff

Tres cambios implementados y comprobados localmente. El usuario puede recargar http://127.0.0.1:52171/inicio y probar con sus cuentas conservadas. No hay implementación pendiente de este alcance. Integración/commits/publicación requieren la solicitud correspondiente; no se reutiliza la autorización de sincronización anterior. El entorno de QA sintético propio se cierra al concluir, conservando artefactos de evidencia; la app real permanece activa.

## Integración y publicación autorizadas posteriormente

El usuario autoriza explícitamente integrar todos estos cambios en main, hacer push, dejar checkout local/main remoto en el mismo commit y no dejar otras ramas sueltas. Antes de entregar: main y GitHub en f8b1df5, pendientes únicamente los archivos de esta unidad; otras ocho ramas de trabajo integradas en ese main y los 12 worktrees históricos limpios. Solo main existe como rama remota. No hay permiso para publicar el contenido privado del stash histórico; se conserva sin aplicarlo. Ninguna carpeta ni volumen se elimina.

Se aplica work-unit-commits: una unidad de corrección de UI con pruebas, guía y evidencia de los tres cambios aprobados, seguida del cierre documental de publicación. Se confirmó igualdad byte a byte de los nueve archivos de producción con el build aislado final aprobado. Controles repetidos antes del commit: docs:check 138 archivos/1738 enlaces/0 issues; inventario 447 entradas/53 exclusiones/23 rutas; diff-check exit 0. No se repite la selección funcional ya aprobada porque no hay cambios de producto posteriores al build verificado.

Entrega en progreso: crear commit de esta unidad, avanzar main por fast-forward, dejar los dos worktrees con ramas antiguas en detached HEAD sobre sus mismos commits (sin modificar archivos), eliminar solo ramas integradas con branch -d, push normal y comprobar referencias exactas. Reversión de producto: los nueve archivos de producción, con expectativas de tests y dos entradas de inventario como una unidad; sin migración o cambio de datos. La evidencia histórica se puede conservar.
