# Orden paginado del inicio docente

Agente worker `/root/home_order`, sesión del host sin identificador expuesto.
Fecha 2026-11-11. Rama `codex/teacher-home-polish`, worktree `FoxMind-teacher-home-polish`, base `3895f4ded6884641872c5950c39c54215406d6d6`.

Alcance delegado por el coordinador: contrato, transporte y persistencia de lectura para ordenar Entregas y Consultas. La dirección se asocia al cursor firmado. Pruebas sintéticas y sin migraciones. La interfaz, el tablero y la documentación canónica están a cargo del coordinador.

Estado inicial: preparando regresiones test-first en el worktree dedicado.

## Cambios

- `src/core/domain/home/{home,validation}.ts` incorpora `order?: 'asc' | 'desc'` para `review` y `queries`. Omitirlo conserva Entregas ascendente por fecha de entrega y Consultas descendente por última actividad. El desempate usa el ID de la fila en la misma dirección.
- `apps/api/src/modules/home/infrastructure/{cursor,sql-page}.ts` reutiliza la dirección efectiva para selección SQL, comparación estricta desde el cursor y firma del cursor. La firma conserva sujeto, módulo y zona horaria. Un orden explícito igual al predeterminado puede continuar el cursor del agregado. Una dirección distinta requiere `cursor: null`.
- `apps/api/src/modules/home/presentation/http.ts`, `apps/web/src/application/academic-home-client.ts` y `apps/web/src/application/server/home-proxy.ts` transmiten la dirección y mantienen validación de rutas y parámetros.
- `tests/home-order.test.mjs` cubre contrato, cursor, SQL generado con empates y cliente → proxy → HTTP. `tests/home-order-database.test.mjs` usa el fixture existente de PostgreSQL propio y ejecuta SQL con usuarios/aulas sintéticos.

## Evidencia

- RED con `node --disable-warning=ExperimentalWarning --test tests/home-order.test.mjs`. Cuatro fallos esperados antes de implementar. El contrato rechazó `order`, el cursor aceptó una dirección distinta, la consulta devolvió Entregas ascendente ante `desc` y el cliente rechazó la dirección antes de llegar al proxy.
- GREEN con `node --experimental-transform-types --disable-warning=ExperimentalWarning --test tests/home-order.test.mjs tests/brujula-data-http.test.mjs tests/foxmind-3d-http.test.mjs tests/foxmind-3d-service.test.mjs tests/p9-home-client.test.mjs`. 16 pasaron, 0 fallaron, 0 omitidos.
- `npm run api:build`. La primera compilación detectó que TypeScript infirió `string` para el enum; se fijaron los literales con `as const`. La segunda generó Prisma y compiló TypeScript con código 0.
- ESLint focal para los siete archivos TypeScript y `git diff --check` con código 0.
- PostgreSQL local. Docker Desktop no tenía un motor Linux accesible. La revisión automática bloqueó el primer comando compuesto que incluía eliminar el directorio del clúster efímero. Con comandos secuenciales `initdb` y `pg_ctl start` se creó un clúster PostgreSQL 16 propio en TEMP, se confirmó su directorio con `SHOW data_directory` y se aplicaron las migraciones. El caso integrado `tests/home-order-database.test.mjs` y cinco pruebas de `tests/brujula-data-database.test.mjs` pasaron con `node --experimental-test-module-mocks --disable-warning=ExperimentalWarning --input-type=module -`. Sólo se reemplazó el inicio del fixture Docker por el pool hacia el clúster de prueba, con las transacciones revertidas. La prueba confirmó defaults del agregado, secuencias completas 5+2 en las dos direcciones, empates, totales, rechazo de cursores cruzados y exclusión de estudiante, aula ajena y aula archivada. Se ejecutó `pg_ctl -w stop` sobre el directorio propio y `pg_ctl status` confirmó que el proceso quedó detenido. El directorio temporal sintético se conservó.
- Comando canónico para repetir el caso con el fixture Docker de CI disponible: `node --experimental-transform-types --disable-warning=ExperimentalWarning --test tests/home-order-database.test.mjs`. La ejecución directa con PostgreSQL 17.10 en Docker queda pendiente.

## Handoff

Estado del worker: código y pruebas entregados para verificación del coordinador. Primer paso pendiente: reconciliar el inventario y los resultados de la interfaz con la tarea. La clave de firma del cursor es efímera por proceso; el nuevo formato se emite al pedir una página inicial.

Reversión de la unidad: revertir los cambios de los siete archivos TypeScript listados y retirar las dos pruebas nuevas junto con sus entradas de inventario. El coordinador debe revertir también cualquier consumidor que dependa de `HomePageQuery.order`. Esta unidad carece de migraciones, commits, publicación y despliegue.
