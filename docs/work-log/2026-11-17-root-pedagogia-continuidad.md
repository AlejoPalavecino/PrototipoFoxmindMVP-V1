# Continuidad del arnés después de las pruebas en Ego Lite

Coordinador principal, checkout principal en feature/latencia-ia, base 6e9c1312, con cambios concurrentes previos. El usuario autorizó resolver los inconvenientes y continuar la implementación. Alcance de este corte: cuota de Estudio, devolución y transferencia, alineación de preguntas y selección por puntero, y apuntes de ambos roles. [Tablero](../../odd/tasks/pedagogical-harness.md). La publicación y el piloto con personas quedan pendientes.

## Cambios y comprobaciones

- Mi Estudio distingue el límite diario de IA en un HTTP 429. En la app habitual, una cuenta con 22 solicitudes y tope vigente de cinco conservó su PDF y el texto en el compositor después del rechazo. Ego mostró la hora de renovación correcta. [Diagnóstico y regresiones de cuota](2026-11-17-cuota-study-budget.md).
- El motor aplica una instrucción específica a los apuntes del estudiante. Los recursos existentes mantienen su circuito de revisión privada. La devolución de una práctica puede usar los últimos cuatro fragmentos autorizados del chat vinculado para evitar repetir un ejercicio. El lector repara los artefactos observados en texto generado anterior. [Pruebas de devolución y aislamiento](2026-11-17-devolucion-estudio-egolite.md).
- En Foxy docente, el perfil nuevo de apunte pide preservar ejemplos, vocabulario y condiciones del docente. El repositorio mantiene la versión encolada para cada turno. La integración descartable comprobó revisión persistida, conservación del original y separación entre docentes. [Pruebas de apuntes docentes](2026-11-17-apunte-docente-foxy.md).
- El generador de actividades aplica el objetivo a cada pregunta. El pie de acciones sigue al formulario en la selección de alcance. Ego permitió seleccionar «Exposición» con puntero. Chromium también comprobó el mismo punto que fallaba a 1538 × 646 y el recorrido a 390 × 844. [Pruebas del editor y perfiles V1–V3](2026-11-17-docente-objetivo-editor.md).

En la compilación conjunta, el tipo local duplicado del servicio de devolución omitía el historial autorizado. Se corrigió usando el contrato compartido. El arranque local posterior compiló API y web. Las tres baterías del tablero registraron 41, 44 y 70 pruebas aprobadas. La suite Study registró 98 y la suite transport 89. ESLint y ambos controles de arquitectura pasaron con cero excepciones congeladas.

## Salidas reales desde Ego Lite

Después de la renovación natural a las 00:00 UTC, se usó el mismo entorno local con Gemini y las dos cuentas sintéticas habituales. El primer chat pasó a las 00:01 UTC con una pista que invitaba a comparar el tamaño real y el dibujado. En el ejercicio, la respuesta deliberada conservó el cálculo de 150 cm y propuso una conversión errónea a 15 m.

- En Mis Aulas se aplicó al editor una actividad privada con tres preguntas. La primera comparó dos aperturas con luz y tiempo constantes. La segunda partió de la luz recibida para inferir la apertura. El desarrollo pidió comparar y justificar el recorrido de la luz. Las tres usaron la condición del caso. La primera y la tercera se parecen entre sí.
- El apunte docente mantuvo el voseo, la frase aportada, el ejemplo del mate y ambas condiciones. También agregó la expresión «regla de oro que vimos en el taller», una atribución que el pedido no establecía. El editor permitió guardar una revisión y recuperarla al reabrir la creación. Se usó el contexto general con material sintético escrito en el pedido.
- El apunte del estudiante usó el PDF vigente, explicó la multiplicación y la división según la dirección de la conversión, y terminó con una pregunta para repasar. Se cambió título y contenido. Después de recargar la carpeta se recuperó la revisión desde Creaciones.
- En ambos apuntes apareció una línea de tres guiones como texto en el lector. El renderizado compartido ahora muestra un separador semántico y preserva los guiones escritos como código. La regresión falló antes del cambio y pasó después.
- El primer intento de devolución encontró una divergencia entre preparación y revalidación del PDF y terminó antes de llamar al proveedor. El cambio recompone el contexto después de cargar el documento y conserva el rechazo ante cambio de custodia. Se preservó el intento para probar la reparación.

Capturas y salidas de las cuentas sintéticas en `.test-artifacts/ego-harness-2345/`. La prueba cubre un caso por herramienta; el aprendizaje y el tiempo docente requieren participantes. La suite pure anterior al ajuste de PDF y separador pasó 939/939.

Con la recompilación se abrió la misma práctica finalizada desde Creaciones y se reintentó la devolución. Gemini reconoció los 150 cm correctos, explicó por qué equivalen a 1,5 m y propuso el recorrido inverso: representar un pasillo real de 2 m en un plano 1:50. La salida se leyó en párrafos, con la respuesta original intacta. Al reabrir el apunte del estudiante, Ego comprobó un elemento HTML de separación en lugar de la línea literal de tres guiones.

## Cierre del corte

Foxy V4 incorpora la regla de fidelidad después de observar el agregado «taller» en V3. Las instrucciones y perfiles ya encolados de V2 y V3 siguen reproducibles. En una repetición con el mismo pedido, V4 conservó literalmente «Primero mirá por dónde pasa la luz», el contexto de clase y las condiciones de las fotos. Se editó y reabrió el recurso. Un segundo pedido, sobre dos planes de viajes ficticios, conservó la frase docente y distinguió un ejemplo ilustrativo. El cálculo de cinco viajes dio 550 y 400 pesos, respectivamente. En este último caso aparecieron fórmulas LaTeX en el texto editable; el lector ofrece un subconjunto de Markdown. Queda pendiente la presentación matemática en las salidas y exportaciones.

El espacio de Ego se cerró al terminar. El registro contable de la aplicación tras la renovación UTC atribuyó ocho solicitudes a las dos cuentas sintéticas y USD 0,036375, sin reservas pendientes. Es una estimación de esta pasada, independiente del consumo anterior y de la facturación del proveedor.

La última compilación levantó API/web. Pasaron las 51 regresiones focalizadas de la tarea, las baterías de los tres pilotos (41/44/70), y la integración de versiones docentes V2–V4. El siguiente corte funcional del plan corresponde a esquemas con relaciones explícitas. Los informes, la accesibilidad de exportación y las mediciones con estudiantes y docentes siguen pendientes.
