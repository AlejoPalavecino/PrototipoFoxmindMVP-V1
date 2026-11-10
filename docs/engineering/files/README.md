# Archivos privados

La aplicación conserva bytes en almacenamiento compatible con S3 y metadatos/custodia en PostgreSQL. El navegador usa el proxy de archivos; no recibe credenciales ni acceso directo al bucket.

## Ciclo de una carga

Crear metadatos y reservar cupo → transmitir bytes → validar formato/estructura → escanear los mismos bytes → confirmar disponibilidad → asociar al recurso autorizado. Seleccionar o subir un archivo no confirma una entrega ni publica material.

Scopes draft/classroom y propósitos plan/instructions/material/attachment tienen autorizaciones diferentes. Instrucciones y adjuntos requieren destino real de actividad/intento. Ready exige carga completa, validación y escaneo limpio coherentes con el digest.

## Límites y conservación

- Plan e instrucciones: PDF/DOCX, 20 MB por archivo. Materiales/adjuntos: formatos admitidos, hasta 50 MB; un intento admite hasta cinco archivos y depende del cupo disponible.
- PDF e imágenes admiten vista previa según navegador; Office/ZIP mantienen descarga. Ambos caminos requieren permisos actuales.
- Falta de espacio bloquea nuevas cargas, sin borrar historia ni denegar lecturas autorizadas. El cupo productivo no se decide desde un fixture.
- Archivos confirmados en borrador e intentos históricos no caducan por la limpieza de uploads. Sólo cargas incompletas abandonadas pueden limpiarse tras 24 h de inactividad según su servicio.
- Bytes de archivos confirmados son inmutables; revisar un material TEXT crea otra identidad. Quitar un adjunto del borrador no equivale a liberar espacio o borrar historia.

Contrato: [HTTP de archivos](../../api/files.md). Fuentes: [servicio Files](../../../apps/api/src/modules/files/), [puente académico](../../../apps/api/src/bootstrap/attachment-integration.ts), [modelo](../data-model.md). En la [verificación actual](../../verification/flows.md), el PDF adjunto descargado mediante fetch autenticado coincidió byte por byte; el evento nativo de descarga de Ego no se acreditó.
