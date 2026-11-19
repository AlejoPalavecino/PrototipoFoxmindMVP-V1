# Acompañamiento docente por estudiante y aula

[Abrir la maqueta integrada](../../design/foxmind-ui-lab/01-foxmind.html). En Inicio docente, Fotografía y luz reúne a Tomás, con una entrega para leer, y a Marina, con varias notas para comparar. La fecha del escenario es el 13/11/2026. El [primer boceto aislado](../../design/acompanamiento/index.html) conserva los casos iniciales al 18/11/2026.

El diseño de la ficha y el recorrido docente están aprobados. La primera implementación usa los cortes iniciales que se detallan abajo. Su utilidad pedagógica requiere calibración con docentes. La maqueta integrada ilustra la prioridad por cantidad de pendientes y los estados de cumplimiento y evidencia insuficiente.

## Recorrido

Inicio resume únicamente las inscripciones actuales con prioridad alta, media o baja en las aulas activas, incluidas las distintas inscripciones de una misma persona. Sin evidencia suficiente se consulta desde Estudiantes. Filtrar cambia contadores y lista juntos. Mostrar inicialmente hasta tres situaciones ordenadas por prioridad; Ver todos conserva el filtro. Aula → Estudiantes abre la misma ficha. Cerrar o Escape devuelve el foco al disparador y conserva posición, orden y filtro.

La ficha identifica estudiante, aula y motivo vigente. Muestra entregas obligatorias con plazo cumplido, promedio con denominador y evolución cronológica cuando hay notas comparables. Con una nota basta mostrar el valor y su actividad. Las dos listas, Puntos fuertes y Aspectos a reforzar, tienen hasta tres ítems por lista con acceso a la evidencia. El widget muestra las prioridades como píldoras de color y texto. El filtro abre una lista visual de aulas con portada, grupo y selección marcada. El bloque de observaciones agrupa la actividad de origen, la acción Leer entrega y los puntos fuertes y a reforzar. Abre una vista de lectura con consigna y producción; Volver a la ficha devuelve el foco al botón que la abrió. Una sugerencia indica qué probar y cómo comprobarlo. La ausencia de evidencia se explica. En móvil se apilan las secciones, cada color lleva texto y el foco queda dentro del diálogo.

## Política inicial y evolución del rendimiento

Evaluar por aula, estudiante y fecha con los plazos efectivos de cada obligación. Ventana inicial: últimos 30 días corridos, más pendientes anteriores aún vigentes. Excluir optativas, obligaciones retiradas y borradores de corrección. No atribuir incumplimiento antes de la inscripción si no se asignó la obligación. La primera recepción confirmada determina cumplimiento y conserva el plazo aplicado al evaluar la puntualidad histórica.

| Prioridad, en orden de evaluación | Regla y evolución prevista |
|---|---|
| Prioridad alta | Dos obligaciones distintas vencidas pendientes, o una con al menos 10 días de atraso en la zona horaria del aula. |
| Prioridad media | Una obligación vencida pendiente con menos de 10 días de atraso. |
| Prioridad baja | Sin señales anteriores y con dos o más obligaciones recientes vencidas y entregadas. Puede haber correcciones pendientes. |
| Sin evidencia suficiente | Los demás casos, incluida una inscripción nueva sin obligaciones vencidas. |

Orden estable por prioridad, antigüedad del pendiente mayor y nombre. Comparar sólo actividades de igual escala y comparabilidad confirmada. Las notas se pueden consultar por actividad. La tendencia queda fuera del color hasta acordar cómo declarar la comparabilidad. La propuesta a calibrar compara las dos últimas notas con las dos anteriores dentro de la ventana. Distinguir nota cero publicada, corrección pendiente y actividad ausente. Calcular promedio histórico por actividad y redondear al presentar según [Progreso](../engineering/grading/progress.md). Recalcular ante recepción, cambio de plazo, retiro, rectificación o paso del tiempo. Una reentrega conserva la nota efectiva mientras espera corrección.

## Evidencia y privacidad

- Revalidar aula propia activa, inscripción y acceso a ficha, actividad e intento para cada lectura. Separar historia y matrícula actual. Ante pérdida de acceso, retirar la ficha y actualizar lista y contadores.
- Analizar sólo producciones entregadas en esa aula, su consigna y criterios pertinentes. Cada observación cita el intento y la actividad. Una producción permite una observación específica; un patrón requiere al menos dos producciones comparables. Evitar inferir personalidad, diagnósticos o estilos fijos. La escritura orienta al docente y queda fuera del cálculo del color.
- Abrir Inicio calcula reglas académicas sin generar IA por alumno. Ante error, presupuesto insuficiente o evidencia desactualizada, mantener las métricas y explicar el estado de la orientación. Revalidar referencias antes de mostrar derivados. El pedido usa la cuota del docente y sólo admite texto de entregas confirmadas. [Análisis docente vigente](../engineering/ai/student-analysis.md).
- Segunda etapa: una estrategia privada de Mi Estudio puede compartirse después de que el estudiante revise el texto exacto, elija el aula vinculada y confirme. Puede retirar el acceso futuro. Indicar al docente que la compartió el estudiante. Ni compartirla ni retirarla cambia el color. Chats, archivos, intentos y métricas privadas quedan en Mi Estudio. Esta segunda etapa queda fuera de la maqueta docente.

## Responsabilidades y dependencias

1. Progreso y Participación exponen hechos autorizados. Una política pura recibe hechos y fecha, y devuelve prioridad, motivos y referencias. Verificar la matriz antes de conectar las vistas.
2. Una consulta común proyecta el resultado para Inicio y aula, con paginación en servidor y totales del conjunto completo. Medir latencia con aulas representativas antes de persistir agregados.
3. Una ficha carga el detalle bajo demanda en ambos accesos. Distinguir carga, ausencia, error recuperable y permiso retirado.
4. Extender el análisis docente con entrada acotada y versionada tras aprobar el uso de datos y costo. Revisar comprensión de hechos, hipótesis y acciones con docentes.
5. Diseñar el contrato de audiencia, retiro y conservación antes de habilitar publicación voluntaria desde Mi Estudio.

## Casos de aceptación

| Caso | Resultado observable |
|---|---|
| Una alumna integra dos aulas | Motivos, notas y fuentes independientes en cada contexto. |
| Entrega una de dos pendientes y luego la otra | Desaparece cada motivo resuelto; reevaluar con los hechos restantes. |
| Cambia el plazo o se rectifica una nota | Se retira el motivo obsoleto; una misma obligación nunca cuenta dos veces. |
| Hay entrega sin corregir | Suma a cumplimiento y conserva el promedio de notas publicadas. |
| Alumno nuevo sin evidencia | Sin promedio ficticio, gráfico vacío ni cero inventado. |
| Abrir evidencia de escritura | Leer consigna y producción del estudiante y volver al mismo punto. |
| Filtrar, abrir, cerrar y elegir otra ficha | Conservar filtro, orden, posición y foco desde Inicio o el aula. |
| Error de carga, lista vacía o revocación | Mensaje específico, reintento si corresponde y ningún dato revocado visible. |
| Falla IA o cambia una fuente | Métricas disponibles, explicación de vigencia y retirada de orientación obsoleta. |
| Tercero intenta leer una ficha o intento | Acceso denegado también al consultar directamente por identificador. |
| Un alumno practica en privado | El semáforo docente y su explicación permanecen independientes de esa actividad. |

Validación pedagógica pendiente: calibrar cortes y comparabilidad y validar comprensión del recorrido. La aceptación de producción requiere además pruebas de reglas, volumen, privacidad, revocación y proveedor.

La implementación inicial toma las observaciones del comentario y los criterios publicados del intento que sustenta la nota efectiva. La lectura de la entrega carga sólo su consigna y los textos autorizados. La ampliación autorizada más abajo incorpora el análisis a pedido del docente. [Seguimiento y evidencia de la rama](../../odd/tasks/acompanamiento-docente.md).

## Ampliación autorizada el 19 de noviembre

El docente puede solicitar un análisis de escritura de entregas confirmadas del estudiante en esa aula. El pedido usa su cuota de IA. Abrir la ficha y consultar un resultado existente son lecturas. Las sugerencias identifican las producciones que las sustentan y conservan las métricas disponibles ante cuota agotada o fallo del proveedor.

Desde Mi Estudio, el alumno puede revisar el texto exacto de una estrategia, elegir compartirla con el docente del aula vinculada y retirarla. La ficha identifica expresamente su procedencia. Compartir una estrategia y solicitar el análisis son decisiones independientes entre sí y del color del semáforo. Los chats, archivos y demás contenidos de la carpeta conservan su carácter privado.
