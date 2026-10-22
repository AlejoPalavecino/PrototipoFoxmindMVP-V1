# FoxMind — conceptos educativos, futuristas e intuitivos

El usuario rechaza las tres alternativas de ronda 3 y solicita conceptos diferentes y estilos diversos. Esta ronda cambia la representación del trabajo educativo, no solo el color de Inicio. Tres pantallas de concepto, ninguna elegida todavía:

1. [Mapa del curso](01-mapa-del-curso.png): aula / Plan, unidades y temas conectados, panel contextual de material y actividad.
2. [Espacio de enfoque](02-espacio-de-enfoque.png): aula / detalle de trabajo práctico, consigna, ejemplo visual y preparación de entrega.
3. [Agenda visual](03-agenda-visual.png): Inicio organizado por fechas/novedades con acceso a aulas.

## Alcance
Solo mockups estáticos. Las tres imágenes representan distintas superficies del mismo producto para explorar modelos visuales, no tres implementaciones alternativas del mismo componente. Se mantienen datos ficticios y fecha de ejemplo 21 octubre 2026. Originales de marca Zorro.png y ZorroH.png adjuntos a cada generación, sin editar los archivos. El logo generado es aproximado; al implementar se utilizaría el asset original, no su redibujo raster en el mockup.

## Revisión visual y límites de producto
- Mapa: Dado, Siguiente y Pendiente son estados definidos por docente. Un único Siguiente. No son dominio del alumno, calificaciones, desbloqueos ni prerrequisitos. Las conexiones representan orden del plan, no dependencias obligatorias. El panel contextual es propuesta de presentación; no presupone nuevas relaciones/API aprobadas.
- Enfoque: consigna y fotografías son contenido ficticio de ejemplo, no resultados de IA dentro de FoxMind. Antes de implementar, mapear fotografías a previews/recursos admitidos, sin inventar un editor enriquecido o un nuevo contrato de instrucciones. Preparar entrega no equivale a envío confirmado. No se presume autosave, archivos reales o trabajo enviado.
- Agenda: muestra plazos/novedades existentes con una representación temporal propuesta. No crea agenda de eventos, recordatorios, sesiones de clase ni capacidades de programación. Las fechas del ejemplo son coherentes con la semana 19–25 octubre 2026; el estado de hoy es ficticio.
- Las tres imágenes se inspeccionaron. Se conservaron navegación superior, identidad original como referencia y límites contra IA/gamificación. No se validaron contraste compuesto, teclado, accesibilidad, interacción, fuentes exactas o responsive.

## Archivos
- [Prompts completos](PROMPTS.md), ImageGen integrado, no API/CLI fallback.
- [Manifiesto de dimensiones y hashes](manifest.json).
- [Registro de trabajo](../../work-log/2026-10-21-id-unavailable-learning-concepts-round4.md).

Siguiente paso: selección/refinamiento del usuario. No implementar ni integrar por la mera elección de un concepto. Resolver checkout servido y reglas de datos antes de futura implementación autorizada.
