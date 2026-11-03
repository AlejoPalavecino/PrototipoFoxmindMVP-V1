# Foxy–Files — contrato por operaciones

- Agent / role: root, implementación
- Session or task ID: unavailable
- Date: 2026-11-03
- Branch: main
- Starting commit: 51e277c, con corrección local de Biblioteca preservada
- Phase: ARQ-03, extracción incremental de la frontera Foxy–Files
- Status: completed

El usuario aprobó implementar el contrato por operaciones. Alcance: cableado del host, lectura privada y custodia por propósito, publicación en la transacción existente y pruebas focales.

## Work performed
- El host conecta operaciones de lectura de documentos, lectura de archivos autorizados, lectura privada acotada, custodia visual y preparación/verificación de publicación.
- El publicador de Biblioteca se inyecta como operación transaccional. El runtime no importa FileService ni toma su store, scanner o storage.
- La guarda de arquitectura protege el adaptador como entrada del host. Se eliminaron 17 excepciones obsoletas, de 146 a 129.
- Se adaptaron fixtures al contrato y la prueba de rollback usa el publicador suministrado por el adaptador real.

## Verification
- RED focal observado: el runtime anterior falló al acceder a files.storage al recibir solamente operaciones.
- npm run api:build y npm run lint:boundaries pasaron. git diff --check pasó.
- Composición Nest, runtime, fronteras, citas y lectura privada: 40/40, sin omisiones (Node con preload del build y module mocks).
- Runtime y confirmación por el nuevo adaptador: 16/16, sin omisiones. PostgreSQL desechable comprobó rollback conjunto, autorización, prueba de custodia e idempotencia.
- node --import ./scripts/register-api-test-build.mjs --test apps/api/src/foxy-ai/foxy-real-storage-scanner.test.mjs: 2/2, sin omisiones. Imagen sintética publicada en Biblioteca con almacenamiento S3 y ClamAV aislados, rechazo EICAR y limpieza de recursos sin fallas.

- Suite de custodia, publicación, asignación, confirmación, reinicio y recorridos visuales con preload del build: 69/69, sin omisiones. Incluye PNG, JPEG y diagramas, y descarte al vencimiento real del lease. Hay solapamiento con la corrida focal de confirmación.
- Alcance de evidencia: pruebas focales con datos sintéticos y servicios aislados. Sin revisión independiente ni corrida de toda la matriz CI.

## Commits and outcomes
Cambio local sobre 51e277c. Los cambios locales previos de Biblioteca se conservaron.

## Handoff
La extracción Foxy–Files queda comprobada con los recorridos focales. La recuperación por lotes de las colas IA pertenece a otra unidad.
