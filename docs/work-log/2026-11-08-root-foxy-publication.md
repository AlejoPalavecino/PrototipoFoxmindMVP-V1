# Comprobación real y publicación de Foxy

- Agente: /root, orquestador; identificador de sesión no expuesto.
- Fecha: 2026-11-08. Rama inicial: main. HEAD y origin/main iniciales: cee57f4.
- Autorización vigente: usuario solicita commits, push e integración de todo a main. Posteriormente exige comprobar Gemini real **antes** de los commits/push.
- Alcance: cambios de Foxy ya implementados y verificados sintéticamente; comprobación con Gemini sobre cuentas/datos sintéticos y recursos propios. No despliegue ni datos retenidos.

## Preflight

- `git fetch origin --prune`: salida 0. `main...origin/main`: sin diferencias. Sólo main local/remota observadas. Todo el diff pendiente corresponde a la mejora Foxy y su documentación/evidencia; sin archivos privados o artefactos ignorados listados para publicación.
- `npm run docs:check`: 57 archivos, 674 enlaces, 0 problemas. Inventario CI: 496 entradas y 53 exclusiones válidas. `git diff --check`: salida 0.
- Se aplica work-unit-commits para separar comportamientos con pruebas/documentación. Preparación prevista: catálogo privado del backend; integración UI/controladores y evidencia; recibo final si hace falta. No crear PR ni merge artificial: integración fast-forward desde rama temporal codex cuando corresponda.

## Configuración necesaria para Gemini real

- No se encontraron variables AI_API_KEY/AI_MODEL, GEMINI o GOOGLE en el proceso ni nombres correspondientes en entornos User/Machine. Se consultaron nombres, no se imprimieron valores.
- En raíz sólo existe `.env.example`; no hay `.env.foxy-test`, `.env` o `.env.local`. Tampoco se encontraron archivos .env en apps/api o apps/web.
- Se leyó código de configuración y adaptadores actuales. No se ejecutaron helpers históricos reales: uno de los scripts referencia un adaptador/ruta retirados y otro usa una composición anterior; no son prueba vigente del runtime actual.
- Se solicitó al usuario ruta o servicio de la configuración, sin pedir que pegue la clave. No se buscaron secretos en otros proyectos, datos retenidos o servicios ajenos.

## Estado

Comprobación real pendiente de localizar la configuración de Gemini. No hay llamadas reales ni commits/push de esta publicación. Respetar la secuencia solicitada: prueba real → registrar resultado → commits → integrar a main → push y verificar SHA remoto/árbol.

## Configuración aportada por el usuario

El usuario creó `.env` en la raíz y autorizó usar esa clave para la comprobación real. El archivo está ignorado por Git. Se analizó en memoria sin imprimir valores; clave presente y consulta de modelos de Gemini HTTP 200. El archivo conserva AI_ENABLED=false, sin modelo ni límites de precio/presupuesto/globales configurados. La prueba aislada usa gemini-2.5-flash (devuelto por el catálogo de esa clave), habilitación temporal sólo para Foxy texto/esquema y un máximo de siete generaciones sin reintentos. No se modifica `.env` ni se activan otras familias IA.

Los dos primeros intentos de preparar el entorno fallaron antes de cualquier generación: Docker Desktop estaba detenido (pipe Linux ausente). Cleanup propio reportó 0 fallos, contador de generaciones 0. Se inició Docker Desktop en segundo plano para crear únicamente fixtures nuevos; no se reiniciaron ni eliminaron contenedores/volúmenes retenidos por comando del agente.

## Diagnóstico y corrección real

- gemini-2.5-flash estaba listado pero countTokens devolvió 404: el proveedor lo declara no disponible para usuarios nuevos. Sin generaciones en ese intento. gemini-3.8-flash admitió countTokens por SDK y HTTP (200); se seleccionó sólo para el ensayo aislado, sin cambiar `.env` ni el modelo productivo.
- Dos ensayos posteriores ejecutaron tres generaciones cada uno: ambos chats generales y continuidad pasaron; el apunte con ejemplos ausentes de la fuente fue rechazado como INVALID_AI_OUTPUT. El segundo ensayo capturó únicamente texto/uso/finishReason en artefactos ignorados: el modelo emitía INSUFFICIENT_CONTENT con markdown y referencias no vacíos, incompatibles con el contrato. No se relajó el parser ni se reintentó automáticamente.
- Se explicitaron en la instrucción del adaptador los campos mutuamente excluyentes de READY/INSUFFICIENT_CONTENT. Prueba RED: 1 fallo esperado por instrucciones incompletas. GREEN: adaptador 11/11; API build salida 0. Superficies: `foxy-prompt.ts` y prueba existente, sin migraciones ni cambios de proveedor.
- Nuevo ensayo acotado a ocho generaciones: incluye pregunta intencionalmente no sustentada, apunte limitado a lo que sí contiene la fuente, las otras herramientas y publicación/traspaso. Los seis despachos reales previos se conservan como intentos fallidos, sin inferir costo a partir de tarifas de prueba. Los límites locales sirven como resguardo, no como cotización del proveedor.

- Ese ensayo confirmó chat/continuidad, información insuficiente válida y apunte completo; se detuvo tras cinco despachos al superar la planificación el deadline de 30 segundos, con PROVIDER_OUTCOME_UNKNOWN. No hubo redispatch automático. Un ensayo posterior de cinco generaciones con deadline textual de 90 segundos completó apunte, esquema, publicación de apunte y traspaso privado; planificación/actividad/rúbrica devolvieron información insuficiente (la fuente mínima sólo contenía definiciones y un único tema estaba seleccionado). Su marcador COMPLETE del helper no acredita generación completa de esas tres herramientas: se revisaron los JSON originales y se fortaleció la aserción para exigir missingInformation vacío.
- Hallazgo derivado: el catálogo incluía avisos de información faltante porque el turno usa estado READY también para esos avisos. Se agregó exclusión por missingInformation antes de paginar. RED SQL: página extra inesperada; GREEN catálogo SQL/HTTP/visual 3/3. No se cambió la conservación del turno ni la validación de evidencia.
- Último ensayo usa dos temas seleccionados y un PDF sintético suficiente que incluye definiciones, ejemplos, secuencia de clase de 40 minutos, consigna, producción y rúbrica 40/35/25. Exige respuesta completa en cada herramienta; no utiliza datos retenidos ni amplía el conocimiento permitido en contexto aula. Cinco generaciones máximas, texto 90 segundos y esquema 30 segundos; otras familias IA rechazadas. Resultado pendiente de cierre.

## Resultado de verificación real

El último ensayo obtuvo cuatro textos completos con missingInformation vacío (apunte 298 caracteres, planificación 534, actividad 683, rúbrica 928); el esquema superó el deadline de 30 segundos y quedó PROVIDER_OUTCOME_UNKNOWN. El esquema sí había terminado READY en el ensayo anterior (14.635 segundos). No se repitió automáticamente ninguna petición incierta.

Se reprodujeron las cuatro respuestas completas capturadas, con validación actual del adaptador y API, sobre otra infraestructura descartable: cuatro creaciones privadas, apunte → PDF revisado → Biblioteca, actividad completa → borrador privado y denegación al estudiante. Ese último recorrido no hizo llamadas externas nuevas y no se presenta como una generación real adicional. La publicación directa del apunte también pasó con proveedor real en el ensayo anterior. Todos los helpers informaron limpieza propia con 0 fallos.

Total: 21 generaciones externas en cinco ensayos, sin reintentos automáticos. Cobertura real combinada de chat/continuidad, fuentes, insuficiencia y cinco herramientas; **no hubo un único recorrido externo completo sin interrupciones**. Los fallos quedan conservados en el [recibo saneado](../verification/foxy-gemini-real.json). No se certifican calidad pedagógica, costos reales, generación de imágenes ni publicación de actividades al alumnado. No se modificó `.env`: AI_ENABLED=false y modelo/límites habituales pendientes de configurar; no se activó ni desplegó el servicio.

Controles del candidato final: API build salida 0; adaptador/presupuesto/esquema 21/21; catálogo SQL/HTTP/visual 3/3; lint/boundaries salida 0 (123 excepciones previas); inventario CI 496 entradas/53 exclusiones. Build web y QA visual del cambio UI ya verificados en el registro de implementación; las correcciones posteriores sólo afectan backend y evidencia. Faltan comprobación documental final y entrega Git.

## Unidades Git preparadas

Rama temporal `codex/foxy-discovery-verified`, desde main sincronizado con origin/main (0/0 tras fetch). Se aplica work-unit-commits, sin PR ni despliegue. Cada índice se comprobó contra la clave exacta en memoria: `.env` y artefactos privados excluidos; nunca se imprimió el valor.

- `0137d17` — instrucción del proveedor y regresión. Rollback: esos dos archivos; preserva parser y servicios. RED/GREEN y prueba real de insuficiencia anteriores.
- `3a0ba84` — catálogos privados y filtros, prueba SQL/HTTP/visual e inventario/modelo. Rollback: catálogo y extensiones de consulta, sin migración. 3/3 y API build.
- `33ed689` — cliente/controladores/proxy, regresiones e inventario. Rollback: descubrimiento y apertura directa del cliente; API previa permanece compatible. Recheck `foxy-discovery-controller.test.mjs` + `foxy-proxy.test.mjs`: 25/25.
- Unidad final UI/documentación/evidencia: incluye componentes, estilos, prueba e inventario junto a guías, capturas y recibos que explican el comportamiento. Supera la guía de 400 líneas al conservar evidencia y documentación de la funcionalidad conjunta; se registra el exceso, sin comprimir código ni suprimir pruebas. Rollback: presentación/colecciones y sus referencias actuales; el backend y contratos anteriores continúan disponibles. Recheck `foxy-collections.test.mjs`: 8/8; navegador 390/768/1440 y build web documentados.

Recheck final `docs:check`: 59 archivos, 680 enlaces, 0 problemas; `lint:boundaries` y `git diff --check` salida 0. No se repitió la suite completa del repositorio; sí la suite Foxy focal y controles proporcionales detallados. La integración/push siguen pendientes al escribir esta sección.

## Entrega comprobada

- Cuarta unidad: `425005b6158a7970cd4abf9fe63b85458c31de99` (UI/documentación/evidencia, 986 inserciones/40 eliminaciones y tres PNG).
- `git switch main` y `git merge --ff-only codex/foxy-discovery-verified`: salida 0, cee57f4 → 425005b. Cuatro commits, 53 archivos, sin merge artificial.
- `git push origin main`: salida 0. `git ls-remote --heads origin` confirmó exactamente 425005b6158a7970cd4abf9fe63b85458c31de99 en refs/heads/main, única rama remota observada.
- Rama temporal propia eliminada con `git branch -d` después de integrar/publicar. `git status --short --branch`: sólo main...origin/main, sin cambios. El recibo documental posterior registra este resultado y actualiza tarea/roadmap; no cambia producto.
- Estado: implementación verificada localmente por escenarios, integrada y publicada en Git. Sin despliegue. Clave ignorada y `.env` sin modificar; no se guardaron secretos o transcripciones en el repositorio. Sin generación real de imágenes ni evaluación pedagógica/costos. Los dos timeouts y la ausencia de una única ejecución externa íntegra continúan como límites conocidos.
- Primer paso operativo fuera de esta entrega: definir modelo, habilitación, límites y presupuesto del entorno habitual si el usuario solicita activarlo. No inferir que la prueba temporal habilitó ese entorno.
