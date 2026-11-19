# Flujos del semáforo de acompañamiento

18 de noviembre de 2026. Verificación full stack. Base 0aa8be0d, rama codex/semaforo-riesgo, worktree ProtipoFoxMind.

- Caso de aceptación con Next, API, Chromium y PostgreSQL nuevos. Usa sesiones y aulas sintéticas. Crea, entrega y publica por las rutas reales, con vencimientos históricos preparados en la base propia.
- Docker Desktop no expone su socket local. La prueba usa un clúster nativo con puerto de loopback de la corrida. El recorrido no requiere almacenamiento de archivos, escaneo ni correo.

## Prueba primero

- El primer arranque confirmó PostgreSQL 17, las migraciones vigentes, la API y Next en loopback.
- Ajustada la forma de leer la revisión que devuelve la API al guardar una respuesta, el caso obtuvo RED en los artefactos anteriores al cambio. La publicación y la entrega real ya funcionaban. La lectura autenticada del semáforo devolvió 404 y la ficha nueva no aparecía desde Inicio ni desde Estudiantes.
- Tras integrar API, proxy y UI, el recorrido obtuvo 6/6. La inspección visual encontró que la etiqueta de aula aparecía pegada al nombre y que Ver todos medía menos de 44 px. Se incorporaron comprobaciones geométricas y el build anterior volvió a fallar por la altura del botón.
- La fixture de aceptación incorpora una rúbrica publicada con dos criterios y dos notas que ejercitan el promedio redondeado y la longitud de las barras. Las sesiones verificadas y los planes se preparan en la base sintética. La publicación, entrega, calificación, prórroga y baja usan las rutas reales.

## Reproducción

Ejecutar `npm run api:build`, `npm run web:build` y `node --test --test-concurrency=1 tests/teacher-support-flow.test.mjs`. El entorno necesita Chromium de Playwright y PostgreSQL nativo. El runner busca sus binarios vía `pg_config --bindir`, PATH y las ubicaciones de PostgreSQL 17 y 16 en Windows. `FOXMIND_TEST_POSTGRES_BIN` admite una ruta explícita para esta prueba directa.

## Resultado final

- `npm run web:build` pasó la compilación y los tipos. El build web final quedó a las 21:13:22 y el repositorio SQL compilado a las 21:15:15. La prueba dejó su primera captura a las 21:15:34, hora local.
- `node --test --test-concurrency=1 tests/teacher-support-flow.test.mjs` terminó con 6/6, sin casos fallidos, cancelados u omitidos. Se comprobaron recuentos y prioridad, filtro por aula, dos notas y promedio 7,18, ambos bloques de rúbrica, lectura y retorno de foco, dos entradas a la ficha, salida del widget en el rol alumno, prórroga, y pérdida de acceso a ficha y entrega tras retirar la matrícula desde una segunda pestaña. Se rechazó pedir esa entrega como estudiante, docente ajeno o para otro integrante del aula.
- Navegador actualizado de Playwright Chromium en 1350, 390 y 320 px. El selector y el widget muestran acciones y nombre de aula separados. Se comprobó el botón principal de al menos 44 px, el foco y el desbordamiento del diálogo. Se inspeccionaron capturas finales con movimiento reducido. Las capturas sintéticas se conservan en el directorio temporal de la corrida con sufijo `fIRTXf`.
- El clúster, la API y Next se cerraron al terminar. La cobertura es de los recorridos de acompañamiento. Quedan fuera la verificación del correo, los adjuntos, las llamadas a un proveedor de IA y una evaluación con docentes.

Se repitió el mismo comando sobre los builds estables durante la regresión general. Resultado 6/6 en 47,9 segundos. Capturas sintéticas con sufijo `FCw3Cd`.
