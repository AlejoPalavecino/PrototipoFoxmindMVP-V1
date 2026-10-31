# Desarrollo local

Prepara un entorno propio y usa la [operación local](operation.md) como guía principal. El [estado actual](../../implementation-roadmap.md#estado-actual) distingue lo verificado de la preparación de un piloto.

## Recorrido de arranque

1. Identifica los recursos que vas a usar y su propietario: base, correo capturado y, si habilitas aulas, almacenamiento privado y escáner. Los recursos retenidos, el checkout P3 original y los volúmenes de desarrollo no son fixtures desechables. Sigue los límites de [operación](operation.md#choose-an-owned-local-environment-first).
2. Con Node 24 y las dependencias del lockfile ya disponibles, configura en el entorno de proceso la base y la [identidad](../identity/http.md#startup-without-environment-files); para aulas habilita además los componentes documentados en [archivos](../files/host.md) y [aulas](../classrooms/host.md). La [base de datos](database.md) explica el aprovisionamiento y las migraciones separadas: arrancar la API no las ejecuta.
3. Configura el correo local y el origen web exacto. Los secretos permanecen en el entorno aprobado; no los escribas en ejemplos, archivos o registros. [Correo local](local-email.md) y [configuración](operation.md#configuration-ownership) detallan cada responsabilidad.
4. Compila la API y la web y arráncalas en terminales separadas según la secuencia de [operación local](operation.md#configuration-ownership): `npm run api:start` para la API y `npm run web:start` para Next. Configura `FOXMIND_API_ORIGIN` solo en el servidor web. Para HTTP loopback, la API valida `AUTH_LOCAL_HTTP` y su propio `NODE_ENV`; el entorno del proceso Next es independiente.
5. Abre el origen configurado. La cuenta verificada llega ordinariamente a `/inicio`; invitaciones y destinos explícitos permitidos conservan sus flujos. Salud y disponibilidad de base no demuestran que el recorrido académico esté completo.

La [guía backend](backend.md) describe las opciones y comprobaciones; la [cuenta de demostración](demo-account.md) documenta un entorno persistente distinto, que no se trata como fixture desechable.
