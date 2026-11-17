# Extraer un plan y revisar unidades

En el asistente de aula, subir PDF/DOCX sólo carga y valida. El docente elige Analizar con IA en el segundo paso y continúa; el servicio crea un trabajo durable. En el tercero se muestran cola/proceso/error y la propuesta editable.

El docente revisa nombres/temas, agrega/quita y usa explícitamente las unidades revisadas. Si ya había unidades, el reemplazo requiere la confirmación aplicable. Aplicar no publica el aula. Puede continuar manualmente ante demora, indisponibilidad o error; una respuesta tardía no reemplaza sus cambios.

El proveedor recibe el documento aprobado y límites de extracción configurados. Las advertencias sobre estructura parcial o imágenes DOCX omitidas se conservan. No inferir generación libre de un programa de estudio ni ampliar el temario.

La capacidad backend vive en `curriculum/generation`. Su capa `application` decide inicio, retry, replay de requestId, conflicto de revisión y aplicación explícita; recibe operaciones tipadas que mantienen el mismo `Transaction`. La infraestructura conserva SQL, locks, lectura autorizada, ejecución del proveedor y snapshots persistidos de perfil/modelo. La serialización del hash de solicitudes conserva su formato anterior para poder reconocer recibos preexistentes. El adaptador de construcción compatible sigue disponible durante la migración; no contiene la coordinación del caso de uso.

`activities/generation` sigue el mismo límite: la aplicación valida el estado/revisión y construye la propuesta aplicada, y los adaptadores guardan el borrador, actualizan la revisión y registran el recibo dentro de la transacción recibida. Esta reorganización no cambia esquemas, rutas HTTP, cuotas, modelos configurados ni comportamiento de respuestas tardías.

Fuentes: [Wizard](../../../apps/web/src/application/workflows/classroom-creation/ClassroomWizard.tsx), [runtime](../../../apps/api/src/bootstrap/academic-curriculum-ai-runtime.ts), [esquema de salida](../../../src/core/domain/curriculum/plan-schema.ts). [Prueba actual](../../verification/flows.md): PDF aprobado, extracción sintética, revisión/aplicación y aula publicada. También se recorrió DOCX y modo manual; no se llamó a Gemini real.
