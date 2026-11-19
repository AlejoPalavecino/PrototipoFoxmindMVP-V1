# Verificación del acompañamiento publicado en main

El 19 de noviembre de 2026 se repitió la verificación a pedido del usuario sobre `e37244c953d0027d2bee27b43fb1d4c0fea2c2fe`, con árbol limpio y una sola rama local y remota. El coordinador ejecutó la prueba en el worktree principal. Se usaron cuentas sintéticas, Chromium, PostgreSQL descartable y un proveedor de IA sintético.

Las compilaciones `npm run api:build` y `npm run web:build` terminaron con código 0. El comando `node --test --test-concurrency=1 tests/teacher-support-flow.test.mjs tests/teacher-support-sharing-flow.test.mjs` pasó 12/12 en 93,9 segundos, sin fallos, cancelaciones ni omisiones.

El recorrido verificó el filtro por aula, la ficha en escritorio y celular, la lectura de evidencias con retorno de foco y el recálculo tras prórroga o baja de matrícula. Abrir la ficha conservó la cuota. El pedido explícito de análisis generó un cargo docente y una nueva entrega invalidó el informe previo. El estudiante confirmó el texto exacto en móvil, la lectura quedó limitada al aula vinculada y el retiro obsoleto preservó una publicación posterior.

Esta repetición verificó el código publicado. El único cambio para publicar es este registro de resultados.
