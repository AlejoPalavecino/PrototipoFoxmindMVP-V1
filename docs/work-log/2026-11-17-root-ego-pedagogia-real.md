# QA de los dos pilotos en Ego Lite con Gemini

Coordinador principal. Checkout local de FoxMind, rama `feature/latencia-ia`. Prueba solicitada por el usuario sobre respuestas reales en pantalla con fuentes y cuentas sintéticas. La app habitual estaba detenida al comenzar.

## Entornos

El supervisor arrancó la aplicación habitual con Gemini. Se preparó una carpeta sintética «QA Ego · Escalas» y un PDF de una página mediante la API de la aplicación. La UI conservó la pregunta y mostró «Alcanzaste el espacio disponible. Tus materiales siguen guardados». No se determinó qué límite se agotó. Se detuvo el supervisor preservando sus volúmenes y esa carpeta.

La verificación continuó sobre el mismo build en infraestructura descartable con PostgreSQL, archivos, escáner y correo propios. El primer montaje incluyó una sustitución de IA incompatible con el proveedor de Estudio; devolvió AI_UNAVAILABLE y se retiró. Se repitió con los proveedores normales de la aplicación y la configuración Gemini local. Ego Lite usó un único espacio y navegación por rol. El login y los pedidos de generación se hicieron desde la interfaz. La preparación de la carpeta, del aula y de las fuentes se hizo por API. Se cerró el espacio tras la verificación.

## Mi Estudio

1. Pista ante 4 cm y escala 1:50: Foxy preguntó si la medida real debía ser mayor o menor y qué operación correspondía. Preservó el resultado para el alumno.
2. Segundo turno: validó el razonamiento por grupos de 2 cm y su equivalencia con la multiplicación. Confirmó 200 cm = 2 m. La UI mostró la fuente.
3. Desde Herramientas se generó un ejercicio de desarrollo para 3 cm a la misma escala. Se respondió con un primer paso correcto y un error de conversión deliberado (150 cm = 15 m). Después de finalizar, la orientación distinguió los dos pasos, corrigió a 1,5 m y propuso practicar con 4 cm. Esa medida ya se había trabajado en el chat, por lo que el ejemplo sirve como repaso y aporta poca evidencia de transferencia.
4. Hallazgo visual: en la devolución aparecieron secuencias literales de barra invertida y n, además de un asterisco suelto. El defecto se comprobó en el texto visible y en la captura `devolucion.png`.

## Mis Aulas

Con el contexto docente sobre apertura, exposición y contraste se generó un cuestionario de dos opciones simples y un desarrollo. Llegó al paso Contenido en el editor con estado guardado. Las opciones correctas ocuparon las posiciones primera y segunda respectivamente. La consigna de desarrollo comparó dos fotos manteniendo constantes tiempo e iluminación y pidió justificar qué sucede con la luz. La rúbrica ponderó comparación, justificación y precisión en 40/40/20. Se mantuvo el voseo. Uno de los ítems sólo pidió recordar la definición de exposición. No se publicó la actividad.

El clic automatizado en el tema fue interceptado por el pie del editor en el viewport usado; se completó la selección con teclado. Las capturas locales de pista, continuidad, devolución, actividad y rúbrica quedan en `.test-artifacts/ego-pedagogia-2311/`. La pasada cubre los dos roles en escritorio; no mide aprendizaje, ahorro de tiempo ni resultados en población real.
