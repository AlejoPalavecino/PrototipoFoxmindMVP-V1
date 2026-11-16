# Corrección privada, publicación y conservación

El docente abre una entrega desde Inicio, la actividad o la ficha del alumno. La corrección privada conserva puntos por pregunta, rúbrica, nota sugerida, nota final editable y devolución.

## Recorrido actual

Calificar criterios orienta la nota ponderada. Usar nota sugerida es una decisión; la nota final puede editarse. Guardar corrección privada no publica, no notifica y no hace visible el resultado al estudiante.

Publicar calificación abre revisión/confirmación. Confirmar publica la versión guardada y actualiza la calificación efectiva de la actividad, aunque sea menor. El estudiante consulta su resultado publicado y la evaluación por criterios; claves de respuesta, auditoría privada y propuestas IA no se revelan. La proyección publicada incluye los campos autorizados de cálculo/rúbrica suggestedGrade, finalGradeOverride y calculatedGrade; no deben confundirse con una propuesta IA privada.

La asistencia IA es privada y opcional, con [contrato propio](../../../odd/tasks/grading-ai-issue-2.md). Una falla conserva la corrección manual. Aplicar una sugerencia no publica.

La mesa presenta el trabajo a la izquierda y la revisión a la derecha en escritorio; en móvil conserva el orden de lectura. Ofrece navegación entre entregas y entre preguntas. El panel de corrección alterna entre Rúbrica y nota y Devolución, y conserva los cambios al cambiar de sección. La devolución separa «Lo que hiciste bien», «Para mejorar» y «Próximo paso», más un comentario general opcional. Vista previa y resultado estudiantil comparten componentes. En Mi progreso el estudiante consulta sus devoluciones y el avance de las unidades; Seguir con mis actividades abre la sección Actividades. Estos bloques se serializan con títulos en el campo existente `overallFeedback`, sin migrar el contrato ni perder comentarios anteriores; el límite agregado sigue siendo 5000 caracteres. Un comentario legado se conserva como general. Publicar queda deshabilitado mientras haya cambios sin guardar. Salir/cambiar de intento con cambios exige decidir si se descartan; Recargar restaura explícitamente la versión guardada.

## Cálculo e integridad

Puntos disponibles positivos; cero ganado o nota final cero son válidos. Las entradas manuales admiten como máximo dos decimales; no se redondean silenciosamente para validarlas. El motor conserva fracciones exactas y redondea half-up al límite final de presentación. En selección múltiple, marcar cualquier opción incorrecta da cero a toda la pregunta; selección vacía también da cero. EXACT otorga todos los puntos sólo si el conjunto marcado coincide exactamente con el correcto. PARTIAL, sin opciones incorrectas, calcula puntos disponibles × correctas marcadas / correctas totales, conservando la fracción sin redondeo intermedio.

La nota efectiva sólo apunta a un resultado publicado. Rectificar modifica sólo la nota final del mismo resultado publicado, exige motivo y registra actor, fecha, nota anterior y nueva; conserva puntos, publishedAt e identidad de la calificación efectiva y notifica al estudiante. No reescribe respuestas, recepción ni publicación original. Los promedios excluyen notas ausentes/privadas, sin confundirlas con cero. Consultá [progreso](progress.md).

Fuentes: [editor](../../../apps/web/src/features/grading/ui/GradingEditor.tsx), [motor](../../../apps/api/src/modules/grading/domain/scoring.ts), [corrección](../../../apps/api/src/modules/grading/application/grading.ts), [publicación](../../../apps/api/src/modules/grading/application/grade-publication.ts). [Evidencia actual](../../verification/flows.md).
