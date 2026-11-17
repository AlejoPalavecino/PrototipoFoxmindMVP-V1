# Foxy docente durante la corrección del 17 de noviembre de 2026

Agente docente del coordinador. Rama main, checkout principal y base 375a2d75. Alcance vigente autorizado por el usuario a través del coordinador. Corregir los recorridos de Foxy docente registrados por la auditoría, conservando Gemini, los permisos y originales privados. El coordinador gestiona prompt persistido en el API visual, prueba final integrada y tablero.

Pruebas de regresión primero para el seguimiento de turnos y reconciliación de descarte. Después se verifican filtros, cronología, lectura, fuente de estado de publicación y el traspaso desde una creación.


## Cambios y evidencia técnica

- El chat recupera la lectura del mismo turno con espera creciente y una acción explícita. Los errores de cuota, contexto y tasa se distinguen sin volver a enviar la solicitud. La cronología ordena los trabajos visuales y los turnos de texto y muestra la consigna persistida.
- Historial y Creaciones conservan filtros combinados. Biblioteca permite armar el alcance de próximos pedidos con temas y fuentes autorizados. El formulario de herramienta respeta la selección del chat.
- El lector textual indica las publicaciones existentes al reabrir. Ofrece Word y TXT y mantiene la separación entre lectura, edición, revisión y publicación. Los textos originados en Gemini con saltos escapados se muestran y exportan con párrafos. Las ediciones docentes conservan su contenido guardado.
- El traspaso abre la revisión y preparación de un TP privado desde la creación. El lector visual ofrece el archivo original y un TXT completo opcional del esquema. El TXT editorial continúa disponible.
- La lista de preparaciones deja que termine la inspección ya en curso al recibir una revisión más nueva. El caso evita perder el estado confirmado de descarte mientras todavía se descarta una respuesta individual desactualizada.

Las dos pruebas de regresión iniciales fallaron por las causas esperadas. La prueba del chat no encontró aviso ni nueva lectura después de un 429. La prueba del descarte confirmó que la señal de la inspección individual quedaba cancelada. Las siete nuevas comprobaciones focales pasaron al corregir el código. La suite conjunta de Foxy, lector y temas visuales pasó 370 de 370 pruebas. TypeScript de la web y el verificador de límites de frontend pasaron. En un corte anterior de la suite quedó un doble de chat General que dependía de no resolver fuentes. Se corrigió la ruta General y la prueba pasó en la ejecución final.

## Comprobación en la aplicación recompilada

Chromium a 390 × 844 con dos cuentas docentes sintéticas. Build web del 17 de noviembre de 2026 a las 17:41:10, hora local. Las creaciones reales de Gemini se recuperaron del propio entorno de auditoría.

| Recorrido | Resultado |
| --- | --- |
| Apunte publicado | Historial y Creaciones filtran por contexto. Creaciones combina estado, tipo y búsqueda. El lector de la revisión privada muestra su publicación previa y el material sigue identificado por el mismo ID. |
| Selección de fuentes | En un aula, Biblioteca abre Temas y fuentes, selecciona Exposición y el PDF publicado. Al preparar un apunte se conserva esa selección de temas. |
| Formato y Word | La planificación de Gemini con saltos serializados abre con encabezados e imprime el mismo contenido normalizado en TXT. El archivo .docx se descarga con firma ZIP y 9459 bytes. |
| Descarte | Tras revisar y confirmar, el lector muestra la preparación descartada. La inspección devuelve DISCARDED en revisión 2. El estado de conflicto ya no aparece. |
| Rúbrica y TP | La rúbrica generada abre la revisión del TP. La confirmación exige marcar la revisión y crea un borrador relacionado por ID. Abrir borrador en Actividades navega al destino y al título exactos. |
| Visuales | JPEG de 599297 bytes y PNG de 34272 bytes descargados desde el lector privado, con las firmas esperadas. El esquema exportó TXT editorial y TXT completo con conceptos y relaciones. La descripción persistida aparece antes del mensaje de texto que la siguió, también después de recargar. |
| Recuperar un 429 | El navegador simuló un único 429 en la lectura de estado. Foxy mostró el aviso y Volver a consultar. Gemini completó el turno real con un POST, tres lecturas y una sola respuesta READY. |

Artefactos locales ignorados en .test-artifacts/qa17-docente. Los recibos exitosos son correccion-mwl5scno.json, correccion-mwl5szfp.json, visual-corregido-mwl5re3e.json y poll-corregido-mwl5re4x.json. En correccion-mwl5re65.json pasaron formato y descarte. Los selectores originales de los filtros usaban getByLabel con texto exacto dentro de un label que contiene opciones. Se cambió a combobox por nombre accesible. La primera comprobación del destino esperaba ver el título en el paso Alcance. Se verificó la URL y se avanzó a Contenido, donde el título corresponde al borrador de origen.

Finalizó la ejecución propia. La validación de generación directa de actividades y la decisión de entrega quedan a cargo del coordinador. No se crearon commits.

## Ajuste posterior de interfaz

La selección de una sola fuente se anuncia en singular. El traspaso abierto con un modo elegido muestra el formulario correspondiente y elimina el título y las alternativas repetidos. La entrada genérica del panel todavía permite elegir el modo. Las dos pruebas nuevas reprodujeron los defectos y luego pasaron. La suite focal de colecciones y traspaso pasó sus 14 pruebas. En el build de las 17:55:21 pasaron cuatro recorridos en Chromium a 320 × 640 y 390 × 844. El contador mostró «1 fuente seleccionada» y el formulario de traspaso presentó un encabezado y una acción Revisar borrador. Los diálogos quedaron dentro del viewport. Escape, Cerrar diálogo y Volver al chat devolvieron el foco al acceso correspondiente. La prueba no inició generaciones ni guardó borradores. Recibo local en .test-artifacts/qa17-docente/final-mobile-copy-mwl6c5yt.json.
