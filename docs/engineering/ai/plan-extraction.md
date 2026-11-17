# Extraer un plan y revisar unidades

En el asistente de aula, subir PDF/DOCX sólo carga y valida. El docente elige Analizar con IA en el segundo paso y continúa; el servicio crea un trabajo durable. En el tercero se muestran cola/proceso/error y la propuesta editable.

El docente revisa nombres/temas, agrega/quita y usa explícitamente las unidades revisadas. Si ya había unidades, el reemplazo requiere la confirmación aplicable. Aplicar no publica el aula. Puede continuar manualmente ante demora, indisponibilidad o error; una respuesta tardía no reemplaza sus cambios.

El proveedor recibe el documento aprobado y límites de extracción configurados. Las advertencias sobre estructura parcial o imágenes DOCX omitidas se conservan. No inferir generación libre de un programa de estudio ni ampliar el temario.

Fuentes: [Wizard](../../../apps/web/src/application/workflows/classroom-creation/ClassroomWizard.tsx), [runtime](../../../apps/api/src/bootstrap/academic-curriculum-ai-runtime.ts), [esquema de salida](../../../src/core/domain/curriculum/plan-schema.ts). [Prueba actual](../../verification/flows.md): PDF aprobado, extracción sintética, revisión/aplicación y aula publicada. También se recorrió DOCX y modo manual; no se llamó a Gemini real.
