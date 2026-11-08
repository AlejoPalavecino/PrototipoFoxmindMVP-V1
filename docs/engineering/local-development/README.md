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

## Desarrollo con datos a conservar

Identificar y autorizar por separado base, bucket, escáner, correo y claves. Configurar nombres de variables de identidad, archivos, aulas y web según sus módulos; no buscar credenciales retenidas ni ejecutar helpers históricos para recuperarlas.

API recibe DATABASE_URL y orígenes/flags en su entorno. Web recibe FOXMIND_API_ORIGIN sólo en servidor. APP_ORIGIN debe ser el origen exacto de la web; localhost y127.0.0.1 son distintos. No exponer claves en NEXT_PUBLIC ni pegar valores en registros.

Arrancar la API no migra la base. Usar [migraciones](database.md) sólo sobre el destino autorizado. Mailpit local captura; no envía correo a destinatarios reales.

Fuentes: [configuración](../../../apps/api/src/configuration.ts), [composición](../../../apps/api/src/application.ts), [scripts](../../../package.json). [Comprobaciones actuales](../../verification/README.md).
