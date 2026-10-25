# Crear actividades manuales o con IA

El docente elige cómo preparar un trabajo práctico, cuestionario o evaluación desde **Actividades**. Ambos caminos terminan en una actividad editable; **Guardar actividad** conserva el borrador y **Publicar** habilita su visibilidad para estudiantes. El [roadmap](implementation-roadmap.md) y el [registro actual](work-log/2026-10-25-root-activity-ai-implementation.md) indican el estado real de implementación/verificación local.

## Creación manual

Elegir **Crear manualmente**, el tipo de actividad y los temas de una misma unidad. Un trabajo práctico puede contener consignas escritas, archivos PDF/Word aprobados o ambos. Cuestionarios y evaluaciones usan preguntas de desarrollo, selección única o selección múltiple. Las actividades anteriores de un solo tema siguen siendo válidas.

Una actividad con varios temas conserva una sola identidad: no duplica entregas esperadas, notas ni eventos de Agenda. El primer intento mantiene el bloqueo de contenido existente; las asociaciones organizativas conservan su política separada.

## Generación con IA

1. Abrir **Generar con IA** y seleccionar tipo, unidad y temas.
2. Definir objetivo, nivel del grupo, dificultad, duración, cantidad de consignas o mezcla de preguntas y contexto docente.
3. Elegir explícitamente las fuentes: plan vigente y materiales de Biblioteca de la misma aula. La pantalla informa qué archivos no pueden procesarse y la limitación de imágenes incrustadas de Word.
4. Pulsar **Generar borrador**. Consultar el estado o recuperar el trabajo desde **Generaciones recientes**; abrir/cerrar la pantalla no genera contenido nuevo.
5. Revisar y editar título, objetivos, consignas, preguntas, opciones, puntos y claves. La vista de estudiante omite las claves privadas. Las referencias indican fuentes/páginas, pero no certifican exactitud pedagógica.
6. Aplicar la propuesta revisada para crear un nuevo borrador y continuar en el editor habitual. Revisar entrega/fechas y publicar explícitamente.

La regeneración solicita otra propuesta y conserva la anterior. Si ya existen cambios docentes, reemplazarlos exige una elección explícita. Un resultado incierto puede haber consumido cuota; no se vuelve a enviar automáticamente.

## Fuentes y límites

| Entrada | Límite inicial |
|---|---|
| Selección curricular | Una unidad y entre 1 y 100 temas de esa unidad |
| Fuentes documentales | Hasta 6 archivos PDF/DOCX, 20 MB en total |
| PDF | Hasta 100 páginas entre las fuentes seleccionadas |
| Word | Texto de párrafos/tablas, hasta 200.000 caracteres en total; sin OCR de imágenes |
| Trabajo práctico | Entre 1 y 20 consignas |
| Cuestionario/evaluación | Entre 1 y 30 preguntas en total |

La política de Biblioteca sigue admitiendo otros formatos y archivos mayores para consulta/descarga; eso no los convierte en fuentes procesables por IA. Las fuentes seleccionadas se procesan completas dentro de los límites o se informa el fallo; no se recortan silenciosamente. Sin archivos, el docente debe aportar contexto de contenido. Si resulta insuficiente, se solicitan aclaraciones en lugar de ampliar el temario con conocimiento general.

Cambiar el programa o las fuentes puede volver obsoleta una propuesta. Se vuelven a comprobar permisos, documentos y currículo antes de aplicar/publicar; las actividades históricas no se reescriben automáticamente. Las claves no se publican en Biblioteca ni se usan para corrección por IA.

## Configuración y operación

La capacidad usa la configuración Gemini del backend descrita en [IA del plan](classroom-ai.md), con cuotas y presupuesto compartidos entre ambas capacidades. Las credenciales permanecen en el servidor. Desactivar IA conserva la autoría manual y la validación de procedencia al publicar borradores generados previamente. No se agregan variables públicas de proveedor ni un segundo presupuesto independiente.

Los contratos exactos, estados/errores, límites de parsing y plan de pruebas están en [la tarea de implementación](../odd/tasks/classroom-activity-ai.md). Una prueba con proveedor controlado demuestra el flujo de FoxMind; no equivale a una llamada real a Gemini. Esta extensión inicial no incluye corrección por IA, soluciones generadas de desarrollo/TP ni exportación a PDF.
