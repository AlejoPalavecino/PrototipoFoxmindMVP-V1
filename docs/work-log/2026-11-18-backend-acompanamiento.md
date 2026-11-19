# Consultas del semáforo y de la ficha

18 de noviembre de 2026. Agente backend. Rama `codex/semaforo-riesgo`, base `0aa8be0d`. Alcance autorizado: política de prioridad, lecturas docentes y evidencia de devoluciones publicadas. El análisis de escritura por proveedor requiere la política de datos y costo de la [especificación](../product/acompanamiento-docente-propuesta.md).

La consulta de Inicio pagina de veinte en veinte y calcula totales antes del paginado. La fecha y los vencimientos usan la zona del aula. La primera recepción confirmada cancela un pendiente aunque la nota todavía espere publicación. Las fichas, el listado y la lectura del intento efectivo publicado se autorizan en transacción.

Los puntos de la ficha usan los criterios de la rúbrica publicada. Un criterio con puntaje máximo se señala como logro, y el menor puntaje entre criterios diferenciados se presenta como aspecto para revisar en ese trabajo. La devolución libre aparece íntegra. Cuando existe devolución junto con ese criterio, la ficha sugiere revisarlo en la próxima entrega y comparar ambos trabajos. La acción se deriva de la rúbrica, sin generación de IA.

## Comprobación

- RED: `node --test tests/teacher-support-backend-policy.test.mjs tests/teacher-support-backend-http.test.mjs` falló porque faltaba el módulo de política y el endpoint de listado devolvía 503.
- GREEN: `npm run api:build` y `node --experimental-transform-types --disable-warning=ExperimentalWarning --test tests/teacher-support-backend-policy.test.mjs tests/teacher-support-backend-http.test.mjs tests/teacher-support-backend-db.test.mjs` pasaron 5/5. Se comprobó el vencimiento exacto, la prórroga inicial, la zona local, reapertura, publicación con nota cero, lectura de consigna, criterio, devolución y texto, roles, revocación y paginado. PostgreSQL nativo descartable con las migraciones del repositorio.
- El listado de 4 aulas, 180 inscripciones y 4.500 obligaciones tardó 25,7–28,0 ms con tablas recién pobladas y 16,8–27,5 ms luego de `ANALYZE`, medido dentro del proceso entre servicio y base local. Una variante anterior producía más de diez millones de comparaciones en el plan frío. Materializar los hechos y usar el índice de intentos por obligación corrigió ese caso. La medida no incluye navegador, red ni concurrencia de producción.
- ESLint de los archivos TypeScript de este corte, `node scripts/check-boundaries.mjs` y `git diff --check` pasaron.

## Reloj de la consulta con Prisma

La revisión reprodujo un desplazamiento de tres horas al leer el reloj de la sesión PostgreSQL de Buenos Aires mediante Prisma. Se agregó una regresión con `PrismaService` en sesión UTC y de Buenos Aires. En RED el reloj de evaluación quedó fuera del intervalo UTC real. En dos pasadas posteriores, la prueba detectó que leer la recepción como época Unix discrepaba con el recibo de Participación y que un vencimiento grabado en Actividades quedaba fuera de los pendientes.

El servicio usa milisegundos desde la época Unix para el reloj de evaluación. Proyecta los plazos al mismo instante que muestra Actividades y la recepción al mismo que devuelve el recibo de Participación. En GREEN, un plazo recién vencido generado en Actividades dio prioridad media en Inicio y ficha, y la evidencia coincidió con el recibo y la vista Entregas en ambas sesiones. La corrección se aplica al servicio de acompañamiento y preserva los registros existentes.

La suite final pasó 5/5. Con el adaptador de producción y 4 aulas, 180 inscripciones y 4.500 obligaciones, el listado tardó 31,2–34,3 ms recién poblado y 21,3–39,3 ms luego de `ANALYZE`. Las mediciones corresponden al servicio y PostgreSQL de prueba, con el límite de consulta de 1.000 ms de `PrismaService`.

La revisión independiente repitió el flujo por HTTP con sesión autenticada en ambas zonas. Verificó prioridad media para el plazo vencido, baja al trasladarlo al futuro en su escenario con entregas previas, y coincidencia de fechas con Actividades y Entregas.

`node --test tests/teacher-support-flow.test.mjs` pasó 6/6 en 43,48 s al repetir el flujo completo en Chromium con el artefacto de API que incluye el ajuste temporal.
