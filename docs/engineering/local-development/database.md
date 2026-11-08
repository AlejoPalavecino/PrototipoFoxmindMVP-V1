# Base local y migraciones

PostgreSQL usa Prisma y migraciones SQL versionadas. [El mapa de datos](../data-model.md) explica 55 modelos; la fuente física es [schema.prisma](../../../prisma/schema.prisma) y las 46 migraciones del corte actual, no un inventario copiado aquí.

| Comando | Efecto |
|---|---|
| npm run db:validate | Valida esquema |
| npm run db:generate | Genera cliente ignorado |
| npm run db:status | Consulta migraciones del DATABASE_URL autorizado |
| npm run db:migrate | Aplica pendientes a ese destino; comprobarlo antes |
| npm test | Contratos sobre una base aislada creada por el runner |
| npm run test:red | Baseline deliberadamente fallido; no valida implementación terminada |
| npm run db:up / db:stop | Servicio local persistente de Compose; stop conserva volumen |

La base descartable del preview aplica las migraciones en un destino propio vacío. Eso no migra ni prueba una actualización de datos retenidos. Mantener SQL adicional de checks, índices y triggers; Prisma db push no lo sustituye.

No reescribir migraciones aplicadas, resetear o eliminar volúmenes de datos a conservar. Una corrección se diseña como migración hacia adelante con prueba aislada y plan de recuperación cuando corresponda. Un volumen Docker no es un backup.

Datos, claves y URL con contraseña quedan fuera de Git y de ejemplos públicos. [Entorno completo](README.md).
