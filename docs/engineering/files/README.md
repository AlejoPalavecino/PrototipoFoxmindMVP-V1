# Archivos privados

La aplicaci√≥n conserva bytes en almacenamiento compatible con S3 y metadatos/custodia en PostgreSQL. El navegador usa el proxy de archivos; no recibe credenciales ni acceso directo al bucket.

## Ciclo de una carga

Crear metadatos y reservar cupo ‚Üí transmitir bytes ‚Üí validar formato/estructura ‚Üí escanear los mismos bytes ‚Üí confirmar disponibilidad ‚Üí asociar al recurso autorizado. Seleccionar o subir un archivo no confirma una entrega ni publica material.

Scopes draft/classroom y prop√≥sitos plan/instructions/material/attachment tienen autorizaciones diferentes. Instrucciones y adjuntos requieren destino real de actividad/intento. Ready exige carga completa, validaci√≥n y escaneo limpio coherentes con el digest.

## L√≠mites y conservaci√≥n

- Plan, Biblioteca, instrucciones y adjuntos de actividades, y adjuntos de chat admiten PDF, DOC, DOCX, PPT y PPTX hasta 20.000.000 bytes por archivo. El chat conserva seis adjuntos y 20.000.000 bytes acumulados por conversaci√≥n. Biblioteca conserva otros formatos ya permitidos con su l√≠mite de 50 MB y puede descargar documentos anteriores de mayor tama√±o.
- Las entregas admiten hasta cinco archivos por intento y conservan el l√≠mite de 50 MB por archivo para XLSX, JPG, PNG y ZIP, sujetos a la cuota disponible.
- La IA recibe PDF con p√°ginas y Office con texto extra√≠do. DOCX/DOC aportan texto del cuerpo y PPTX/PPT aportan texto de diapositivas en orden. Los elementos gr√°ficos requieren una fuente alternativa con texto.
- DOC y PPT requieren que el API local tenga Docker Linux y la imagen `foxmind-office-converter:local` creada con `docker build -t foxmind-office-converter:local config/office-converter`. El convertidor valida streams propios del formato y corre sin red ni montajes del host, con ra√≠z de s√≥lo lectura, un usuario sin privilegios y l√≠mites de tiempo, memoria y tama√±o. Se guarda y escanea el original. Si el convertidor no est√° disponible, la validaci√≥n requiere reintento y no llega a estado listo.
- PDF e im√°genes admiten vista previa seg√∫n navegador; Office/ZIP mantienen descarga. Ambos caminos requieren permisos actuales.
- Falta de espacio bloquea nuevas cargas, sin borrar historia ni denegar lecturas autorizadas. El cupo productivo no se decide desde un fixture.
- Archivos confirmados en borrador e intentos hist√≥ricos no caducan por la limpieza de uploads. S√≥lo cargas incompletas abandonadas pueden limpiarse tras 24 h de inactividad seg√∫n su servicio.
- Bytes de archivos confirmados son inmutables; revisar un material TEXT crea otra identidad. Quitar un adjunto del borrador no equivale a liberar espacio o borrar historia.

Contrato: [HTTP de archivos](../../api/files.md). Fuentes: [servicio Files](../../../apps/api/src/modules/files/), [puente acad√©mico](../../../apps/api/src/bootstrap/attachment-integration.ts), [modelo](../data-model.md). En la [verificaci√≥n actual](../../verification/flows.md), el PDF adjunto descargado mediante fetch autenticado coincidi√≥ byte por byte; el evento nativo de descarga de Ego no se acredit√≥.

## Custodia de adjuntos Foxy

`chat_attachments` identifica un objeto inmutable. `foxy_chat_attachment_links` registra la custodia independiente de cada conversaci√≥n docente con claves compuestas que conservan el propietario. La migraci√≥n `202611160001_foxy_attachment_links` incorpora los v√≠nculos de las filas anteriores cuando conversaci√≥n y propietario coinciden, preservando la revocaci√≥n previa y los registros hu√©rfanos para limpieza.

Conservar archivos al cambiar contexto crea el destino, los v√≠nculos al mismo objeto y el recibo idempotente en una transacci√≥n. El origen no se altera. El bloqueo del propietario serializa cargas, retiros y traslados; los bloqueos de objeto ordenados se comparten con limpieza. La cuota f√≠sica cuenta el objeto una vez y el l√≠mite por chat cuenta cada v√≠nculo. Las fuentes de generaci√≥n textual/visual y las citas revalidan el v√≠nculo de la conversaci√≥n efectiva.

La limpieza s√≥lo reclama un objeto sin custodios vigentes y marca `cleanup_claimed_at` antes de operar sobre almacenamiento. Revalida en una nueva sentencia despu√©s de tomar los bloqueos para evitar borrar un objeto que acaba de recibir un v√≠nculo. Un reclamo terminal no admite carga, lectura o traslado nuevo; los fallos f√≠sicos se reintentan sin perder la marca. El estudiante conserva la sem√°ntica existente de su conversaci√≥n y la copia independiente en carpeta.

Evidencia de esta unidad: [pruebas de custodia y carreras](../../../apps/api/src/modules/files/custody/infrastructure/tests/chat-attachment-transfer.test.mjs), [proxy binario](../../../tests/foxy-exact-attachment-transport.test.mjs) y [registro de implementaci√≥n](../../work-log/2026-11-16-astra-foxy-exact.md). PostgreSQL descartable y almacenamiento sint√©tico; no implican pruebas con datos retenidos o proveedor real.


## Capacidades del backend

- `uploads/application` gobierna admisiÛn, reserva, estado, uso y autorizaciÛn de recepciÛn; `uploads/presentation` conserva el handler HTTP ˙nico y sus lÌmites de transferencia. `authorizeReceive` devuelve sÛlo `{ expectedBytes }`, autoriza en una transacciÛn antes de escuchar el cuerpo y conserva el error de custodia. La recepciÛn vuelve a autorizar antes de cada mutaciÛn despuÈs de I/O.
- `downloads/application` define el puerto de lectura de contenido. La implementaciÛn comparte la custodia de bytes, los digests, el escaneo y la exclusiÛn de transferencias con uploads; dividirla en otro servicio romperÌa una responsabilidad que hoy es com˙n.
- `chat-attachments/domain` posee validaciÛn de intenciÛn, cantidad y tamaÒo del chat. Sus adaptadores SQL, traslados y limpieza permanecen bajo `custody/infrastructure`, donde comparten bloqueos y conservaciÛn de custodios con las integraciones durables.
- `custody/application` define permisos, transacciones, promociÛn y contratos de lectores. `custody/infrastructure` implementa store, almacenamiento, scanner, limpieza y los adaptadores documentales/privados. Los parsers Worker y conversiÛn Office quedan con este dueÒo concreto; no se exportan desde las APIs p˙blicas.

Las capacidades exponen exportaciones nombradas de aplicaciÛn/dominio desde `public.ts`; la entrada del mÛdulo conserva sus contratos p˙blicos. Las reglas comunes de archivo siguen en `files/domain`. Bootstrap construye los adaptadores. El HTTP no recibe el store ni filas SQL y conserva cÛdigos, lÌmites de bytes, timeout, concurrencia y cierre de cuerpos rechazados.

Pruebas focalizadas sin servicios externos: `node --experimental-transform-types --test apps/api/src/modules/files/uploads/application/*.test.mjs apps/api/src/modules/files/chat-attachments/domain/policy.test.mjs`. Las pruebas SQL y las dependientes de build/host requieren la aceptaciÛn integrada; este comando no las sustituye.
