# Agenda en dirección Expedición · 24 de noviembre de 2026

## Pedido y alcance

- **Pedido:** «Mientras tanto, seguí con la migración de Agenda», mientras otra sesión investiga los fallos de CI de `main`.
- **Alcance:** migración visual con el lenguaje aprobado en el piloto y en Mis aulas, sin cambios de comportamiento.
- **Rama:** `claude/agenda-expedition`, apilada sobre `claude/classrooms-expedition` (PR 19).
- **Autorización:** el usuario autorizó commit, push y PR («Sí, commiteá la Agenda y abrí el PR»). No cubre merge ni despliegue.
- **Tablero:** [odd/tasks/expedition-agenda.md](../../odd/tasks/expedition-agenda.md).

## Cambios

- **Hoja nueva:** `apps/web/src/features/agenda/styles/expedition-agenda.css`. Se ancla con cuatro ids, porque las hojas de Agenda ya usan `#agenda-main#agenda-main`.
- **Banner:** usa la ilustración `agenda-hero` y deja Crear evento debajo del texto, para no tapar al zorro.
- **Vistas y días:** Mes, Semana y Día son pestañas segmentadas. El día elegido va en lago con su contador en sol; en Mes, el día elegido lleva contorno lago y hoy conserva su marca naranja.
- **Panel del día:** banda celeste, y «Agregar para este día» como botón secundario lago.
- **Editor:** la categoría elegida se marca en lago.
- **Defectos corregidos:**
  - el título del día ponía mayúscula en cada palabra («Martes, 24 De Noviembre»);
  - «Día completo» se partía letra por letra en la columna de la hora de Semana.

## Verificación

- **Navegador:** `next dev` del worktree contra una API sintética local con clases, actividades, una evaluación, un evento de dos días y entregas del aula. Se revisaron Mes, Semana, Día, el detalle y el editor, con ambos roles a 1440 y 390 px, sin desborde.
- **Capturas:** 4 capturas de Agenda renovadas y 1 nueva (Semana), con sha256 verificado. El catálogo tiene 48 entradas.
- **Comandos:**
  - `node --test tests/expedition-agenda.test.mjs`: 2/2.
  - `run-complete-suite --check`: 728 pruebas clasificadas.
  - `run-complete-suite --group fast`: 3135 aprobadas y 0 fallidas.

## Fallos, omisiones y límites

- **Sin cambios:** el detalle de un evento y las fichas conservan su estilo, que ya era coherente; los colores de los eventos son los que elige cada persona.
- **Entregas del aula:** las fichas muestran la zona horaria cruda («America/Argentina/Buenos_Aires»). Es un texto del componente, fuera de esta migración visual.
- **No ejecutadas:** las suites de integración con PostgreSQL y Docker.

## Primer paso pendiente

1. Revisar el PR apilado sobre el PR 19 y su CI. El merge espera la integración de los PR 18 y 19 y la decisión del usuario.
