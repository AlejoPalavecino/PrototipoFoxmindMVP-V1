# Fidelidad del interior de aulas y actividades

Agente: /root/astra_classroom_fidelity, delegado por coordinador. Fecha: 2026-11-15.
Worktree: foxmind-product-parity/ProtipoFoxMind; rama codex/foxmind-product-parity, base ef6828b.
Alcance autorizado: presentación iter17 en aulas y actividades de ambos roles. Preservar comportamiento, datos y trabajo concurrente. Sin backend, contratos, secretos, commits o publicación.
Referencia: design/foxmind-ui-lab del worktree foxmind-ui-lab (solo lectura).

## Trabajo
En curso: masthead, Plan, Biblioteca y Progreso; luego superficies de actividad.
## Evidencia
Leídas reglas, arquitectura, política documental, frontend-design y fuentes iter17. Inspeccionadas capturas reales/prototipo provistas por coordinador.
## Límites
Comparación Ego y build coordinados por root; no ejecutados por este agente.
## Próximo paso
Implementar candidato y verificar tipos/pruebas focales.

## Candidato implementado
- Header blanco con miniatura 76 px, identidad y KPI enlazados a Plan/Actividades; conteos obtenidos de las proyecciones existentes, sin datos demo. CTA de estudiantes conserva navegación.
- Plan con rail 300 px, filas compactas, tema en encabezado naranja, recursos con acciones legibles y resumen en encabezado. Estado docente y controles de avance preservados.
- Biblioteca con búsqueda y filtro unidad/tema, lista continua, formato/descripción/vínculos reales.
- Progreso self con donut, promedio publicado y devoluciones; se conserva listado de estados y consulta de avance.
- Lista/lectura/respuesta de actividades y corrección: geometría y tonos iter17, contratos existentes conservados.
- CSS propio: apps/shared-ui/parity-classroom-fidelity.css; import delegado al dueño del shell.

## Comprobaciones observadas
- Primer intento de script Python falló antes de editar por encoding cp1252; repetido con PYTHONUTF8=1.
- Primer npx tsc reportó tipo Extract inválido para unión self/member y una condición redundante; corregidos.
- node node_modules/typescript/bin/tsc --noEmit --project apps/web/tsconfig.json: PASS (dos ejecuciones luego de corregir y agregar KPI).
- node --test tests/product-parity-library-ui.test.mjs tests/product-parity-activity-ui.test.mjs tests/brujula-grading-ui.test.mjs: PASS 20/20.

## Límites y siguiente paso
No build/reinicio/navegador por coordinación con root. No se acredita fidelidad exacta ni responsive hasta comparar candidato vía Ego. Muro, miembros y ajustes conservan implementación previa y necesitan comparación del coordinador. Autoría/participación/corrección conservan flujos previos con ajuste visual parcial, no equivalencia completa acreditada. Sin commits/push/deploy. Próximo paso: root revisa capturas del candidato y devuelve diferencias concretas para segunda pasada.

## Lote 2 y comparación v2
Implementados Muro, miembros/ajustes, autoría, resolución, recibo y corrección con geometría de fuentes iter17. Navegación usa Estudiantes/Ajustes. Autoría mueve plazo al lateral de Consigna conservando handlers, validación y confirmación explícita.
Progreso docente ahora muestra métricas, barras por actividad, histograma y recorrido individual con datos de ProgressData. Limitación contractual: no existe estado de revisión privada en esa proyección; se presenta Sin devolución sin fingir distinguir revisión guardada/pendiente. Nota cero se incluye, ausencia de nota nunca genera resultado.
Inspeccionadas capturas app/reference Plan y Actividades v2 1440 y 390 provistas por root. Corregidas cascadas legadas: mast blanco128px, KPI vertical68px, breadcrumb, espacio tabs/Plan, botón Invitar abre modal existente, marcar tema en cabecera, filtros secundarios al pie de rail. Actividades usa pestañas Compartidas/Borradores privados con conteos y selección inicial compartidas; Retiradas aparece sólo si existen. Fecha/conteo real de entregas dentro de contenido; símbolos y títulos ajustados. Mobile mast grid167px y tabs4x2 docente/3x2 alumno. Requiere nueva observación v3.

## Verificación del candidato congelado
- tsc web PASS tras último cambio DOM de autoría.
- product-parity-activity-ui: 10/10 PASS tras último cambio.
- product-parity-activity-ui + classroom-plan-filters + parity-progress-fidelity + p8-progress-client + product-parity-invitation-ui: 22/22 PASS previo al último movimiento DOM (actividad repetida después).
- Suite lote2 activity/grading/invitation-batch/agenda-notification UI: 25/25 PASS.
- Suite Muro/Plan/Progreso: 6/6 PASS. Falló inicialmente guard estático de landmark Estudiantes actuales al extraer TeacherOverview; restaurado landmark semántico, sin modificar la prueba.
- Nuevas parity-progress-fidelity: 2/2 PASS para publicación de nota cero, ausencia de nota, separación entrega/devolución y callback de recorrido. Primera corrida falló por selector de prueba demasiado exacto (dos clases); selector corregido, producción sin cambio.
- Fallos de inspección rg con glob de Windows en argumento literal: repetidos con directorio y -g. No afectan candidato.

Freeze solicitado por coordinador confirmado. No cambios adicionales de código hasta hallazgos v3; root opera reinicio/build/navegador. No se afirma fidelidad exacta antes de QA visual final. Sin commits/push/deploy.


## Corrección estructural tras QA estable v3
Entrada Crear actividad abre Alcance directamente con temas/unidades, tipo y modo manual/Foxy. La idea privada es obligatoria y generar requiere acción explícita; un guard impide duplicar solicitud. El flujo conserva propuesta editable, guardado privado y confirmación independiente de publicación. Cabecera enfocada y footer de acciones reemplazan el modal inicial.
Plan móvil usa Elegir tema y diálogo; rail sólo desktop. Coordinador autorizó adaptar selector/aserciones acopladas al select en classroom-plan-filters manteniendo NEXT/TAUGHT, detalle vacío y ausencia de escrituras.
Lectura usa resumen por tipo, desafío/objetivo/materiales y rúbrica, cabecera blanca y pie fijo. Resolución conserva autosave y revisión de envío con barra fija. Comprobante ya no repite todas las preguntas: consulta mediante diálogo; revisión docente usa cabecera enfocada y pie fijo. Tamaños se basan en participation/grading-polish de iter17; contratos reales conservan límites de archivos y texto aunque difieran del demo.
Verificación: tsc PASS; product-parity-activity-ui + classroom-plan-filters 11/11 PASS. Durante implementación se corrigió JSX residual del selector y propiedad savedAt faltante; sin tocar backend ni estado retenido. Falta QA visual del nuevo candidato y pruebas de entrada agregadas.

Freeze v4: tsc --noEmit --project apps/web/tsconfig.json PASS. Suite conjunta product-parity-activity-ui, classroom-plan-filters, parity-authoring-entry, parity-progress-fidelity, p8-progress-client: 16/16 PASS. Nuevo test comprueba método obligatorio, idea privada requerida, ausencia de escrituras y una única solicitud explícita de generación. QA visual/interacción final a cargo del coordinador, pendiente. No pruebas con proveedor pago. No edición adicional tras este freeze salvo hallazgos del coordinador.

Ajuste v4.1 solicitado por QA: panel de IA de corrección compacto, expandible con botón; conserva consulta de disponibilidad y aplicación explícita, sin generación automática. Tipografía docente reforzada. tsc PASS y actividad/corrección UI 10/10 PASS repetidos. Freeze reconfirmado.

## Ajuste v4.2 por comparación DkuY9
QA encontró transform final de fox-enter en p5-surface que capturaba footer fixed y dejaba Continuar fuera del viewport. Desactivada animation/transform sólo cuando contiene una tarea enfocada; demás superficies conservan entrada. Reemplazado pseudo 100vw por extensión visual sin ancho de layout; restaurados estado de guardado y alineación derecha de botones frente reglas legadas. Clases semánticas para alcance/tipo, resumen azul, separación8px, títulos22/800 y logo /brujula/logo.webp. Progreso refuerza títulos de cards. tsc PASS; entrada/actividad/progreso 13/13 PASS. No navegador/build propios. Requiere QA de geometría y click sin force sobre build actualizado. Freeze v4.2.

Corrección final de asset: ActivityAuthoring y ActivityGeneration usan /foxmind/logo.webp, comprobado existente en apps/web/public/foxmind/logo.webp y coherente con AppNavbar. Test de entrada 1/1 PASS; tsc PASS. Búsqueda /brujula/logo.webp sin coincidencias en src/shared-ui. Coordinador confirmó v4.2: footer fullviewport, sin overflow y recorrido hasta Revisión móvil con clic normal. Freeze tras corrección de asset.


## Flujo Foxy unificado y corrección móvil
Referencia inspeccionada: activity-authoring.js composeScope (231–280), composeGenerate (811–835) y composeNext (848–861). Idea requerida en Alcance, ajustes/fuentes secundarios en diálogo (duración, nivel, fuentes y cantidad conservados), un único Generar propuesta. GenerationSetup pierde el subwizard. La generación solicitada aplica una vez el resultado válido como borrador privado mediante contrato existente y abre Contenido del editor común; revisión y publicación siguen explícitas. Recuperaciones posteriores no se aplican automáticamente. No se ejecutó proveedor real.
RED: nueva prueba encontró lista de tres pasos en GenerationSetup. GREEN: 3 pruebas de entrada/idea/multitema/ajustes sin generación/traspaso privado y 10 de actividad/corrección pasan (13/13). Coordinador autorizó adaptar E03 acoplado a tres submits; se conservan idea vacía sin requests, alcance, fuentes vacías, idea exacta y requests.length===1.
QA móvil mostró footer de corrección232px que interceptaba clicks. Recargar movido a navegación secundaria; guardar/publicar en dos columnas, estado compacto, reserva inferior155px y scroll-margin; cabecera alineada a izquierda. Pendiente repetir observación real en build. tsc PASS antes del guard final de recuperación; se repite al congelar.

Freeze del flujo Foxy unificado: tsc PASS y nuevas pruebas3/3 PASS tras guard final; suite conjunta previa13/13 PASS. Sin proveedor, build, restart ni commits propios. Pendiente QA con candidato reconstruido.

## Último ajuste de superficies secundarias
Historial vacío ahora sin encabezado redundante, con Foxy decorativa y ancho completo; no altera registros existentes. Biblioteca ordena filtros antes del vacío y Agregar material ocupa ancho móvil. Muro/Estudiantes/Ajustes refuerzan tipografía de títulos, nombres y controles mediante data-classroom-tab y hooks semánticos. Fuente historyScreen/empty iter17 inspeccionada junto a captura final-teacher-history-1440. tsc PASS; biblioteca/invitaciones9/9 PASS. QA visual final pendiente del coordinador. Freeze.

## Reserva de espacio para carga TP móvil
QA release-student-upload-blocker-390 mostraba Subir archivo privado detrás del pie fijo. Ajuste limitado a Participation.module.css: reserva inferior160px en móvil, scroll-margin de controles y scroll-padding del documento sólo mientras existe TP con footer. Título Prepará tu entrega reforzado800. Captura inspeccionada; tsc PASS y product-parity-activity-ui10/10 PASS. Falta clic real postbuild para acreditar corrección geométrica. Freeze sin cambios funcionales/API.

Autoría en viewport bajo: reserva160px/175px bajo680px, scroll-margin de controles y scroll-padding condicionado al editor; estado de guardado no captura puntero. Copy de fuentes corregido a PDF/Word/PowerPoint según document-formats.ts y activity-ai/source.ts (20MBtotal), worker PDF100p y lectores200k caracteres; etiqueta Extensión y voseo. tsc PASS y entrada3/3 PASS. Falta QA geométrica en638px; freeze.

Resultado publicado del estudiante: inspeccionada release-student-feedback-390 y grading-polish iter17. Hook parity-student-result condicionado a audience student; tarjeta nota con padding20/24, radio19, jerarquía800 y nota38/46; devolución/criterios en columnasdesktop y apiladosmóvil. Hooks compartidos son neutrales fuera de resultadoestudiante; contenido/privacidad/persistencia intactos. tsc PASS y actividad/corrección10/10 PASS. No browser/build propios; comparación390/1440 postbuild pendiente root. Freeze.

## Tarjetas móviles comprimidas
Causa comprobada en fuente: brujula-parity.css media800 mantiene grid-row1/3 en acciones/icono de antigua grilla3columnas. Nueva grilla2columnas sólo había cambiado grid-column del CTA; ocupaba filas1–2 y empujaba contenido por autoposición a columnaicono50px. Fix CSS semántico define áreas symbol/content/actions y ubicación completa de los3hijos para ambosroles≤800; tamaños72px tablet/50px≤600, texto minmax0/1fr. Captura cut-student-activities-390 inspeccionada. tsc PASS y actividad10/10 PASS; falta QA geométrica320/390/768 y docente del build por root. Freeze, sin DOM ni comportamiento cambiado.
