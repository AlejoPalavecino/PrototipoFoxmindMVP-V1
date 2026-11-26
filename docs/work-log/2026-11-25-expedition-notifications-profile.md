# Notificaciones y Perfil en dirección Expedición · 25 de noviembre de 2026

## Pedido y alcance

- **Pedido:** «Podemos seguir con una PR más?», y como próxima pantalla «Notificaciones y Perfil».
- **Alcance:** migración visual con el lenguaje aprobado en el piloto, Mis aulas y Agenda, sin cambios de comportamiento. Foxy y Mi estudio quedan afuera porque otro worktree trabaja sobre ellos.
- **Rama:** `claude/notifications-profile-expedition`, apilada sobre `claude/agenda-expedition` (PR 20).
- **Autorización:** el usuario autorizó commit, push y PR («Sí, abrí el PR»). No cubre merge ni despliegue.
- **Tablero:** [odd/tasks/expedition-notifications-profile.md](../../odd/tasks/expedition-notifications-profile.md).

## Cambios

- **Hojas nuevas:**
  - `apps/web/src/features/notifications/inbox/styles/expedition-notifications.css`, anclada con `#foxmind-product#foxmind-product.fm3d-theme .parity-notifications`, porque las reglas de la bandeja llegan a (1,3,1).
  - `apps/web/src/features/identity/styles/expedition-account.css`, anclada con `#foxmind-product#foxmind-product.fm3d-theme .entry-profile`, porque las hojas de cuenta llegan a (0,4,0).
  - Las dos se importan en `product.css` después de la de Agenda.
- **Notificaciones:**
  - Banner con la escena del cielo (`hero/welcome-sky-1600`) en lugar de la carta dibujada, con el resumen de avisos sin leer en una píldora.
  - «Todas» y «No leídas» como pestañas segmentadas, con la elegida en lago y su contador centrado en sol.
  - Tipos como chips, con el elegido en lago.
  - Avisos sin leer con franja lago y etiqueta «Sin leer» en sol.
  - Bandeja vacía con el zorro y su caja (`states/empty-320`).
- **Mi perfil y Configuración:**
  - Banner cálido con la escena del perfil o la del escudo, según la página.
  - Vista previa en cielo con el avatar enmarcado en lago.
  - Campos con el borde de 3,25:1 del acceso; los de sólo lectura llevan borde punteado.
  - Opción de avatar elegida en lago, y la escena del escudo en la tarjeta de Configuración de cuenta.
  - Los títulos «Contraseña» y «Sesión actual», que salían con peso fino, quedan en Nunito 900.
- **Pruebas:** `tests/expedition-notifications.test.mjs` y `tests/expedition-profile.test.mjs`, registradas en la ruta rápida.
- **Documentación:** guía de diseño (resumen, Notificaciones y Perfil), galería, matriz de flujos y catálogo.

## Verificación

- **Pruebas de guarda:** las dos fallan (0/4) al quitar la importación de las hojas y pasan (4/4) con ella.
- **Navegador:** `next dev` del worktree contra una API sintética local, con un fixture propio de la bandeja (avisos de actividades, aulas y agenda, leídos y sin leer) y un stream mínimo del saldo de IA. Ambos roles a 1440 y 390 px.
  - **Notificaciones:**
    - Filtrar por «No leídas» muestra 3 avisos; por «Actividades», 2 (docente) o 3 (estudiante).
    - Marcar un aviso baja de 3 a 2 sin leer, y «Marcar todas» deja «Todo leído por acá».
    - La bandeja sin avisos muestra «Las próximas novedades llegan acá» con el zorro.
    - El foco con teclado se ve en las pestañas.
  - **Mi perfil:**
    - Editar el nombre habilita Guardar y Descartar y actualiza la vista previa.
    - Descartar restaura el nombre y devuelve el foco al campo.
    - El selector ofrece 5 opciones, y elegir una marca el perfil como modificado.
  - Sin desborde ni errores de página.
- **Capturas:** 8 renovadas (Notificaciones y Mi perfil, ambos roles y anchos) y 1 nueva (Configuración de la docente), con sha256 verificado. El catálogo tiene 49 entradas.
- **Comandos:**
  - `node --test tests/expedition-notifications.test.mjs tests/expedition-profile.test.mjs`: 4/4.
  - `run-complete-suite --check`: 731 pruebas clasificadas.
  - `check-documentation`: 1088 enlaces sin problemas.
  - `run-complete-suite --group fast`: 3141 aprobadas y 0 fallidas.

## Fallos, omisiones y límites

- **No ensayado contra la API real:** guardar el perfil, cambiar la contraseña, abrir el destino de un aviso y cerrar sesión. La API sintética sólo cubre la lectura y el marcado de la bandeja.
- **Barra lateral:** en `/notificaciones`, el ítem Notificaciones no se marca como sección actual. Ya pasaba antes de esta migración y queda fuera de su alcance.
- **Divergencia de documentación:** la guía dice que, en móvil, el selector de avatar pone las iniciales en una fila y los avatares en dos columnas. A 390 px se ven tres columnas. No se tocó la grilla ni la frase; queda para confirmar el comportamiento esperado.
- **No ejecutadas:** las suites de integración con PostgreSQL y Docker.

## Primer paso pendiente

1. Revisar el PR apilado sobre el PR 20 y su CI. El merge espera la integración de los PR 18, 19 y 20 y la decisión del usuario.
