# Documentación de FoxMind

**Base documental: `main`.** Este índice organiza lo existente sin mover archivos. El [roadmap](implementation-roadmap.md) es la única fuente del checkpoint aceptado y el próximo trabajo; una guía, imagen o registro individual no actualiza por sí solo el estado del producto.

## Empezar según lo que necesitás

| Necesidad | Dónde mirar |
|---|---|
| Saber qué está terminado, en seguimiento o pendiente | [Estado y próximos pasos](implementation-roadmap.md#current-documentation-scope) y [fases](implementation-roadmap.md#phase-overview) |
| Entender reglas y alcance V1 | [Especificación funcional](foxmind-v1-functional-spec.md) |
| Ejecutar la aplicación local | [Operación local y límites](p9-local-operation.md), [backend](backend.md), [base de datos](database.md) y [correo capturado](local-email.md) |
| Consultar diseños y propuestas locales | [Índice de diseño](design/README.md) |
| Revisar la migración FoxMind 3D implementada en rama local | [Guía](foxmind-3d.md), [82 recorridos y evidencia](foxmind-3d-verification.md), [vistas de la aplicación](work-log/evidence/2026-10-25-foxmind-3d/README.md) |
| Comprobar una entrega o retomar una tarea | [Evidencia por fase](#evidencia-y-trabajo-detallado) y [protocolo de registros](work-log/README.md) |

## Producto y contratos

- [Especificación funcional V1](foxmind-v1-functional-spec.md): reglas confirmadas, exclusiones y aceptación.
- [Referencias visuales originales](visual-reference-index.md): catálogo de 29 imágenes; las reglas escritas prevalecen.
- Cuenta y sesión: [contrato y política](api/accounts-sessions.md), [OpenAPI](api/accounts-sessions.openapi.json).
- Archivos privados: [contrato HTTP](api/files.md), [política y antecedente aislado](private-files.md).
- [Aulas e inscripción](classrooms.md): contrato y reglas; el checkpoint aislado no sustituye al estado integrado.

## Guías por tema

| Tema | Documentos |
|---|---|
| Cuenta, sesión y seguridad | [HTTP/configuración](identity-http.md), [primitivas](identity-security.md), [registro/perfil](registration-profile.md), [verificación de correo](account-verification.md), [recuperación](password-recovery.md), [cambio de contraseña](password-change.md), [web de cuenta](p3-web.md) |
| Correo | [Mailpit local](local-email.md), [sender](mail-sender.md), [outbox cifrada](account-mail-outbox.md) |
| Archivos privados | [Host API](p4-host.md), [web](p4-web.md), [integración aceptada](p4-integration.md), [handoff histórico previo](p4-integration-handoff.md) |
| Aulas e inscripción | [Host API](p5-host.md), [web](p5-web.md), [integración aceptada](p5-integration.md) |
| IA para el plan de estudio | [Gemini y configuración](classroom-ai.md), [contrato y tareas](../odd/tasks/classroom-ai-extraction.md), [integración local con Agenda](work-log/2026-10-24-root-classroom-ai-main-integration.md) |
| Organización y comunicación | [Plan](p6-teaching.md), [Biblioteca](p6-library.md), [Muro y notificaciones](p6-muro.md) |
| Agenda y organización personal | [Eventos privados y próximas entregas](agenda.md), [contrato y tareas](../odd/tasks/agenda.md) |
| Actividades y participación | [Autoría](p7-authoring.md), [participación](p7-participation.md), [trabajos prácticos](p7-practical-submissions.md), [cuestionarios/evaluaciones](p7-questionnaire-attempts.md), [historial/notificaciones](p7-history-notifications.md) |
| Actividades con IA y varios temas | [Guía docente y operación](activity-ai.md), [contrato y tareas](../odd/tasks/classroom-activity-ai.md), [registro de implementación local](work-log/2026-10-25-root-activity-ai-implementation.md) |
| Calificaciones y seguimiento | [Corrección privada](p8-private-grading.md), [publicación](p8-publication.md), [rectificaciones auditadas](p8-published-corrections.md), [progreso](p8-progress.md) |
| Inicio y validación local | [Inicio](p9-home.md), [recorridos integrados e historial de prueba](p9-joined-journeys.md), [fallos y recuperación](p9-failure-recovery.md), [operación local](p9-local-operation.md) |

## Evidencia y trabajo detallado

Las pruebas citadas son ejecuciones fechadas, no una comprobación nueva por leer este índice. Una validación local no es deployment ni autorización para usar datos reales.

| Unidad | Evidencia / detalle |
|---|---|
| Fundaciones | [DB](database-verification.md), [backend](backend-verification.md), [dependencias](dependency-security.md); tareas [DB](../odd/tasks/database-foundation.md) y [backend](../odd/tasks/backend-foundation.md) |
| P3 — Cuenta y sesión | [Verificación final](work-log/2026-10-17-p3-verify-final.md), [tareas de cierre](../odd/tasks/p3-completion.md), [runtime de pruebas](p3-test-runtime.md) |
| P4 — Archivos integrados | [Verificación final](work-log/2026-10-18-p4-verify-final.md), [tareas](../odd/tasks/p4-p3-integration.md) |
| P5 — Aulas integradas | [Coordinación e integración](p5-integration.md), [tareas](../odd/tasks/p5-integration.md) |
| P6 — Plan/Biblioteca/Muro | [Coordinación](work-log/2026-10-18-root-p6-teaching.md), [tareas](../odd/tasks/p6-teaching.md) |
| P7 — Actividades | [Coordinación](work-log/2026-10-18-root-p7-activities.md), [tareas](../odd/tasks/p7-activities.md) |
| P8 — Calificaciones/progreso | [Verificación independiente](work-log/2026-10-18-p8-independent-verify.md), [coordinación](work-log/2026-10-18-root-p8-grading.md), [tareas](../odd/tasks/p8-grading.md) |
| P9 — V1 local completa | [Verificación final](work-log/2026-10-20-p9-final-independent-verify.md), [publicación histórica](work-log/2026-10-20-p9-main-publication.md), [matriz](p9-acceptance-matrix.md), [ledger exacto](p9-final-row-ledger.json), [tareas](../odd/tasks/p9-local-validation.md) |

P9 conserva también el [plan finito de verificación](p9-verification-plan.md) y los [controles del runtime aislado](p9-runtime-controls.md). No son una instrucción para repetir suites o modificar sus límites.

## Cómo interpretar y mantener la documentación

- **Vigente:** reglas, contratos y procedimientos aplicables a la base indicada. El estado global se consulta en el roadmap.
- **Histórico:** resultado de una intervención/candidato anterior. Un `blocked` o `in_progress` antiguo no prueba trabajo activo hoy; un `completed` de un agente no acepta toda la fase.
- **Propuesta:** pendiente de decisión; generar o seleccionar una imagen no autoriza su implementación.
- **Integrado, publicado y desplegado:** requieren evidencia separada. No son sinónimos.

Las tareas detalladas permanecen en `odd/tasks/`; los [registros por agente](work-log/README.md) conservan autoría, fallos y correcciones. No se reescriben registros ajenos para hacerlos coincidir con un cierre posterior. Al cerrar una unidad, el coordinador actualiza el roadmap y enlaza sus pruebas; los índices sólo facilitan encontrarlas.

Esta primera etapa no crea un backlog duplicado ni cambia políticas, rutas, requisitos, aceptación o permisos. El [registro de esta etapa](work-log/2026-10-22-root-docs-stage1.md) identifica los cambios y comprobaciones. La auditoría y los diseños que sólo existen en otro checkout se registran como material local en el [índice de diseño](design/README.md).
