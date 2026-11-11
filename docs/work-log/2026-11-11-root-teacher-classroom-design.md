# Diseño detallado de Mis aulas docente

## Coherencia y simplificación de la experiencia estudiantil — verificada en maqueta

Pedido del usuario: revisar/mejorar vista estudiantil y pantallas compartidas, simplificar pasos y mejorar legibilidad sin cambiar identidad. Trabajo en línea por `/root`, sesión de host sin identidad registrada; misma rama/main y maqueta local, sin cambios de producto/servicios/Git. Se reutilizan harness-ux-ui y Ego Lite. Superficies: scripts/estilos de diseño, documento de diseño y este registro. No se reemplazan datos sintéticos existentes.

Auditoría inicial: navegación horizontal oculta destinos en móvil; Mi progreso destaca progreso docente por encima de entregas propias; todas las actividades usan «Ver actividad» y color de éxito incluso pendientes; revisión de entrega repite confirmación en modal; Biblioteca promete buscar por tema pero filtra sólo título. Dirección dentro del pedido: componentes compartidos, tabs visibles, acciones específicas, resumen personal, una confirmación final sobre revisión, búsqueda coherente y adjuntos claramente diferenciados de entrega. Conservar inicio explícito de evaluación, separación selección/subida de adjuntos, reentregas y privacidad de presentación. Verificación pendiente: recorridos completos, contraste visual docente/estudiante, anchos 320–1440, teclado/foco, conservación de borrador y confirmación sin duplicados.

Resultado: seis secciones estudiantiles revisadas; tabs compartidas en grilla móvil, atajos por estado, progreso personal primero, lector/búsqueda comunes, navegación de vuelta al índice del plan y una confirmación final de entrega. Ingreso acepta espacios sin convertir el código a número. No se cambia la identidad ni se agregan destinos de producto. Fuente de diseño actualizada en «Experiencia estudiantil coherente».

Evidencia local en `.test-artifacts/student-polish-20261111/`, Ego Lite TaskSpace 8:

- `audit.mjs`: recorrido inicial de Plan, Muro, Biblioteca, Actividades, Mi progreso y Compañeros, con capturas de referencias anteriores.
- `journeys.mjs`: PASS de continuación directa, conservar borrador tras recarga, revisar/volver sin entregar, confirmación única con incremento exacto de una recepción, apertura de comprobante, contador propio de espera, inicio/cancelación explícitos de evaluación, dos preguntas vacías advertidas, búsqueda sin tildes, lector/Escape/foco, consulta visible en Muro para ambos roles y ausencia de correos/invitación en Compañeros. Datos exclusivamente de ejemplo; dejó un TP confirmado, una evaluación en borrador y una consulta ficticia.
- `layout.mjs`: 48 controles (seis vistas × dos roles × 1400/768/390/320 px), sin overflow horizontal del documento ni pestañas ocultas horizontalmente en móvil. Igualdad computada de font-family, fondo, radio y color de selección en Plan/Muro/Biblioteca: Lexend, panel blanco con radio 19 px y selección durazno. Volver desde detalle de tema devuelve foco a su entrada del índice.
- Inspección visual de capturas móviles de docente/estudiante y progreso: detectó que la regla compartida de acciones blanqueaba el botón primario y dejaba texto blanco. Se corrigió la especificidad; `final.mjs` verificó contraste 5,25:1, volvió a abrir borrador/comprobante/devolución y comprobó código agrupado, error que conserva el input y apertura del aula ya integrada. Capturas finales `student-plan-mobile-final.png`, `progress-mobile-final.png`, `student-progress-final.png` inspeccionadas.
- `node --check` para los tres scripts: PASS. Regresión de cálculo de grading: 5 PASS. `npm run docs:check`: 106 archivos/952 enlaces, 0 problemas. `git diff --check`: sin errores, aviso de normalización previo del mapa JSON.

Fallos de guion: la primera revisión encontró dos botones con el mismo destino Mi progreso; se acotó el selector a `.tabs` sin cambiar comportamiento para satisfacerlo. La captura preliminar `progress-mobile.png` tuvo viewport de escritorio tras recarga; se descarta como evidencia móvil y se reemplaza por capturas finales con métricas explícitas.

Límites: verificado sólo el prototipo, sin API/archivos reales, envío de correos, proveedores o permisos de servidor. El personaje estudiantil y la corrección privada comparten almacenamiento de demo; ausencia de controles/claves es evidencia de presentación, no seguridad. Pendientes: prueba con estudiantes/docentes, lector de pantalla completo e integración autorizada. Sin cambios de producto, commits, push ni despliegue; sin TTP de implementación ni memoria atribuida. Primer paso: revisión de la maqueta abierta en Mi progreso estudiantil.

## Corrección manual y asistida — verificada en la maqueta

Pedido vigente: mejorar en la maqueta la corrección manual/IA, revisión de respuestas, uso de rúbrica, publicación y devolución estudiantil orientada a logros/mejoras. Orquestador único escritor; se conservan dirección visual y alcance local ficticio. Sin datos productivos, proveedor real, cambios del producto ni entrega Git. Se consultaron guía de grading y contrato IA vigente: propuesta privada, aplicar con confirmación guarda en privado, descartar no cambia corrección y publicar requiere revisión explícita. Se reutiliza harness-ux-ui y se verifica con Ego Lite.

Recorrido acordado por el pedido: misma mesa de corrección manual/IA, puntos junto a respuestas, rúbrica con peso/evidencia y nota sugerida adoptable, devolución en logros/mejoras/próximo paso, vista previa y publicación de versión guardada. La IA se representa con estados de ejemplo, sin analizar archivos reales. Aceptación: conservación al navegar, no aplicación/publicación incidental, descarte/fallo conserva manual, cálculo correcto incluyendo cero, resultado estudiantil sin claves/propuestas privadas y responsive.

Se extrajo la corrección a `docs/design/classroom-grading-preview.js`, cargado después del módulo de actividades. Se extendieron estilos compartidos y detalle estudiantil; la devolución publicada aparece primero y la consigna queda consultable. Notas por pregunta incluyen su enunciado. El docente conserva una única pantalla manual/IA; guardar, adoptar sugerencia y publicar son acciones distintas. Se añadió un ejemplo con tres criterios sin reemplazar datos existentes. El diseño recuperable está en la sección «Corrección manual y asistida» del documento de diseño.

Evidencia del candidato de esta revisión:

- `node --test .test-artifacts/teacher-design-20261111/grading-preview.test.cjs`: 5 PASS. RED previo del cálculo incompleto: 3 fallos esperados y 2 casos de ausencia de sugerencia correctos. GREEN: ponderación, cero, decimales/límites, rúbrica incompleta, cálculo objetivo EXACT/PARTIAL y fracciones sin redondeo intermedio. Son pruebas de reglas locales de la maqueta, no del backend.
- Ego Lite, TaskSpace 7 y archivo local: rúbrica 8/7/8 con pesos 30/40/30 produce 7,60; nota final 9 permanece hasta adoptar. Guardado privado no aparece en vista estudiantil. Fallo/reintento IA, cancelar vista previa, descartar y adoptar con confirmación; publicación final muestra los tres bloques y rúbrica. Guion `grading-resume-01.mjs`, salida PASS. Primer intento se detuvo por selector de QA `:first-child` que no correspondía al fieldset; se corrigió a `:first-of-type`, sin reiniciar datos.
- `grading-questions-02.mjs`: puntos manuales y automáticos, rechazo de negativo y exceso sobre máximo, nota cero guardada/vista previa, orientación con enunciado, foco conservado al llegar sugerencia, cancelación y persistencia de corrección tras recarga: PASS. La corrida dejó una corrección privada de ejemplo en Inés.
- `grading-responsive.mjs`: 12 controles geométricos (corrección docente, vista previa de publicación y devolución estudiantil a 320/390/768/1440 px), sin overflow horizontal ni bloques fuera del viewport. Escape cierra el diálogo. Inspección visual de capturas de preguntas, rúbrica, sugerencia, devolución y móvil.
- `grading-final.mjs`, candidato recargado: reduced-motion con animación `none` y `aria-busy=true`; diálogo a 320 px con título accesible/foco inicial, cuerpo desplazable de 431 px, acción final visible y alcanzable por hit-test, cierre alineado y retorno de foco al disparador. Se ajustó cabecera/pie móvil y posición de aviso para no tapar acciones de corrección. Resultado de revisión abierto en entrega de Leo.
- `node --check` para los tres scripts de la maqueta: PASS. `npm run docs:check`: 106 archivos, 952 enlaces, 0 problemas. `git diff --check`: sin errores, aviso previo LF/CRLF del mapa documental.

Límites: todo permanece en diseño local con datos sintéticos y localStorage. IA, espera y archivos son representaciones; no hay análisis real, bytes de adjuntos, API, correos ni controles de autorización de servidor. El cambio de personaje prueba presentación, no aislamiento de datos. No se ejecutaron suites de aplicación porque no cambió producto. Pendientes de integración: contratos de los tres campos de devolución, persistencia/privacidad reales, errores de red y pruebas con docentes/lector de pantalla. Sin commits, push, publicación ni despliegue. No se crea TTP de implementación de producto para esta iteración de maqueta. Primer paso: revisión del recorrido navegable por el usuario.

## Actividades y experiencia estudiantil

El usuario solicitó continuar la maqueta: autoría manual/IA con UI compartida, consignas claras, revisión docente de entregas por tipo y experiencia estudiantil de aulas coherente. Se mantiene alcance de diseño navegable local, sin cambios al producto ni servicios. Dirección: tres pasos compartidos Preparar, Consignas, Revisar y asignar; lectura común con acciones según rol; evidencia de entrega distinta por tipo y revisión privada/publicación separadas. Selector de personaje exclusivamente para la maqueta, sin proponer rol dual en las cuentas reales.

Responsabilidades: orquestador `/root`, shell/roles/vistas comunes/integración/documentación/QA. `/root/activity_contracts`, chuli_explorer, lectura de contratos sin escrituras: confirmó TP con texto/adjuntos y cuestionarios/evaluaciones por pregunta, revisión/confirmación, recepción inmutable y devolución privada/publicada. `/root/activity_prototype`, chuli_worker, propietario exclusivamente de `docs/design/classroom-activity-preview.js` y `.css`, autoría/detalle/entregas/resolución sintéticos. Registro previo de su encargo conservado aquí por el coordinador; el límite de sus escrituras excluye un registro separado. Tras congelar el candidato, el coordinador tomó propiedad para correcciones de QA. Identidad de sesión del host no confirmada; sin memoria atribuida. El cierre de esta revisión está al final del registro.

- Agente: `/root`, orquestador; identificador de sesión del host no expuesto.
- Fecha: 2026-11-11 (America/Buenos_Aires).
- Directorio: repositorio ProtipoFoxMind; rama `main`.
- Commit inicial: `3895f4ded6884641872c5950c39c54215406d6d6`; árbol inicialmente limpio.
- Autorización: el usuario aprobó la propuesta consolidada de UX/UI, incluyó invitaciones múltiples y decidió que el código dure hasta que el docente lo regenere. Solicitó avanzar con diseño detallado; no autorizó implementación de producto ni publicación.
- Alcance: diseño recuperable, vista previa local con datos ficticios y documentación de decisiones/aceptación. Sin servicios, IA real, credenciales, envíos ni cambios de aplicación.
- Skills: harness-ux-ui y harness-specification para recorridos, estados y criterios verificables; ego-browser para inspección del artefacto de diseño.
- Delegación: `/root/teacher_design_preview`, rol product_designer, propietario únicamente de la vista previa HTML y su registro. El orquestador escribe diseño, índices y este registro.

## Trabajo y evidencia

Diseño entregado en `docs/design/classroom-teacher-redesign.md`: catálogo, creación, Plan, Muro, Biblioteca, autoría y lectura de actividades, invitaciones múltiples e ingreso por código. Incluye dirección visual, estados, responsive, teclado, 28 criterios de aceptación futura y cortes de implementación. Se actualizaron índices, roadmap y mapa documental sin cambiar la especificación de comportamiento actualmente implementado.

La vista previa `docs/design/classroom-teacher-preview.html` ilustra cinco vistas con datos ficticios. El diseñador produjo el candidato y corrigió divergencias señaladas por el orquestador: actividad como página, pesos porcentuales, campos individuales de temas y estados de carga de Biblioteca. Tras congelarlo, el orquestador tomó propiedad del HTML para corregir tamaño mínimo de texto, nombres accesibles de diálogos, foco de selects, paso compacto y ubicación del editor de actividad dentro del área principal.

No se crea tablero TTP de implementación porque esa ejecución todavía no fue autorizada.

### Comprobaciones del candidato

- `npm run docs:check`: 106 archivos, 945 enlaces, 0 problemas.
- `git diff --check`: sin errores; aviso de normalización LF/CRLF en el mapa JSON.
- Ego Lite, archivo local y datos ficticios: 13 comprobaciones de interacción correctas (diálogos/foco/Escape, tema/deshacer, pestañas por teclado, modo Texto, actividad como página, rúbrica y resultados individuales de invitaciones). Sin API, correos ni proveedor real.
- Geometría de cinco vistas a 1440, 768, 390 y 320 px: sin desbordamiento horizontal del documento; diálogo de creación dentro del viewport. Resultado de invitaciones a 390 px también contenido y desplazable.
- Viewport 720×500: acción final de creación alcanzable y aviso ilustrativo visible. Es comprobación de poca altura, no prueba de zoom nativo al 200 %.
- `prefers-reduced-motion: reduce`: transición de botón computada en `0s`. Los tres diálogos tienen título accesible asociado.
- Inspección visual de capturas de catálogo, creación, actividad y biblioteca. Contraste calculado para pares de tokens: texto principal 14,02:1; secundario 5,86:1; acción 5,25:1; seleccionado 6,14:1; éxito 7,16:1; error 7,83:1; borde de control 3,55:1. No equivale a una auditoría completa del DOM.
- SHA-256 del HTML comprobado: `952482D13D07FA6FB954D6AD72AF6402F5FE045B40692AC95B006EB35F181C05`.
- Evidencia local no versionada: `.test-artifacts/teacher-design-20261111/`, scripts `qa-interactions.mjs`, `qa-layout.mjs` y `qa-final.mjs`, resultados `interactions.json` y `layout.json`, capturas por vista/ancho. Los criterios UX-01–28 del documento siguen siendo aceptación futura, no pruebas del producto aprobadas.

## Fallos y límites

- La primera lectura de `infrastructure/invitations.ts` falló: esa ruta no existe en el candidato; se debe resolver el contrato por rutas actuales, no por una referencia abreviada de la auditoría anterior.
- Un patrón glob pasado como ruta a rg falló en Windows; se usan directorios y filtros de archivo para las búsquedas siguientes.
- Las capturas anteriores y el informe adjunto son referencias; no acreditan el comportamiento de un rediseño aún no implementado.
- La primera captura llamada `catalog-desktop.png` tuvo viewport 1143×643; se descarta como evidencia de 1440 px y se reemplaza por `classrooms-1440.png` con métricas explícitas en la misma llamada.
- La revisión visual detectó el editor de actividad fuera del shell, debajo de un área vacía. Se corrigió su ubicación y repitieron interacción y geometría; el encabezado queda a 94 px dentro de `main`.
- La maqueta no incluye todos los pasos funcionales: ilustra el editor del plan, editor común de actividad, carga y resultados. El recorrido completo, transiciones y recuperación están definidos en el documento; requieren implementación e integración para probarse.
- No se ejecutaron tests de aplicación porque sólo cambian documentos/maqueta. Pendientes: pruebas con docentes, lector de pantalla, zoom nativo, persistencia, permisos, accesos cortos bajo concurrencia, protección frente a intentos masivos y semántica de reintento de lotes.
- Engram no recibió escrituras: el host no confirmó identidad de sesión después de la compactación. La continuidad queda en el repositorio.

## Estado y siguiente paso

Diseño detallado y vista previa listos para revisión. Las decisiones de invitaciones múltiples y vigencia del código hasta regeneración están incorporadas; el máximo propuesto de 50 destinatarios por tanda y demás detalles de interacción no se presentan como decisiones ya aprobadas. Primer paso pendiente: revisión del diseño detallado y autorización de implementación. Luego cerrar idempotencia de lotes y controles del código antes de desarrollar esas rutas. Sin cambios de producto, commits, integración, publicación ni despliegue.

## Segunda revisión visual y prototipo funcional

El usuario rechazó la identidad visual anterior y pidió recorrer los flujos de Mis aulas de principio a fin. Se sustituyó la maqueta estática por el prototipo HTML y su script local. Se tomaron como referencia las capturas del catálogo e interior y el CSS actual de la cabecera docente. El prototipo reutiliza recursos del repositorio y conserva cambios de ejemplo en el navegador.

La corrida de Ego Lite recorrió 20 comprobaciones desde filtros hasta publicación, tema/deshacer, muro, Biblioteca, autoría manual y Foxy, invitaciones con fallo y reintento, regeneración e ingreso, archivo y reactivación, y persistencia. Se verificó geometría interior a 390 y 320 px. Otra corrida comprobó el requisito del archivo, la propuesta de plan, el foco tras cerrar Biblioteca y la escala de iconos en cabecera. Se revisaron capturas de catálogo, interior y creación móvil. Los scripts y las capturas están en `.test-artifacts/teacher-design-20261111/` con prefijo `revised-`.

Dos intentos previos fallaron por selectores ambiguos del guion de QA y se corrigieron. La inspección también detectó que el selector de portada sobredimensionaba iconos internos y se acotó su alcance. Los datos sintéticos usados para QA se retiraron de la maqueta al terminar. Los resultados y el hash del candidato anterior corresponden sólo a la primera revisión.

Alcance de la simulación: la revisión de archivo valida extensión y tamaño y conserva metadatos. Foxy, correo, visor de archivo e ingreso se simulan localmente. Los estados avanzados de integración, reintentos de red y concurrencia requieren el producto. La dirección visual revisada se entrega para revisión.

## Revisión de jerarquía, fluidez y espera

Por pedido del usuario se pulió la maqueta desde la tarea docente. Se incorporaron accesos a preparar clase en Plan, tarjetas de elección manual/Foxy, indicador de pasos con selección y completado, carga de archivo con estado y reemplazo, metadatos opcionales desplegables y rúbrica progresiva. Se ajustaron tamaños, espacios, elevación y peso de acciones. Los avisos de éxito flotan sin desplazar contenido.

Las operaciones simuladas de carga y generación muestran estado accesible e indicador indeterminado. La generación de actividades agrega estructura provisional animada. El retardo de 700 ms pertenece a la simulación. La cancelación invalida callbacks pendientes. Reduced-motion conserva mensajes y elimina animaciones.

La verificación focalizada con `fluid-qa.mjs` comprobó metadatos desplegados al cambiar unidad, estado aria-busy, generación hasta revisión con rúbrica, creación con Foxy, cancelación y cinco secciones interiores a 390 y 320 px sin desbordamiento. El primer ensayo detectó una barra fija que interceptaba el botón de agregar criterio. Se corrigió su posición y pasó la segunda corrida. Se mantuvo opaco el diálogo durante su animación de entrada.

Evidencia en `.test-artifacts/teacher-design-20261111/fluid-*.png`. La captura llamada fluid-loading se obtuvo después de resolver la carga y acredita el resultado, mientras la observación DOM de la corrida acredita el estado transitorio. Revisión de capturas de Plan, carga y creación móvil. `node --check`, `git diff --check` y `npm run docs:check` correctos, con 106 archivos y 949 enlaces. Falta validación de comprensión con docentes representativos. El prototipo se entrega abierto en Ego Lite para revisión.

## Revisión de unidades, temas y registro de lo dado

Pedido vigente: mejorar unidades/temas en el paso 3 y en Plan, incluyendo las formas de marcar un tema dado. Cambios limitados al prototipo y su diseño; sin cambios de aplicación ni servicios. Trabajo en línea por el orquestador.

El editor ahora usa tarjetas de unidad numeradas, contadores, títulos que se actualizan mientras se escribe, filas de tema compactas y campos que crecen con el texto. Permite expandir/contraer, agregar y eliminar con deshacer inmediato antes de otra edición. El Plan incorpora progreso total y por unidad, filtros con cantidades, selección separada del check de avance y detalle con recursos agrupados y navegación anterior/siguiente. Ambas formas de marcar actualizan el mismo estado local, ofrecen deshacer y una animación breve que respeta movimiento reducido. El check de otra fila conserva el detalle consultado.

Evidencia focalizada: `units-qa.mjs` terminó correctamente, comprobando las dos formas de marcar, deshacer, filtros, nombres largos, agregar/eliminar/restaurar tema, expandir/contraer y avanzar a revisión. Editor a 390 px con todos los campos visibles sin scroll interno de texto; Plan a 390 y 320 px sin desbordamiento horizontal. Se inspeccionaron las capturas `units-plan.png`, `units-editor.png`, `units-editor-mobile.png` y `units-plan-390.png`. La comprobación adicional `units-final-02.mjs` verificó por aserción el check de otro tema mediante Espacio y su deshacer; con movimiento reducido la animación computada fue `none`. Las etiquetas secundarias del Plan se ajustaron a 12 px y el botón móvil de quitar tema a 44 px.

Incidentes de QA: ventana minimizada, selector de agregar ambiguo y selector de ID sin comillas se corrigieron en el guion/entorno. La corrida adicional llegó a los controles de marcado, deshacer y anchos, pero falló al intentar volver al catálogo para capturar; no se declara esa corrida completa como PASS. Una captura posterior del Plan se tomó directamente desde el estado visible. Evidencia bajo `.test-artifacts/teacher-design-20261111/units-*`.

`node --check docs/design/classroom-teacher-preview.js` y `git diff --check` correctos; aviso LF/CRLF del mapa ya existente. `npm run docs:check`: 106 archivos, 949 enlaces, cero problemas. No se ejecutaron pruebas de aplicación: la persistencia y el éxito aquí son locales/simulados. Pendientes integración real, lector de pantalla y prueba de comprensión con docentes. La maqueta queda para revisión visual, sin commits, publicación ni despliegue.

## Cierre de actividades y aula estudiantil

Resultado: editor común de tres pasos con borradores privados, propuesta Foxy editable, revisión y asignación explícita; lectura por objetivo/qué hacer/cómo entregar/preguntas/criterios; listado con filtros, conteos y acceso directo a entregas. Corrección compartida con evidencia TP (texto/adjuntos) o respuestas por pregunta; preparación local conservada al navegar, guardado privado, publicación y reentrega con historial. Los resultados anteriores se identifican como tales cuando llega una nueva recepción sin corregir. Se retiró la repetición de títulos en el detalle y se compactó la cabecera al trabajar en una actividad.

El aula estudiantil usa los mismos componentes y sus seis destinos vigentes. El selector de revisión conserva la actividad asignada al alternar roles; no representa un cambio de rol real. Incluye aulas por membresía ficticia, ingreso por código con vista previa/confirmación, Plan de consulta, consultas propias en Muro, Biblioteca de lectura, participación, Mi progreso y Compañeros sin correos ni resultados de pares. Se conservaron datos previos del navegador, incluidos los ejemplos creados por el usuario. Las nuevas actividades y personas de demostración se inicializan una sola vez.

### Evidencia observada por el coordinador

- `student-shell.mjs`: seis secciones estudiantiles a 1440/768/390/320 px sin desbordamiento horizontal ni controles docentes; publicación de consulta con autoría Marina Demo correcta.
- `activity-tp-cycle.mjs`: texto/autoguardado al navegar, selección y adjunto separado, revisión/confirmación, recepción bloqueada, evidencia docente, corrección privada invisible y publicación visible al estudiante.
- `activity-authoring.mjs`: cuestionario manual con selección única, guardado y recuperación tras recargar, vista previa sin clave, asignación; generación simulada con `aria-busy=true`, dos preguntas editables y mismo recorrido de revisión/asignación.
- `activity-question-cycle-02.mjs`: cuestionario confirmado y evidencia docente comprobada antes de una falla de navegación; no se declara PASS completo. `activity-exam-cycle.mjs` retomó la evaluación y terminó correctamente: inicio explícito, desarrollo/única/múltiple, advertencia de dos incompletas, recepción, corrección local preservada entre roles y nota cero privada.
- `activity-responsive-final.mjs`: corrección, resolución y editor hasta 320 px sin desbordamiento; nota cero conservada tras recarga, borrador autor oculto al estudiante y acceso directo a entregas.
- `activity-boundaries.mjs`: aula archivada en consulta, reactivación, reentrega autorizada con historial y etiqueta de devolución anterior, ingreso estudiantil por código con confirmación.
- Capturas inspeccionadas: lista docente; autoría Foxy y revisión; TP docente/estudiante; corrección, resolución y autoría móviles. Archivos/scripts bajo `.test-artifacts/teacher-design-20261111/activity-*`, `activities-list.png` y `student-*`; evidencia local no versionada.
- `node --check` de ambos scripts y `npm run docs:check`: correctos; 106 archivos, 949 enlaces, cero problemas. `git diff --check` sin errores en el diff rastreado, con aviso LF/CRLF previo del mapa.

El trabajador informó dos verificaciones Node VM con DOM mínimo sobre fixtures, privacidad, confirmación, reentrega y autoría. Son evidencia atribuida; el coordinador verificó los recorridos en Ego Lite. El explorador no encontró defectos concretos en el acople de navegación/roles base dentro de su alcance de lectura.

### Incidentes y límites

Dos comandos de edición PowerShell fueron rechazados por parseo y se sustituyeron por parches. Un primer parche de guion QA falló por saltos de línea y se corrigió antes de ejecutar. Dos llamadas de navegación de QA informaron elemento fuera del viewport emulado; se inspeccionó el estado, se retomó desde lo efectivamente completado y se usó altura 700 px para interacción. Los errores no se contabilizan como recorridos completos. El harness VM del trabajador requirió completar un stub de `window.addEventListener` antes de sus comprobaciones.

La revisión UI conserva datos ficticios en el navegador; IA, archivos y recepción no usan servicios reales. Los adjuntos sólo tienen nombre/tamaño; no se valida contenido PDF ni se ofrece visor real. La selección múltiple de la maqueta usa opciones de ejemplo; el contrato completo, concurrencia, permisos de servidor y límites de proveedor requieren integración. No hubo pruebas de aplicación ni gasto de API. Faltan lector de pantalla, zoom nativo y validación con docentes/estudiantes representativos. La maqueta queda para revisión; no se implementó el producto ni se hicieron commits, push o despliegue.
