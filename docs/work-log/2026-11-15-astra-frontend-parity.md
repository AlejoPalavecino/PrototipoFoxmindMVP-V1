# Paridad visual del frontend aprobado

- Agente: `/root/astra_frontend_parity`, implementación frontend; identificador de sesión no expuesto.
- Fecha: 2026-11-15. Rama: `codex/foxmind-product-parity`. Base: `ef6828b`.
- Worktree: `C:/Users/alejo/.codex/worktrees/foxmind-product-parity/ProtipoFoxMind`.
- Autorización: coordinador transmite aprobación vigente del usuario para reproducir la maqueta aprobada; lote 1 autorizado: shell e Inicio de ambos roles.
- Referencia de lectura: `foxmind-ui-lab/design/foxmind-ui-lab`, fuentes CSS/JS y HTML aprobado. No modificar referencia, backend, permisos, modelos, TTP ni trabajo ajeno.
- Superficies: `apps/shared-ui`, UI de Inicio en `apps/web`. Preservar datos, estados y navegación reales.
- Evidencia inicial: inspección de cascada y JSX; capturas Ego del coordinador `app-student-before.png` y `prototype-student.png`. SHA-256 idéntico para Nunito y seis recursos de referencia comprobados.
- Hallazgos: skins previas alteran tipografía, márgenes y controles; shell usa dimensiones y marca distintas; tarjetas de aulas difieren estructuralmente.
- Estado: implementación lote 1 en curso. No se ejecutaron build/reinicio/navegador; reservados al coordinador durante comparación.
- Próximo paso: corregir presentación, ejecutar comprobaciones focalizadas y entregar candidato para comparación real.

## Lote 1 — candidato para comparación

- Portado CSS de Home/widgets/day-widget/alignment en su orden original, con reset acotado al Inicio; eliminada capa aproximada que forzaba pesos 900/850 y radios distintos.
- Shell: ancho 232 px (208 px intermedio), contenido 1200 px, marca y recurso aprobados, búsqueda completa, ayuda informativa, etiquetas y espaciado. No incorpora barra de demostración.
- Inicio: ilustración completa, hasta tres actividades reales, primera destacada y tono por portada, tarjetas aula con enlace completo y progreso final. No inventa conteos de estudiantes que HomeRoom no suministra. Miniagenda conserva siete días y accesos reales.
- `node --test tests/home-by-role.test.mjs tests/home-miniagenda-reference.test.mjs tests/home-warm-navigation.test.mjs`: 20/20 PASS antes del cambio pendiente de navegación de cuenta.
- `node --test tests/home-parity-navigation.test.mjs`: 2/2 PASS; acciones de actividad abierta/cerrada y enlace aula con click normal/modificado.
- ESLint focal sobre AppNavbar, NavbarParts, NavigationSearch y tres componentes Inicio: PASS.
- Fallo observado: reemplazo inicial de HomeClassCards dejó JSX residual; test y lint lo detectaron, archivo reescrito y checks repetidos correctamente. Comando inicial rg con glob Windows no expandido falló; repetido usando directorio + `-g`.
- Estado: implementado, pendiente comparación visual por coordinador; sin build, navegador, commits ni publicación. Cuenta directa y traslado de cerrar sesión coordinados con dueño Perfil; notificaciones principal a página completa asignado a ese agente.

## Corrección de cascada y lote 2

- Ego del coordinador detectó Inicio oculto tras el primer portado. Causa identificada: asignar `selectors=[]` en PostCSS normaliza a selector vacío; se prefijaron por error reglas descartadas sobre el componente raíz. Generación corregida filtrando antes de asignar; guard ejecutable exige una única regla raíz prevista y ninguna raíz `display:none`. Regresión corregida y Inicio móvil visible confirmado por coordinador.
- Shell móvil: menú y búsqueda de 44 px, marca inline, barra de 60/64 px. Chat emite/escucha eventos de entrada/salida y menú; rail automático no sobrescribe preferencia persistida. En móvil chat conserva drawer con navbar de altura cero; coordinación con agente AI para toolbar.
- Cuenta enlaza directamente a `/profile`; agente Perfil conserva logout real. Prueba RED de nueva navegación (9 fallos esperados), luego GREEN.
- Colección: hero, cards completas, invitaciones, borradores y estados con datos reales; filtros extra cerrados detrás de botón Filtros, contador y chips, vista lista/tarjetas conservada según decisión del coordinador.
- Wizard aula: rail 246 px, preview, pasos previos navegables, cuerpo con scroll y footer completo. CSS propio `parity-catalog-fidelity.css`; no modifica estilos compartidos de creación de Estudio. Conserva validación, carga, análisis explícito, revisión, persistencia y errores.
- Imports coordinados: catálogo, interiores, Agenda/cuenta y AI al final de `_app`.
- Pruebas: colección/controles/pendientes 12/12 PASS; wizard 8/8 PASS; invitaciones UI 7/7 PASS; filtros puros 3/3 PASS; compatibilidad colección 5/5 PASS; home-client 2/2 PASS; navegación/guard Home 3/3 y navegación shell 9/9 PASS; cards de datos 2/2 PASS.
- Tests iniciales de colección fallaron por contrato UI previo (botón aislado, filtros siempre visibles, etiqueta Pendientes); se actualizaron hacia enlace completo, apertura explícita de Filtros y Borradores preservando aserciones de orden, filtros, callbacks, datos y roles. También detectaron porcentaje falso en plan vacío, corregido conservando la regla previa (sin barra, Sin temas/No disponible).
- `npx tsc --noEmit -p apps/web/tsconfig.json`: PASS. ESLint focal de todos los componentes editados: PASS.
- Límites: no se ejecutó build/reinicio ni navegador por este agente. Comparación visual y capturas atribuidas al coordinador. Zona horaria editable y catálogo de portadas heredado siguen reales; no se fija Buenos Aires ni inventa conteos ausentes para copiar datos de ejemplo.
- Estado: candidato implementado y comprobado por pruebas focales; pendiente cierre de comparación por coordinador. Sin commits ni push.

## Congelamiento para QA estable

- Copy wizard alineado a referencia; zona actual compacta con Cambiar/Listo, conserva selector real y su valor. Tres portadas principales más portada legacy seleccionada, Ver más muestra catálogo completo sin reescribir selección.
- Controles de zona y portada usan estado del wizard y componentes de presentación sin hooks propios. El harness de pruebas se actualizó para expandir el nuevo componente de portada; no modifica reglas de carga, análisis ni publicación.
- Wizard actualizado: 9/9 PASS, incluyendo conservación explícita de portada legacy y selección manual. TypeScript y ESLint focal PASS tras estos cambios.
- Congelado para build/QA del coordinador. No editar durante capturas hasta recibir lote correctivo concreto.

## Corrección geométrica tras QA de producción

- La marca desktop conservaba height:88px de skins previos pese a min-height:44px. Se fija altura de 44px y se adopta el ritmo final de chat-expansion.css de referencia (padding superior 22px, separación 20px y variante de viewport bajo), sin toolbar de demostración.
- Se elimina padding-top adicional del main privado, observado por coordinador en 23px en Plan móvil; se conserva el inset del contenedor y se excluyen chats.
- Perfil monta navbar fuera de p5-app: se normalizan wrapper y ancho/márgenes del navbar móvil para evitar el desborde derivado de gutters académicos. Coordinación con agente Agenda/cuenta para contenido del perfil.
- En colección desktop, filtros avanzados y selector de vista comparten fila con estado/búsqueda. Funciones y estado conservados; responsive menor sin modificación.
- Validación: node --test tests/home-parity-navigation.test.mjs tests/home-warm-navigation.test.mjs tests/classrooms-reference-controls.test.mjs: 15/15 PASS. Cambios de esta ronda exclusivamente CSS; pendientes capturas del coordinador para geometría final. No build, restart, browser ni commit por este agente.
- Candidato congelado nuevamente para QA.

## Regresión próximo tema y margen de perfil

- RED reproducido sin modificar aceptación: brujula-home-complete fallaba por ausencia de nextTopic en cards de Inicio (8/9 PASS). Se recuperan unidad, tema y Abrir tema con topicId exacto del DTO. Botón independiente del enlace del aula para evitar controles interactivos anidados; conserva enlace al plan y clic modificado del navegador.
- GREEN: brujula-home-complete + home-parity-navigation 12/12 PASS. TypeScript PASS.
- QA de coordinador encontró margin:12px 16px 0!important heredado de brujula-fidelity.css:150 en perfil. Override móvil específico neutraliza ese margen con igual importancia; no oculta overflow.
- Congelado para nueva comparación del coordinador; sin build/reinicio ni navegador propio.

## Corrección explícita: Inicio y navbar literales

- Nueva decisión del usuario: eliminar de Inicio elementos ausentes en la maqueta vigente, incluso accesos anteriormente protegidos. Reemplaza expectativas de borradores globales, últimas devoluciones, ordenar entregas y Abrir tema; contratos backend permanecen intactos.
- Alcance propio: Inicio, presentación y navbar/CSS; sin catálogo, interiores, proveedores ni datos. Primero se actualiza aceptación visible y se reproduce RED.
- Miniagenda de referencia muestra cinco días y eventos del día. Contrato Home proyecta próximos eventos; se investiga antes de filtrar para evitar un falso estado vacío.

### Candidato literal de Inicio listo para comparación

- Eliminados del render Inicio: borradores globales, últimas devoluciones, ordenar pendientes, footer Abrir tema, paginación docente y modal global de actividades. La decisión explícita reemplaza las pruebas anteriores que requerían esos elementos; el backend y sus datos se preservan.
- Máximo1200px centrado en Inicio; tipografía base500. Widget docente de una entrega alineado al inicio para conservar fila compacta. Mantiene variants fuente de una/dos/tres actividades y layoutresponsive. Tono por portada, avatars alternados por grupo, CTAplay antes del texto, singular1entrega y fechas sin coma.
- Agenda diaria: cliente ya existente de Agenda, consulta semana completa paginada y muestra eventos propios del día (incluidos pasados), zonas y solapamiento all-day. Cinco días Lun–Vie con indicadores reales, hora inicio/fin, duración en horas/minutos. Fallos no se convierten en vacío; reintento real. Sin cambios backend.
- Colas docente completan páginas sin controles extras; fallo/cursor repetido/límite100páginas produce error explícito de sección, nunca truncado silencioso. Aulas muestran studentCount sólo si el DTO de colección lo provee.
- Footer alumno usa callback local que abre Activities del aula activa, validando aula existente/noarchivada antes de delegar. ClassroomView conserva lectura autorizada habitual. No se amplía HomeTarget/rutas compartidas.
- Navbar: eliminada reserva15px scrollbar, pathsopt-in de core.js sólo en Inicio/navbar/search, menú272px bajoheader60/64 con marca/búsqueda/enlaces/aulas/perfil; título accesible sin encabezado visible, foco/Escape y cerrar permanecen. Botones móviles con fondo/radiofuente y rail76px.
- Asset foxy.webp SHA256 idéntico a referencia:25301D04F8276044EC63A0816F0120F15C3A57AF6ADD220D247EC6DB7D6A967D. No se alteraron portadas/avatars/cuentas guardadas.
- RED:4fallos esperados al reemplazar aceptación de módulos extras/semana7días;3fallos esperados previolectorAgenda. GREEN:49/49 suitefocal; después limpieza/colores17/17 focal. TypeScript PASS y ESLint de14archivos PASS.
- Incidente de verificación: se incluyó por error p6-mobile-navigation (runnerintegración/browser) en un lote; interrumpido al detectarlo, exit1, no se cuenta como evidencia. Sin local:restart ni buildproductivo por agente.
- Fixturevisual existente tests/helpers/home-reference/fixture.tsx extendido modoexact:3aulas,3entregas en2grupos,2pendientes y2eventos de la fecha sintética. Preparar con node tests/helpers/home-reference/harness.mjs y servir comando que imprime; no ejecutado por este agente.
- Queryrender preparado para authorName opcional real (avatar de usuario si falta), proyección de ese campo delegada al agente Agenda/cuenta por coordinador.
- Estado: congelado para build/QA1920/1440/390 y menú por coordinador. Implementación/tests no acreditan por sí mismos paridad visual.

### Lote final de tres detalles observados por Ego

- SVG del menú móvil neutraliza color naranja heredado con #52677d; sin cambios de eventos/foco.
- Ver mis aulas muestra flecha antes del texto como el helper de referencia.
- Drawer usa wrapper de notificaciones de navegación y explicita fila46px con texto y contador, anulando la presentación compacta anterior. Sólo presentación, sin lógica de bandeja.
- Tests home-warm-navigation + home-parity-navigation:13/13 PASS. Pendiente recaptura visual por coordinador; congelado para reconstrucción conjunta.

### Corrección de fronteras de arquitectura

- lint:boundaries del coordinador detectó tres imports de tipo cruzados desde Home hacia agenda/api. Se reemplazan por puerto HomeAgendaReader propio en home/api/home-api.ts, con list y DTOAgendaRange/AgendaPage del dominio compartido. La aplicación sigue inyectando el mismo cliente estructuralmente compatible.
- Sin cambio de comportamiento, CSS, backend ni reglas de lint.
- Verificación:11/11 tests (home-daily-agenda y brujula-home-complete) PASS; TypeScript PASS; npm run lint:boundaries PASS: Architecture AST boundaries passed (0 frozen exceptions).
- Congelado para reconstrucción del coordinador.
- QA adicional rail: marca centrada en76px, contador oculto sólo en raildesktopplegado y flecha de expandir arrow-right como referencia. Drawer móvil conserva contador. Navegación shell9/9 PASS. Mismo lote, congelado.

## Corrección explícita de tarjeta única del estudiante

- El usuario reemplaza la variante horizontal only-child de escritorio: una actividad debe conservar tarjeta vertical y ancho de una columna, igual a una tarjeta cuando hay dos. No se inventa otra actividad ni se ensancha la única.
- Alcance autorizado: sólo parity-home.css; conservar adaptación compacta móvil, datos y acciones. Coordinador realiza comparación Ego y rebuild.
- Diff de producción: retiradas4reglas globales only-child (grid de una columna, tarjeta horizontal140px, cover expandida y footer columna2); cover144px para cualquier cardinalidad en container>500px. Las reglas compactas container≤500/300 permanecen intactas.
- Control focal existente home-parity-navigation:4/4 PASS (acciones/destinos, variantes de contenido y parseo/guard CSS). Sin tests nuevos que repliquen CSS, sin build ni cambios de otras superficies.
- Congelado; pendiente Ego de1/2actividades en escritorio y móvil por coordinador.

## Barra móvil de Inicio durante scroll

- Ego del coordinador comprobó que AppNavbar en Inicio permanece position:relative y sale del viewport al bajar, mientras la referencia conserva mobile-header sticky. Producto debe usar top0 porque no tiene toolbar demo.
- Corrección autorizada sólo en p5-app.entry-home, media≤1000; conservar altura64/60, márgenes, z-index y diálogo. Sin cambio de chat ni otras superficies.
- Diff: una regla en parity-foundation.css establece position:sticky;top:0 para el navbar hijo directo de entry-home en viewport≤1000. Ninguna otra propiedad geométrica/deapilado se modifica.
- Navegación focal existente:9/9 PASS. Congelado; quedan a cargo del coordinador scroll al fondo, abrir menú, Escape/foco y comprobación de escritorio.

## TASK-017 — Catálogo, invitaciones y unirse

- Decisión vigente: calcar catálogo y diálogos aprobados; retirar Filtros, tarjetas/lista y chips ausentes. Se reemplazan expectativas anteriores de esos controles, conservando tabs, búsqueda, estados y acciones reales.
- Alcance: colección/join/invitaciones y hoja nueva aislada. Wizard e interiores pertenecen a otros escritores. Coordinador verifica Ego y build.
- Invitation y preview no exponen coverKey; informado al coordinador antes de cambiar contrato. No se infieren portadas ni datos.
- Implementado: retiro de Filtros, tarjetas/lista y chips; tabs/búsqueda conservadas, foco tras borrar hacia Borradores. Ancho máximo1200 y toolbar de referencia mediante parity-classroom-collection.css. Estados vacíos y aviso de borrador recuperable según referencia; progreso sólo cuando wizardStep real está disponible.
- Invitaciones y preview comparten InvitationPreview exportado por la entrada pública: portada coverKey real opcional, materia, grupo/ciclo, docente real y beneficios. Ahora no cierra sin responder; Aceptar y unirme conserva confirmación real y protección de doble respuesta. Retirado control de rechazo ausente en referencia; callback/endpoint no eliminados.
- Ingreso por código conserva compatibilidad real con códigos anteriores y normalización6dígitos con espacios. Confirmar vuelve a Activas, limpia búsqueda y recarga; no abre interior. Publicar aula ya volvía al catálogo y ahora también limpia búsqueda/remonta pestaña activa.
- Import real pages/_app.tsx: agregadas parity-classroom-collection.css y parity-wizard.css (contenido wizard de otro escritor).
- TDD eliminación:2fallos RED por Filtros presente; tras retiro,19/19 pruebas catálogo/workspace/borradores/invitación/join PASS. Tests nuevos verifican imagen real, cierre sin mutación, preview antes de confirmar, token exacto y retorno sin autoentrada.
- tsc -p apps/web/tsconfig.json --noEmit --incremental false PASS. npm run lint:boundaries PASS,0excepciones. git diff --check PASS (warnings existentes CRLF). Primer intento tsc sin -p mostró ayuda porque no existe tsconfig raíz; corregido con configuración web.
- Corrida adicional wizard mientras su escritor modificaba tuvo24/26 con2fallos de controles/portadas; informado al coordinador, no se modificaron esas pruebas desde este agente. Los19tests propios pasaron después; aceptación final wizard corresponde a su escritor/coordinador.
- Congelado para build/Ego del coordinador. No browser/build/restart/commits desde este agente. Pendiente comparación real desktop/mobile, menús, scroll y confirmación; datos/portadas legacy pueden diferir de fixtures aprobados sin ser fabricados.

## TASK-017 — Corrección QA del diálogo móvil

- Ego390 detectó ancho/alto y footer heredados: botones apilados, código22px espaciado, heading violeta y cierre pequeño. Ajuste autorizado limitado a parity-collection-dialog y copia redundante de ingreso; conservar errores y datos.
- Referencia: ancho limitado por UA calc(100% - 2em - 6px), título21px móvil, padding20px, cierre44px, footer2columnas y código16px normal. Helper demo no se reproduce en producto.
- Implementado ajuste acotado: límite UA de ancho, padding responsive23/20, títuloink21pxmóvil, cierre44px con fondo, footerfila y botones flex1basis0, input16px sin espaciado, primary sin sombra y flecha de Ver aula a la derecha. Retirado helper redundante y su aria-describedby.
- Control focal product-parity-invitation-ui:9/9 PASS; diffcheck focalPASS. Congelado segundo candidato; Ego/build a cargo del coordinador. Altura puede ser menor que fixture porque se omitió la ayuda demo en producto, como solicitado.

## TASK-017 — Retorno de guardado y semántica de confirmación

- Runtime SGk: Guardar y salir persiste pero retorna a Activas; debe seleccionar Borradores. Creación confirmada usa aviso naranja; éxitos de catálogo deben ser verdes sin cambiar loading/info/error.
- onExit del wizard sólo corre después de save() exitoso. Se cambia el callback de catálogo y estado inicial de colección; no se publica ni se infiere éxito antes de persistencia.
- Implementado leaveSavedDraft posterior a persistencia: limpia búsqueda, retorna catálogo y selecciona Borradores; publicación/ingreso/aceptación retornan Activas. ClassroomCollection recibe estado inicial acotado a docente y se remonta cuando cambia la selección de retorno.
- Wiring adicional autorizado en screens/classrooms-screen.tsx: metadata opcional kind/collectionState junto departureNotice, consumida sólo por la misma cuenta y ruta Mis aulas. No se infiere éxito por texto ni se deja catálogo bajo URL Inicio.
- Aviso existente conservado con data-notice-kind explícito; CSS verde sólo para success. Info externa y errores mantienen su estilo. No se modificó contenido/flujo interior ni wizard.
- Test-first guardado: RED por initialState ausente; tras cambio16/16 PASS (invitaciones, ingreso, catálogo, retorno desde Inicio y rechazo de metadata ajena). tsc web sin incremental PASS; diffcheck focal PASS. Candidato congelado para Ego del coordinador; lint global en ejecución al congelar.
- Lint global final: npm run lint:boundaries PASS,0excepciones. Sin build/restart/browser/commit desde este agente.

## TASK-017 — Cascada del preview de invitación

- QA live: el diálogo anidado en parity-catalog hereda reset de botones y márgenes con mayor especificidad que el mismo diálogo abierto por código. Causa comprobada en CSS: selector catálogo añade p5-app + parity-catalog[class].
- Corrección limitada: elevar alcance de todas las reglas parity-collection-dialog mediante su tipo/clases reales y p5-app; mantener ambos previews bajo la misma regla. Título del aula con ink explícito. No modificar datos ni aceptación.
- Diff: reglas de diálogo ahora usan .p5-app dialog.p5-dialog.parity-collection-dialog; supera reset del catálogo sin !important ni cambiar otras superficies. h3ink explícito. Cierre, márgenes, fuente y footer mantienen los mismos valores de preview por código.
- Referencia móvil permite wrap del texto de CTA: footer .button flex1 con padding10px13px, sin nowrap ni altura fija; no se fuerza44px cuando aceptar necesita2líneas.
- Control focal existente3/3 PASS (selección, reintento y cierre sin escritura); diffcheckPASS. Congelado para Ego; no build/browser/restart.

## TASK-017 — Retomar el borrador más reciente

- Repositorio de borradores devuelve ORDER BY updated_at DESC,id. El banner usaba pending.at(-1) y ofrecía el más antiguo. Corrección acotada al primer elemento de la proyección existente, sin reordenar ni modificar datos.
- Test-first: RED mostró el nombre Anterior; cambio pending[0]; suite pending-classrooms7/7PASS con nombre e id recientes verificados. Congelado, sin otros cambios de producción ni build.
- Microcorrección autorizada antes build: ClassroomCollectionCard usa tema dado cuando total===1 y conserva temas dados para plural; sólo texto, sin layout. Congelado.

## TASK-017 — Acciones visibles en invitación a320px

- QA320x740: footer queda fuera del viewport al crecer el contenido. Corrección autorizada: sticky bottom0 dentro del scroll existente del diálogo, fondo opaco y z-index, compartida con formulario de ingreso. Coordinador probará geometría con CSSruntime antes de recompilar.
- Editado bloquebase del footer: position:sticky;bottom:0;z-index:1, conserva background:#fff y métricas. DiffcheckPASS; congelado. Geometría pendiente de Ego runtime del coordinador, no afirmada como verificada.
