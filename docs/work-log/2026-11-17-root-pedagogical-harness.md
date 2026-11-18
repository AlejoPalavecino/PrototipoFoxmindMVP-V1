# Plan técnico del arnés pedagógico

Coordinador principal, 2026-11-17. Checkout principal en feature/latencia-ia, base 6e9c1312. El usuario acordó priorizar y probar los dos recorridos y pidió definir cómo aplicarlos con alta cohesión y bajo acoplamiento.

Se inspeccionaron estado Git, política documental, arquitectura, guías y entradas de generación, devolución y aplicación de propuestas. La búsqueda por ruta y contenido no encontró un tablero del arnés. Se guardó [el registro de alcance, diseño y tareas](../../odd/tasks/pedagogical-harness.md). La rama tenía cambios locales concurrentes en Estudio, Foxy y el runtime. Entrega documental local; pendiente aprobar diseño técnico y ejecutar pilotos.
Verificación del registro: `taskboard.py check odd/tasks/pedagogical-harness.md --current` informó cuatro tareas válidas. Los dos archivos figuran como nuevos en Git. Las pruebas funcionales corresponden a la ejecución posterior.

## Ejecución autorizada

Se inicia con pruebas de selección de estrategias, coordinación del versionado y verificación independiente de los dos recorridos sintéticos.

El motor de Estudio compone sus instrucciones con una política por finalidad del dominio; las devoluciones internas se distinguen de CHAT. Actividades conserva su V1 y agrega V2 en el mismo contrato de salida. La revisión del versionado y las pruebas de política/persistencia están en el [registro del especialista](2026-11-17-snapshot-pedagogical-prompts.md).

RED: dos fallos esperados en 34 pruebas del motor y adaptador; GREEN: 34/34. El control de arquitectura detectó un ciclo por una importación exclusivamente de tipo. Al derivar la finalidad del mapa de políticas se eliminó el ciclo. Pasaron el build API, el build web y el lint de límites con cero excepciones. Una primera invocación de las pruebas de snapshot omitió la opción de módulos simulados de Node; la repetición con las opciones del repositorio pasó.

El [registro de QA](2026-11-17-recorridos-pedagogical-harness.md) documenta los recorridos en Chromium con infraestructura descartable. La [evaluación comparativa](../verification/pedagogical-pilots.md) conserva casos, controles y criterios de lectura ciega. El usuario autorizó usar Gemini real con entradas sintéticas y un máximo total de USD 20 para esta comparación. No incluye participantes ni medición de sus resultados individuales.

### Lectura del coordinador antes de abrir la asignación

Revisión cualitativa de seis pares de Gemini sobre materiales sintéticos. En definición prefiero 1d27ceb7c2 por distinguir razón y proporción con precisión y concisión. En pista, 5fa36fc1a0 devuelve la elección de operación al estudiante. En devolución, bae1d1af52 reconoce los grupos equivalentes y ofrece un problema concreto de 7 cm. En simulacro, 328556b5ad exige dos aplicaciones numéricas en sentidos opuestos con explicaciones en el campo privado. En historia, fbadb0fd92 enlaza las consignas y pide indicios concretos, aunque adelanta parte de la interpretación. En selección, 1989dc08bd deja más abierta la elección del procedimiento en sus criterios públicos. Las dos muestras de selección ponen las dos claves en la primera posición y las dos de historia usan imperativos tuteantes pese al voseo del pedido. Estos patrones merecen seguimiento. La revisión independiente aplica la rúbrica por dimensión y puede discrepar.

Cierre local. Tras cruzar las etiquetas, cinco preferencias correspondieron al candidato. Dos iteraciones sobre el único caso desfavorable corrigieron voseo, patrón de claves y detalle de procedimientos en la rúbrica. Persisten los límites descritos en la comparación. El chequeo de resultados inicialmente confundía menciones de ambos códigos con la preferencia; al restringirlo al encabezado de cada decisión confirmó seis pares, cuatro repeticiones y USD 0,083538 estimados. Suite Study 96/96, pruebas focalizadas finales 68/68, builds API/web y límites verdes. Cuatro tareas técnicas completadas. Siguiente paso de producto: evaluación docente del tiempo y utilidad del material. Sin commit ni despliegue.
