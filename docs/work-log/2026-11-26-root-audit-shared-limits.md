# Cupos que un usuario no puede agotar para todos (S2–S5)

Coordinador /root, 2026-11-26, sesión sin identificador expuesto. Rama `main`, worktree principal, commit inicial `4b73223a`. El usuario eligió remediar S2–S5 de la [auditoría](2026-11-26-root-full-stack-audit.md) y aprobó los cupos que figuran en el [tablero](../../odd/tasks/audit-shared-limits.md). Sin autorización de commit al abrir este registro; el usuario autorizó después commit y push a `main` si las suites pasaban. No concede despliegue.

## Qué cambió

- **S2.** Fuera de desarrollo local (`AUTH_LOCAL_HTTP=true`), la API no arranca sin `FOXMIND_PROXY_CLIENT_KEY`. Sin esa clave, la API sólo ve la dirección del servidor web y todos los cupos por IP pasan a ser uno. [Configuración](../../apps/api/src/modules/identity/accounts/infrastructure/security/configuration.ts).
- **S3.** Un cupo compartido del proceso (`createTransferGate`, 8 simultáneas y 2 por cuenta) reemplaza la bandera global de la biblioteca, que admitía una sola transferencia en toda la plataforma, y los topes globales de 4 de adjuntos y de carpetas de estudio. Lo crea la composición y lo comparten los tres transportes; cada uno toma lugar sólo para subir o descargar bytes, con la cuenta ya autenticada. Un cuerpo que pasa 5 s sin datos se corta, también en estudio, donde una subida podía ocupar su lugar hasta 120 s. Los topes de pedidos simultáneos de adjuntos y carpetas pasaron de 4 a 16, como los demás transportes. [Cupo](../../apps/api/src/platform/http/transfer-gate.ts) · [biblioteca](../../apps/api/src/modules/files/uploads/presentation/http.ts) · [adjuntos](../../apps/api/src/bootstrap/chat-attachment-transport.ts) · [estudio](../../apps/api/src/modules/study/folders/presentation/uploads/http.ts).
- **S4.** Login y recuperación cuentan por correo+IP (`identifierPerIp`: 10 y 3 cada 15 min) y por correo desde cualquier IP (`identifier`: 100 y 10). El cupo de login por IP subió de 30 a 300 cada 15 min, porque una escuela entera puede compartir una dirección y ese cupo cuenta también los ingresos exitosos. Un login exitoso o un restablecimiento libera el techo por correo y el cupo correo+IP de esa dirección. `AUTH_RATE_LIMITS_JSON` acepta el campo nuevo. [Runtime](../../apps/api/src/modules/identity/accounts/application/runtime.ts).
- **S5.** Cada alumno tiene 20 códigos de aula fallidos cada 10 min. El tope global de 300 sólo cuenta y aplica a códigos de 6 dígitos; los de 8 caracteres no se pueden adivinar por fuerza bruta y no quedan bloqueados para todos. [Operaciones](../../apps/api/src/modules/classrooms/memberships/application/membership-code-operations.ts).
- Guías actualizadas: [identidad](../engineering/identity/README.md), [aulas](../engineering/classrooms/README.md) y [archivos](../engineering/files/README.md).

## Comprobaciones

| Hallazgo | Prueba | RED | GREEN |
| --- | --- | --- | --- |
| S2 | `p33-identity-security.test.mjs` y escenario de arranque en `p33-identity-http.test.mjs` | la configuración aceptaba la falta de clave | 15/15; HTTP 23/23 |
| S3 | `receive-http.test.mjs` y `upload-ordering.test.mjs` | el módulo del cupo no existía | 6/6 y 5/5 |
| S4 | `runtime.test.mjs` y prueba HTTP con direcciones firmadas | sin balde correo+IP y liberación sin IP | 7/7; HTTP 23/23 |
| S5 | `membership-behavior.test.ts` y `p5-codes-invitation-batches.test.mjs` (Postgres) | la interfaz por alumno no existía | 4/4 y 11/11 |

`npm run api:build` y `npm run lint:boundaries` pasaron. Se ajustaron pruebas que fijaban los valores anteriores: el techo por correo en `p33-identity-security`, la configuración amplia de `p33-recovery` y el doble de admisión de `study-runtime`. La primera corrida de `owned-db` falló en `p5-codes-invitation-batches`, que exigía el contrato anterior (fallos de 8 caracteres en el tope global y un código válido bloqueado para todos); se reescribió con el contrato aprobado y se repitió la suite completa.

Suites integradas con `npm run test:complete -- --group <grupo>`: `fast` 3222/3222, `owned-db` 960/960 (segunda corrida completa) y `wrappers` 19/19 completos (no informan conteos individuales). `npm run docs:check`: 0 problemas. Tablero: `taskboard.py check` válido, cuatro tareas DONE.

## Límites

- El RED de S3 fue la ausencia del módulo, no una corrida del transporte anterior. Restaurar sólo el transporte de estudio no compila, porque la composición ya le pasa el cupo nuevo.
- Los valores (8 y 2 transferencias, 300 por IP) no se midieron con carga real ni con la memoria del servidor de destino.
- Una vez agotados, los cupos correo+IP de otras direcciones no se liberan con un login exitoso, porque se guardan como digest y no se pueden enumerar: vencen con su ventana.
- El reenvío de verificación (`verification-resend`) todavía cuenta sólo por correo: con 5 pedidos por hora se puede demorar el reenvío de otra persona. Quedó fuera de este corte.
