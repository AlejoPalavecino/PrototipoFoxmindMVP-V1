# Contrato HTTP de archivos privados

createFilesHandler(service) se integra al host Nest con configuración de archivos, sesión/admisión y puente de autorización por registro. [Dominio de archivos](../engineering/files/README.md). No hay ruta anónima, pública, presignada ni acceso S3 directo; el adaptador de acceso recibe la solicitud original.

| Método/ruta | Entrada | Éxito |
|---|---|---|
| POST /files | JSON {scope:{kind,id},purpose,name,bytes,targetId?} | 201, estado y reserva de cuota |
| PUT /files/:id/content | application/octet-stream; Content-Length admitido exacto | 200 tras validación durable y escaneo limpio |
| GET /files/:id | Sin cuerpo/query | 200, estado actual |
| GET /files/:id/content?mode=download | mode opcional download o preview | 200, bytes autorizados y headers seguros |
| GET /files/usage?kind=classroom&id=… | Un único kind/id; también admite draft | 200, uso/cuota/disponible como cadenas decimales |

IDs UUID. Propósitos: plan/instructions/material/attachment. Instructions/attachment requieren targetId de actividad/intento realmente autorizado; draft sólo admite plan. Campos desconocidos, parámetros duplicados, cuerpos comprimidos, metadata inválida y cuerpos GET se rechazan. Metadata limitada a 16 KiB; transferencia limitada a los bytes admitidos, plazo absoluto de recepción de 10 segundos y un único slot de transferencia por handler. No hay cola de cargas ilimitada.

Las cargas de PDF, DOC, DOCX, PPT y PPTX admiten hasta 20.000.000 bytes por archivo para todos los propósitos. Materiales y adjuntos de entrega conservan el límite de 50.000.000 bytes para XLSX, JPG, JPEG, PNG y ZIP. La extensión declarada debe coincidir con la estructura y el MIME detectados. La disponibilidad para asociar o descargar y la disponibilidad como fuente con texto para IA se evalúan por separado. Los adjuntos privados de chat conservan el límite de seis archivos y 20.000.000 bytes acumulados por conversación.

El estado contiene id/name/sizeBytes/ready/upload/validation/scan/rejectionCode. No incluye keys, URLs de objeto, credenciales, tokens ni firmas. Ready exige carga completa y prueba de digest aprobado/limpio coincidente. Un archivo en cuarentena no se descarga ni vincula. Reintentar exige bytes idénticos; no sobrescribe el archivo.

Respuestas no-store/nosniff. Contenido con longitud exacta, disposición RFC5987, política same-origin y CSP sandbox. PDF/JPEG/PNG pueden mostrarse inline; Office/ZIP son adjuntos incluso con preview. La UI ofrece descarga si no hay visor disponible, según el cliente vigente.

Errores JSON {error:{code}}, sin texto interno de drivers, parsers o escáner.

| HTTP | Códigos |
|---|---|
| 400 | INVALID_UPLOAD |
| 403 | FORBIDDEN |
| 404 | NOT_FOUND |
| 409 | FILE_NOT_READY, UPLOAD_CONFLICT, QUOTA_EXCEEDED |
| 413 | FILE_TOO_LARGE |
| 415 | FILE_TYPE_NOT_ALLOWED |
| 422 | FILE_REJECTED |
| 503 | SERVICE_UNAVAILABLE, con Retry-After positivo |

Agotar cuota conserva lecturas autorizadas. Fallar almacenamiento/escáner no confirma éxito ni libera cuota especulativamente. Limpieza interna acotada; no hay ruta HTTP de limpieza/delete. Borradores confirmados e historia se conservan. Cookie, sesión, CSRF y autorización por registro siguen siendo obligatorios.

## Entrega de respuesta acotada

Un handler comparte un slot entre cargas PUT y respuestas GET de contenido. La lectura conserva el slot hasta finish/close/error, incluido backpressure. Una segunda transferencia recibe 503 y Retry-After 3. Una respuesta detenida se destruye tras 30 segundos absolutos de salida y libera admisión. Instalar un handler por ingreso del servicio; consumidores directos de FileService son responsables de los buffers retenidos.

Si el cliente se desconecta durante una lectura de almacenamiento pendiente, se libera admisión cuando termina esa lectura, sin iniciar otra espera de salida de 30 segundos ni escribir a la respuesta destruida.

## Adjuntos privados del chat

Foxy usa `/api/v1/chat-attachments/teacher/:conversationId`. GET lista `{items}`; PUT `/:attachmentId?name=...` recibe bytes `application/octet-stream` y devuelve `{attachment}`; DELETE `/:attachmentId` revoca sólo el vínculo del chat. Las mutaciones requieren sesión docente verificada, origen/CSRF y conversación propia escribible. Cada conversación admite seis documentos y 20.000.000 bytes acumulados; la cuota física del propietario se cuenta por objeto, sin multiplicar sus vínculos.

`GET /api/v1/chat-attachments/teacher/:conversationId/:attachmentId/file?mode=preview|download` devuelve bytes privados. `mode` por defecto es `preview`; únicamente PDF se muestra inline, Office siempre se descarga. No exige CSRF en GET. Comprueba sesión, propietario, conversación y vínculo vigente antes y después de leer almacenamiento; tamaño y SHA-256 deben coincidir con lo aprobado. La lectura mantiene la política existente de aula archivada consultable; una conversación eliminada o identidad revocada no permite leer. Headers: `Cache-Control: private, no-store` (proxy `no-store`), `nosniff`, CSP sandbox, CORP same-origin y nombre RFC5987 escapado. No devuelve una URL de almacenamiento ni redirige. Parámetros desconocidos o repetidos son inválidos.

`POST /api/v1/foxy-ai/conversations` admite opcionalmente `carryAttachments: {sourceConversationId, sourceRevision, attachmentIds}`. Requiere entre uno y seis IDs únicos; el servidor los normaliza y ordena para la identidad de solicitud. El origen debe seguir siendo propio, escribible y de revisión vigente, y cada vínculo seleccionado debe seguir aprobado y activo. Destino, vínculos y recibo se confirman en una transacción. El mismo `requestId` con la misma entrada devuelve el destino existente, incluso después de quitar el vínculo de origen; otra entrada produce `CONFLICT`. No se copian bytes ni se crea otra carga. Sólo transporta adjuntos privados, no materiales del aula. Errores de revisión/vínculo: `CONFLICT`; acceso revocado: `FORBIDDEN`; límites: `QUOTA_EXCEEDED`.

Los vínculos apuntan al ID canónico del objeto. Quitar el origen conserva el destino; quitar el último vínculo permite limpieza. `cleanup_claimed_at` impide que una carga o traslado reactive un objeto cuya eliminación física comenzó. El proceso revalida custodios después de obtener el bloqueo y conserva el reclamo para reintentar fallos de almacenamiento. La copia explícita en carpeta de Estudio conserva su custodia independiente.
