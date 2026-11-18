# Progreso: tres medidas independientes

| Medida | Regla |
|---|---|
| Cumplimiento | Actividades publicadas y obligaciones persistidas; una primera entrega confirmada cuenta como entregada, no un borrador |
| Rendimiento | Notas efectivas publicadas; ausencia/privado/pendiente no equivale a cero |
| Avance del plan | Temas dados sobre temas totales; no cambia notas ni entregas |

A tiempo/tarde usa la primera recepción confirmada y su plazo aplicado; no el plazo actual o la última reentrega. Reabrir no borra el cumplimiento anterior.

El promedio individual pesa por igual actividades con calificación efectiva publicada. El promedio de clase es la media de los promedios individuales exactos de alumnos actuales con nota; no agrupar filas de notas ni promediar valores ya redondeados. Redondear sólo al presentar.

Sin denominador aplicable se informa ausencia, no un porcentaje inventado. Un publicado0 es distinto de no tener nota.

El docente ve clase/alumnos actuales e historia preservada separada; el estudiante sólo su progreso. Reingreso no multiplica obligaciones por cada período de membresía. Lecturas no crean intentos, obligaciones o notas.

## Presentación y acompañamiento

Progreso docente muestra entregas recibidas, plan trabajado, barras por actividad, distribución de notas publicadas y recorridos individuales. El promedio del gráfico mantiene la regla de clase: media de promedios individuales exactos. La distribución cuenta las notas efectivas por actividad y estudiante; una nota cero participa del rango correspondiente.

Cada barra separa la última entrega confirmada en por revisar, revisión privada guardada o devolución publicada; los estudiantes sin entrega ocupan un cuarto estado. `review` contiene únicamente `attemptId` y `state` y sólo se incluye para el docente. Guardar una revisión no publica la nota. Una reentrega puede estar por revisar mientras el rendimiento conserva una nota efectiva anterior. El próximo acompañamiento abre el intento concreto; abrir una barra lleva a las entregas de esa actividad.

Ver recorrido abre un diálogo con entregas, promedio publicado y actividades del estudiante, incluyendo el estado de su última revisión y acceso directo a ella. Volver al progreso conserva el destino de entrada. La ficha desde Estudiantes sigue disponible como recorrido separado.

Mi progreso muestra el cumplimiento propio, promedio publicado, devoluciones y El camino de la clase. La acción Seguir con mis actividades abre Actividades; Ver devolución abre el intento que produjo la nota efectiva publicada mediante `publishedAttemptId`, incluso cuando existe una reentrega posterior sin publicar. Su identidad procede de la misma calificación publicada y autorizada que la nota; no del último intento privado. El progreso por unidad se consulta desde `units` y `topics`, independientemente de actividades retiradas o notas. Unidades sin temas indican ausencia de denominador y no presentan un porcentaje inventado. La proyección propia y la evidencia para análisis individual omiten el campo docente `review`, sin notas privadas ni datos de compañeros.

La orientación de Mi progreso prioriza una reentrega habilitada e indica la actividad por nombre. Si quedan entregas obligatorias y el aula admite cambios, identifica una que puede consultar. Cuando corresponde sólo consultar, sugiere usar una devolución publicada para elegir un ajuste que aplicar en la próxima actividad. El criterio se deriva de los registros que recibe el estudiante. El [análisis individual](../ai/student-analysis.md) es una vista orientativa para docentes.

La verificación de paridad actual se registra en [el trabajo de Progreso](https://github.com/AlejoPalavecino/PrototipoFoxmindMVP-V1/blob/2ed07b6794cbe5b296ad3b65b7f8a91a4ce91d81/docs/work-log/2026-11-16-classroom-progress-exact.md); las pruebas de componentes no sustituyen la comparación visual del coordinador.

Fuentes: [servicio](../../../apps/api/src/bootstrap/academic-grading-composition.ts), [esquema](../../../prisma/schema.prisma). [Flujos actuales](../../verification/flows.md).
