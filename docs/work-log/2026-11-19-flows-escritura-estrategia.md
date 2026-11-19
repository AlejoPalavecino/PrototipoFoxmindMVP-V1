# Verificación de análisis de escritura y estrategias compartidas

19 de noviembre de 2026. Rol de verificación. Rama `codex/semaforo-riesgo` sobre 0aa8be0d. Alcance autorizado por coordinación: flujos completos desde las pantallas y rutas reales. Sesiones sintéticas, PostgreSQL descartable y modelo inyectado sin red.

## Prueba primero

Con las builds anteriores y la base descartable recién migrada, se creó una entrega práctica confirmada sin nota y una carpeta activa con el plan importado del aula. El GET de análisis y el GET de estrategia devolvieron NOT_FOUND (404), el fallo esperado antes de incorporar ambas rutas.

## Resultado comprobado

Builds integradas de API y web de las 01:02:27 y 01:02:40, hora local. `node --test --test-concurrency=1 tests/teacher-support-sharing-flow.test.mjs` terminó 6/6 en 54,8 segundos. El proceso cerró el navegador, Next, Nest y el clúster PostgreSQL de la prueba.

- La consulta muestra el análisis disponible sin despachar el modelo ni cargar saldo. Sólo el propietario del aula puede consultar o iniciar el análisis y leer la evidencia citada. El modelo sintético recibió la consigna y el texto confirmado sin nombres, identificadores, conversaciones privadas ni borradores.
- El docente inició el análisis desde Inicio, abrió una cita desde la segunda lista y volvió al mismo botón. La segunda solicitud reutilizó el resultado. Se registró una sola operación en su cuota y ninguna en la del estudiante. Confirmar la segunda entrega dejó obsoleto el informe, invalidó la cita vieja y conservó la ficha.
- El estudiante eligió el docente del aula vinculada y revisó el texto literal antes de confirmar. La ficha entregó solamente el texto compartido y su identificador. Otro docente del mismo alumno no pudo leerlo en su propia aula. El color permaneció igual.
- El retiro obsoleto devolvió 409 y preservó la versión actual. El retiro confirmado desde Mi Estudio removió el texto de la ficha al revalidar en el evento de retorno de foco. Desvincular y volver a vincular no volvió a compartir la estrategia.
- Se revisaron las capturas finales a 1350 y 390 px y el desbordamiento de la revisión móvil a 320 px. Los botones del pie del análisis en Inicio midieron al menos 44 px tras corregir el reset de estilos. Capturas temporales con sufijo `XyfJLy`.

El proveedor, los usuarios y los datos fueron sintéticos. La prueba valida funcionamiento y permisos con el stack local y no evalúa calidad educativa del modelo.

La regresión `node --test --test-concurrency=1 tests/teacher-support-flow.test.mjs` terminó 6/6 en 50,6 segundos sobre las mismas builds y con el runner compartido en su configuración sin IA. Capturas temporales con sufijo `RQyXBO`.
