# Fidelidad Foxy y Mi estudio

- Agente: /root/astra_ai_fidelity, implementación frontend delegada.
- Fecha: 2026-11-15. Rama: codex/foxmind-product-parity.
- Worktree: C:/Users/alejo/.codex/worktrees/foxmind-product-parity/ProtipoFoxMind.
- Base: ef6828b96084b0fcaf9a883e4afb95e0871cf1d6; árbol con trabajo concurrente preservado.
- Autorización: coordinador comunica diseño de maqueta aprobado y ejecución frontend autorizada.
- Alcance: listado y creación de carpetas, Foxy/Estudio, toolbar, mensajes, paneles. Referencia readonly foxmind-ui-lab iter17. Skill frontend-design aplicada con dirección fijada.
- Fuera de alcance: contratos, backend, proveedores, secretos, commits/publicación, TTP y shell global.
- Estado: implementación en curso. QA de navegador y build coordinados por root, sin reiniciar servicios.
- Inspección: AGENTS, arquitectura, política documental y work-log leídos; git status, branch y HEAD comprobados.

## Implementación y evidencia local

- `apps/shared-ui/parity-ai-fidelity.css`: tokens/medidas de iter17 aplicados mediante clases semánticas estables (independientes del compilador CSS Modules): toolbar, chat, composer, mensajes, welcome, drawers, contexto, colección y sesiones de repaso.
- `FoxyChatLayout.tsx`: clases de presentación y eventos de entrada/salida del chat coordinados con el dueño del shell; los paneles conservan el composer montado.
- Foxy workspace/collection: contexto en dos líneas, bienvenida con dos sugerencias, hint de teclado, biblioteca con fuentes autorizadas del aula consultadas por el controlador existente.
- Study workspace/wizard: listado con Activas/Borradores, filtros secundarios (incluye Archivadas), privacidad en portada, metadatos reales; bienvenida, composer y fuentes propias/vinculadas. Copy de cuatro pasos alineado a referencia. Plan: presentación de sesiones, sin alterar confirmación de Agenda.
- CSS Modules agrega sólo clases propias de welcome y filtros. Superficies ya modificadas por trabajo anterior se preservaron; el diff total no representa únicamente esta delegación.
- `npx tsc --noEmit -p apps/web/tsconfig.json --incremental false`: PASS, repetido tras los últimos cambios.
- `npx eslint` sobre layout, Foxy workspace/collection y Study workspace/wizard/creation-dialog: PASS.
- `node --test` sobre foxy-workspace, foxy-workspace-start, foxy-context-view, foxy-collections y foxty-study-demand-panels: 47/47 PASS. Primer intento: 46/47, el entorno de hooks no tenía dispatchEvent; llamada opcional al evento de shell corregida, sin editar pruebas.
- Parse de `parity-ai-fidelity.css` con PostCSS: PASS. `git diff --check` de superficies asignadas: PASS (sólo avisos Git LF/CRLF).

## Límites y siguiente paso

- No se ejecutó navegador ni build ni reinicios desde este agente; root coordina QA visual sobre preview3002 y la comparación con referencia4173.
- No se ejecutaron proveedores IA ni se usaron datos/credenciales adicionales. Datos visibles siguen viniendo de APIs existentes.
- El contrato StudyFolder no contiene materia/subject presente en la maqueta. No se inventó ese dato ni se extendió el modelo: la tarjeta usa nombre/año/origen existentes. El campo requiere decisión/implementación de producto fuera de este corte frontend si se exige igualdad literal.
- Estado: implementado y comprobado estáticamente/con pruebas focales; fidelidad visual pendiente de verificación del coordinador. Primer paso: capturas desktop/mobile de listado, chat y paneles, ajustar diferencias observadas.
- Sin commits, push, PR ni despliegue.

## Corrección QA v3

Root aportó capturas app/reference Foxy 390x844 y1440. Se confirmó doble padding del shell, altura excedida y Nuevo chat desplazado a una fila propia por una regla CSS Module heredada.

- Se neutralizó padding exterior sólo cuando existe `.parity-ai-chat`, dejando el main a100dvh con padding7x6 móvil/10x14 desktop y box-sizing explícito.
- Toolbar móvil fija contexto en fila1 y accesos/Nuevo chat en fila2.
- Coordinado con dueño de AppNavbar: toolbar incorpora botón menú, evento `foxmind:chat-menu`; shell oculta su header móvil sin esconder el drawer.
- Historial/Herramientas/Creaciones/Adjuntar tienen aria-label explícito. `ChatAttachmentControls.tsx` recibió únicamente ese nombre accesible.
- Contexto general usa etiqueta secundaria y bienvenida móvil ajusta ilustración78px y márgenes.
- TypeScript volvió a pasar. Pendiente recaptura root tras HMR.

## Corrección QA v4 (freeze)

- Capturas producción v3 comparadas a1440/390: composer comprimido por height47px!important legado; disclosure absolute debajo del formulario quedaba fuera del recorte del chat.
- Disclosure pasa a fila hermana del formulario, texto igual referencia para ambos roles. Composer146px desktop/134px móvil, textarea64px!important; welcome desplazado20px arriba para compensar jerarquía/espacio restante.
- Contador Biblioteca derivado de fuentes/adjuntos existentes; nombres accesibles explícitos Biblioteca/Nuevo chat. Prompts con iconos naranja, tipografía500 y arte/orbitas alineados.
- Clase semántica del cuerpo renombrada parity-ai-conversation para no colisionar con parity-ai-chat del contenedor compartido.
- TypeScript PASS. Reejecución workspace+demand24:22PASS/2fallos por literal JSX Biblioteca con espacio tras agregar contador; conservado literal separado, sin modificar pruebas. Reejecución demand-panels6/6PASS.
- Freeze comunicado a root. Sin build/restart. Siguiente paso: recaptura del coordinador.

## Corrección del wizard de carpetas

- QA root aportó capturas1440/390 de Crear carpeta frente referencia. La estructura anterior sólo compartía cuatro pasos; no compartía el frame visual vigente de aulas.
- StudyWizard ahora usa el markup y clases de ese frame (`parity-classroom-wizard`, `class-builder`, rail, stage y footer). Los cuatro pasos conservan handlers, validaciones, importación de plan, edición y revisión; el footer está fuera de las dos columnas y permanece alcanzable.
- Sidebar244px con títulos/descripciones, PasoNde4, header84px desktop/70px móvil. Tres portadas principales y Ver más; conserva la portada previa si pertenece al catálogo adicional. No se agregó Materia al contrato.
- Vinculación opcional de aula movida al pasoEl programa. Se conserva importación/copia del plan; uploader propio se oculta mientras se elige copiar aula.
- Guardar y salir ejecuta la actualización existente y sólo cierra tras éxito. El borrador no se activa.
- TypeScript PASS, ESLint archivo PASS, study-sequence + study-feature8/8PASS. Sin build/restart ni navegador. Freeze comunicado a root; QA visual de cuatro pasos pendiente del coordinador.

## Bloqueo de dimensiones del wizard resuelto en preview

Root encontró modal560px y footer fuera del área accionable. Causas: max-width560px heredado de folders-controls.css y min-height100% de class-builder con selector más específico que su override. Se corrigió exclusivamente parity-study-wizard: width/max-width explícitos, cadena body/form flex con min-height0, builder con scroll interno y footer flex-none fuera del scroll.

Evidencia atribuida al coordinador: Ego3002 confirmó ancho1050 y footer visible/Continuar accionable en `.test-artifacts/study-wizard-fixed-dev-1440.png` y `study-wizard-fixed-dev-390.png`. Root continúa paso2 con aula seleccionada y validará el recorrido; reproducción producción pendiente del rebuild conjunto que ejecuta root. Freeze conservado.
