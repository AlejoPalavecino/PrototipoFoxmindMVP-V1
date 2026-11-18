# Cierre de la rama de latencia e integración en main

Coordinador principal, sin identificador de sesión expuesto. El usuario autorizó resolver los pendientes y publicar en main. La rama parte de 8299fcbc y el remoto se comprobó en 6e9c1312. El directorio compartido contiene además trabajo pedagógico. La comprobación incluye los fallos de navegador identificados en la matriz de latencia y las pruebas del conjunto integrado.

## Repetición con Gemini real

Se compararon los adaptadores de 6e9c1312 y 8299fcbc con Gemini 3.8 Flash, tres pares por consulta y orden de versiones alternado entre repeticiones. La autorización cubrió doce generaciones nuevas. Las doce terminaron con una respuesta válida. Los tiempos empiezan antes del conteo de tokens y terminan en el adaptador.

| Mediana de tres repeticiones | Base | Rama |
|---|---:|---:|
| Multiplicación, primer texto | 4,36 s | 3,71 s |
| Multiplicación, final | 4,36 s | 4,14 s |
| Plan de clase, final | 9,74 s | 9,93 s |

Las tres multiplicaciones terminaron antes en la rama y las seis respuestas dieron 102. El plan terminó antes en la rama en dos de los tres pares. Las seis planificaciones incluyeron un objetivo, etapas que sumaban 40 minutos y evaluación de salida. Con tres pares y tiempos de la rama entre 6,45 y 11,66 s, la muestra no establece un cambio sistemático en la duración del plan. Los recibos están en el directorio local ignorado `.test-artifacts/qa-latencia-completa/foxy-benchmark/repeat-live/`. Esta comparación aísla el cambio de latencia anterior a la incorporación de los prompts pedagógicos.

Tres planes mostraron saltos de línea doblemente escapados. El adaptador corrige separaciones de párrafo y de lista en recursos docentes antes de guardarlos. Comparte la normalización de Estudio y conserva los escapes de los ejemplos de código. La regresión del plan falló antes del cambio y pasó después con el mismo cuerpo de respuesta.

## Recorridos de navegador y entorno de prueba

Pasaron los dos recorridos de Brújula que fallaban en la línea base. Uno creó el aula, publicó, calificó y verificó la privacidad de las notificaciones tras respetar el plazo de reintento del servidor. El otro recorrió ambos roles, seis rutas docentes, las secciones del aula y controles de acceso entre estudiantes a cuatro anchos. Foxy ofrece ahora un encabezado de nivel uno al lector de pantalla.

Durante la ejecución en paralelo, Docker informó que había agotado las subredes predeterminadas. Se comprobó que el daemon asigna automáticamente una subred libre al solicitar `0.0.0.0/28`. El helper P4 usa ese tamaño para tres servicios propios y libera la red al terminar.

La verificación de participación recuperó las acciones docentes de la consigna y la información del plazo. En el cuestionario, reintentar un guardado conserva el editor abierto. Un guardado posterior con texto diferente persiste la nueva revisión. El recorrido comprobó ambos resultados. [Inicio, aula y participación](2026-11-17-browser-inicio-p6-p7.md). Los recorridos de cuestionario, trabajo práctico, evaluación, correo, privacidad y recuperación de servicios de P9 pasaron en ocho archivos. [Recorridos P9](2026-11-17-browser-journeys-p9.md).

La suite rápida completa pasó con 2.979 pruebas en 478 archivos. Los 19 comandos integradores pasaron en copias independientes, con 153 pruebas contabilizadas. Las cifras de grupos distintos pueden superponerse. Las compilaciones de API y web, ESLint y los límites de arquitectura pasaron. Los recibos de los comandos integradores están en `.test-artifacts/wrappers-cierre/summary.json`.

## Resultado de la verificación integrada

Los 44 archivos de navegador tienen una ejecución final aprobada. Se validaron en tandas mientras se corregían los fallos, con verificación focal de cada corrección. Los cinco archivos de calificaciones aportaron 17 pruebas aprobadas de guardado, descarte, publicación, rectificación y recuperación. [Verificación P8](2026-11-17-browser-grading-playwright.md). La tanda complementaria pasó en 20 archivos, con 94 pruebas aprobadas y cero omisiones. Su recibo está en `.test-artifacts/qa-latencia-completa/browser-integracion-resto/summary-final.json`.

La matriz de PostgreSQL descartable pasó con 927 pruebas y la de servicios aislados con 52. La migración de PDF se verificó con datos sintéticos, incluida una publicación preexistente. Para comparar los resultados funcionales y las limitaciones educativas, consultar la [reconciliación del arnés](2026-11-17-pedagogy-reconciliacion.md). La autorización de publicación corresponde al repositorio Git.
