# Mi Estudio · recuperación de flujos

- Responsable: agente `/root/estudio`, implementación y verificación de interfaz.
- Inicio: 2026-11-17, `main` en `375a2d75`, checkout principal de FoxMind.
- Alcance autorizado: corregir los hallazgos de interfaz de Mi Estudio. El coordinador conserva la responsabilidad del backend, integración y despliegue.
- Evidencia de partida: auditoría local con Chromium y Gemini, expediente ignorado `.test-artifacts/qa17-estudio/AUDITORIA.md`.
- Contrato: propuesta aprobada de carpetas, especificación funcional y comandos existentes de Estudio.
- Primer corte: verificar la entrada desde Plan de aula del estudiante, preseleccionada sólo para un aula autorizada, sin persistencia al abrir el asistente.
- Estado inicial: en ejecución. Sin commits.

## Implementación y pruebas focalizadas

- Se repusieron opciones de carpeta, estado Archivadas, búsqueda por texto y filtros por año y vínculo en la colección. Abrir desde Plan de aula inicia el asistente con selección autorizada y espera la confirmación para persistir.
- Biblioteca conserva su lector y recupera apertura y descarga del archivo original del plan. El editor reutilizado guarda título y temas de material propio. Los apuntes y esquemas conservan el TXT y recuperan Word desde la misma versión guardada.
- Volvieron los ejercicios, el control de cantidad/dificultad, los filtros por tipo y la identificación por número y estado de intento. El editor de sesión recuperó el aviso privado y el plan confirmado ofrece abrir Agenda.
- RED: fallaron los casos de preselección del aula, opciones de carpeta, ejercicios, aviso y biblioteca al faltar sus controles. GREEN: 54 pruebas focalizadas de la UI, incluidas siete regresiones nuevas.
- Pasaron ESLint en las superficies de Estudio y Plan, límites frontend, y el chequeo del inventario de pruebas. El primer TypeScript del workspace reportó tres errores en Foxy durante su edición paralela; la ejecución coordinada posterior identifica el candidato definitivo.
- Pasó el chequeo documental, incluida la actualización de la guía canónica de Estudio.

## Navegador sobre el build integrado

- El arranque de las 17:41 permitió verificar colección, acceso directo desde Plan del aula, preselección del vínculo sin escritura, archivar/reactivar y eliminar una carpeta sintética tras cancelar una primera confirmación.
- El PDF original se abrió y descargó. La edición de un material volvió del diálogo de descarte y guardó exactamente el tema seleccionado y el título. La primera aserción confundió los temas que el archivo ya tenía con la selección nueva; el caso corregido pasó.
- Se descargó el apunte revisado en DOCX y TXT. El catálogo mostró números y estados distintos para dos intentos. Al confirmar el repaso se verificaron el aviso de 15 minutos, el evento y su relación con el plan exacto.
- Gemini produjo un recurso de ejercicios con tres preguntas y dificultad solicitada Avanzada. Se abrió desde el chat. Detener otra generación conservó CANCELLED tras recargar y no creó ningún recurso.
- El primer ensayo automático del candidato incluyó un PDF privado adjunto y cinco respuestas. Finalizar persistió las respuestas. La devolución devolvió 503 y quedó pendiente. El botón **Reintentar devolución** la completó con HTTP 200 en 11,1 segundos y conservó las cinco respuestas.
- Un nuevo intento con el mismo archivo privado completó la devolución automáticamente en 14,4 segundos. La traza registró HTTP 200 en autoguardado, finalización, consultas de reconciliación y devolución, con estado final COMPLETE. El 503 inicial sigue registrado como intermitencia observada en ese build.
- Recibos y capturas en `.test-artifacts/qa17-estudio/verified-fixes/`, `verified-material/`, `verified-cancel/`, `verified-feedback/`, `verified-feedback-manual/` y `feedback-diagnostic/`. Se inspeccionaron controles de opciones a 320 px y los diálogos de aviso y ejercicios a 390 px.
- Resultado entregado al coordinador para integración. La comprobación usó Chromium y Gemini real en loopback con datos sintéticos. Quedan fuera la entrega del aviso a su hora, dispositivos físicos y lector de pantalla.

## Mensajes de devolución y comprobación posterior

- Devolución automática y reintento muestran el motivo específico de ocupación, vencimiento o cuota junto al estado finalizado. La opción de volver a guardar queda reservada a fallos de guardado.
- RED por mensaje genérico ante AI_BUSY. GREEN en las cinco pruebas de práctica y ESLint focalizado. Chromium mostró los tres avisos mediante respuestas de servidor simuladas de forma local al navegador, sin mutar prácticas. Evidencia en `.test-artifacts/qa17-estudio/verified-feedback-messages/results.json`.
- La comprobación concurrente de `/root/contratos` sobre el mismo alumno inició ejercicios en una carpeta y finalizó en otra una práctica con devolución automática. Gemini respondió HTTP 200 en ambas operaciones. La práctica quedó FINALIZED y el feedback COMPLETE con las respuestas intactas. [Registro de admisión y ejecución concurrente](2026-11-17-contratos-estudio-admision-feedback.md).
- Al consultar un entorno detenido, la salida de diagnóstico de Playwright incluyó el identificador de una sesión sintética de esta auditoría. Se revocó la sesión con logout HTTP 204 y se verificó que el identificador previo recibe estado no autenticado y Estudio HTTP 401. El runner oculta encabezados sensibles en sus errores.
