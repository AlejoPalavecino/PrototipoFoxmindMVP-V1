# Encontrar e interpretar la evidencia

Esta página enlaza ejecuciones fechadas. No suma pruebas de candidatos distintos ni vuelve a ejecutar o aceptar el producto por leer sus registros. El [roadmap](../implementation-roadmap.md#estado-actual) mantiene el estado global; [cómo verificar un cambio](../engineering/testing/README.md) explica el procedimiento vigente.

## Fundaciones y V1

| Unidad | Evidencia de referencia |
|---|---|
| Base de datos y backend | [DB](../database-verification.md), [backend](../backend-verification.md) |
| Cuenta y sesión | [Verificación P3](../work-log/2026-10-17-p3-verify-final.md), [contrato HTTP](../api/accounts-sessions.md) |
| Archivos privados | [Cierre P4](../work-log/2026-10-18-p4-verify-final.md), [handoff anterior](../p4-integration-handoff.md) |
| Aulas | [Recorrido integrado](../engineering/classrooms/integration.md) |
| Plan, Biblioteca y Muro | [Coordinación P6](../work-log/2026-10-18-root-p6-teaching.md) |
| Actividades y entregas | [Coordinación P7](../work-log/2026-10-18-root-p7-activities.md) |
| Calificación y progreso | [Verificación independiente P8](../work-log/2026-10-18-p8-independent-verify.md), [coordinación](../work-log/2026-10-18-root-p8-grading.md) |
| Validación local V1 | [Verificación P9](../work-log/2026-10-20-p9-final-independent-verify.md), [matriz](../p9-acceptance-matrix.md), [ledger](../p9-final-row-ledger.json) |

El [plan P9](../p9-verification-plan.md), los [recorridos unidos](../p9-joined-journeys.md) y la [recuperación ante fallos](../p9-failure-recovery.md) conservan sus candidatos y límites históricos; no son el próximo trabajo ni un mandato de repetirlos.

## IA y extensiones

| Función | Cierre y límites |
|---|---|
| Extracción de plan | [Cierre de la integración](../work-log/2026-10-24-root-classroom-ai-final.md) |
| Generación de actividades | [Gemini real y flujo docente](../work-log/2026-10-25-gemini_real_verify.md) |
| Análisis individual | [Recorrido sintético con Gemini](../work-log/2026-10-28-root-student-ai-verification.md) |
| Corrección asistida | [TP con PDF](../work-log/2026-10-29-root-gemini-grading.md), [cuestionario/evaluación](../work-log/2026-10-29-root-gemini-questionnaire-evaluation.md) |

Un proveedor controlado prueba integración de FoxMind; una llamada real no acredita todos los modelos o formatos. Aplicar una sugerencia privada y publicar una nota son operaciones diferentes. Las [guías de IA](../engineering/ai/README.md) y sus contratos delimitan cada caso.

## Cambios y comprobaciones posteriores

- [Seis correcciones de auditoría](../work-log/2026-10-30-root-audit-completion.md): resultados y rechazos previos atribuidos, sin borrar límites.
- [Cierre de cinco comprobaciones](../work-log/2026-10-30-root-five-historical-checks.md): conserva el checkpoint anterior con omisiones y la ejecución posterior de los cinco casos.
- [Sistema visual FoxMind3D](../foxmind-3d-verification.md) y [catálogo visual](../../design-qa.md): observar una captura no equivale a un flujo autenticado completo.
- [Auditoría documental Astra](../audits/2026-10-30-astra-documentation-audit.md) y [reorganización](../../odd/tasks/documentation-reorganization.md): controles documentales separados de aceptación funcional.

## Buscar un registro

El [catálogo por unidad y fecha](../work-log/INDEX.md) enlaza las fuentes originales. Un resultado fallido o un estado antiguo se interpreta dentro de su candidato; no se cambia retrospectivamente por un cierre posterior. Los artefactos permanecen junto a sus registros y mantienen su procedencia.
