# Ejecutar FoxMind en local

Requisitos del repositorio: Node 24, npm/lockfile y Docker Desktop con motor Linux. La aplicación usa Next, API Nest, PostgreSQL, almacenamiento privado compatible con S3, ClamAV y Mailpit. No basta iniciar una web sin API/servicios para afirmar un recorrido integrado.

## Retomar el caso de Marina Demo

El caso está guardado en los volúmenes persistentes del entorno local de este equipo. Para retomarlo:

1. Abrí Docker Desktop. Desde la raíz de `ProtipoFoxMind`, ejecutá `npm run local:up`. Cuando `npm run local:status` indique `READY`, abrí [FoxMind local](http://127.0.0.1:3000).
2. **Como docente**, ingresá con `teacherEmail` y `password` de `.test-artifacts/local-app/accounts.json`. En **Inicio → Semáforo de acompañamiento**, filtrá por **Taller de escritura fotográfica · Prueba Gemini** y abrí la ficha de **Marina Demo**. También podés entrar por **Mis aulas → Taller de escritura fotográfica · Prueba Gemini → Estudiantes → Ver ficha**.
3. **Como Marina**, usá una ventana privada e ingresá con `studentEmail` y `password` del mismo archivo. La carpeta es **Mi Estudio → Encuadres de Marina · Prueba de estrategia**. En **Opciones de la carpeta → Compartir estrategia** podés repetir el recorrido. La última prueba terminó con la estrategia retirada. [Registro del recorrido en Ego Lite](../../work-log/2026-11-19-root-ego-estrategia.md).
4. Al terminar, ejecutá `npm run local:stop` y comprobá que `npm run local:status` indique `STOPPED`. Así se conservan la base, la carpeta y las entregas para el siguiente arranque.

**Cómo reconocer el caso.** El 19/11/2026 Marina tenía dos entregas calificadas: *Luz lateral y textura* (9) y *El encuadre de una escena* (7). El promedio era 8. *Justificar el punto de vista* estaba pendiente desde el 17/11 y la prioridad era media. El semáforo se recalcula según la fecha de consulta, por lo que el color puede cambiar aunque se conserven las entregas. En la ficha, **Análisis de escritura** permite consultar el informe de Gemini mientras siga vigente. Consultarlo no consume cuota adicional.

## Entorno descartable de revisión

1. Instalar dependencias según lockfile si el equipo aún no las tiene, mediante npm ci.
2. Compilar API con node scripts/build-api.mjs; el supervisor propio conserva 30 s totales.
3. Compilar la web con npm run web:build; para aceptación supervisar el límite 180 s.
4. Ejecutar node scripts/documentation-preview.mjs. Usa recursos nuevos y puertos loopback, aplica migraciones a su base vacía y crea dos identidades sintéticas y un aula.
5. Abrir el origen que imprime el helper con Ego Lite. Las credenciales sintéticas están sólo en el fixture privado ignorado cuya ruta imprime; no copiarlas a documentación/capturas.
6. Presionar Enter o crear el stopFile propio impreso para detener. Comprobar salida y limpieza; nunca usar prune o eliminar volúmenes ajenos.

La IA del helper es sintética e inyectada; no lee archivos de claves ni llama a proveedores externos. Análisis individual y corrección IA tienen proveedores no disponibles para impedir una llamada accidental. Las pruebas que necesiten esas ramas deben preparar un override explícito y declararlo.

## Arranque habitual para pruebas con Gemini real

Antes de detener la instancia o preparar servicios, `local:up` y `local:restart` comparan la versión instalada de Next con el lockfile del checkout. Si difieren, ejecutá `npm ci` desde la raíz y volvé a iniciar la app.

Por pedido del usuario, cuando solicite levantar la app para probar se usa la clave ya configurada en `.env` de raíz, con Gemini real. No regenerar ni copiar esa clave a código, documentación o variables NEXT_PUBLIC. Si falta, solicitar restaurarla. Las suites automatizadas y el helper documental anterior siguen siendo sintéticos; no consumen API por defecto.

- `npm run local:up`: configura infraestructura local propia, aplica migraciones a esa base, compila API/web y arranca ambas en segundo plano. Web: `http://127.0.0.1:3000`; API: `http://127.0.0.1:3001`.
- `npm run local:restart`: detiene únicamente los procesos API/web del supervisor propio y vuelve a compilar/arrancar con `.env` vigente. No borra base, archivos, cuentas ni clave.
- `npm run local:status`: consulta el estado del supervisor de API/web. `npm run local:stop`: detiene API/web y los contenedores Docker propios, conservando contenedores, volúmenes, datos y configuración para el próximo arranque. También apaga los servicios si API/web ya estaban detenidas. Valida el propietario antes de detener contenedores y no modifica otros proyectos Docker. Si Docker no está disponible, informa el fallo en lugar de confirmar un cierre completo.

La compilación API de `local:up` y `local:restart` usa `node scripts/local-api-build.mjs`: 90 s totales compartidos entre generación Prisma y TypeScript estricto, siempre en ese orden y una vez por invocación, sin caché ni reuso. Un fallo o deadline agotado impide continuar. El wrapper permite 95 s: 90 s de trabajo y 5 s de margen para inicio/salida del proceso, no un segundo presupuesto de compilación. Los demás comandos conservan sus límites. Agotar el presupuesto no autoriza reintentar ni aumentarlo automáticamente.

`node scripts/build-api.mjs` (también `npm run api:build`) mantiene 30 s totales por defecto. Ambos scripts aceptan sólo `--help` o ningún argumento; no hay flag de presupuesto ni override de entorno. El adaptador local reutiliza `buildApi({ root, run, budgetMs, now })`; `budgetMs` es un entero seguro positivo (30.000 ms por defecto), y `run`/`now` permiten pruebas sintéticas sin ejecutar herramientas reales.

El propietario y puertos persistentes se registran en `.test-artifacts/local-app/owner.json`; la configuración completa queda en `.env`. Docker usa un proyecto propio `foxmind-local-<id>` con PostgreSQL, SeaweedFS, ClamAV y Mailpit, publicado sólo en loopback. No reutiliza la antigua copia P3/P4 ni opera sobre sus volúmenes. El arranque rechaza otra DATABASE_URL y puertos web/API ocupados, en lugar de detener procesos desconocidos. Los archivos de ClamAV se normalizan a LF en el directorio privado para funcionar desde Windows.

El primer arranque crea cuentas/aula sintéticas y guarda el acceso en `.test-artifacts/local-app/accounts.json`, ignorado. No recrea cuentas ni cambia secretos en reinicios. No publicar el contenido de ese archivo. No eliminar `.env` ni el directorio local para reiniciar: contienen secretos e identidad de los recursos persistentes. `npm run api:start` también carga `.env` si existe; requiere servicios configurados y API compilada.

Ejecutá los comandos desde el checkout que querés probar. Para usar ambos roles a la vez, abrí una ventana privada para uno de ellos. Detené la instancia propia antes de reconstruir `.next` para que las páginas abiertas no queden apuntando a chunks de la compilación anterior.

Las llamadas de Foxy usan los adaptadores reales, sin overrides. La habilitación compartida AI_ENABLED también queda disponible para las otras familias de IA al solicitarlas desde la app. Un arranque no realiza generaciones de prueba por sí solo. El presupuesto es un control estimado interno; no es un tope de facturación del proveedor. [Registro de activación y QA](../../work-log/2026-11-08-root-local-gemini-runtime.md).

## Perfiles IA y transición de pendientes

El comportamiento habitual conserva Gemini y las variables `AI_MODEL`, límites y tarifas existentes. `AI_TEXT_PROFILES_JSON` permite sobrescribir por tarea textual el proveedor/modelo, versión de perfil, límites/plazo y tarifas. Las claves de tarea y los campos admitidos están en la [guía de configuración](../ai/README.md#configurar-perfiles-textuales); no configura visuales. Cambiar proveedor o modelo exige declarar `inputUsdPerMillion` y `outputUsdPerMillion`, sin precios inferidos.

Claude es opt-in: requiere `AI_ANTHROPIC_ENABLED=true`, `AI_ANTHROPIC_API_KEY` y un perfil `provider: "anthropic"` con modelo y tarifas. Una clave sin habilitación no se usa. La base Gemini sigue siendo obligatoria; omitir Anthropic no impide trabajar con Gemini. Guardar claves sólo en la configuración privada existente, nunca en JSON de perfiles, registros o variables públicas. Configurar estos valores no autoriza una prueba paga por sí mismo.

Antes de actualizar un destino autorizado a la versión con política persistente:

1. Conservar la versión y configuración Gemini anteriores; evitar nuevas solicitudes IA y dejar terminar sus trabajos `QUEUED`/`RUNNING` en extracción, actividades, análisis, corrección, Foxy y Estudio. No inferir el modelo histórico desde una configuración recién modificada.
2. Detener los ejecutores anteriores tras el drenaje. Aplicar la migración versionada sólo al destino autorizado, siguiendo la [guía de migraciones](database.md). Si ya está aplicada, `SELECT foxmind_ai_legacy_pending();` debe devolver `false` antes del primer arranque de la nueva política.
3. Iniciar la nueva versión. Antes de arrancar workers, la API crea `ai_execution_policy` con baseline inmutable y perfiles activos validados. Si quedan pendientes NULL y todavía no existe política, el arranque falla con `AI_LEGACY_PENDING`; restaurar el orden de drenaje, sin rellenar snapshots ni eliminar trabajos para eludirlo.
4. Para un cambio posterior de perfiles, mantener el baseline persistido y verificar ausencia de pendientes legacy. Los trabajos nuevos guardan el perfil activo; los existentes conservan su snapshot y tarifas. Un proveedor incompatible o sin configuración válida falla explícitamente, sin fallback.

`execution_profile` contiene identidad técnica, límites y tarifas; no contiene claves, prompts, archivos ni respuestas. El marcador de conexión `application_name=foxmind-api-ai-execution-v1` evita escrituras accidentales de ejecutores incompatibles sobre trabajos con snapshot. No autentica una sesión SQL ni reemplaza permisos de base; no se debe usar cambiar el marcador como procedimiento de upgrade.

El arranque inicial de la política de perfiles se verificó el 16 de noviembre en el checkout principal. Para una instalación existente, seguí además el corte contable de la cuota mensual. Las suites aisladas verifican contratos y consumo con SDK y transportes sintéticos. [Verificación del arranque de la política](../../work-log/2026-11-16-root-ai-runtime-publication.md#actualización-local-posterior-autorizada--completada) · [Corte y conciliación mensual](../ai/README.md#cuota-mensual-por-cuenta).

## Desarrollo con datos a conservar

Identificar y autorizar por separado base, bucket, escáner, correo y claves. Configurar nombres de variables de identidad, archivos, aulas y web según sus módulos; no buscar credenciales retenidas ni ejecutar helpers históricos para recuperarlas.

API recibe DATABASE_URL y orígenes/flags en su entorno. Web recibe FOXMIND_API_ORIGIN sólo en servidor. Web y API comparten el secreto de servidor FOXMIND_PROXY_CLIENT_KEY (base64url, al menos 32 bytes), que permite aplicar los límites por IP a cada cliente y no a la dirección del servidor web; el arranque local lo genera con las demás claves en `.env` y lo pasa a la web (ver [identidad](../identity/README.md)). APP_ORIGIN debe ser el origen exacto de la web; localhost y127.0.0.1 son distintos. No exponer claves en NEXT_PUBLIC ni pegar valores en registros.

Arrancar la API no migra la base. Usar [migraciones](database.md) sólo sobre el destino autorizado. Mailpit local captura; no envía correo a destinatarios reales.

Fuentes: [configuración](../../../apps/api/src/bootstrap/configuration.ts), [composición](../../../apps/api/src/bootstrap/application.ts), [scripts](../../../package.json). [Comprobaciones actuales](../../verification/README.md).
