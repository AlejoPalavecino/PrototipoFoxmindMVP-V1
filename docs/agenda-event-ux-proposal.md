> **Contexto histórico:** esta propuesta conserva el estado y la evidencia de su fecha. Consulte la [guía actual de Agenda](engineering/agenda/agenda.md) y el [catálogo de diseños](design/INDEX.md). El contenido siguiente permanece intacto.

# Propuesta: crear un evento personal

Fecha: 2026-10-24. Estado: implementada y verificada funcionalmente en el worktree; preview actualizado, sin integración a main. Captura automática no disponible; no se declara aceptación por píxeles. Objetivo: registrar un compromiso con título, fecha y horario, entender su repetición y encontrarlo al terminar. Mantiene el estilo Folder y los contratos actuales de [Agenda](agenda.md). [Contrato y pruebas de esta mejora](../odd/tasks/agenda-compact-event-form.md).

## Diagnóstico previo y límites

Antes de esta mejora se revisaron EventForm, EventFields, event-draft y useEventEditor y el formulario real desde una cuenta sintética. El DOM mostraba título, categoría, descripción, día completo, inicio/fin, zona y repetición juntos. El borrador usaba 09:00–10:00 y toggleAllDay restablecía esas horas; faltaba resumen de ocurrencias. Guardar recargaba el rango actual aunque se eligiera otra fecha. Son observaciones del formulario anterior, corregidas por esta implementación.

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

## Zona horaria sin fricción

No pedir una zona al crear cada evento. La zona del calendario es la referencia automática: inicialmente proviene del navegador y respeta el cambio explícito que el usuario haya hecho en Agenda. Al editar se conserva la zona guardada del evento, aunque el calendario esté mostrando otra. No inferir zona por ubicación física ni cambiarla silenciosamente.

Para un evento con hora, mostrar solo una aclaración secundaria: Hora de Buenos Aires, Hora de Madrid u otra ciudad legible. La aclaración no es un campo obligatorio ni un selector abierto. En un evento de día completo se oculta porque sus fechas no se convierten entre zonas.

Cambiarla vive dentro de Más opciones, mediante búsqueda/selección de ciudades con etiquetas comprensibles. El identificador IANA permanece como valor interno. Si una zona ya guardada no está entre las sugerencias habituales, debe seguir apareciendo y conservarse. Explicar el efecto antes de cambiar: se mantienen la fecha y la hora ingresadas, que pasan a corresponder a la ciudad seleccionada.

Las horas repetidas por cambio estacional requieren una elección excepcional entre las alternativas reales, expresadas en lenguaje claro; no pedir minutos de desplazamiento UTC. Si el conflicto aparece en una ocurrencia futura de la serie, ofrecer ajustar el horario o la fecha final, porque el contrato no permite excepciones por ocurrencia. No inventar una selección automática.

## Interacción completa

1. Abrir desde un día precarga esa fecha; mostrar título, tipo y horario, con duración inicial de una hora. Elegir una categoría no activa repetición ni borra lo escrito.
2. Al mover el inicio, conservar la duración mientras esté en modo duración. Si el usuario edita el fin manualmente, mantener ese fin y señalar incompatibilidades, sin reemplazarlo silenciosamente. Las duraciones pueden cruzar medianoche.
3. Día completo conserva los campos de hora en el borrador para recuperarlos al desactivarlo. Un rango de varios días se configura en las opciones secundarias y permanece visible en el resumen.
4. La repetición es explícita. Su primera sugerencia es hasta cuatro semanas después del inicio: cinco encuentros incluyendo el primero, con fecha editable. Después de editar esa fecha, no moverla automáticamente al cambiar el inicio. Validar el límite real de 53 ocurrencias y no mostrar un conteo si la configuración es inválida.
5. El pie mantiene Cancelar y Crear evento/Guardar cambios accesibles. La creación normal no requiere varios pasos. Las confirmaciones que cambian o eliminan una serie existente deben conservar el alcance explícito.
6. Una validación fallida conserva el borrador, señala el campo y lo enfoca. Un conflicto remoto permite revisar la versión guardada conservando los cambios locales. No habilitar una sobrescritura sin revisión.
7. Al crear, mostrar la fecha del primer evento en la zona de vista y ofrecer Ver evento. Al editar una serie antigua, conservar la selección actual y ofrecer una acción explícita para ver su inicio, evitando saltar inesperadamente a una fecha pasada.
8. Abrir opciones o buscar una ciudad no cuenta como modificar el evento. Cerrar un borrador sin cambios es inmediato; si hay cambios reales, permitir continuar editando o descartarlos. Guardar correctamente cierra sin otro aviso de descarte.

## Ayuda que evita errores

- Validar junto al campo: título faltante, fin anterior a inicio y fecha final de repetición inválida; enfocar el primer error. Mantener validación autoritativa del servidor.
- Ante una hora estacional ambigua, ofrecer las opciones válidas de hora/zona en lenguaje claro y convertir la selección a los offsets explícitos existentes. Una hora inexistente se debe corregir; no desplazarla automáticamente. La validación sigue abarcando toda la serie.
- No mostrar JSON temporal como explicación principal. Traducir las fechas/opciones recibidas a ayuda legible, sin ocultar errores ni sustituir restricciones.
- Conservar borrador y semántica actual de revisión/CAS ante conflictos. Cerrar sin cambios debe ser inmediato; al descartar cambios reales, ofrecer continuar editando.
- Para edición/eliminación semanal, mantener explícito el alcance de toda la serie, incluidas ocurrencias pasadas.

## Después de guardar

Usar Crear evento para un alta y Guardar cambios para edición. Confirmar la escritura una sola vez; si falla la actualización de la vista, permitir recargar sin repetir el alta. Mostrar el día del evento creado y una acción Ver evento para que la persona lo encuentre. Definir aparte el comportamiento para ediciones de series cuya primera fecha sea pasada.

## Alcance de la primera implementación

Jerarquía del formulario, fecha/hora/duración, preservación de borrador al alternar día completo, repetición con resumen, errores específicos y confirmación visible. Son cambios de interfaz/estado local; conservar privacidad, rango de 93 días, página de 200, 53 ocurrencias, fecha final inclusiva, IANA/DST, ALL_DAY por fechas y concurrencia. No añadir automáticamente asociaciones a aulas ni alterar actividades académicas.

Recordatorios, ubicación/enlace y avisos de solapamiento pueden evaluarse después según uso. Los recordatorios necesitan entrega real y preferencias de usuario; no son un campo decorativo de esta primera mejora. No están implementados ni aprobados por esta propuesta.

## Verificación implementada

35 casos nuevos del formulario y las regresiones J3/J4 pasaron, al igual que tipos y compilación web. El navegador verificó duración, fin manual, alternancia, descarte, foco de error, altas semanal/única/día completo, persistencia real y navegación al resultado. Geometría sin desborde en 390×844 y 1440×1000. La única captura del build final volvió a fallar por timeout; no hubo reintentos ni aceptación visual inventada. [Evidencia independiente](work-log/2026-10-24-compact-form-verify.md) y [cierre del coordinador](work-log/2026-10-24-root-compact-event-form.md).
