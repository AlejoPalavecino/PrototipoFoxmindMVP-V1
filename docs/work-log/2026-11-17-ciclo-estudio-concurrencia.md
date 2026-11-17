# Concurrencia de lecturas de fuentes en Estudio

Agente ciclo, revisión independiente. 2026-11-17, checkout principal `main` en `375a2d75`, con cambios paralelos del equipo.

El coordinador autorizó pruebas de regresión en `tests/` con PostgreSQL aislado y una barrera determinista de lectura de fuente sintética. Las pruebas comparan la operación concurrente y la autoridad de la fuente al despachar generación y devolución. La implementación del producto se realiza en paralelo en el coordinador.

Estado inicial. Preparando fixture y reproducción antes de que esté disponible el cambio.

## Evidencia

`node --test tests/study-source-concurrency-database.test.mjs` dio 8 aprobadas, contando 7 escenarios y su prueba padre. El fixture aplica las migraciones del repositorio a un PostgreSQL propio y pausa sólo la lectura sintética. Los casos comprobaron GET, estado pendiente, cancelación, revocación de pertenencia, cambio de versión con los mismos identificadores, selección de fuentes con texto inline, devolución y vista previa DOCX. La vista previa permitió guardar una conversación durante la lectura y rechazó el documento cuando se revocó el acceso. La devolución mantuvo la práctica finalizada y avanzó con una sola lectura cuando la fuente siguió autorizada.

La misma prueba contra una exportación del commit `375a2d75` falló en los 7 escenarios. Los seis casos de generación y devolución fallaron con SQLSTATE `55P03` al bloquear filas de `users`. La vista previa falló con `PREVIEW_UNAVAILABLE` cuando la integración ofrecía sólo el nuevo puerto. Los registros están en `.test-artifacts/qa17-ciclo/study-concurrency-red.log` y `.test-artifacts/qa17-ciclo/study-concurrency-green.log`.

Estas cuatro suites existentes sumaron 19 pruebas aprobadas.

- `apps/api/src/modules/study/generation/application/tests/conversation-generation.test.ts`
- `apps/api/src/modules/study/generation/application/tests/generation-transaction-phases.test.mjs`
- `apps/api/src/modules/study/folders/infrastructure/tests/database.test.mjs`
- `apps/api/src/modules/study/generation/application/tests/study-generation-cancellation.test.ts`

La revisión del puente de archivos comprobó por inspección la comparación de tamaño y digest de bytes contra la custodia. La corrida de concurrencia sustituye el almacenamiento y el proveedor con lectores controlados y confirma el resultado en PostgreSQL. Quedan fuera el rendimiento con almacenamiento y proveedores reales, y las pruebas de carga a escala. Las pruebas usan datos sintéticos y recursos efímeros.

Entrega al coordinador. Pruebas focales, revisión independiente y evidencia disponibles. Sin commits propios.
