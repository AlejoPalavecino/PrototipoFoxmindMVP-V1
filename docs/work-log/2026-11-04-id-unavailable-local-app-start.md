# Arranque local para pruebas manuales

- Agent / role: root, coordinador.
- Session or task ID: unavailable.
- Date: 2026-11-04.
- Branch / worktree: main, checkout principal.
- Starting commit: d8441c1a5e63e2ae970458861581970defc4b055.
- Phase and detailed task/spec links: R1, operación local; [guía](../engineering/local-development/README.md), [operación](../engineering/local-development/operation.md).
- Status: completed.

## Request and scope

El usuario solicita levantar FoxMind en su PC para verlo y probarlo. Reiniciar el entorno de desarrollo retenido ya documentado, conservando cuentas, base, archivos y correo. El lanzador carga internamente su configuración; no se imprimen secretos. Sin migraciones, seed, reset, solicitudes a proveedores externos, commits ni publicación.

Autorización posterior explícita: «Sí, autorizo respaldar la base local, aplicar la migración pendiente y completar el arranque conservando mis cuentas y datos. Pasame la URL cuando esté lista». Se habilita únicamente el respaldo y 202611030001_library_cleanup_retry; los demás límites permanecen. Preparar backup custom, validar su índice, comprobar historial previo y comparar conteos/huellas por tabla sin imprimir registros personales. No se promete restauración probada del backup.

## Work performed

Inspeccionados Git, roadmap, protocolo y guías locales; checkout limpio en main sincronizado. Consultados registros anteriores de arranque, incluidos los de 2026-11-02 conservados en el stash, sin aplicarlo. Docker disponible: cuatro contenedores main-gemini detenidos, sin listeners API/web en 52170/52171. Identificado lanzador retenido preview-readme-no-ai.mjs, con IA desactivada, validación de admisión e historial/drift antes de iniciar. Hay operation.lock previo: verificar propietario/PID antes de actuar. Se usará ego-browser para comprobar acceso y dejar la página disponible.

## Verification

- Lock previo `{pid:14864}` del 2026-11-02: Get-CimInstance/Get-Process no encontraron ese PID. Se conservó como operation-stale-14864-20261104-start.lock, sin eliminarlo.
- Lanzador retenido iniciado mediante Start-Process de node, oculto, PID 13608; salida/error en .test-artifacts/main-gemini-20261024/start-20261104.{out,err}, sin valores secretos.
- Los cuatro servicios propios main-gemini arrancaron. Docker muestra DB y S3 activos, scanner y correo healthy. No se tocaron contenedores ajenos.
- Consulta de metadatos de migración mediante psql: 36 entradas completadas; última 202611010005_foxy_raster_publication. El repo contiene 37 migraciones; falta 202611030001_library_cleanup_retry.
- Inspección de esa migración: agrega deletion_retry_at, deletion_retry_step con default 0 y restricción 0..5 a materials. No incluye DELETE ni DROP. No fue aplicada.
- El guard del lanzador abortó con Preparation detail: retained-drift / stage=retained-drift exit=1. Supervisor finalizado; API/web no arrancaron. Guard de historial previo aprobado, no se relajó el control de esquema.
- La API fue compilada con éxito en la tarea inmediatamente anterior sobre este mismo código. No se ejecutó otro build ni pruebas funcionales en este arranque, ni se abrió una página de navegador todavía.
- Pendientes: autorización específica para respaldar/actualizar la base persistente, aplicar solo la migración pendiente, verificar historial/drift y retomar el arranque. La petición de iniciar la app no se interpretó como autorización para migrar datos retenidos.

## Commits and outcomes

Sin commits ni cambios de producto. Registro operativo local; stash y worktrees conservados.

## Migración autorizada observada

- Script ignorado propio upgrade-retained-20261104.mjs: `node --check` y ejecución exit 0. Verifica admisión/propietario, historial y checksums de 36 migraciones y que el único directorio pendiente sea 202611030001_library_cleanup_retry. Operación bajo el lock del entorno.
- Backup custom: .test-artifacts/main-gemini-20261024/before-library-retry-20261104-1793807785610.dump. Tamaño no vacío e índice `pg_restore --list` comprobados, incluidas tablas users y materials; no se ejecutó restauración completa.
- `prisma migrate deploy` seguido de `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code`: exit 0 con el helper existente y configuración interna. Historial final de 37 entradas/checksums aprobado; las 36 entradas anteriores permanecen idénticas.
- Comparación de conteos y huellas de contenido por tabla antes/después: 54/54 idénticas, excluyendo solamente las dos columnas nuevas al normalizar materials. Defaults nuevos comprobados: retry_at NULL y retry_step 0 para registros existentes. Solo se imprimieron resultados agregados; sin registros personales ni credenciales. Prueba resumida en upgrade-20261104-proof.json ignorado.
- Conteo esperado del lanzador ignorado actualizado de 36 a 37 después de verificar el historial. Se mantiene validación de checksums y drift, y la rama de clone/restore sigue bloqueada.
- Reinicio oculto del lanzador sin IA: supervisor PID 19192; logs start-20261104-after-migration.{out,err}. Pendientes health/readiness y pantalla de acceso.

## Arranque final comprobado

- Launcher listo, PID 19192, producto d8441c1. API y Next de desarrollo sobre checkout actual. IA externa desactivada, sin acceso a clave del proveedor ni generación real.
- GET API /api/v1/health/live y /api/v1/health/ready en 52170: HTTP 200. GET /sign-in en 52171: HTTP 200. Correo /readyz en 52169: HTTP 200. Web /api/v1/classrooms anónima: HTTP 401 esperado. Lecturas con timeout de 10 s y cuerpos descartados.
- Ego-browser Space 2/p1: acceso real renderizado con campos de correo/contraseña y botón Iniciar sesión. Espera inicial de input[type=email] agotó 10 s porque este control usa input[name=email], compatible con los buzones admitidos por el producto. Snapshot posterior confirmó formulario completo y selector correcto; no se cambió producto ni se inició sesión. Página conservada para el usuario al finalizar el Space.
- Next dev generó únicamente las dos rutas .next/dev en next-env.d.ts; se restituyó ese archivo generado al contenido Git previo, sin tocar cambios ajenos. Advertencia no bloqueante: lockfile externo pnpm ignorado por Next. Sin aceptación de build de producción ni suite funcional nueva.
- Servicios permanecen activos para pruebas manuales. URL http://127.0.0.1:52171/sign-in, correo capturado http://127.0.0.1:52169. Credenciales existentes conservadas; visor local documentado en la guía de demo, sin descifrado ni impresión por este agente.

## Handoff

Arranque completado. El usuario puede probar en http://127.0.0.1:52171/sign-in; API, Next y los cuatro servicios retenidos permanecen activos. Sin tareas pendientes dentro de este alcance. Para detener, usar el supervisor observado y sus procesos propios, preservando volúmenes/backup; no cerrar recursos ajenos. Sin seed/reset ni proveedor real. Stash intacto y registro propio local sin commit. El respaldo tiene índice validado, sin ensayo de restauración completa. No se verificó login ni operación académica autenticada en este arranque.

## Cierre posterior solicitado por el usuario

El usuario pidió «Cerra la app». Se verificaron supervisor 19192, árbol descendiente y listeners 52170/52171. Stop-Process se limitó a los nodos propios observados 48084, 16088 y 12236 tras verificar sus comandos; el supervisor cerró después, retirando operation.lock. `docker stop` de los cuatro contenedores exactos main-gemini (mail, scanner, s3, db) terminó con exit 0. No se cerró Docker Desktop ni servicios ajenos.

Comprobación final: cero procesos de esos IDs, cero listeners API/web y cero contenedores activos con la etiqueta de este entorno. Permanecen los tres volúmenes db-data/mail-data/s3-data y el backup before-library-retry-20261104-1793807785610.dump; no se eliminaron contenedores, datos ni archivos privados. Sin cambios de producto ni commits. Handoff vigente: aplicación detenida; el próximo arranque debe usar el lanzador retenido con guard de 37 migraciones y conservar este entorno.
