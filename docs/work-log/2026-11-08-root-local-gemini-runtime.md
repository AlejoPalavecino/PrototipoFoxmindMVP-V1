# Entorno local persistente con Gemini

- /root, orquestador; identidad de sesión no expuesta. 2026-11-08, main a4377e7, árbol inicial limpio.
- R1: el usuario autoriza completar configuración, levantar/reiniciar backend, verificar Foxy desde la plataforma con Gemini real y reutilizar la clave de raíz en futuros arranques de prueba.
- Alcance: entorno local nuevo y propio, datos sintéticos persistentes, API/web y servicios loopback. No datos retenidos anteriores ni despliegue. La clave permanece en `.env` ignorado; instrucciones futuras guardan sólo ubicación y preferencia, nunca el valor.
- Resultado previsto: comando recuperable de arranque/parada/reinicio que cargue `.env`, conserve servicios/datos/secretos locales y no sustituya Gemini por mocks. QA con ego-browser y recibo saneado. No generar otra clave si falta la configurada.
- Estado: preparando configuración y arranque; verificación/persistencia/reinicio pendientes.

## Implementación y controles iniciales

- `local:up/restart/stop/status` crean/reutilizan sólo el proyecto Docker propio y supervisor API/web. `.env` conserva la clave original, completa autenticación, DB, archivos, aulas, correo y orígenes; sin overrides de proveedores al arrancar API. `api:start` carga `.env` si existe. Accesos sintéticos y propietario quedan ignorados en `.test-artifacts/local-app/`.
- Preferencia de uso futuro registrada en AGENTS.md y guía de desarrollo local; no en Engram porque no hay identidad de sesión registrada disponible. No se almacena el valor de la clave.
- Pruebas de entorno: 2/2, incluida preservación de clave, quoting JSON, duplicados y rechazo de propietario ajeno. RED inicial detectó que JSON.stringify no era quoting válido para parseEnv; se corrigió con comillas compatibles. Sin llamadas externas en esas pruebas.
- Primer arranque: ClamAV rechazó CRLF de Windows (`Foreground yes`); se normalizan copias privadas a LF. Siguiente inicio levantó API pero el chequeo de readiness consultaba una ruta protegida y luego omitió el prefijo /api/v1; se corrigió a `/api/v1/health/ready`. Los intentos fallidos cerraron sólo sus procesos API/web, preservando datos/servicios propios. No hubo generaciones en estos fallos.
- Arranque final READY en web 3000/API 3001, PostgreSQL/SeaweedFS/ClamAV/Mailpit sanos. Prisma migrate deploy, builds API/web: salida 0. Lint/boundaries salida 0 (123 excepciones existentes).
- Inventario completo detectó tres pruebas Foxy de la entrega anterior sin ruta de ejecución, aunque figuraban en inventario; se agregaron a fast/owned-db según su frontera, sin retirar cobertura. `run-complete-suite.mjs --check`: 497 pruebas, 23 rutas; docs:check 60 archivos/682 enlaces/0 problemas. No se ejecuta la suite completa por tratarse de configuración/arranque local.
- Ego Lite: login de cuenta docente sintética y acceso real a Foxy; primera solicitud a Gemini en curso. Falta comprobar respuesta, fuentes/creación, persistencia y reinicio.

## Resultado comprobado

- Ego Lite sobre API/web de este checkout, composición normal de producción sin adapters inyectados: chat general respondido por Gemini, seguimiento recuerda los 40 minutos, contexto de aula con dos temas y un PDF seleccionados, apunte con referencias al plan y missingInformation vacío.
- Desde controles de la plataforma: abrir el recurso, seleccionar aula/título, preparar PDF, revisar, confirmar y publicar. Creaciones muestra Publicado o asignado, origen y destino efectivo Biblioteca de Fotografía y luz. Tres generaciones externas nuevas; no se usaron respuestas capturadas ni reintentos automáticos.
- `local-app.mjs restart` ejecutado y verificado: PID de API/web nuevos; claves Gemini/autenticación/aula, DATABASE_URL y archivo de cuentas idénticos. Builds y migraciones salida 0; no se recrearon cuentas ni datos. Recarga del navegador mantuvo sesión; Creaciones conservó destino y abrió el recurso con la publicación PUBLISHED.
- Verificación SQL de la base propia: tres turnos READY, modelo gemini-3.8-flash, un despacho por turno, tokens de entrada/salida positivos y una referencia del apunte; material publicado vigente. [Recibo saneado](../verification/local-gemini-runtime.json), sin transcripciones, credenciales ni URLs privadas. Capturas locales ignoradas en `.test-artifacts/local-app/foxy-gemini-real.png` y `foxy-gemini-after-restart.png`.
- Fallos de automatización conservados: selector textarea ambiguo después de abrir panel visual (no envió mensaje); click de recurso no resuelto por el viewport (abierto con foco/Enter); referencia de snapshot obsoleta después de preparación (se recuperó estado, sin preparar/publicar otra vez). No se atribuyen como fallos del proveedor ni del contenido. TaskSpace terminada conservando sólo la página de resultado para que el usuario continúe.
- Estado: entorno local activo en 127.0.0.1:3000 y API 3001, servicios propios persistentes. Las cinco herramientas siguen disponibles según configuración; este recorrido nuevo comprobó chat/apunte/publicación, sin repetir esquema/actividad/plan/rúbrica, sin imágenes ni certificación pedagógica. Tests locales 2/2, lint, builds, rutas de CI y documentación comprobados; no suite completa, commit, push o despliegue en esta tarea.
- Continuidad: próximos pedidos de levantar la app para probar usan `npm run local:up` o `local:restart` con la clave existente de raíz; preferencia en AGENTS.md y guía canónica. No hay acción pendiente para usar este entorno. Mantener `.env` y `.test-artifacts/local-app/` para conservar clave, cuentas e identidad del entorno propio.

## Publicación Git autorizada

El usuario solicita posteriormente commits, push e integración de todo a main, conservándola como única rama. Inicio de entrega: main y origin/main a4377e7, árbol con los 15 archivos de esta funcionalidad; ningún cambio ajeno observado. No se publica `.env`, credenciales, cuentas, configuración de Docker ni logs privados.

Preflight de entrega: fetch origin --prune salida 0; divergencia main/origin 0/0; única rama remota observada main. `node --test tests/local-app-environment.test.mjs`: 2/2; `docs:check`: 61 archivos/688 enlaces/0 problemas; `run-complete-suite.mjs --check`: 497 pruebas/23 rutas; `git diff --check`: salida 0. Escaneo exacto en los 15 archivos publicables: sin los secretos configurados, `.env` ignorado. Estado del supervisor local READY; no se reinicia ni se consumen nuevas generaciones para publicar código ya comprobado.

Unidad de implementación: arranque local persistente, carga de `.env`, pruebas de preservación/propiedad, comandos, instrucciones futuras y evidencia de Gemini. Incluye corrección de rutas de CI omitidas para tres pruebas Foxy de la entrega previa, conservando cobertura. Rollback: retirar los comandos/módulos de arranque y sus pruebas/documentación; no tocar `.env` ni eliminar datos o servicios persistentes. Una unidad documental posterior registrará SHA e integración/push observados. Aplicación de work-unit-commits; no PR ni despliegue.

## Publicación comprobada

- Implementación: `c48422bc2d0f2856617568fedbac6f249d12580c`, 15 archivos, 312 inserciones/2 eliminaciones; pruebas/documentación/evidencia junto al comportamiento.
- Rama propia `codex/local-gemini-publication` integrada con `git merge --ff-only` a main, desde a4377e7. `git push origin main`: salida 0; `git ls-remote --heads origin` confirmó exactamente c48422bc2d0f2856617568fedbac6f249d12580c en main, única rama remota observada.
- Rama temporal eliminada con `git branch -d` tras integración/publicación. Árbol limpio en main...origin/main antes de este recibo documental, que se publica como unidad posterior sin cambios de producto.
- La clave/configuración completa y los datos locales permanecen ignorados en este equipo; no se incluyeron en los commits. El supervisor seguía READY en esta comprobación. No se reinició la app ni hubo llamadas nuevas a Gemini por publicar Git. Sin despliegue ni tareas pendientes de integración.
