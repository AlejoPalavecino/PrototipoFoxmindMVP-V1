# Auditoría del contrato Agenda — T3 / S4

## Alcance y punto de partida

- Agente: escritor delegado de implementación Agenda; identificador de sesión no expuesto.
- Fecha del registro: 2026-11-13. Rama: `fix/architecture-audit`; worktree: raíz del repositorio; commit inicial: `95fef894becd8de082e8c9f61235c6d0a0a213f8`.
- Autorización: «Bien resolve entonces esos 4 hallazgos», delegación T3 y S4 de `odd/tasks/architecture-audit-remediation.md`, leído hasta `## Log` antes de editar.
- Objetivo: conectar solicitudes del cliente Agenda real con transporte/servicio reales, usando identidad y almacenamiento sintéticos en memoria. Sin cambios de producto, generación de cliente, DB, secretos, proveedores, Git de escritura ni publicación.
- Superficies propias: pruebas `tests/agenda-{client,http,contracts,client-http}.test.mjs`, guía `docs/engineering/agenda/README.md` y este registro. Tarea/mirror/roadmap pertenecen al coordinador.
- Árbol inicial: sólo registros ajenos sin seguimiento `docs/work-log/2026-architecture-audit-root.md` y `odd/tasks/architecture-audit-remediation.md`; se preservan.

## Plan de evidencia

Las pruebas actuales verifican cada lado por separado: cliente con respuestas simuladas y HTTP con servicio simulado. El nuevo puente usará `createWebAgendaClient`, `installAgendaTransport`, admisión/CSRF de identidad y `createAgendaService`; sólo los puertos de persistencia/identidad tendrán datos en memoria, siguiendo las convenciones de `agenda-events.test.mjs` y `agenda-http.test.mjs`. Las fixtures existentes son locales, no exportadas; no se modificarán sus superficies fuera del alcance.

Es caracterización de contratos existentes: puede pasar desde la primera ejecución. No se inventará RED ni se cambiará producción para producirlo. Verificación autorizada: `node --test tests/agenda-client.test.mjs tests/agenda-http.test.mjs tests/agenda-contracts.test.mjs tests/agenda-client-http.test.mjs`.

## Resultado

- Primera ejecución de `node --test tests/agenda-client.test.mjs tests/agenda-http.test.mjs tests/agenda-contracts.test.mjs tests/agenda-client-http.test.mjs`: exit 1; 16 pruebas, 15 PASS, 1 FAIL. Falló `real Agenda admission and client preserve auth/verification/owner/Origin/CSRF errors without mutation`: `SERVICE_UNAVAILABLE` observado en lugar de `ORIGIN_NOT_ALLOWED`.
- Causa de fixture: `loadTsModule` tiene caché por invocación. Configuración y transporte cargaban clases `IdentitySecurityError` distintas; el `instanceof` de `publicIdentityError` no reconocía la excepción real. Primera corrección: compartir los módulos reales de errores mediante los puntos de inyección del cargador, sin reemplazar sus validadores ni cambiar la expectativa. No es evidencia de bug productivo.
- Segunda ejecución del mismo comando tras la corrección: exit 0; 16 pruebas, 16 PASS, 0 FAIL/SKIP, 4305.7569 ms. No hubo fallo intencional de producto (excepción de caracterización a RED); el primer fallo fue de fixture.
- Autorrevisión añadió estados exactos de éxito, rechazo de escritura sin correo verificado y comprobación de argumentos del puerto académico. Tercera ejecución del mismo comando: exit 0; 16/16 PASS, 4798.037 ms. Ejecución final tras fijar argumentos académicos: exit 0; 16/16 PASS, 0 FAIL/SKIP, 4370.6862 ms.
- Cuatro pruebas conectadas nuevas; doce pruebas existentes preservadas sin cambios. Se comprueban payloads all-day/timed, serie semanal, las tres categorías, título normalizado, texto plano, color omitido/expreso, CRUD con DELETE 204 vacío, PUT idempotente, revisión string, conflictos 409, entrada inválida 400 y errores de autorización 401/403 con códigos exactos. Después de rechazos se consultan evento y colección mediante el cliente público para comprobar payload, timestamps, revisión y conteo; no se inspeccionan filas privadas desde las aserciones.
- Cliente/CSRF, transporte instalado/admisión/validadores y servicio son reales; no se editó producción ni se generó cliente. El UoW/repositorio en memoria modela propiedad y CAS, no acredita atomicidad SQL ni reautenticación transaccional. No se prueban proxy Next, montaje Nest, sesiones persistidas, paginación, excepciones por ocurrencia ni todas las variantes de calendario; la guía delimita esta evidencia.
- `git diff --check`: exit 0. Autorrevisión de S4, pruebas y documentación completada. Se preservan cambios concurrentes de otros escritores en runtime y DB; este escritor sólo cambió las tres rutas de la entrega. Sin scratch/cache generado por estas pruebas; servidores de loopback cerrados en `finally`. No se ejecutaron builds, suite completa, docs:check ni revisión independiente (no delegados).
- Estado: T3/S4 implementado y verificado localmente; sin commits propios, integración, publicación ni despliegue. No quedan requisitos vinculados S4 sin cubrir dentro del alcance delegado. Primer paso pendiente del coordinador: reconciliar esta evidencia con T4 y resolver revisión/disposición del candidato.
