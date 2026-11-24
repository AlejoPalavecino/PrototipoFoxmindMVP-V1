# Mis aulas en dirección Expedición · 24 de noviembre de 2026

## Pedido y alcance

- **Pedido:** el usuario aprobó la maqueta `design/mis-aulas/index.html` («Me gustó, la probamos») y resolvió las decisiones abiertas:
  - catálogo completo de portadas;
  - apuntes escritos del docente en Biblioteca;
  - un solo nombre, «Eliminar borrador»;
  - corrección asistida configurable con un interruptor claro;
  - publicación inmediata de actividades;
  - Muro dentro del aula;
  - ninguna métrica que no venga de la API;
  - eliminar el código y las comunicaciones que la migración deje sin uso.
- **Decisiones del 2026-11-24 por pregunta:**
  - entregar en una rama y un PR nuevos, apilados sobre el PR 18;
  - el ciclo lectivo sigue siendo de sólo lectura.
- **Autorización:** commits en la rama `claude/classrooms-expedition` y un PR propio hacia `main`. No autoriza despliegue.
- **Tablero:** [odd/tasks/expedition-classrooms.md](../../odd/tasks/expedition-classrooms.md).

## Cambios

- **Lista (TASK-001):**
  - `expedition-classrooms.css` pinta el banner del valle, las pestañas con contador centrado, la búsqueda, las tarjetas de aula y de borrador, los vacíos y las invitaciones.
  - `learningCover` resuelve cada una de las 7 portadas a su propia ilustración. Antes, siete claves compartían cuatro imágenes y «Arte y creatividad» mostraba el castillo de Literatura.
  - Los borradores dicen «Borrador», muestran «Paso N de 4» y el diálogo dice «Eliminar borrador».
- **Asistente (TASK-002):**
  - Ventana amplia con riel lago, sendero de paradas, vista previa en el riel y pie fijo.
  - Catálogo completo de portadas. El tilde de la portada elegida va en la esquina para no correr el nombre.
- **Interior (TASK-003):**
  - Encabezado como banner sobre la portada, pestañas como paradas, y Plan como sendero de temas con el tema elegido en una tarjeta.
  - La hoja suma `#classroom-main` al anclaje, porque las hojas del aula llegan a (2,4,0).
  - Una regla heredada ocultaba el `::before` del encabezado.
- **Biblioteca (TASK-004):**
  - El diálogo pregunta «¿Qué querés compartir?»: subir un archivo (por defecto) o escribir un apunte.
  - El apunte usa el camino que la API ya soportaba (`contentKind: 'TEXT'` con documento generado).
  - Los caracteres de control se frenan antes de subir.
  - El primer paso se llama «1. Apunte y detalles» cuando corresponde.
- **Actividades (TASK-005):**
  - Filtro como pestañas segmentadas.
  - En el editor:
    - paso actual en lago;
    - estado de guardado en niebla;
    - títulos de Tipo, Método y unidades dentro de su tarjeta;
    - pasos completos en celular.
  - Sólo CSS.
- **Ajustes (TASK-006):**
  - Interruptor de corrección asistida con estado escrito y explicación del consumo de IA. No se activa sin servicio, pero siempre se puede apagar.
  - Catálogo completo de portadas y ciclo de sólo lectura.
- **Código retirado (TASK-007):**
  - `WizardPlanText.ts`, el diálogo «Editar el plan como texto», su estado y la prop `classroomLayout` con sus ramas: el único llamador siempre la pasaba, así que el botón nunca se mostraba.
  - Las pruebas que sólo cubrían ese parser, los ayudantes `openPlanText` y `preparePlanText`, y los selectores `.brujula-wizard-extract`.
  - También las props `expanded` y `onToggle` del selector de portadas y el estado `coversExpanded`.
- **Pruebas que cambiaron de sentido por decisión del usuario:**
  - `grading-ai-ui` ahora exige el interruptor.
  - `classroom-creation-four-steps` y `classroom-people-wall-exact` exigen las 7 portadas.
  - Dos pruebas siguen la ruta nueva de portadas.

## Verificación

- **Navegador:** `next dev` del worktree contra una API sintética local (aulas, borradores, invitaciones, detalle, integrantes, actividades, biblioteca, muro y progreso), con ambos roles a 1440 y 390 px.
  - Las ocho secciones docentes quedan sin desborde.
  - El interruptor pasa a «Activada» con «Tenés cambios sin guardar».
  - El apunte abre «Escribir un apunte» con «Contenido».
  - El asistente muestra las 7 portadas y la vista previa.
- **Capturas:**
  - 17 entradas de la galería renovadas o nuevas, con sha256 verificado. El catálogo tiene 47 capturas y su campo `count` se corrigió, porque ya estaba desfasado.
  - Las 4 de Inicio también se renovaron, porque las tarjetas «Tus aulas» usan las portadas nuevas.
- **Comandos:**
  - `tsc` y eslint de los archivos tocados limpios.
  - `check-boundaries` y `check-frontend-architecture` OK.
  - `run-complete-suite --check`: 727 pruebas clasificadas.
  - `check-documentation`: 1073 enlaces sin problemas.
  - `run-complete-suite --group fast`: 3133 aprobadas y 0 fallidas sobre el estado final.

## Fallos, omisiones y límites

- **Endpoints conservados:** `GET /activities/:id/submissions` y `GET /attempts/:id/receipt` no tienen llamador en la web, pero las pruebas de integración `p7-practical-integration`, `p7-practical-proxy` y `p9-practical-journey-integration` los usan como chequeos de autorización. Retirarlos cambia el contrato de la API y requiere ajustar esos recorridos, que necesitan Docker. Queda para decisión del usuario.
- **Plan:** conserva dos columnas (lista de temas y detalle) en lugar del acordeón de la maqueta, para no cambiar el comportamiento. El sendero se aplicó sobre esa estructura.
- **Progreso, Estudiantes, Historial y Muro:** reciben el encabezado y las pestañas nuevas, pero su contenido conserva el estilo anterior, que ya era coherente.
- **No ejecutadas:** las suites de integración con PostgreSQL, correo y Docker. En CI, `main` ya falla en `p3-browser`, el Muro (429), `study-shared-strategy-db` y la región Inicio de `brujula-browser`.
- **Tablero:** varios cortes compartían archivos (`product.css`, registros de suites, documentación). Esos archivos pasaron a TASK-008 y la evidencia de TASK-001 y TASK-002 se actualizó por cambio de alcance, sin cambio de contenido.

## Primer paso pendiente

1. Abrir el PR de `claude/classrooms-expedition` hacia `main`, apilado sobre el PR 18.
2. Decidir si se retiran los dos endpoints sin uso en la web.
3. Migrar Agenda, Foxy, Mi estudio, Notificaciones y Perfil, y retirar las hojas Brújula.
