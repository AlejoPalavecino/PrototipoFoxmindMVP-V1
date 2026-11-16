# Refinamiento de fidelidad visual con la maqueta

- Responsable: root, orquestador; identidad de runtime no expuesta. Implementación delegada a `astra_frontend_parity`, modelo solicitado `gpt-6-astra`, sólo esta sesión.
- Fecha: 2026-11-15.
- Rama: `codex/foxmind-product-parity`; worktree: `C:/Users/alejo/.codex/worktrees/foxmind-product-parity/ProtipoFoxMind`; base: `ef6828b96084b0fcaf9a883e4afb95e0871cf1d6`.
- Autorización: igualar frontend real a la maqueta indicada por el usuario, ambos roles, animación, composición e interacción, con comparación en Ego Lite. No incluye commits, integración ni publicación.
- Referencia de sólo lectura: `C:/Users/alejo/.codex/worktrees/foxmind-ui-lab/ProtipoFoxMind/design/foxmind-ui-lab/01-foxmind.html`, iteración 17. Las pruebas previas de funcionalidad no acreditan igualdad visual exacta.
- Se preservan datos, permisos, servicios, configuración Gemini y el trabajo previo sin confirmar. No se copian controles de demostración ni datos ficticios a componentes productivos.

## Baseline observado

`npm run local:status`: READY, web 3000/API 3001. Maqueta servida en 4173. Ego Lite TaskSpace 1, app p1 y referencia p2. Comparación inicial a 1440×900: navbar 238 frente a 232 px; margen de contenido distinto; subtítulo Brújula y búsqueda no coinciden; peso de widgets 900 frente a 800 y agenda 20 frente a 22 px. Assets Nunito/Foxy/covers existentes son idénticos según inspección del implementador. La app mezcla hojas anteriores con overrides parciales.

Capturas iniciales sintéticas en `.test-artifacts/app-student-before.png` y `.test-artifacts/prototype-student.png`. La app tiene menos datos que la maqueta: cantidades, fechas y estados vacíos deben seguir reflejando datos reales.

## Estado

Implementación de las cuatro superficies Astra y verificación conjunta completadas localmente. Se registran abajo los candidatos intermedios, los bloqueos corregidos y los límites del corte final.

Se ejecutó una generación explícita de actividad con Gemini real durante la validación del flujo nuevo, con contexto sintético propio. No hay commits propios de esta iteración.

## Comparación y correcciones intermedias

Se amplió el equipo Astra por superficies disjuntas: `astra_frontend_parity` (shell/Inicio/colección), `astra_classroom_fidelity` (aulas/actividades), `astra_ai_fidelity` (Foxy/Estudio), `astra_agenda_account_fidelity` (Agenda/avisos/perfil). Root conserva TTP y operación del navegador.

Vista de desarrollo 3002 con Next programático y directorio de compilación ignorado independiente; usa API local 3001. No modifica configuración productiva ni `.next` del servidor3000. El hot reload concurrente puede invalidar capturas/estado: algunas imágenes capturaron carga o comprobación de sesión y se descartan como evidencia final. Se hará comprobación final sobre build estable.

Hallazgos reales durante iteración: selector raíz accidental del portado PostCSS ocultó Inicio; corregido por autor con guard. Navbar móvil comprimía marca y texto Menú; corregido a menú/marca/búsqueda. Chat móvil sobraba header y composer fuera de vista; v3 pendiente recaptura. Aulas v2 no coincidían todavía en masthead/KPI/tabs/cabecera de tema/cards; v3 ajustada a partir de capturas.

Preparación sintética autorizada a través de API real local, sin IA: dos actividades publicadas manuales (cuestionario de dos preguntas y trabajo práctico con archivo) en aula propia de prueba, y dos eventos personales por cuenta de prueba con colores y aviso de 30 minutos. Identificadores sólo en `.test-artifacts/visual-fidelity-*.json`. No se alteraron datos ajenos ni se usó proveedor para esta preparación.

Referencia hash revalidado: `81642edc107f01b3d602d11399bacfd3189e13841842e289739c3f3540764ff0`. Validador TTP:15 tareas válidas en revisión intermedia.

## Comprobación de producción intermedia

`npm run local:restart` PASS, candidato `ip-fBP-WiES_hlxi-RvhA`, web3000/API3001 READY con configuración Gemini existente. `npm run lint:boundaries` y TypeScript PASS antes de la siguiente ronda. La app estable evita los falsos hallazgos por HMR.

Ego observó diferencias todavía reales: entrada de autoría en modal en vez de Alcance enfocado; lectura de actividad sin cabecera/barra inferior; Plan móvil repetía selector y rail; perfil no recibía overrides y desbordaba 423px a390; navbar heredaba altura88px de marca; editor Agenda limitaba colores y disponía campos con scroll excesivo. Se devolvieron a los responsables Astra para corregir estructura/cascada, no se consideran cerradas por pruebas estáticas verdes.

La captura de chat de Estudio con mensajes no tenía encabezado h1/h2, por lo que el helper de captura agotó su espera. Se corrigió sólo el helper para aceptar el composer como señal de carga; no fue un error del producto. Una selección ambigua de Abrir actividad en la maqueta se repitió con ref observado. Un `git diff --check` con autocrlf desactivado temporalmente trató CRLF preexistente como espacios; no hubo normalización ni cambios de archivos por ese comando. La comprobación final usará la configuración normal.

## Flujos reales y correcciones posteriores

Sobre builds locales `CsU5irom4fDJPIgivaZMc` y `PyZRANnlXXF0cU1pFHwBR`, Ego comprobó autoría manual de un TP (alcance → contenido → rúbrica → revisión → confirmación y asignación), cuestionario estudiantil de dos preguntas, entrega confirmada, corrección privada con nota 8 y devolución estructurada, publicación explícita y lectura por el estudiante. También se subió un PDF privado, se guardó el comentario y se confirmó una entrega de TP con comprobante. Datos exclusivamente de las cuentas locales de prueba.

Carpeta de estudio: cuatro pasos completos desde móvil, portada, aula opcional, copia de plan, edición de un tema, revisión y creación; el chat resultante conserva el contexto de la carpeta. Gemini real generó dos preguntas y una rúbrica de dos criterios; el resultado se aplicó como borrador privado, se editaron título y criterio y se guardó. No se publicó esa propuesta. La validación de idea vacía se observó en rojo antes de la única generación explícita.

Ego encontró bloqueos adicionales que los tests de componentes no detectaban: animación con transform que contenía incorrectamente barras fixed, modal de carpeta heredando ancho560 y footer fuera de vista, pie de corrección que tapaba Usar nota sugerida, y pie del TP tapando Subir archivo privado. Astra corrigió cada superficie; los últimos ajustes de scroll-padding/scroll-margin y reserva inferior requieren comprobación en el corte final. No se consideran fallos del producto los timeouts del helper por esperar textos diferentes a los realmente mostrados, ni las selecciones perdidas por HMR del preview3002.

Regresión detectada por prueba de Inicio: se había perdido Abrir tema. Se restauró el enlace con topicId real, sin modificar la aceptación. Pruebas focales conjuntas: primero 105/105 y, tras el nuevo flujo IA, 107/107 PASS. `lint:boundaries`, TypeScript y `docs:check` (159 archivos/976 enlaces/0 problemas) PASS en el corte previo al último ajuste CSS/copy. La prueba E03 de IA se actualizó con revisión del coordinador porque esperaba tres submits del subwizard retirado; conserva idea vacía sin solicitud, brief exacto, alcance y fuentes, y agrega una sola generación y abrir/cerrar ajustes sin consumo.

## Corte final

Build API/web `QuoiLeFkpez_y5nNmscUm`, web3000/API3001 READY con Gemini real de la configuración local conservada. Rama y base sin cambios; ninguna operación de commit, push, merge ni despliegue. El preview de desarrollo3002 propio se detuvo; el producto3000 permanece disponible. La maqueta de referencia no cambió.

Ego recorrió 28 vistas (14 por rol) en 320/390/768/1000/1440:140 comprobaciones, sin desborde horizontal, imágenes visibles rotas ni controles fuera del ancho. Capturas a 390/1440 y métricas identificadas por build en [refinement](../verification/product-parity/refinement/candidate-manifest.json). Se conservaron 155 artefactos y hashes de 308 archivos productivos del candidato combinado; incluyen trabajo preexistente de implementación, no son autoría exclusiva de esta sesión.

La revisión independiente Astra identificó una compresión interna de cards estudiante a390 que no detectaba el control de overflow: un `grid-row` heredado reservaba dos filas para el CTA y empujaba el texto a la columna del icono. Se corrigió con áreas explícitas y se revalidaron ambos roles; root y revisor confirmaron el cierre sobre el build final. También se verificaron el centrado del perfil a 1040 px y la tarjeta de devolución con padding, radio y jerarquía legible.

Pruebas de interacción adicionales: subir PDF en TP a390 sin scroll manual adicional; autoría a1524×638 con desplazamiento vertical normal; Escape devuelve foco desde Historial de Foxy y menú móvil. Bajo `prefers-reduced-motion: reduce`, Inicio no mantuvo animaciones activas. Muestra calculada de 24 textos sobre fondos opacos: contraste mínimo 5.35:1. No es una auditoría WCAG completa ni una comparación de todos los fotogramas/estados posibles.

Agenda: edición real guardada y reabierta con 20 de noviembre de 2026, verde y aviso de 30 minutos. El helper `fill` de Ego sobre fecha nativa cambió el DOM sin sincronizar React; se usaron eventos de teclado y se comprobó el valor persistido. No se atribuye esa limitación de automatización al producto. La lectura/no lectura de una notificación se revirtió correctamente. Biblioteca: PDF aprobado y publicado como material de Exposición, visible desde el plan; marcar tema dado se conservó tras recarga (el plan avanza automáticamente al siguiente tema, por lo que una espera del helper sobre el anterior fue incorrecta).

Límites: pruebas con cuentas y material sintético propios; generación real de actividad y las respuestas de chat previamente documentadas, sin probar todas las herramientas pagas ni habilitar imágenes. No se repitieron 2077 casos de la auditoría funcional anterior: esta iteración usa 107 focales y 21 recontroles, build, tipos, límites de arquitectura y QA real. Formatos distintos de PDF conservan la evidencia de contrato/conversión anterior. No hubo prueba de carga ni despliegue; el usuario puede revisar el candidato local antes de decidir integración.
