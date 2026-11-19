# Especificación y prototipo de acompañamiento docente
18 de noviembre de 2026. Coordinador. Rama codex/semaforo-riesgo, base 0aa8be0d, worktree ProtipoFoxMind. Alcance autorizado: diseñar y probar el recorrido sobre datos ficticios.

Entregables: [propuesta funcional](../product/acompanamiento-docente-propuesta.md) y [recorrido local](../../design/acompanamiento/index.html). La muestra contiene cinco inscripciones en dos aulas y permite consultar consignas y producciones sintéticas desde una observación. Los umbrales se someten a revisión docente.

Verificación sobre los archivos locales con Playwright y Chromium a 1280 y 390 px de ancho: ambas ejecuciones pasaron. Se ejercitaron expansión, filtro, cambio de aula y ficha, entrega y consigna, promedio ausente, corrección pendiente, cierre por botón y Escape, foco de retorno y conservación de filtro. Se comprobó ausencia de desborde horizontal y de errores de página o solicitudes fallidas. El comando ego-browser no estuvo disponible en el PATH. Se verificó sintaxis con node --check y se ejecutó npm run docs:check.

La demostración usa datos en memoria y no invoca IA. Pendientes: revisión humana del prototipo, calibración de umbrales y definición de comparabilidad. Persistencia, autorización efectiva, proveedor y evaluación pedagógica corresponden a la implementación posterior.

## Integración en la maqueta UI Lab

Pedido posterior: incorporar el recorrido directamente a la maqueta HTML original para revisión visual. Se edita su fuente y se regenera el HTML autónomo. Base local 0aa8be0d.

Integración comprobada en Chromium a 1440 y 390 px: expansión de 3 a 15 inscripciones, filtro por aula, apertura y evidencia de Tomás, dos barras de notas para Marina, cierre por Escape con foco de retorno, acceso desde Estudiantes y ausencia del widget en Inicio estudiantil. Inspección visual de capturas de escritorio y móvil. Se emplearon las aulas y personas de UI Lab con un trabajo práctico histórico ficticio y sus revisiones. Escenario al 13/11, prioridad por pendientes. Calibración de antigüedad y tendencia fuera de esta muestra. No se probaron datos reales ni comprensión con participantes.

## Pulido visual de la maqueta

Alcance solicitado: píldoras de prioridad, selector de aula con opciones diseñadas, ficha con datos de ejemplo y gráficos, lectura de entregas sin acordeones y verificación responsive.

Se verificó el nuevo recorrido en Chromium a 320, 390, 768, 1024 y 1440 px. Pasaron filtro con opciones diseñadas, expansión de lista, lectura de entrega, retorno de foco a la ficha y a la fila, caso con gráfico y caso sin notas. Se midieron colisiones entre elementos de las filas y desborde horizontal de widget y diálogo. Revisión visual de escritorio, ficha y selector móviles con animaciones finalizadas. docs:check verificó 239 archivos y 1043 enlaces sin problemas. La intervención utiliza datos sintéticos y no incluye prueba de usabilidad con docentes.

## Prioridades en Inicio y lectura de la entrega

Ajuste autorizado en la maqueta: mostrar únicamente situaciones con prioridad asignada, compactar recuentos y vincular visualmente las observaciones de la ficha a la entrega que las sustenta.

Verificación en Chromium a 320, 390, 768 y 1440 px. Inicio mostró únicamente tres categorías y seis inscripciones clasificadas en la muestra completa. El filtro de Biología presentó el estado vacío. Se comprobó la ficha de Tomás, sus tres notas, la entrega del 30 de octubre y el retorno de foco al botón de lectura. Se inspeccionó la captura móvil y se verificó ausencia de desborde horizontal en la lectura. docs:check pasó (239 archivos y 1043 enlaces).
