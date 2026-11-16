# Segunda auditoría de Actividades

Agente `/root/classroom_activity_reaudit`, delegado por root, 2026-11-16. Worktree `foxmind-product-parity/ProtipoFoxMind`, rama `codex/foxmind-product-parity`; estado concurrente preservado. Alcance autorizado: estados, colores, scroll y pies de actividades, autoría, resolución y devolución. Sin backend, servicios, datos retenidos, secretos, commits ni publicación. Root opera Ego.

## Hallazgo reproducido

`academic-AttemptHistory.tsx` aplica tono confirmed a cualquier SUBMITTED. UI Lab `learning-experience.js`, función `activityDeliveries`, especifica naranja para pendiente, azul para revisión privada y verde para publicada. El texto y filtro eran correctos, pero los tres estados parecían terminados.

## Correcciones y evidencia

- Entregas docente: pendiente naranja, revisión guardada azul, publicada verde; el rol estudiante no consume el estado privado para su tono ni texto.
- Listado estudiante: `learningState` de la referencia usa azul para Para empezar y Entrega recibida, naranja para Borrador guardado y verde para Devolución publicada. Antes Para empezar era naranja y Entrega recibida verde; corregido en `academic-Activities.tsx`. Estados adicionales de plazo/consulta/reentrega conservados.
- Azul tomado de `refinement.css` de UI Lab (`#dceafa` / `#234d73`). Cambios de estilo limitados al módulo de actividad.
- `node --test tests/classroom-delivery-tones.test.mjs`: RED docente 1/2 por confirmed en los tres estados; luego RED listado 2/3 por tonos anteriores. GREEN final incluido en suite de 28 casos.
- `node --test tests/classroom-delivery-tones.test.mjs tests/classroom-activities-exact.test.mjs tests/product-parity-activity-ui.test.mjs tests/p8-grading-client.test.mjs`: **28/28 PASS**. Incluye permisos de reentrega, primer intento, preservación de cambios privados y nota cero ante publicación fallida.
- `node node_modules/typescript/bin/tsc --noEmit --project apps/web/tsconfig.json`: **PASS**, repetido después del segundo cambio.
- Fallos de inspección: glob Windows de rg no admitido y una lectura relativa desde UI Lab en lugar de worktree de aplicación; repetidos en rutas correctas. Sin efecto en candidato.

## Freeze y límite

HEAD inicial confirmado `ef6828b96084b0fcaf9a883e4afb95e0871cf1d6`. Congelados `academic-Activities.tsx`, `academic-AttemptHistory.tsx`, `academic-activity.module.css`, prueba propia y registro. No se cambió lógica de permisos, revisión, nota, publicación, autoría o resolución. No se modificaron pruebas de aceptación anteriores. Sin build/reinicio, proveedor real, commits ni publicación.

Geometría de footer de cuestionario intermedio en 320×568 señalada a root: cuatro acciones pueden envolver y exceder la reserva genérica de 116px. No se corrigió sin reproducción visual. Casos Ego: docente tres estados de Entregas y sus filtros; estudiante Para empezar/Borrador/Recibida/Publicada; cuestionario de 3+ preguntas en pregunta intermedia a 320×568, final del contenido y teclado; TP con archivo seleccionado; corrección privada con comentario largo y nota cero; autoría móvil con confirmación final. Las capturas existentes revisadas no acreditan este candidato ni esas geometrías extremas. Root aporta comparación visual final.

## Seguimiento: reserva del pie de cuestionario

Root reprodujo con Ego Lite y componente real en fixture sintético el tapado a 320×480 y 320×568: con guardado rechazado el footer mide 148.4px, empieza en y=331.6 y tapa el textarea que termina en y=332 y tarjeta hasta y=352.8. Sin error se recorta el borde de la tarjeta. Autorizó corregir sólo QuestionnaireAttempt/Participation.module.css y prueba propia.

Se reemplaza la reserva genérica de 116px sólo mientras el cuestionario tiene su footer editable por el alto real del pie +16px. Un callback ref mide el rectángulo y ResizeObserver acompaña cambios de texto, navegación y zoom. Al desmontar desconecta el observer y elimina la variable. No suma padding adicional dentro del cuestionario ni cambia la posición fija. La tarjeta mantiene un margen inferior útil sin conservar la reserva de un error ya desaparecido.

`node --test tests/questionnaire-footer-clearance.test.mjs`: RED observado porque el pie no tenía medición; luego GREEN con mediciones 148.4→149, 202.2→203 y 94px, más limpieza al salir. `node --test tests/questionnaire-footer-clearance.test.mjs tests/product-parity-activity-ui.test.mjs`: **11/11 PASS**. `node node_modules/typescript/bin/tsc --noEmit --project apps/web/tsconfig.json`: **PASS**.

Freeze adicional: `QuestionnaireAttempt.tsx`, `Participation.module.css`, `tests/questionnaire-footer-clearance.test.mjs`. Root debe verificar geometría del candidato con su fixture y build. La prueba con observer sintético acredita actualización y limpieza, no layout del navegador. Sin servicios, reinicio ni commits.
