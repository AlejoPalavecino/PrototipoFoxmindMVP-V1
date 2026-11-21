# Repaso, clases y rúbricas con Gemini

- Coordinación planificaciones. Sesión sin identificador expuesto.
- Worktree principal, rama main. Base 4d057490.
- Alcance autorizado: trasladar los recorridos aprobados de la maqueta a la aplicación y verificar los resultados de repaso, clases y rúbricas.

Se inspeccionan el planificador de repaso y el lector docente para reutilizar sus puntos de entrada.

## Cambios y evidencia

- Mi Estudio inicia `GENERATE` con `REVIEW_PLAN` desde el formulario de Organizar mi repaso. Las fechas y la duración se validan antes de la llamada. Gemini propone actividades y temas por ventana y puede devolver un consejo. Se conserva el recibo en chat y el plan en Creaciones.
- Confirmar incorpora sólo las sesiones seleccionadas. El lector consulta el vínculo vigente de cada sesión con Agenda al reabrir. Los planes guardados antes del cambio siguen usando el contrato legado y pueden mostrar una consigna sugerida de respaldo.
- Foxy docente usa el lector de momentos con sus minutos y el editor por nivel para rúbricas con encabezados y listas. El editor visual común cubre formatos libres. El perfil de texto V7 ajusta las instrucciones de ambas herramientas y conserva los perfiles V2 a V6 para turnos anteriores.
- 26 pruebas de repaso, Agenda, formulario y lectura docente pasaron. También pasaron 20 pruebas del adaptador Foxy y 13 de versiones de ejecución. La revisión documental encontró 0 problemas.
- Gemini real local generó un repaso de mitosis de 3 actividades distintas en 16,7 s. El chat y Creaciones recuperaron el plan. Se confirmó sólo la segunda sesión y se comprobó en Agenda que la descripción reproducía la actividad.
- Gemini real local V6 generó y guardó un plan y una rúbrica de mitosis. El ejemplo determinó los ensayos de compatibilidad con separadores entre criterios y minutos antes de un subtítulo. Se detectó una palabra en inglés copiada de las instrucciones y se ajustó el perfil V7.
- En Ego Lite, espacio 14, se recorrieron y capturaron los formularios y resultados de referencia de la maqueta. Las pruebas de interfaz autenticada y la muestra V7 quedan en curso, con turnos por rol para respetar las sesiones compartidas.
- Foxy V7 real en Ego Lite generó una clase de 30 min sobre mitosis (18,6 s) y una de 25 min sobre fotografía (23,2 s). Los minutos visibles sumaban lo pedido y la consigna de mitosis se mantuvo en castellano. Los lectores se vincularon desde el chat y se midió el ancho del diálogo sobre 390 px.
- La rúbrica V7 de fotografía tardó 9 s y respetó dos criterios con pesos de 60 % y 40 % y los mismos cuatro niveles. Se editó un descriptor y se reabrió desde Creaciones. En Ego Lite a 390 px se verificaron los ocho niveles, la edición persistida y ausencia de desborde horizontal.
- La primera muestra de clase mostró palabras partidas en los botones inferiores. Se ajustó el pie de lectores para que las acciones puedan pasar a otra fila y conserven palabras completas. Las capturas anteriores al ajuste quedan en el directorio privado de pruebas.
- `node scripts/check-boundaries.mjs` pasó después de exponer lector y editor docente desde el punto de entrada público de Foxy.
- Ego Lite sobre Mi Estudio real generó un repaso sobre evaporación y precipitación con 3 actividades diferentes y un consejo. Se confirmó una sesión mediante Revisar Agenda. El evento apareció con la actividad exacta. Tras recargar, Creaciones abrió el plan y conservó la marca En agenda y el acceso al evento. El lector no desbordó a 390 px y se contrastó con la maqueta.
- La captura del plan real mostró el pie de acciones bajo el scroll. El candidato separa el contenido desplazable del pie para mantener Revisar Agenda visible, y acerca el resumen y la columna de ayuda a la maqueta. Pendiente comprobar esta última mejora sobre el HTML servido tras reconstrucción.
- En el build siguiente, Ego Lite abrió desde Creaciones el plan real de mitosis. Midió a 1908 y 390 px que el contenido se desplaza manteniendo visibles Cerrar, Guardar plan y Revisar Agenda. No hubo desborde horizontal y se conservó exactamente una sesión confirmada. Capturas en el directorio privado de pruebas.
- Se preparó la cuenta sintética para el resto del QA con un PDF privado de Fotografía legible y un plan de Mitosis legible. La prueba de repaso no consumió más cuota en esta reapertura.
