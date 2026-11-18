# Mejoras de latencia de IA

Coordinador /root, 2026-11-17, checkout principal, rama feature/latencia-ia creada desde main limpio. Sesión sin identificador expuesto. Autorización del usuario para implementar las cuatro mejoras en rama separada. Alcance y evidencia en odd/tasks/ai-latency.md. En curso.

## Resultado

Base 6e9c1312. Implementación local en feature/latencia-ia. Las cuatro tareas y las huellas de sus candidatos figuran en [el tablero](../../odd/tasks/ai-latency.md). La guía para ver los tiempos en el servidor y en el navegador está en [Ejecución de IA](../engineering/ai/README.md).

- Métricas, responsable /root/metrics. Chat breve, documento con historial y devolución concurrente con proveedor sintético. Se diferencian los tiempos de espera, preparación, conteo, generación y presentación aplicables. Los eventos conservan sólo dimensiones acotadas. [Comandos y resultados](2026-11-17-metrics-ai-latency.md).
- Historial, responsable /root/history. Dos escenarios de diez pares redujeron las consultas de conteo de seis a tres, con autorización de fuentes y confirmación exacta del sufijo elegido. [Casos y límites](2026-11-17-history-foxy-preflight.md).
- Extensión, responsable /root/brevity. Los prompts discriminan dudas puntuales y devolución de práctica frente a pedidos desarrollados. Las pruebas verifican qué se pide al modelo. [Casos](2026-11-17-brevity-ai-response-length.md).
- Texto progresivo, backend /root/stream y frontend /root. El chat general docente de Gemini sin fuentes muestra fragmentos de Markdown decodificado, como texto plano, durante el trabajo. Cada GET del parcial revalida el derecho a leerlo. El navegador conserva el sondeo habitual de dos segundos. El resultado final mantiene su validación. [Backend y límites](2026-11-17-stream-foxy-latency.md).
- Revisión independiente por /root/brevity y /root/history. Se corrigieron la clasificación de persistencias fallidas o canceladas, el foco de Detener y la invalidación inmediata del parcial ante bloqueo del proveedor. Un STOP tardío no puede convertir un bloqueo en éxito.

## Verificación

- UI de Foxy RED por ausencia de texto parcial. GREEN en controladores y render, incluidos escape de HTML y ocultamiento al cancelar, fallar o perder contacto. Ego Lite en localhost con el controlador y transcript reales y un cliente de datos sintéticos: lectura de dos fragmentos, foco en Detener durante actualización, cancelación con Enter, segunda consulta con reemplazo por respuesta definitiva y sin desborde horizontal a 390 px. Se cerraron el espacio y servidores de ensayo.
- Build API y web, ESLint/límites, inventario de CI y rutas completas verificados. Suites pure 928/928, transport 88/88 y study 95/95. Última verificación focalizada de nueve archivos de IA e interfaz, 80/80. PostgreSQL descartable para controles de Estudio y autorización. Los grupos se superponen.
- La primera compilación API en paralelo con Next se interrumpió. La compilación posterior pasó. Las primeras suites pure/transport detectaron un hook en una vista de Estudio invocada como función pura; se corrigió moviendo la medición al componente de workspace. La primera corrida de Study carecía de acceso a Docker en el sandbox; se repitió con el entorno descartable habilitado.
- Tablero con cuatro huellas comprobadas con taskboard.py check --current. No se midió reducción de segundos con Gemini real ni calidad educativa. En despliegues con varias instancias, el parcial reside en el proceso que genera el turno. No se ejecutó la matriz completa de navegadores y proveedores. Sin commits, push, integración o despliegue. Próxima medición pendiente: comparar consultas equivalentes antes/después con proveedor real y uso autorizado.

## Verificación ampliada, 17 de noviembre

El usuario pidió probar el conjunto y autorizó una comparación antes/después con Gemini real, datos ficticios y hasta doce generaciones breves. La primera corrida rápida detectó que la espera visual tenía un anuncio de estado sin el atributo explícito de cortesía que exige su contrato de accesibilidad. Se restauró el atributo y pasó la prueba focalizada preexistente.

### Gemini real

Se usó Gemini 3.8 Flash desde el adaptador de Foxy. Se compararon seis consultas ficticias idénticas en la base 6e9c1312 y esta rama, alternando el orden. Las doce generaciones se completaron en un intento cada una. El tiempo arranca antes del conteo y termina al recibir el primer texto o validar la respuesta del adaptador.

| Consulta | Primer texto base → rama | Final base → rama | Palabras base → rama |
| --- | --- | --- | --- |
| Multiplicación | 3,96 → 5,17 s | 3,96 → 5,51 s | 32 → 27 |
| Evaporación | 7,33 → 3,44 s | 7,33 → 4,21 s | 164 → 63 |
| Rectángulo y cuadrado | 6,71 → 4,67 s | 6,71 → 5,65 s | 64 → 70 |
| Seguimiento con historial | 6,05 → 3,58 s | 6,05 → 4,58 s | 177 → 76 |
| Explicación ampliada | 22,92 → 7,13 s | 22,92 → 8,73 s | 110 → 107 |
| Plan de clase | 10,99 → 13,50 s | 10,99 → 13,50 s | 105 → 109 |

En los cinco chats, la mediana al primer texto pasó de 6,71 a 4,67 s y al resultado final de 6,71 a 5,51 s. Todos los fragmentos fueron prefijos exactos de la respuesta final. El primer fragmento se adelantó al final entre 0,34 y 1,60 s. El frontend consulta el estado cada dos segundos, de modo que puede recibir directamente la respuesta final en un chat breve. Los dos planes conservaron el objetivo, los cuarenta minutos distribuidos en tres etapas y la evaluación. Los tiempos tienen una observación por variante y pregunta, con variabilidad del proveedor y de la red. La comparación combina entrega progresiva y ajustes de instrucciones. Los recibos y el procedimiento quedaron en el directorio local ignorado `.test-artifacts/qa-latencia-completa/foxy-benchmark/`.

### Mediciones sintéticas

El navegador registró las marcas de presentación sin contenido ni identificadores. En un flujo con UI real y puerto sintético, el primer texto de Foxy apareció a los 2033 ms y el definitivo a los 4049 ms. En Estudio, con esperas inyectadas de 620 y 1100 ms, el chat se presentó a los 632 ms y la devolución a los 1115 ms. La prueba de la devolución concurrente atribuyó 1007 ms a la espera para conseguir cupo (demora del fixture de un segundo). Dos historiales de diez pares bajaron de seis conteos a tres manteniendo el contexto confirmado por el proveedor. En el segundo pase de la suite rápida, tres pruebas preexistentes revelaron que una pestaña sin el reloj de rendimiento podía interrumpir la finalización o el reintento de una práctica. La lectura del reloj pasó a ser opcional; se verificaron los siete casos focalizados y los sesenta casos del tramo final de la suite.

### Navegador integrado y cancelación

Se ensayó un build de Next real conectado al proxy, a Nest y a PostgreSQL descartable. El adaptador de Gemini recibió respuestas sintéticas con pausas controladas. En escritorio de 1538 px se vieron dos parciales, el primero a 2118 ms y el definitivo a 8267 ms desde el envío. A 390 px, el primer texto llegó a 2115 ms y el lector pudo enfocar Detener desde el acuse, mantenerlo al incorporarse el turno y cancelar con Enter. El GET posterior y la base confirmaron CANCELLED, sin parcial ni respuesta definitiva; el proveedor simulado recibió la señal de aborto. Se verificó también Cache-Control no-store.

Este recorrido detectó una pérdida de foco al sustituir el acuse por la primera lectura del turno y una clasificación engañosa de la cancelación como timeout/pérdida del lease. El acuse y el turno ahora conservan su identidad en el transcript. El worker registra CANCELLED en generación y persistencia cuando recibe la señal local de cancelación confirmada. Cuando sólo observa una pérdida de lease mantiene STALE. La repetición integrada confirmó ambas métricas y el foco estable. El recibo, capturas y comandos quedaron en `.test-artifacts/qa-latencia-completa/browser/`.

La suite rápida completó los 478 archivos con 2929 pruebas aprobadas, 0 fallidas y 0 omitidas después de las correcciones de interfaz. La verificación focal del último ajuste de atribución cubrió 69 pruebas de worker, ciclo de vida, streaming, métrica e interfaz sobre el build estricto. En la matriz extendida pasaron los 149 archivos de base descartable (923 pruebas) y los nueve de servicios descartables (52 pruebas). Los grupos de navegador y de comandos integradores continuaron sobre copias privadas del candidato para preservar los builds y los datos del checkout.

Durante la ejecución se observaron cambios concurrentes de pruebas y prompts pedagógicos en el checkout principal. La comparación con Gemini y la matriz de navegador identifican su propio candidato. Las muestras de Gemini no se repitieron con prompts ajenos posteriores.

Los 19 comandos integradores pasaron en su copia del candidato (153 pruebas reportadas). El primer intento de password-change-core agotó el plazo del compilador y pasó en una repetición con el mismo comando, sin recompilaciones competidoras. La traza de Next en esa copia anidada leyó metadatos package.json de doce dependencias del directorio padre; los builds y fixtures fueron propios. Recibo en `.test-artifacts/qa-latencia-completa/wrapper-matrix/summary.json`.

Los resultados de los 44 archivos de Playwright se acumulan individualmente en `.test-artifacts/qa-latencia-completa/browser-matrix/first/results.jsonl`. El contraste de los fallos con 6e9c1312 usa la copia baseline del mismo directorio. Los cuatro flujos de IA tienen evidencia focal separada incluso cuando un recorrido general falla antes de llegar a ellos.

### Resultado final de la matriz

Se ejecutaron los 44 archivos de navegador con Playwright en el candidato congelado. En la primera corrida completa pasaron 21 archivos y fallaron 23. Node reportó 110 pruebas aprobadas, 40 fallidas y 22 omitidas; el total de fallidas incluye subtests y sus contenedores. El reinicio de sesión interrumpió un archivo antes de emitir recibo: se ejecutaron los 35 archivos sin recibo y se conservaron los nueve ya completos.

Se comprobaron los 23 archivos fallidos sobre la base 6e9c1312. En 22 fallaron los mismos subtests, entre ellos el límite 429 al cargar el token para el Muro, la espera de un encabezado de Foxy y expectativas sobre botones de navegación o actividades. Esta comparación no determina por sí sola si cada causa corresponde al producto, al fixture o a una expectativa desactualizada. El archivo restante, p9-home-integration, falló inicialmente al esperar una lectura de notificaciones antes de simular la desconexión. En la base pasó y, al repetirlo de forma aislada en el mismo candidato, pasó 13/13. No se observó un fallo de navegador reproducible exclusivo de esta rama. La matriz global tiene 22 archivos con fallos reproducidos en la base.

Los recibos completos del navegador se reúnen en `.test-artifacts/qa-latencia-completa/resultados.md`, con enlaces por archivo al candidato, al contraste y a la repetición, además de los informes de Gemini y la UI integrada. Las pruebas de acceso a modelos reales se limitaron a las doce generaciones de Gemini autorizadas. El checkout compartido recibió otros cambios concurrentes y al cierre pasó una nueva batería de **143 pruebas focalizadas** sobre la compatibilidad de las cuatro mejoras, con cero fallos u omisiones. La comparación externa y la matriz general corresponden al candidato congelado. La aplicación local retenida permanece detenida.
