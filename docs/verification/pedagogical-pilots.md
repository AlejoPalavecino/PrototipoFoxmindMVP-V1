# Casos de referencia de los pilotos pedagógicos

Usar las mismas fuentes, consignas y condiciones en ambos candidatos. Los textos y situaciones siguientes son sintéticos. Registrar para cada respuesta «cumple», «parcial» o «falla» y la frase o decisión que justifica el resultado. Para comparar calidad, ocultar versión y alternar el orden de las muestras. Una clave revelada en el intento activo, una fuente inventada o una publicación involuntaria son fallos del recorrido.

| Caso y material | Pedido o intento | Qué observar en la respuesta |
| --- | --- | --- |
| Gráfico con marcas 0, 5, 10 y 15; dos puntos separados por dos divisiones | «La diferencia es 2 porque hay dos espacios» | Distingue contar espacios de leer su valor. Ofrece una pista para el paso siguiente. Una lectura equivalente por resta de valores es válida. |
| Mismo gráfico, alumno que aún no conoce el término | «¿Qué es la escala de un eje?» | Explica directamente y usa las marcas como ejemplo. Si el alumno luego pide practicar, deja que haga el intento. |
| Programa de física con una unidad sobre lectura de gráficos y otra sobre temperatura | «¿Qué relación tienen las dos unidades?» | Presenta una relación útil sustentada por el material. Atribuye la intención de ordenamiento al docente sólo si la fuente la documenta. Sin material autorizado, pide lo que falta. |
| Circuito eléctrico y analogía hidráulica en el material | «Si el agua se gasta, ¿la corriente se gasta después de la lámpara?» | Identifica el límite de la analogía y vuelve al concepto. Reconoce una explicación equivalente expresada con otros términos. |
| Práctica con desarrollo ya entregado | El alumno propone una explicación parcialmente correcta | Ancla la devolución a un paso real de la respuesta, prioriza una revisión y respeta su carácter orientativo. El simulacro activo oculta soluciones; después de finalizar se puede revisar el resultado. |
| Dos testimonios sintéticos sobre la misma huelga, objetivo de contrastar perspectivas, 30 minutos | El docente pide una consigna de desarrollo con sus propios ejemplos | Exige comparar y justificar usando los testimonios. El producto es realizable en 30 minutos; los criterios describen evidencia observable y admiten interpretaciones defendibles. La idea privada queda fuera del texto público. |
| Misma actividad, selección simple, con un solo testimonio insuficiente para el contraste solicitado | Generar, aplicar y revisar | Con ambas fuentes, las opciones requieren leer y no delatan la clave. Con información insuficiente se indica el faltante. El material generado llega al editor como borrador privado. |

## Comparación técnica observada

Antes de implementar las reglas, las pruebas del motor y del adaptador registraron 32 éxitos y dos fallos: la solicitud de chat no incluía la ayuda gradual y la actividad no exigía trabajo observable. Tras incorporar las políticas, las mismas 34 pruebas pasaron. El proveedor de prueba inspecciona las instrucciones que recibe y devuelve una respuesta prefijada. Esta comparación acredita la selección y entrega de las reglas.

## Comparación con Gemini real

El 17 de noviembre de 2026 se ejecutaron seis pares con `gemini-3.8-flash`, datos sintéticos e idéntica entrada dentro de cada par. Para Estudio, la base conserva el comportamiento local de latencia y brevedad previo al sufijo pedagógico. Para Actividades se usó el texto V1 original. El coordinador y un segundo revisor de IA registraron sus lecturas antes de cruzar los códigos. La [rúbrica puntuada y las preferencias por muestra](../work-log/2026-11-17-lectura-ciega-pedagogica.md) permiten revisar los juicios.

| Par | Preferencia de ambos revisores | Motivo |
| --- | --- | --- |
| Definición | Arnés | Diferencia razón de proporción con una explicación directa. |
| Error de escala | Arnés | Retoma la división que intentó el alumno y deja que decida la operación. |
| Solución alternativa | Arnés | Reconoce el método por grupos y propone aplicarlo a una medida distinta. |
| Simulacro | Arnés | Incluye dos aplicaciones con datos concretos en sentidos opuestos. |
| Historia | Arnés | Encadena las consignas y exige fundamentar con indicios de testimonios. |
| Selección | Base | Enunciados más consistentes. En ambas versiones las claves ocupaban siempre la primera posición. |

Después de la lectura ciega se ajustaron voseo, posición de claves y redacción de criterios públicos. En la primera repetición, las claves quedaron en posiciones 2 y 1 y el texto pasó al voseo, pero la rúbrica aún anticipaba multiplicación y división. Se agregó un ejemplo de criterio centrado en el resultado y se repitieron los dos casos docentes. En la salida final de selección las claves fueron la segunda (1,5 m) y la tercera (8 cm). La rúbrica dejó de indicar las operaciones exactas; aún orienta con la expresión «relación inversa». En Historia, la segunda pregunta final adelanta el límite de generalización que el alumno debe justificar. La revisión docente sigue siendo importante. Las cuatro repeticiones son comprobaciones dirigidas, externas al recuento de preferencias.

Se conservaron 16 respuestas con conteos de uso: 12.504 tokens de entrada y 19.776 de salida, incluido razonamiento. A las tarifas de entrada/salida de USD 0,75/3,75 por millón, el estimado registrado es **USD 0,083538**. No se consultó facturación. Un reinicio interrumpió el primer proceso con dos pares guardados; la continuación pidió sólo los cuatro pares faltantes. Una solicitud en vuelo sin recibo durante el corte no aparece en esa estimación. Aun imputando dos solicitudes adicionales y los topes efectivos por llamada (12.000 tokens de entrada y 8.192 de salida) el máximo por generación para 18 llamadas a esas tarifas sería USD 0,715. Se preservaron las fuentes sintéticas y salidas bajo `.test-artifacts/pedagogical-gemini-*`.

**Decisión para la etapa 3.** Conservar los dos pilotos locales y priorizar una prueba con docentes antes de extender estas reglas a todas las herramientas. El primer candidato a extender es el apunte editable: permitiría evaluar fidelidad a la fuente y voz docente con una tarea acotada. Quedan pendientes el ahorro de tiempo hasta el borrador utilizable y la transferencia o retención de estudiantes.

### Regla de lectura ciega para las generaciones

Cada revisor puntúa de 0 a 2 cuatro dimensiones por muestra: exactitud y fidelidad a las fuentes; pertinencia de la estrategia al pedido; trabajo intelectual que queda para el estudiante o evidencia concreta que recoge el docente; claridad y utilidad inmediata para el destinatario. Dos indica cumplimiento claro, uno cumplimiento parcial o genérico y cero fallo o contradicción. Registrar una observación textual y una preferencia por caso, admitiendo empate. Las claves de selección pueden estar en el campo privado; revisar por separado un posible indicio o solución explícita en el texto público. Una consigna de explicación directa puede cumplir plenamente sin agregar una pregunta.

Se mantienen las mismas entradas y el mismo modelo dentro de cada par. Las etiquetas no identifican versión. Registrar la evaluación antes de abrir la clave, incluidas preferencias por la versión anterior, errores de formato e incertidumbres. Una muestra por versión y caso permite descubrir regresiones y formular ajustes. No permite estimar un efecto estadístico ni el aprendizaje de los alumnos.

Para el alumno, registrar desempeño con ayuda, tarea nueva sin ayuda y repetición diferida por separado. Para el docente, medir desde el encargo hasta el borrador que considera utilizable, incluidas correcciones. Registrar qué partes del material y del registro docente conservó. La decisión de ampliar a la etapa 3 requiere muestras de contenido revisadas; el piloto con personas y sus datos requiere autorización específica.
