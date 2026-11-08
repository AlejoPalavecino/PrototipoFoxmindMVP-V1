# Estado actual de FoxMind

Base del producto inspeccionada: main, d41ff6d0b8c9321403b1d3000a06e06d84366cfe. La renovación documental es posterior a ese commit; publicación Git autorizada el 2026-11-08, con estado y evidencia en el [registro de publicación](work-log/2026-11-08-root-main-publication.md). Este archivo describe estado vigente, no una cronología de entregas ni una autorización para publicar.

| Capacidad | Estado actual | Evidencia o fuente |
|---|---|---|
| Cuenta y rol exclusivo | Registro docente/estudiante, verificación, acceso, perfil, contraseña y recuperación implementados; recorridos actuales observados | [Identidad](engineering/identity/README.md), [flujos](verification/flows.md) |
| Aulas | Creación de cuatro pasos, borrador privado, catálogo con Pendientes y eliminación confirmada, ingreso por código/invitación, archivo/reactivación y pertenencia implementados; pendientes comprobados localmente, sin publicar | [Aulas](engineering/classrooms/README.md), [evidencia](work-log/2026-11-08-root-pending-classrooms.md) |
| Plan, Biblioteca y Muro | Plan consultable con avance docente; materiales FILE/TEXT y revisiones; avisos, consultas y respuestas | [Enseñanza](engineering/teaching/README.md) |
| Actividades | Manual de dos etapas y generación de tres pasos; TP, cuestionario y evaluación; asignación explícita | [Autoría](engineering/activities/authoring.md) |
| Participación y devolución | Adjuntos, respuestas/autoguardado, confirmación, historial, corrección privada/publicada y progreso | [Participación](engineering/activities/participation.md), [calificación](engineering/grading/README.md) |
| Inicio, búsqueda, notificaciones y Agenda | Vistas por rol y navegación autorizada; eventos privados con repetición y eliminación por alcance | [Inicio](engineering/home/README.md), [Agenda](engineering/agenda/README.md) |
| Asistencia IA | Extracción, generación, análisis individual, corrección asistida y Foxy implementados. El ensayo actual sólo usa proveedores sintéticos; no atribuir éxito de generación a las ramas no ensayadas | [IA](engineering/ai/README.md) |
| UX/UI | Brújula vigente; sidebar desde 1024 px, menú móvil y ocho/seis secciones por rol | [Diseño](design/README.md), [referencias](design/current/README.md) |
| Nueva base documental | Verificada localmente y cerrada; sustituye documentación anterior. 165 capturas, matriz de 46 entradas con límites, controles focales y revisión independiente aprobados | [Tareas](../odd/tasks/project-documentation-renewal.md), [registro](work-log/2026-11-07-root-current-baseline.md) |

## Límites y decisiones pendientes

No hay despliegue ni piloto real autorizados en esta entrega. Hosting, presupuesto, proveedores cloud y cuota productiva numérica requieren definición humana. No se migraron datos retenidos ni se leyeron credenciales privadas. Los límites de las comprobaciones actuales están en la [matriz](verification/flows.md).

## Cómo retomar

1. Leer arquitectura, especificación y guía del dominio afectado.
2. Cotejar Git y la tarea activa; no inferir progreso por la presencia de una tabla o captura.
3. Actualizar la documentación conforme a la política. Un comportamiento que contradiga una regla aprobada se señala antes de cambiar la regla.
4. Implementar sólo el alcance autorizado; la documentación no concede permiso de commits, push o despliegue.

## Publicación Git de esta base

Entrega documental 620331241f0ba5a0524389078d9eef33529cc342 integrada y publicada en main el 2026-11-08. Única rama local/remota observada: main. El [recibo de publicación](work-log/2026-11-08-root-main-publication.md) registra comandos y alcance; su commit posterior es evidencia documental, sin cambios de producto. No implica despliegue.
