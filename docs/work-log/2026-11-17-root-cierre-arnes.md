# Ampliación y verificación del arnés pedagógico

Coordinador principal. Rama local `feature/latencia-ia`, base `6e9c1312`, con cambios previos conservados. El usuario pidió completar el plan. Al inicio, el tablero de cinco tareas verificaba los dos pilotos y los apuntes. La especificación enumera las herramientas restantes en la etapa 3 y deja para después los informes diferenciados y la validación educativa. Este corte sigue esos resultados verificables en los recorridos existentes. [Tablero](../../odd/tasks/pedagogical-harness.md).

## Guion para evaluar aprendizaje y tiempo docente

El producto permite probar el recorrido con casos sintéticos. Para medir el resultado educativo hacen falta participantes, dos tareas equivalentes por tema y una fecha acordada para volver a evaluar. La persona que coordine el piloto acuerda de antemano participantes, condiciones de uso, tratamiento y plazo de conservación de los resultados. Este guion se puede usar sin crear perfiles persistentes de aprendizaje en FoxMind.

| Momento | Tarea observable | Qué registrar |
| --- | --- | --- |
| Antes de estudiar | Resolver una tarea breve del tema y justificar el procedimiento. | Corrección de la respuesta, relación explicada y ayuda utilizada. |
| Con Foxy | Estudiar el material y revisar un intento propio con una pista. | Qué cambió en el razonamiento y qué ayuda hizo falta. |
| Al terminar | Resolver una tarea nueva con otra incógnita o representación, sin asistencia. | Resultado y justificación según la misma pauta. |
| En la fecha de repaso | Resolver sin abrir el apunte un tercer caso equivalente. | Resultado, justificación, intervalo real y práctica entre sesiones. |
| Preparación docente | Crear dos materiales de dificultad equivalente, uno con el procedimiento habitual y otro con Foxy. Alternar el orden entre participantes. | Minutos desde el encargo hasta el borrador utilizable, incluidas revisión y correcciones. Registrar si el docente lo usaría y qué tuvo que cambiar. |

En escalas, por ejemplo, una tarea puede pedir la longitud real a partir del plano y otra pedir qué medida dibujar para una longitud real. Antes de ver las respuestas, quien evalúa acuerda ejemplos de justificación completa, parcial y errónea; acepta métodos equivalentes. En materiales docentes revisa exactitud, desafío, fidelidad a la fuente y voz del autor con la [rúbrica de los pilotos](../verification/pedagogical-pilots.md). Mantener la condición del material oculta al revisor cuando sea posible.

Para informar los resultados, registrar cuántos comenzaron y terminaron cada paso, errores recurrentes y ejemplos desidentificados. Comparar resultados individuales en las tres tareas y la diferencia de minutos entre materiales comparables. Informar aparte los abandonos y los borradores descartados. Una observación en Ego o la preferencia por una respuesta constituyen evidencia técnica o de contenido. Medir retención o ahorro real requiere ejecutar el piloto.

## Alcance técnico y verificación

- Mi Estudio prepara resúmenes fieles y esquemas con relaciones nombradas. La extracción del programa conserva el orden del documento; el planificador de repaso usa las fechas y los temas que elige el estudiante. La consigna personal de cada encuentro llega a Agenda después de confirmar las sesiones elegidas. [Implementación y pruebas](2026-11-17-estudio-esquemas-repaso.md).
- Los recursos de Foxy contemplan resúmenes, planes con práctica y comprobación, rúbricas con evidencia observable, diagramas con vínculos etiquetados e imágenes que explican un proceso o una comparación. Los registros antiguos mantienen su versión de generación. [Compatibilidad y regresiones](2026-11-17-docente_final-recursos-pedagogicos.md).
- Mi progreso muestra la próxima acción del estudiante. El informe individual docente usa señales anónimas de la actividad del aula y conserva la autorización existente. Un análisis docente sigue siendo privado. [Recorridos y límites de evidencia](2026-11-18-informes-pedagogicos.md).
- Los archivos descargables conservan títulos, listas y notación matemática compatible. El PDF V2 incorpora semántica y orden de lectura; la migración admite la nueva versión y conserva el digest del PDF histórico. La base descartable demostró la diferencia entre borrador privado y publicación confirmada. [Pruebas de Word, TXT y PDF](2026-11-18-exportacion-pedagogica.md).

En la primera pasada con Gemini, el esquema de la carpeta incluyó un estado interno sobre prácticas que el estudiante no había pedido. La fuente era válida. Además, el proveedor serializó dos veces algunos saltos de línea del Markdown. Se separó el contexto de aprendizaje de los recursos que no lo necesitan y se reparan separadores estructurales fuera de los fragmentos de código. La vista recupera creaciones anteriores con revisión 1; una edición del estudiante conserva sus caracteres. Ambos defectos tuvieron prueba RED y repetición GREEN.

En Ego se editó la consigna de un repaso para comparar dos tomas sin abrir el apunte. Agenda mostró las tres sesiones a las 17 h los días 19, 22 y 26 de noviembre. El planificador ahora corrige también la sugerencia de inicio si la hora de hoy ya pasó. El registro de Mi progreso mostró una entrega sobre dos y nombró la actividad que faltaba.

La repetición del esquema en V5 separó el contraste, definido de forma aislada, de las relaciones entre apertura, luz y exposición. La lectura recuperó títulos y listas y omitió el estado interno. Tras las 17:00, el planificador propuso iniciar al día siguiente.

La planificación docente real distribuyó 25 minutos en apertura (4), modelado (6), práctica (10) y comprobación (5). El diagrama privado mostró tres enlaces etiquetados y explicó la condición de duración e iluminación constantes. La primera rúbrica usó una tabla Markdown que el lector no representaba como tabla. Para el formato predeterminado, Foxy V6 pasó a un encabezado por criterio y viñetas con niveles y evidencias; un formato solicitado expresamente prevalece. Ego comprobó dos criterios con tres niveles cada uno. La descarga de esa rúbrica produjo un Word con dos encabezados de criterio y un TXT con las descripciones correspondientes, sin separadores de tabla.

El análisis del docente citó las dos actividades del aula, identificó una entrega de dos, distinguió la falta de nota de una calificación cero y propuso verificar la entrega pendiente en la revisión siguiente. Mi progreso nombró la acción disponible para el alumno. La evidencia de entregas es insuficiente para inferir dominio del contenido o las causas de un retraso.

## Cierre del candidato local

Dos solicitudes iniciales de imagen terminaron con resultado desconocido. La investigación encontró límites de espera inferiores al tiempo configurado para imágenes. La corrección respeta el tiempo configurado con un máximo de 90 segundos y conserva los límites de bytes y el control de duplicados. En Ego Lite una repetición V2 produjo una imagen privada con un solo envío. Agregó rótulos pese al pedido de omitirlos. En V3 el encargo explícito prevalece y los trabajos pendientes conservan sus instrucciones originales. La repetición del mismo pedido en V3 abrió un PNG privado de 1024 × 1024, sin rótulos, con dos aperturas de diferente tamaño. El segundo grupo superó las seis flechas pedidas. La exactitud de cantidades en imágenes generativas requiere revisión docente. Capturas locales en `.test-artifacts/harness-cierre/imagen-final.png` y `imagen-v3.png`.

La suite rápida (`npm run test:complete -- --group fast`) pasó 2.979 pruebas. Pasaron también el lint, los límites de arquitectura y la validación documental. Los recibos de los cinco entornos que generaron contenido suman 12 solicitudes y USD 0,590973 estimados. Sumando el máximo de USD 0,139264 para el diagnóstico directo, el total estimado de este cierre es de hasta USD 0,730237. Se usaron datos sintéticos. El cargo facturado lo determina el proveedor.

La migración del PDF se probó en PostgreSQL descartable. La verificación corresponde al entorno local. Quedan por medir los resultados educativos con participantes y por evaluar los archivos con usuarios de lectores de pantalla.
