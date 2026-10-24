# Propuesta: crear un evento personal

Fecha: 2026-10-24. Estado: propuesta, sin cambios de comportamiento implementados. Objetivo: que un estudiante pueda registrar un compromiso con título, fecha y horario, entienda su repetición y encuentre el resultado al terminar. Mantener el estilo Folder y los contratos actuales de [Agenda](agenda.md).

## Evidencia actual y límites

Revisados EventForm, EventFields, event-draft y useEventEditor, y abierto el formulario real en el preview local desde una cuenta sintética. El DOM confirma título, categoría, descripción, día completo, inicio/fin, zona y repetición en el mismo flujo. El borrador usa 09:00–10:00 y toggleAllDay restablece esas horas; la repetición muestra fecha final y límite 53 sin resumen de ocurrencias. Guardar recarga el rango actual, aunque el usuario haya elegido otra fecha dentro del formulario.

La captura de esta revisión falló con Page.captureScreenshot timeout. No hay capturas aceptadas ni auditoría visual completa. Las observaciones son funcionales/estáticas; no prueban problemas de contraste, espaciado o accesibilidad visual. No se guardaron eventos ni se alteró la pestaña manual del usuario.

## Flujo recomendado: una sola pantalla

Evitar un asistente con múltiples pasos para un evento sencillo. Ordenar un formulario compacto en tres grupos, con acciones al pie; en móvil, permitir desplazamiento del contenido manteniendo accesible la acción principal.

| Grupo | Contenido principal | Comportamiento |
|---|---|---|
| Qué voy a organizar | Clase / Evaluación / Actividad; título con ejemplo contextual | Categorías como opciones claramente seleccionables y accesibles; no depender solo del color. Ayuda breve: Solo visible para vos. |
| Cuándo | Fecha elegida en el calendario; hora inicial; duración editable | Separar fecha y hora. Atajos de 30/60/90 minutos pueden calcular el fin; conservar duración al mover inicio si el usuario no fijó un fin manual. Día completo debe preservar el horario previo al desactivarlo. |
| Cómo se repite | Una vez / Cada semana; hasta cuándo | No activar repetición silenciosamente. Al elegirla, mostrar el día real y fecha final inclusiva, cantidad calculada y límite válido. |

Descripción, eventos que ocupan varios días y cambio de zona van en opciones secundarias. La zona efectiva siempre debe ser visible como dato humano (por ejemplo, hora de Buenos Aires), con una acción explícita para cambiarla. El dominio sigue guardando IANA; no reinterpretar silenciosamente el horario.

Antes de confirmar, un resumen comprensible: Clase de Historia · martes 27, 18:00–19:00 · cada martes hasta el 24 de noviembre. El ejemplo ilustra la redacción, no resultados de cálculo. Implementar el resumen a partir del borrador real y no mantener una segunda regla temporal.

## Ayuda que evita errores

- Validar junto al campo: título faltante, fin anterior a inicio y fecha final de repetición inválida; enfocar el primer error. Mantener validación autoritativa del servidor.
- Ante una hora estacional ambigua, ofrecer las opciones válidas de hora/zona en lenguaje claro y convertir la selección a los offsets explícitos existentes. Una hora inexistente se debe corregir; no desplazarla automáticamente. La validación sigue abarcando toda la serie.
- No mostrar JSON temporal como explicación principal. Traducir las fechas/opciones recibidas a ayuda legible, sin ocultar errores ni sustituir restricciones.
- Conservar borrador y semántica actual de revisión/CAS ante conflictos. Cerrar sin cambios debe ser inmediato; al descartar cambios reales, ofrecer continuar editando.
- Para edición/eliminación semanal, mantener explícito el alcance de toda la serie, incluidas ocurrencias pasadas.

## Después de guardar

Usar Crear evento para un alta y Guardar cambios para edición. Confirmar la escritura una sola vez; si falla la actualización de la vista, permitir recargar sin repetir el alta. Mostrar el día del evento creado y una acción Ver evento para que la persona lo encuentre. Definir aparte el comportamiento para ediciones de series cuya primera fecha sea pasada.

## Alcance sugerido de la primera implementación

Jerarquía del formulario, fecha/hora/duración, preservación de borrador al alternar día completo, repetición con resumen, errores específicos y confirmación visible. Son cambios de interfaz/estado local; conservar privacidad, rango de 93 días, página de 200, 53 ocurrencias, fecha final inclusiva, IANA/DST, ALL_DAY por fechas y concurrencia. No añadir automáticamente asociaciones a aulas ni alterar actividades académicas.

Recordatorios, ubicación/enlace y avisos de solapamiento pueden evaluarse después según uso. Los recordatorios necesitan entrega real y preferencias de usuario; no son un campo decorativo de esta primera mejora. No están implementados ni aprobados por esta propuesta.

## Verificación cuando se implemente

Test-first de duración/fechas, alternancia sin pérdida de horas, resumen semanal/límites, errores y conservación de borrador/conflicto. Mantener las regresiones J3/J4 de acceso/rango. Probar crear una clase semanal, una evaluación única y un evento de día completo en móvil y escritorio, verificar persistencia y que el resultado quede visible. Capturas nuevas siguen necesarias para aceptación visual.
