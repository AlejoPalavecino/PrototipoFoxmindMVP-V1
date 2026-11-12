# Ejecutar FoxMind en local

Requisitos del repositorio: Node 24, npm/lockfile y Docker Desktop con motor Linux. La aplicación usa Next, API Nest, PostgreSQL, almacenamiento privado compatible con S3, ClamAV y Mailpit. No basta iniciar una web sin API/servicios para afirmar un recorrido integrado.

## Entorno descartable de revisión

1. Instalar dependencias según lockfile si el equipo aún no las tiene, mediante npm ci.
2. Compilar API con node scripts/build-api.mjs; el supervisor propio conserva 30 s totales.
3. Compilar la web con npm run web:build; para aceptación supervisar el límite 180 s.
4. Ejecutar node scripts/documentation-preview.mjs. Usa recursos nuevos y puertos loopback, aplica migraciones a su base vacía y crea dos identidades sintéticas y un aula.
5. Abrir el origen que imprime el helper con Ego Lite. Las credenciales sintéticas están sólo en el fixture privado ignorado cuya ruta imprime; no copiarlas a documentación/capturas.
6. Presionar Enter o crear el stopFile propio impreso para detener. Comprobar salida y limpieza; nunca usar prune o eliminar volúmenes ajenos.

La IA del helper es sintética e inyectada; no lee archivos de claves ni llama a proveedores externos. Análisis individual y corrección IA tienen proveedores no disponibles para impedir una llamada accidental. Las pruebas que necesiten esas ramas deben preparar un override explícito y declararlo.

## Arranque habitual para pruebas con Gemini real

Por pedido del usuario, cuando solicite levantar la app para probar se usa la clave ya configurada en `.env` de raíz, con Gemini real. No regenerar ni copiar esa clave a código, documentación o variables NEXT_PUBLIC. Si falta, solicitar restaurarla. Las suites automatizadas y el helper documental anterior siguen siendo sintéticos; no consumen API por defecto.

- `npm run local:up`: configura infraestructura local propia, aplica migraciones a esa base, compila API/web y arranca ambas en segundo plano. Web: `http://127.0.0.1:3000`; API: `http://127.0.0.1:3001`.
- `npm run local:restart`: detiene únicamente los procesos API/web del supervisor propio y vuelve a compilar/arrancar con `.env` vigente. No borra base, archivos, cuentas ni clave.
- `npm run local:status`: consulta el estado del supervisor de API/web. `npm run local:stop`: detiene API/web y los contenedores Docker propios, conservando contenedores, volúmenes, datos y configuración para el próximo arranque. También apaga los servicios si API/web ya estaban detenidas. Valida el propietario antes de detener contenedores y no modifica otros proyectos Docker. Si Docker no está disponible, informa el fallo en lugar de confirmar un cierre completo.

La compilación API de `local:up` y `local:restart` usa `node scripts/local-api-build.mjs`: 90 s totales compartidos entre generación Prisma y TypeScript estricto, siempre en ese orden y una vez por invocación, sin caché ni reuso. Un fallo o deadline agotado impide continuar. El wrapper permite 95 s: 90 s de trabajo y 5 s de margen para inicio/salida del proceso, no un segundo presupuesto de compilación. Los demás comandos conservan sus límites. Agotar el presupuesto no autoriza reintentar ni aumentarlo automáticamente.

`node scripts/build-api.mjs` (también `npm run api:build`) mantiene 30 s totales por defecto. Ambos scripts aceptan sólo `--help` o ningún argumento; no hay flag de presupuesto ni override de entorno. El adaptador local reutiliza `buildApi({ root, run, budgetMs, now })`; `budgetMs` es un entero seguro positivo (predeterminado30000), y `run`/`now` permiten pruebas sintéticas sin ejecutar herramientas reales.

El propietario y puertos persistentes se registran en `.test-artifacts/local-app/owner.json`; la configuración completa queda en `.env`. Docker usa un proyecto propio `foxmind-local-<id>` con PostgreSQL, SeaweedFS, ClamAV y Mailpit, publicado sólo en loopback. No reutiliza la antigua copia P3/P4 ni opera sobre sus volúmenes. El arranque rechaza otra DATABASE_URL y puertos web/API ocupados, en lugar de detener procesos desconocidos. Los archivos de ClamAV se normalizan a LF en el directorio privado para funcionar desde Windows.

El primer arranque crea cuentas/aula sintéticas y guarda el acceso en `.test-artifacts/local-app/accounts.json`, ignorado. No recrea cuentas ni cambia secretos en reinicios. No publicar el contenido de ese archivo. No eliminar `.env` ni el directorio local para reiniciar: contienen secretos e identidad de los recursos persistentes. `npm run api:start` también carga `.env` si existe; requiere servicios configurados y API compilada.

Para revisar Mis aulas, el entorno activo del 2026-11-11 pertenece al worktree `FoxMind-classrooms-ux`, rama `codex/classrooms-ux-unification`. Ejecutar sus comandos locales desde ese directorio. Tiene cuentas docente/estudiante y recursos propios; no comparte la base ni las conexiones del checkout original. Los puertos web/API siguen siendo 3000/3001, por lo que no debe iniciarse otra instancia en esos puertos a la vez. Para probar ambos roles simultáneamente, usar una ventana privada para uno de ellos. No reconstruir `.next` mientras se ejecutan recorridos E2E sobre ese build: las páginas abiertas conservarían referencias a chunks del build anterior.

Las llamadas de Foxy usan los adaptadores reales, sin overrides. La habilitación compartida AI_ENABLED también queda disponible para las otras familias de IA al solicitarlas desde la app. Un arranque no realiza generaciones de prueba por sí solo. El presupuesto es un control estimado interno; no es un tope de facturación del proveedor. [Registro de activación y QA](../../work-log/2026-11-08-root-local-gemini-runtime.md).

## Desarrollo con datos a conservar

Identificar y autorizar por separado base, bucket, escáner, correo y claves. Configurar nombres de variables de identidad, archivos, aulas y web según sus módulos; no buscar credenciales retenidas ni ejecutar helpers históricos para recuperarlas.

API recibe DATABASE_URL y orígenes/flags en su entorno. Web recibe FOXMIND_API_ORIGIN sólo en servidor. APP_ORIGIN debe ser el origen exacto de la web; localhost y127.0.0.1 son distintos. No exponer claves en NEXT_PUBLIC ni pegar valores en registros.

Arrancar la API no migra la base. Usar [migraciones](database.md) sólo sobre el destino autorizado. Mailpit local captura; no envía correo a destinatarios reales.

Fuentes: [configuración](../../../apps/api/src/bootstrap/configuration.ts), [composición](../../../apps/api/src/bootstrap/application.ts), [scripts](../../../package.json). [Comprobaciones actuales](../../verification/README.md).
