# Revisión visual de la maqueta

Aplicación de la pauta de taste-skill en modo app. Las reglas de landing sobre cuatro fotografías, video, titulares gigantes o movimiento abundante no corresponden a un espacio de aprendizaje. El brief pide conservar Foxy, pasteles y calma; no se añadieron recursos para satisfacer contadores de una landing.

ROUND 1
Seen in one second: Foxy, bienvenida naranja y acción Crear actividad.
Idea (one sentence): una plataforma educativa que presenta un próximo paso claro y acompaña sin saturar.
Live thing: responder, revisar, confirmar y retomar tareas con estado visible.
Layout words by section: bienvenida=ilustración lateral / pendientes=lista / agenda=resumen / aulas=colección.
Scores: design 7.5 · usability 7 · creativity 7 · content 8 → overall 7.3
Caps applied: creatividad ≤7; composición conocida adaptada a identidad existente. Sin pretensión de una dirección experimental.
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. `layout/390-docente-aula-plan.png`, versión inicial: índice ocupaba casi todo el primer viewport. Se reemplazó en móvil por tema actual y selector en diálogo.
2. `layout/390-estudiante-estudio.png`, versión inicial: compositor quedaba bajo el primer viewport. Se limitó el contenedor y se hizo desplazable sólo la conversación.
3. `inspect/mobile-fold.jpg`: texto de demostración y etiquetas de portadas bajo 11 px. Se amplió; además se eliminó el contorno de foco programático del H1, conservando foco visible de controles.

ROUND 2
Seen in one second: bienvenida de FoxMind y acciones concretas; al entrar a una tarea el contenido toma el centro.
Idea (one sentence): la misma identidad alegre cambia a una composición enfocada cuando la persona empieza a trabajar.
Live thing: entrega y devolución se conectan entre los roles de ejemplo; espera y recuperación se pueden recorrer.
Layout words by section: inicio=resumen / plan=tema y contexto / actividad=espacio de trabajo / selector=filas compactas / estudio=conversación / agenda=calendario y día.
Scores: design 8 · usability 8 · creativity 7 · content 8 → overall 7.8
Caps applied: creatividad ≤7 por continuidad deliberada con patrones educativos conocidos. Evaluación propia, no estudio con usuarios ni puntuación de accesibilidad.
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. `inspect-final/desktop-fold.jpg`: banda vacía en agenda tras alinear columnas. Resuelta agregando la acción contextual Crear un evento al pie; inspector final sin advertencias.
2. `layout/1440-docente-agenda.png`: selector CSS coloreaba también el contenedor de puntos del día actual. Resuelto limitando el estilo al primer span.
3. `layout/390-docente-aula-plan.png`: navegación de aula extensa. Se conserva scroll horizontal con sección parcialmente visible, mientras el contenido principal y el selector de tema son verticales. Requiere validación con usuarios antes de producción.

Cierre: no quedan fallos medidos de layout. Los límites restantes son alcance ilustrativo y validación humana del diseño, no integración productiva completada.

ROUND 3 — feedback del usuario, 2026-11-14
Seen in one second: bienvenida de Foxy con ilustración y una agenda con estructura reconocible.
Idea (one sentence): una plataforma cálida que diferencia claramente qué mirar, qué tocar y qué sigue.
Live thing: seleccionar un día muestra sus eventos, con retorno explícito al calendario en celular.
Layout words by section: bienvenida=composición ilustrada / pendientes=filas de atención / agenda=calendario delimitado y resumen diario / aulas=portadas y progreso.
Scores: design 8 · usability 8.3 · creativity 7.2 · content 8 → overall 7.9
Caps applied: ninguna nueva sobre el modo app; evaluación propia, no validación de usuarios. Se mantienen discrepancias documentadas con reglas de bordes y paleta porque el usuario pidió más separación y naranja/pasteles.
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. `iteration-2/before-agenda.png`: fechas flotantes, eventos reducidos a puntos y demasiada superficie indiferenciada. Se definieron celdas, eventos etiquetados y resumen diario con tinta clara sobre azul profundo.
2. `layout/390-docente-agenda.png`, primera pasada de esta iteración: cabecera del mes se distribuía como una fila y el toolbar gastaba dos niveles. Se corrigió el grupo del título y se compactó el acceso a la fecha de referencia.
3. `iteration-2/estudiante-home-390.png`: una estrella decorativa quedaba junto al último término del título. Se retiraron esos motivos en celular; se conservan Foxy, papel y lápiz fuera de la acción.

Límite: un calendario mensual sigue requiriendo desplazamiento vertical en celular. La selección lleva al resumen del día y permite volver; no se fuerza a comprimir los números para que todo entre en una captura.
