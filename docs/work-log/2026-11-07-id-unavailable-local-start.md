# Arranque local FoxMind

- Agent / role: root / coordinador.
- Session or task ID: unavailable.
- Date: 2026-11-07, America/Buenos_Aires.
- Branch / worktree: main / checkout principal.
- Starting commit: bd0ee53d3c491f89801a12eaa909f480788da79d.
- Phase and detailed task/spec links: operación local, docs/engineering/local-development/operation.md.
- Status: completed.

## Request and scope
Levantar la app local a pedido del usuario. Reutilizar entorno admitido conservando datos; sin migraciones, reset, seed ni publicación.

## Work performed
Leídos roadmap, protocolo, operación y registros de arranque. Árbol inicialmente limpio. Docker activo con cuatro contenedores retenidos detenidos. Se usa launcher sin IA externa para arranque sin acceso a claves de proveedor.

## Verification
Pendiente compilación API, arranque y comprobación HTTP.

## Commits and outcomes
Sin commits.

## Handoff
Iniciar supervisor retenido y comprobar disponibilidad; detener ante incompatibilidad de esquema.

## Resultado observado
API: `node scripts/build-api.mjs` exit0 (Prisma y TypeScript). Supervisor oculto PID28400 finalizó con exit1 en `retained-drift`, sin iniciar API/Next. Consulta de solo lectura al historial confirmó39migraciones; repositorio contiene46. Pendientes: agenda_occurrence_exceptions, library_written_content, foxy_rubric_purpose, agenda_graphite_color, classroom_access_code_envelope, material_revisions y practical_written_response. No se aplicaron migraciones. Los cuatro servicios de soporte quedaron iniciados y los datos conservados.

Estado vigente: blocked. Falta autorización explícita del usuario para respaldar y actualizar la base retenida. Próxima acción: con autorización, preparar backup verificable, aplicar sólo siete migraciones pendientes, verificar historial/drift y reiniciar. Sin autorización, no mutar esquema. Sin pruebas funcionales: API/Next no pudieron arrancar por esquema incompatible. IA externa no iniciada.


## Autorización 2026-11-07
Usuario: «Si te autorizo», en respuesta al pedido de respaldo, siete migraciones y arranque. Estado: in_progress. Se revisaron los siete SQL: agregan columnas/tabla y amplían restricciones; no borran datos existentes. Se verificará respaldo e índice, historial previo, hash/conteos de columnas originales y drift.

## Cierre verificado
`upgrade-start-20261107.mjs` exit0: backup custom e índice pg_restore válidos (no restauración completa ensayada);39→46migraciones, historial anterior intacto, hash/conteos de las columnas originales en54tablas idénticos, drift0. Respaldo privado: `.test-artifacts/main-gemini-20261024/before-start-20261107-1794071298127.dump`. Prueba privada: `upgrade-start-proof-20261107.json`. El mensaje heredado del helper mencionó dos migraciones; el guard y el resultado JSON confirman exactamente las siete autorizadas.

Guard del launcher ignorado actualizado39→46. Supervisor52876, Next39304, activos en loopback. `check-start-20261107.mjs` exit0: readiness API200, acceso200, registro200, aulas anónima401, Mailpit200. Prueba en `start-ready-proof-20261107.json`; logs `start-ready-20261107.{out,err}`. IA externa desactivada en este arranque. Sin pruebas autenticadas ni nueva aceptación funcional global. Warning heredado de lockfile externo no bloqueante.

Resultado vigente: completed. App disponible en http://127.0.0.1:52171/sign-in y correo local en http://127.0.0.1:52169. Datos/cuentas/archivos conservados; no seed/reset, commits, push ni deploy. Próxima acción: usuario prueba con sus cuentas existentes. Para detener API/Next usar SIGTERM del supervisor52876; servicios persistentes permanecen.

## Cierre solicitado por usuario
Usuario pidió «Cerra la app». Se cierran supervisor API/Next y los cuatro servicios de soporte de este entorno, sin borrar volúmenes. Se comprobarán listeners/procesos y conservación de volúmenes; luego se restituirá únicamente next-env.d.ts generado por Next dev, contrastado con HEAD.

Cierre observado: taskkill del supervisor52876 y árbol propietario completado; cuatro contenedores detenidos mediante docker stop. Sin listeners52170/52171 ni procesos52876/39304; ningún contenedor del entorno ejecutándose. Tres volúmenes con mismos nombres antes/después, sin eliminación. Lock del proceso detenido conservado como operation-stopped-52876-20261107.lock. next-env.d.ts restituido de rutas dev/types a rutas types de HEAD. App cerrada; próximo arranque usará esquema46 ya actualizado. No hay tarea pendiente de este cierre.

## Nuevo arranque solicitado
Usuario: «Volvé a levantar FoxMind». HEAD bd0ee53 sin cambios de producto; registro previo preservado. Estado de esta operación: in_progress. Sin listeners API/web ni contenedores activos. Se reutiliza launcher admitido con46migraciones y sin IA externa; mismo build API exitoso de este chat y mismo commit. No se necesitan nuevas migraciones ni recompilación sin cambios.

Nuevo arranque completed: supervisor3404 activo, guard retained-restart-only/historial46/drift aprobados. `check-restart-20261107.mjs` exit0: API readiness200, acceso200, registro200, aulas anónima401, Mailpit200. Prueba privada restart-proof-20261107.json; logs restart-20261107.out/err. App http://127.0.0.1:52171/sign-in, inbox52169. Datos conservados sin nuevas migraciones; IA externa desactivada como en arranque anterior. Next regeneró next-env.d.ts con rutas dev/types mientras está activo; no es cambio de producto. Sin nuevas pruebas autenticadas/funcionales globales. Se deja corriendo para el usuario, sin tarea pendiente de arranque.

## Segundo cierre solicitado
Usuario pidió «Cerrar app». Operación en curso: detener supervisor3404 y árbol propietario, cuatro servicios retenidos; conservar volúmenes y datos.

Segundo cierre completed: taskkill3404/árbol y docker stop de los cuatro servicios completados. Sin listeners52170/52171, procesos3404/17804 ni contenedores propios activos. Tres volúmenes conservados idénticos por nombre. Lock archivado como operation-stopped-3404-20261107.lock y next-env.d.ts restituido a rutas types de HEAD. Datos/archivos/cuentas conservados; sin tarea pendiente. Próxima acción sólo ante pedido de nuevo arranque.
