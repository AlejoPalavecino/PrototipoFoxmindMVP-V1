# Asistencia IA: capacidades y límites

| Necesidad | Guía vigente |
|---|---|
| Acompañar estudio privado, practicar y preparar exámenes | [Carpetas de estudio](../study/README.md) |
| Extraer unidades/temas de un documento | [Plan](plan-extraction.md) |
| Preparar un borrador de actividad | [Generación](activity-generation.md) |
| Orientar seguimiento individual | [Análisis](student-analysis.md) |
| Proponer una corrección privada | [Corrección asistida](grading-assistance.md) |
| Conversar y preparar/publicar recursos | [Foxy](foxy.md) |

Compartir proveedor o presupuesto no combina reglas de entrada, privacidad, cuotas ni publicación. Configuración y credenciales quedan en backend. Ninguna capacidad autoriza publicaciones automáticas o tratamiento más amplio de datos personales.

La [matriz actual](../../verification/flows.md) registra recorridos con proveedores sintéticos. No hubo llamadas pagas/reales en esta comprobación. El análisis individual sólo se observó en su rama de error; la corrección IA no generó una sugerencia nueva en el ensayo.

Los adaptadores pertenecen al módulo que define su contrato: curriculum para extracción, activities para generación, grading para análisis/corrección, foxy para conversaciones y recursos, study para estudio privado. `platform/ai` conserva admisión, presupuesto y cliente técnico; `bootstrap` selecciona y conecta proveedores. Un proveedor compartido no convierte todas las capacidades IA en un único dominio.

Fuentes: [extracción](../../../apps/api/src/modules/curriculum/infrastructure/providers/gemini-adapter.ts), [actividades](../../../apps/api/src/modules/activities/infrastructure/providers/activity-adapter.ts), [Foxy](../../../apps/api/src/modules/foxy/infrastructure/providers/), [Estudio](../../../apps/api/src/modules/study/infrastructure/providers/study-adapter.ts), [admisión compartida](../../../apps/api/src/platform/ai/admission.ts), [composición](../../../apps/api/src/bootstrap/application.ts).
