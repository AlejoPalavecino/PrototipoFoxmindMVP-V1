# Arranque de política IA con Prisma real

- Coordinador: root; sin identidad registrada para memoria. Fecha: 2026-11-16. Worktree IA, base1e60ea5.
- Autorización vigente: migrar/preparar el entorno local con la arquitectura IA y preservar el trabajo UI. La autorización anterior de commits/integración/push corresponde a esta misma funcionalidad; no concede despliegue ni activación de Claude.
- La verificación del cliente compilado real descubrió P2010: Prisma no deserializa el tipo PostgreSQL void retornado por `SELECT pg_advisory_xact_lock(...)`. La migración SQL y la política persistida eran válidas; fallaba el inicializador usado por el arranque normal.
- RED: nueva aceptación con PrismaService real y PostgreSQL descartable falla por void, no por permisos o migraciones. Las pruebas anteriores usaban wrapper pg y no cubrían esa frontera.
- Cambio: `SELECT 1 FROM pg_advisory_xact_lock(78123003)` conserva el mismo bloqueo transaccional y devuelve un entero compatible. No cambia persistencia, permisos, proveedor, versiones o tarifas.
- La aceptación cubre primera inicialización e idempotencia con el cliente generado, además de los escenarios previos de upgrade, legacy y concurrencia. Los recursos descartables tienen ownership y cleanup; no usa secretos ni datos retenidos ni proveedores reales.
- GREEN13/13 en suite policy, incluidas inicialización/idempotencia Prisma y dos órdenes de concurrencia. ESLint focal, docs:check151 archivos902 enlaces y diff check correctos. Revisión independiente VERIFIED, sin bloqueantes. La comprobación posterior del runtime compilado en main se registra en el recibo local. El recibo de la operación local queda en el registro de publicación; esta corrección no modifica el worktree UI.
