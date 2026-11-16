# Estado de FoxMind

El candidato de la auditoría del 12 de noviembre de 2026 es `398cc0b` en `main`, igual a la referencia local `origin/main`. El estado Git refleja las publicaciones registradas. El estado de despliegue queda fuera de esas publicaciones.

| Área | Implementación en main | Fuente |
|---|---|---|
| Cuenta y perfil | Rol exclusivo, verificación, recuperación, configuración de contraseña y cuatro avatares Foxy o iniciales con guardado explícito | [Identidad](engineering/identity/README.md) |
| Inicio por rol | Orden independiente de entregas y consultas, aula en foco y acciones docentes con destino explícito. Pendientes y devoluciones propias en estudiante. Mini agenda compartida y entregas adaptadas a móvil | [Inicio](engineering/home/README.md), [auditoría](work-log/2026-11-12-root-home-visual-audit.md) |
| Aulas | Activas, archivadas y pendientes según el rol. Asistente de cuatro pasos, códigos persistentes de seis dígitos, invitaciones múltiples con resultado individual y composición visual compartida | [Aulas](engineering/classrooms/README.md), [integración](work-log/2026-11-11-root-classrooms-frontend.md), [auditoría](verification/classrooms-visual-audit.json) |
| Plan, Biblioteca y Muro | Avance docente consultable, materiales con revisiones, avisos, consultas y respuestas | [Enseñanza](engineering/teaching/README.md) |
| Actividades y calificación | Autoría manual o asistida, prácticos, cuestionarios y evaluaciones, entrega confirmada, devolución privada o publicada y progreso por rol | [Actividades](engineering/activities/README.md), [calificación](engineering/grading/README.md) |
| Foxy AI docente | Historial buscable, contexto y adjuntos privados, cola que retoma trabajo al liberarse capacidad, visuales desde un chat nuevo y lectura/descarga separadas de Compartir | [Foxy](engineering/ai/foxy.md), [publicación](work-log/2026-11-12-root-foxy-study-publication.md) |
| Carpetas de estudio | Asistente de cuatro pasos, chat privado, adjuntos con copia opcional, materiales y plan, vista previa DOCX con descarga original, prácticas, sesiones de repaso y diálogos de confirmación | [Estudio](engineering/study/README.md), [recorridos E2E](verification/2026-11-12-foxy-study-e2e.md) |
| Agenda y avisos | Calendario Mes/Semana/Día que conserva la fecha, detalle lateral o inferior según ancho, formulario adaptable, eventos personales y avisos dentro de FoxMind | [Agenda](engineering/agenda/README.md), [evidencia](verification/agenda-ux.json) |
| Arquitectura por dominios | Frontend por features, pantallas y composición. Backend por módulos con puertos y adaptadores. Contratos y lógica neutral en `src/core` | [Arquitectura](engineering/architecture.md), [cierre de migración](verification/architecture-migration.json) |

## Pendientes registrados

- Agenda conserva seis hallazgos visuales de la revisión posterior a la publicación. [Registro de Agenda](work-log/2026-11-12-root-agenda-publication.md)
- Hosting, presupuesto, proveedores cloud, cuota productiva y piloto siguen pendientes de decisión. La evidencia disponible corresponde a entornos locales o descartables. [Límites de verificación](verification/README.md)

## Arquitectura IA integrada — 2026-11-16

La arquitectura IA incorpora SDK oficiales, perfiles persistentes por trabajo en seis tareas y protección de pendientes antiguos. Gemini conserva la configuración inicial; Claude queda preparado con activación explícita futura. El código está integrado y publicado en main (`e9d901d`); no se aplicó la migración a datos retenidos ni se realizó despliegue. El [recibo de publicación](work-log/2026-11-16-root-ai-runtime-publication.md) distingue código publicado de actualización de entornos. Ver [especificación](engineering/ai/runtime-proposal.md), [tablero](../odd/tasks/ai-runtime.md) y [evidencia local](work-log/2026-11-16-root-ai-runtime-design.md).
