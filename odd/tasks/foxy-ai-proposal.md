# Foxy AI — propuesta de espacio docente

**Estado: propuesta para conversación; no aprobada para implementación.** Foxy AI sería un espacio privado para que cada docente converse, prepare recursos y organice ideas con asistencia de IA. El docente decide qué fuentes usar, revisa los resultados y elige si convertirlos en contenido de un aula. Esta propuesta amplía las capacidades actuales; no modifica por sí sola sus contratos ni autoriza implementación, proveedor, despliegue o uso de datos reales.

## Objetivo y experiencia

Un único espacio accesible desde la navegación docente, con un chat como punto de partida y accesos para **material de estudio**, **repaso**, **resumen**, **ideas de actividades** y **planificación**. Son formas de iniciar una conversación, no herramientas aisladas: el docente puede pedir cambios, profundizar y guardar resultados. Estudiantes no acceden a Foxy AI ni a sus conversaciones.

1. Elegir **contexto general** o **un aula propia**. El contexto activo permanece visible en todo momento.
2. Elegir una tarea sugerida o escribir una consulta. En aula, revisar y elegir las fuentes concretas disponibles antes de generar.
3. Conversar, inspeccionar fuentes y advertencias, y editar el resultado en un borrador privado.
4. Guardar para continuar después o elegir una acción explícita: preparar material para Biblioteca, o continuar una actividad en el flujo existente. La disponibilidad de cada destino depende de las decisiones y capacidades definidas antes de implementarlo.

Ejemplo: «Prepará un repaso de fotosíntesis para tercer año, con ejemplos y cinco preguntas». En contexto de aula, el docente selecciona la unidad y el material que enseñó; Foxy informa qué pudo leer y propone un texto revisable. El docente corrige y decide si prepararlo para la Biblioteca de esa aula.

## Contexto: qué sabe Foxy

| Modo | Comportamiento propuesto | Transparencia |
|---|---|---|
| General | Responde usando la consulta y el conocimiento general del modelo, sin acceder automáticamente a aulas. | Indicar que no usa fuentes del aula y que puede equivocarse o estar desactualizado. |
| Aula | Usa solo el aula elegida y las fuentes autorizadas y seleccionadas: plan, materiales compatibles y actividades anteriores habilitadas. Las indicaciones docentes completan el pedido. | Mostrar aula, fuentes efectivamente leídas, omisiones y referencias disponibles; si no hay evidencia suficiente, pedir más fuentes o aclaraciones. |

Recomendación: no mezclar conocimiento general adicional en modo aula salvo que el docente lo solicite explícitamente y el producto identifique esa ampliación; la primera versión puede mantenerlo excluido. La IA no puede garantizar que una respuesta sea correcta ni que las referencias prueben cada afirmación. Los títulos de fuentes no equivalen a su contenido, y un documento puede contener instrucciones maliciosas que deben tratarse como datos, no como órdenes.

El selector debe distinguir fuentes disponibles, seleccionadas, efectivamente procesadas y no compatibles o inaccesibles. Los formatos admitidos en Biblioteca no son necesariamente procesables por IA. Evitar truncamientos silenciosos; informar límites antes de generar. No incorporar por defecto datos personales, entregas, calificaciones, conversaciones, claves privadas ni análisis de estudiantes. Actividades anteriores significa sus contenidos docentes autorizados, no las respuestas de alumnos.

Cada conversación pertenece a un solo contexto fijo. Para cambiar de general a aula o entre aulas, iniciar otra conversación; se evita arrastrar historial o fuentes de un contexto a otro. Si el docente pierde acceso o una fuente cambia o desaparece, revalidar el acceso y advertir que el contenido previo puede estar desactualizado antes de reutilizarlo. No afirmar que el cambio elimina información ya enviada a un proveedor.

## Capacidades propuestas

| Necesidad | Resultado editable | Opciones orientativas |
|---|---|---|
| Material de estudio | Explicaciones, ejemplos, conceptos y guía de lectura | Nivel, tema, profundidad, extensión y formato. |
| Repaso | Síntesis de contenidos, preguntas de práctica y autoevaluación | Temas, dificultad, extensión y tipo de preguntas. |
| Resumen | Resumen de las fuentes elegidas, con referencias cuando sea posible | Extensión, estructura y énfasis; indicar cobertura incompleta. |
| Ideas de actividades | Alternativas con objetivos, dinámica, recursos y duración | Modalidad, edad/nivel, tiempo y propósito; elección docente. |
| Planificación | Borrador de secuencia o clase con objetivos, contenidos, actividades, tiempos y evaluación sugerida | Período, cantidad de clases, contexto, recursos y criterios. No modifica el plan del aula automáticamente. |
| Chat abierto | Respuestas y refinamiento de cualquiera de los anteriores | Preguntas de seguimiento y ajuste de tono o nivel. |

En todos los casos, el docente tiene responsabilidad de revisar contenidos, adecuación pedagógica, fuentes y derechos de uso antes de compartir. La generación puede producir errores, referencias imprecisas o contenido poco adecuado; el sistema debe decirlo de forma comprensible.

## Del borrador al aula

- **Biblioteca:** proponer una vista previa editable y una acción «Preparar para Biblioteca», con aula destino, título y asociación opcional a unidad/tema. Confirmar expresamente la creación y su visibilidad para estudiantes. La Biblioteca actual funciona con archivos y políticas de validación; el formato generado, conversión, escaneo y flujo exacto requieren diseño y pruebas, no se asumen existentes. La publicación nunca debe producirse al generar o guardar un chat.
- **Actividades:** las ideas son privadas. Si se acuerda un puente, abrir el flujo actual de creación con una propuesta revisable, sin publicar ni sobrescribir actividades existentes. La generación actual ya permite producir un borrador desde el aula; conviene reutilizar su contrato y controles donde corresponda, sin prometer compatibilidad automática.
- **Planificación:** guardar como borrador privado; no editar el plan curricular vigente ni crear eventos o actividades automáticamente. La vinculación estructurada al plan o a Agenda es una ampliación futura a decidir.
- **Edición y regeneración:** nunca reemplazar cambios del docente silenciosamente. Una nueva respuesta debe poder compararse o recuperarse; aplicar una versión exige una elección explícita.

## Primera entrega recomendada

**Propuesta de MVP, sujeta a acuerdo:** acceso exclusivo docente; conversaciones privadas persistentes con contexto general o un aula fija; selección explícita de plan, materiales compatibles y actividades anteriores permitidas; chat y plantillas de los cinco usos; borrador editable y recuperable; preparación y publicación explícita en Biblioteca de la misma aula, si se resuelve el formato; estados, límites y errores claros. En general, guardar el borrador privado y elegir aula al preparar material, con nueva confirmación de destino.

Para acotar el riesgo, empezar con fuentes documentales y límites compatibles con el flujo de generación de actividades existente, sujetos a validación técnica; no suponer que sus límites cubren automáticamente el chat. Definir si las actividades se seleccionan una por una y cómo se representa su contenido. Si la integración con Biblioteca requiere más trabajo, entregar primero borradores privados y abordar la publicación como segunda etapa explícita.

**Posterior:** puente estructurado al editor de actividades; planificación vinculada al plan/Agenda; exportaciones adicionales; más formatos u OCR; búsqueda entre varias aulas; colaboración entre docentes; plantillas compartidas y otras integraciones. No incluye tutor para alumnos, corrección o calificación automática, acceso a datos individuales de alumnos, publicación automática, navegación web ni acciones autónomas sobre aulas.

## Requisitos para convertir la propuesta en implementación

- **Acceso y privacidad:** autorización en servidor por rol, propiedad y aula/fuente en cada lectura, generación y aplicación; aislamiento entre docentes y aulas. Conversaciones y borradores privados, sin filtración a estudiantes. Definir retención, borrado, alcance del historial enviado en cada turno y tratamiento de datos por proveedor antes de almacenar o enviar contenido. No prometer retención cero sin verificar el contrato del proveedor.
- **Fiabilidad y costos:** límites de entrada/salida y fuentes, cuotas y presupuesto coordinados con las funciones actuales; mostrar estados de espera, error y cuota. Evitar duplicados por doble envío; no reenviar automáticamente una solicitud de resultado incierto. Mantener el trabajo editable ante fallas y evitar perder cambios por respuestas tardías.
- **Procedencia:** registrar qué fuentes y versiones se utilizaron, señalar cambios o acceso revocado, y validar referencias y formatos. Una fuente mostrada no certifica la respuesta. Definir el comportamiento de conversaciones históricas ante borrado y pérdida de acceso.
- **Arquitectura:** evaluar reutilización del stack y servicios actuales de IA, trabajos y control de presupuesto detrás de interfaces; contratos separados para conversación, contexto, fuentes y borrador. Definir límites concretos antes de construir. No incorporar un proveedor ni servicio nuevo como decisión ya tomada.
- **Verificación:** pruebas de roles y aislamiento entre aulas, fuentes no disponibles/cambiadas, contenido insuficiente, instrucciones embebidas, errores y límites del proveedor, concurrencia y recuperación, edición y publicación explícita, y ausencia de datos de alumnos. Verificar el recorrido docente completo en escritorio y móvil con datos sintéticos. Comprobar la integración de Biblioteca según el formato finalmente elegido.

## Decisiones para acordar antes del diseño técnico

| ID | Decisión | Recomendación inicial | Alternativa y efecto |
|---|---|---|---|
| D1 | ¿Qué datos del aula entran en contexto? | Plan, materiales compatibles y actividades seleccionadas explícitamente, sin datos de alumnos ni claves privadas. | Selección automática de todo el aula: menos pasos, pero mayor costo, exposición y riesgo de contexto irrelevante. |
| D2 | ¿Cómo se comparte un material? | Editar borrador, elegir aula y confirmar publicación en Biblioteca; definir el formato que respete el flujo de archivos existente. | Dejarlo solo en Foxy AI en la primera entrega: menor complejidad, pero requiere que el docente lo transfiera manualmente. |
| D3 | ¿Qué alcance tiene la primera entrega? | Chat, cinco tipos de ayuda, contexto general/aula, guardado y Biblioteca si el formato es viable. | Primero chat y borradores privados, luego Biblioteca: reduce dependencia y permite validar antes el valor del asistente. |

Antes de implementar también hay que acordar retención y borrado del historial, acceso a aulas archivadas o con varios docentes, límites y costos, proveedor y tratamiento de datos, selección exacta de actividades y formato de salida. Estas son decisiones pendientes, no autorizaciones implícitas.

## Relación con el producto actual

La [guía de IA](../docs/engineering/ai/README.md) documenta cuatro funciones existentes con reglas propias; la [generación de actividades](../docs/engineering/ai/activity-generation.md) ya exige fuentes elegidas, revisión y publicación separada. La [Biblioteca](../docs/engineering/teaching/library.md), el [plan](../docs/engineering/teaching/plan.md) y la [especificación funcional](../docs/foxmind-v1-functional-spec.md) conservan sus contratos actuales. El [roadmap](../docs/implementation-roadmap.md) refleja el estado aceptado; este documento es una propuesta independiente y no declara cambios implementados.
