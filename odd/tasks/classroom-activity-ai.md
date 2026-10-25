# Crear actividades manuales o con IA

Diseño con D1:A, D2:A y D3:A aceptadas por el usuario el 2026-10-25. **Implementación pendiente de confirmación explícita.**

ESTADO_DISENO: DECISIONES_PRODUCTO_ACEPTADAS; CONTRATO_TECNICO_Y_AUTORIZACION_IMPLEMENTACION_PENDIENTES

## Resultado propuesto

Desde Actividades → Crear actividad, el docente elige «Crear manualmente» o «Generar con IA». Ambos caminos terminan en un borrador editable y una publicación explícita. Se mantienen los tipos Trabajo práctico, Cuestionario y Evaluación.

El worktree aislado usa `codex/classroom-activity-ai`, desde main `727614d9ed05818fab1295271bfd9654820dc74f`. [Registro coordinador](../../docs/work-log/2026-10-25-root-activity-ai-design.md). Esta propuesta no modifica la especificación vigente ni autoriza RED, implementación, integración o publicación remota.

## Camino manual

El docente puede escribir consignas o subir su PDF/DOCX para un trabajo práctico, asociarlo al contenido del plan y vincular materiales. Para cuestionarios/evaluaciones, mantiene el editor de preguntas y respuestas actual. Adjuntar un PDF no lo convierte automáticamente en preguntas interactivas; esa conversión sería otra capacidad a acordar.

## Camino con IA

1. Elegir tipo de actividad, unidad y temas, según D1.
2. Indicar qué quiere trabajar: objetivo, nivel del grupo, dificultad, duración aproximada y contexto libre. Por ejemplo: «Aplicación a un caso cotidiano, sin derivadas, para resolver en 40 minutos».
3. Revisar las fuentes propuestas: unidad/temas del plan y materiales de Biblioteca asociados, con selección explícita. Puede sumar materiales de otra unidad de la misma aula. El programa delimita el alcance; sus títulos por sí solos no garantizan suficiente contenido didáctico.
4. Configurar extensión: cantidad de consignas para TP o cantidad y combinación de preguntas de desarrollo/selección para cuestionario/evaluación. Los puntos se sugieren para revisión docente.
5. Pulsar «Generar borrador». Mostrar estado y permitir recuperar el resultado al volver. Generar tiene una acción explícita; abrir la pantalla o seleccionar una fuente no dispara consumo.
6. Revisar título, consignas/preguntas y fuentes utilizadas. Mostrar advertencias por contenido insuficiente, parcialmente leído o no compatible. Permitir edición y regeneración explícita sin pisar cambios docentes.
7. Usar el resultado revisado como borrador de actividad. Configurar fecha, entrega y demás ajustes con el editor habitual; previsualizar como estudiante y publicar explícitamente.

## Resultado por tipo

| Tipo | Propuesta de IA | Revisión privada docente |
|---|---|---|
| Trabajo práctico | Título, objetivo y consignas editables; expectativas de entrega | Revisión de las consignas |
| Cuestionario | Preguntas de desarrollo, selección única o múltiple, opciones y puntos | Claves correctas de selección |
| Evaluación | Preguntas y puntos con la misma estructura soportada | Claves correctas de selección |

Las claves y orientaciones docentes no se guardan como materiales de Biblioteca ni se envían a estudiantes antes de la visibilidad de resultados ya autorizada. No se añade corrección por IA. Un TP generado se guarda como texto editable; exportar a PDF no forma parte de esta propuesta inicial.

## Decisiones aceptadas — 2026-10-25

El usuario confirmó: «Si voy con tus recomendaciones para D1, D2 y D3». Se aceptan las tres opciones A. La comparación original se conserva debajo como fundamento; las alternativas B no fueron elegidas.

| ID | Opción A | Opción B | Recomendación propuesta |
|---|---|---|---|
| D1: cobertura | Una actividad puede abarcar varios temas de una misma unidad; amplía asociaciones y exige revisar filtros, Plan y métricas | Un tema por actividad, como hoy; menor cambio pero limita actividades integradoras | A: responde a generar desde una unidad; conservar lectura y significado de actividades existentes y separar seguimiento de temas de calificación |
| D2: conocimiento | Basarse sólo en contenido seleccionado y contexto docente; si falta información, pedir material o aclaraciones | Permitir ampliar con conocimiento general del modelo mediante elección explícita, marcando qué no está respaldado por fuentes | A inicialmente: facilita revisar correspondencia con lo enseñado; ejemplos nuevos deben derivarse del contenido disponible y no introducir temario ajeno |
| D3: formatos | PDF/DOCX como fuentes documentales iniciales; avisar límites de lectura y archivos no utilizables | Incluir además PPTX e imágenes desde el primer alcance; requiere lectores y pruebas adicionales | A: se apoya en experiencia existente; límites IA propios, sin asumir que todo archivo permitido en Biblioteca es procesable |

Las orientaciones generadas de resolución para TP/desarrollo quedan propuestas para una ampliación posterior. Las claves estructuradas de selección son necesarias para los tipos existentes y se incluyen en esta propuesta inicial.

## Arquitectura propuesta y condiciones

- Mantener stack existente. Nueva capacidad de generación de actividades con contratos puros en `src/core/domain` y adaptador de proveedor detrás de un puerto; no acoplar reglas de actividades al SDK ni cambiar extracción a generación implícita.
- Reutilizar infraestructura de trabajos durables, cuotas y presupuesto donde las interfaces lo permitan; contabilidad conjunta para evitar dos presupuestos independientes accidentales. Fijar límites operativos y formatos antes de implementar.
- Contratos conceptuales: solicitud con aula, tipo, selección curricular, fuentes, contexto y parámetros; trabajo con estado y snapshot; propuesta con contenido por tipo, fuentes y advertencias; aplicación explícita con revisión del borrador. D1 fija una unidad y uno o más temas de esa unidad; queda concretar el contrato técnico compatible con actividades existentes antes de RED.
- Sólo docente autorizado en aula activa; fuentes aprobadas, privadas, de la misma aula y accesibles. No datos de estudiantes, notas o entregas en el contexto de IA.
- Capturar identidad/digest de fuentes y revisión curricular; revalidar antes de aplicar y publicar. Un cambio relevante vuelve obsoleto el resultado; no aplicar fuentes borradas o permisos revocados.
- Idempotencia de generar/aplicar: doble clic y recarga no duplican trabajos, actividades, reservas ni despachos locales. No se garantiza facturación exactamente una vez del proveedor. Los reintentos de resultado incierto no son automáticos; explicar estado y consumo posible.
- El modelo propone contenido estructurado; servidor valida tipos, límites, preguntas/opciones/claves/puntos. Las referencias deben corresponder a fragmentos disponibles; mostrar fuentes no certifica exactitud semántica del modelo.
- Tratar instrucciones dentro de documentos como contenido, sin acceso del modelo a herramientas, secretos o navegación externa. Lectura parcial y falta de evidencia se señalan al docente.
- Aplicar sólo sobre borrador editable con revisión vigente; no sobreescribir ediciones, contenido bloqueado tras intento o actividades archivadas. Regenerar un elemento requiere definir alcance y confirmar reemplazo si ya está editado; mantener recuperación de la versión anterior hasta aplicar.
- En futuras pruebas usar datos sintéticos e infraestructura aislada; esta etapa no inicia servicios ni usa configuración privada retenida.

## Criterios para implementación después de aprobación

- RED independiente para permisos, esquema por tipo, selección curricular, privacidad de soluciones, idempotencia, consumo y fallos de proveedor.
- Pruebas de fuente inaccesible/eliminada/cambiada, respuesta inválida, cancelación/timeout y resultado tardío frente a ediciones.
- Aplicar una propuesta crea exactamente un borrador; publicar sigue requiriendo acción explícita. Camino manual funciona con IA desactivada o fallida.
- Demostrar guardado/reapertura, revisión de claves y puntos, ausencia de filtración a estudiantes, archivos seguros y bloqueo tras primer intento.
- Verificar interfaz desktop/móvil y flujo completo con ego(lite), más regresiones de actividades/Plan/biblioteca afectadas por D1.
- Ampliar de forma acotada la exclusión histórica de generación en la especificación funcional sólo cuando el usuario apruebe el diseño.

## Primer paso pendiente

Las decisiones D1–D3 están aceptadas. Confirmar implementación conforme al pedido del usuario y, después, completar contrato técnico, revisión de impacto multi-tema y criterios de prueba antes de RED. La aceptación de estas decisiones no autoriza integración, publicación remota o despliegue.
