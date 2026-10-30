# Diseño de recuperación explícita en pruebas de confirmación

Actor inspector: `/root/confirm_rate_design`, architect;2026-10-30. Persistido por `/root` a partir de informe de solo lectura. Rama `codex/audit-remediation`, base446d3cb79cb122fb43f50dbf88abd40dcd61dd5e. No cambios de producto propuestos ni realizados por este actor.

Round9 demostró P7 EVALUATION: CSRF200→429 RATE_LIMITED, Retry-After34, alerta de límite y ninguna petición answer. P8 ASSIGNMENT: upload200 previo, CSRF429 RATE_LIMITED Retry-After35 al confirmar y ninguna petición submit-practical. No eran fallos de upload. api.ts espera CSRF antes de mutar; classroom-client/account-client propagan estado/código/Retry-After. CSRF pertenece a general-identity (defaults IP240/60s y sesión120/60s); la evidencia no identifica cuál bucket se agotó.

Decisión: representar en los dos tests un único reintento humano visible tras la espera indicada por la respuesta real. No aumentar límites, resetear filas, ignorar errores, cambiar confirmación completa por incompleta ni ampliar presupuestos330/360/API30/Next180. La UI ya conserva borrador y confirmación recuperables; no hay evidencia que exija cambiar producto.

Contrato: observador previo a la acción clasifica éxito de mutación o429 con JSONerror.code RATE_LIMITED y Retry-After entero seguro1..60. CSRF200 es intermedio. Otro error/header inválido/segundo429/ausencia de respuesta debe fallar; listeners se retiran. El observador no reintenta. El test exige alerta y estado preservado, espera exactamente segundos*1000 una vez y repite el control correspondiente.

P7: observar antes de editar para incluir autosave; exigir texto intacto, editor utilizable, confirmación ausente y ninguna mutación si CSRF denegó; repetir Enviar sin rellenar, exigir answer200 misma pregunta y revisión ACK mayor que CAS enviado. Luego submit-answers200, confirmtrue, confirmIncompletefalse y última revisión confirmada. Conservar hashes, archivos/custodia, puntero efectivo, historial y reinicio.

P8: upload200 y adjunto aprobado permanecen; ante límite conservar diálogo/adjunto y no submit si CSRF rechazó; esperar y repetir Confirmar envío del trabajo sin volver a subir, transferir ni quitar archivo. Exigir submit-practical200 y comprobante; conservar corrección privada/cancelación/publicación explícita/notas/privacidad/notificación/reinicio/revocación.

Si se extrae un nuevo helper, requerirá pruebas deterministas de estados y tiempo inyectado. La implementación asignada mantiene observadores locales en los dos archivos existentes para evitar un nuevo entrypoint auxiliar. RED ya observado en ambos archivos reales; GREEN requiere ambos archivos completos y después41 oficial. La reapertura del aula en el otro test questionnaire es un fallo separado todavía sin causa demostrada.

Verificación del architect: solo lecturas de fuentes, documentos, round9, rama/HEAD y diff. Búsquedas iniciales con globs literales fallaron en Windows y se reemplazaron por rutas/filtros. Sin tests, DB, navegador, Engram, búsquedas externas, escrituras ni commit. Handoff a TestRunner para implementación y verificación independiente; no DoD global.

## Reapertura de aula: causa posterior y revisión acotada

Round11 completo questionnaire terminó5PASS/2FAIL/1SKIP,107.352s, sin interrupción. Demostró GETdetalle429 RATE_LIMITED Retry-After42 tras colección/session/drafts/invitations200; confirmación y submit completos ya habían pasado. Un prefijo propio sin recursos,2reportescleanup0,mirror intacto. El coordinador corrigió el helperP6, sin cambiar producto: observar detalle al entrar, exigir429/código/cabecera válidos para una espera exacta y un clic Actualizar aula; recuperar mismo path200 y nombre esperado. Cada waitForResponse conserva timeout heredado, se maneja inmediatamente mediante resultado etiquetado y se drena en finally.

El architect revisó ese parche en solo lectura: LGTM acotado, sin carrera o rechazo no manejado observado. Confirmó ClassroomView48/58/113 (Actualizar aula recarga mismo recurso) y classroom-queries36/context94 (name top-level), además de round11. No ejecutó pruebas ni escribió archivos. Primera acción pendiente de su handoff: questionnaire completo; no GREEN todavía.

## Diseño sistémico tras observar etapas anteriores

Round12 no probaba transferencia ni refresh. El architect detectó dos defectos de fixture: apiP4 solicita CSRF por mutación pero igualmente despacha sin token si falla el preflight, a diferencia del cliente real; y los tests confundían clic/respuesta intermedia con acción compuesta terminada. Recomendó una corrección coordinada, no elevar cuotas ni reducir escenarios.

Contrato entregado: sexto argumento optativo `stopOnCsrfFailure:true` solo en wrappers de los dos tests; devolver respuesta real de preflight fallido sin mutar, manteniendo default compatible y sin caché. Observador pasivo común desde bootstrap de ambos actores, etapa ligada al request original, operaciones/códigos cerrados sin identificadores ni cuerpos, conteos de peticiones totales/por actor y últimos60s. Transferencia requiere200/mismoDRAFT/editor/epoch/control habilitado; carga requiere201+PUT200 mismo archivo ready y GETsession posterior con adjunto selected/ready, más lecturas de actividades/detalle emitidas por refresh. No hay endpoint finalize separado: receive hace scan/onReadyTransition antes de devolver200.

Solo429 RATE_LIMITED con Retry-After entero1..60 habilita una espera exacta y un gesto visible correspondiente por etapa; consolidar lecturas paralelas denegadas en una espera, sin reupload/reserva/transferencia ciega. Segundo fallo o error distinto conserva fallo. Eliminar GETsession auxiliares introducidos para IDs: aprovechar respuestas reales de Continuar/start/transfer. Mantener tres tipos, actores, privacidad, historial, hashes y reinicios,330/360/API30/Next180. El architect no ejecutó pruebas, escribió archivos ni afirmó causa runtime round12.

Round14 posterior sí demostró causas: history CSRF429/40 antes de transferir y sesión recuperada sin editor; publicación allocation201/content200 seguidos de GETsessionrefresh429/40, sin refresh200 ni submit. Bucket concreto y persistencia de selected/ready no se infieren de esa ejecución.

TestRunner agregó unit8: RED2PASS/6FAIL (dos preflight aún enviaban; cuatro imports de helper faltante). Worker implementó helpers sin tocar pruebas; GREEN8/8 y verificación independiente TestRunner8/8, SHAunit4589690c3ab747b7218426aac2230f494f0648a1096147edc23dbf0dcaafd4ba intacto. Módulo común134líneas, funciones breves, whitelist ampliada y sin herencia. Revisión ordinaria de auxiliares LGTM; checks privados ESLint/fronteras/node--check observados, no se afirmó typecheck raíz inexistente.
