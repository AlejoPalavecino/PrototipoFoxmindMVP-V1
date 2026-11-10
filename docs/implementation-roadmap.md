# Estado actual de FoxMind

Base del producto inspeccionada: main, d41ff6d0b8c9321403b1d3000a06e06d84366cfe. La renovación documental es posterior a ese commit; publicación Git autorizada el 2026-11-08, con estado y evidencia en el [registro de publicación](work-log/2026-11-08-root-main-publication.md). Este archivo describe estado vigente, no una cronología de entregas ni una autorización para publicar.

| Capacidad | Estado actual | Evidencia o fuente |
|---|---|---|
| Carpetas de estudio | Implementado y verificado localmente, integrado y publicado en main (3c30de3):65 pruebas, permisos/DB/HTTP, revisión independiente y QA responsive. Gemini real plan/chat/quiz directo; prácticas E2E sintéticas. Cupo demo agotado sin elevar límites. Sin despliegue | [Guía](engineering/study/README.md), [tarea](../odd/tasks/study-folders.md), [recibo](verification/study-folders.json) |
| Cuenta y rol exclusivo | Registro docente/estudiante, verificación, acceso, perfil, contraseña y recuperación implementados; recorridos actuales observados | [Identidad](engineering/identity/README.md), [flujos](verification/flows.md) |
| Aulas | Creación de cuatro pasos, borrador privado, catálogo con Pendientes y eliminación confirmada, ingreso por código/invitación, archivo/reactivación y pertenencia implementados; Pendientes comprobado localmente e integrado/publicado en main (2de9e28), sin despliegue | [Aulas](engineering/classrooms/README.md), [evidencia](work-log/2026-11-08-root-pending-classrooms.md) |
| Plan, Biblioteca y Muro | Plan consultable con avance docente; materiales FILE/TEXT y revisiones; avisos, consultas y respuestas | [Enseñanza](engineering/teaching/README.md) |
| Actividades | Manual de dos etapas y generación de tres pasos; TP, cuestionario y evaluación; asignación explícita | [Autoría](engineering/activities/authoring.md) |
| Participación y devolución | Adjuntos, respuestas/autoguardado, confirmación, historial, corrección privada/publicada y progreso | [Participación](engineering/activities/participation.md), [calificación](engineering/grading/README.md) |
| Inicio, búsqueda, notificaciones y Agenda | Vistas por rol y navegación autorizada; eventos privados con repetición y eliminación por alcance | [Inicio](engineering/home/README.md), [Agenda](engineering/agenda/README.md) |
| Asistencia IA | Extracción, generación, análisis individual, corrección asistida y Foxy implementados. Foxy incorpora conversaciones buscables/renombrables, contexto previo y Herramientas/Creaciones con destinos; verificación local sintética y Gemini real por escenarios (con dos timeouts conservados); integrada y publicada en main (425005b), sin despliegue | [IA](engineering/ai/README.md), [tarea Foxy](../odd/tasks/foxy-workspace-discovery.md), [evidencia](work-log/2026-11-08-root-foxy-implementation.md) |
| UX/UI | Pulido Foxy/Carpetas/Aulas implementado y verificado localmente el 2026-11-09: 28 capturas Ego Lite inspeccionadas a 1440×1000/390×844 y 74 tests focales verdes; integrado y publicado en main (edcdbe0), sin despliegue; [evidencia y límites](verification/foxy-study-ux-polish.json). Brújula vigente; sidebar desde 1024 px, menú móvil y ocho/seis secciones por rol | [Diseño](design/README.md), [referencias](design/current/README.md) |
| Avatares Foxy y Configuración | Implementado, verificado localmente, integrado y publicado en main (842a6e8): cuatro variantes e iniciales para ambos roles, guardado privado persistente, Mi cuenta y botones Mostrar alineados. Sin despliegue | [Identidad](engineering/identity/README.md), [tarea](../odd/tasks/profile-foxy-avatars.md), [evidencia](verification/profile-avatars.json) |
| Nueva base documental | Verificada localmente y cerrada; sustituye documentación anterior. 165 capturas, matriz de 46 entradas con límites, controles focales y revisión independiente aprobados | [Tareas](../odd/tasks/project-documentation-renewal.md), [registro](work-log/2026-11-07-root-current-baseline.md) |

## Límites y decisiones pendientes

La migración de arquitectura por dominios fue aprobada y su ejecución por etapas autorizada el 2026-11-10. Primer corte cerrado con commits locales en `codex/architecture-foundation`; piloto Agenda implementado, verificado y cerrado con commits locales e6d8349/febe948/1089678 más recibo documental (TASK-004 DONE). Agenda reúne reglas neutrales, backend por responsabilidades y feature frontend pública, con composición de identidad/proyección académica fuera del módulo. Compatibilidad conserva una sola implementación; se eliminaron once excepciones, quedan 112 legadas. Candidato del piloto: fast reconciliado 322/322 archivos y 1785 PASS/0 FAIL/0 SKIP; integración focal 85 PASS y repetición DB tras corregir emisión 19 PASS; builds API/web, tipos, lint, inventario, docs y TTP pasan. Revisión independiente sin hallazgos pendientes; QA Ego Lite sintético de CRUD/errores/foco y responsive 390×844 en iframe, con límites documentados. Corte identidad/composición global del frontend implementado y verificado localmente (TASK-013/014/015 DONE), con cambios aún sin commit: fast324/324 y1790 PASS, builds/tipos/lint110, contratos y QA sintético; [evidencia](work-log/2026-11-10-root-identity-frontend.md). TASK-005 sigue IN_PROGRESS por las restantes features; sigue Foxy/Estudio. TASK-006/007 pendientes. [Diseño](engineering/architecture-migration.md), [tablero](../odd/tasks/architecture-migration.md), [primer corte](work-log/2026-11-10-root-architecture-migration.md) y [piloto Agenda](work-log/2026-11-10-root-agenda-pilot.md). Sin push, merge ni despliegue. No se repitieron todos los grupos owned-db/servicios/browser/wrappers de la suite completa.

No hay despliegue ni piloto real autorizados en esta entrega. Hosting, presupuesto, proveedores cloud y cuota productiva numérica requieren definición humana. No se migraron datos retenidos ni se leyeron credenciales privadas. Los límites de las comprobaciones actuales están en la [matriz](verification/flows.md).

## Cómo retomar

1. Leer arquitectura, especificación y guía del dominio afectado.
2. Cotejar Git y la tarea activa; no inferir progreso por la presencia de una tabla o captura.
3. Actualizar la documentación conforme a la política. Un comportamiento que contradiga una regla aprobada se señala antes de cambiar la regla.
4. Implementar sólo el alcance autorizado; la documentación no concede permiso de commits, push o despliegue.

## Publicación Git de esta base

Entrega documental 620331241f0ba5a0524389078d9eef33529cc342 integrada y publicada en main el 2026-11-08. Única rama local/remota observada: main. El [recibo de publicación](work-log/2026-11-08-root-main-publication.md) registra comandos y alcance; su commit posterior es evidencia documental, sin cambios de producto. No implica despliegue.
