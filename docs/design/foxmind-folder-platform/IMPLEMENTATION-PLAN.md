# Plan integral UX/UI — FoxMind Carpetas

**Objetivo:** una sola familia visual y recorridos claros desde el acceso hasta enseñar, aprender, entregar y corregir, manteniendo todos los contratos de V1. El usuario pide un plan para otro agente; no ejecutar producto en esta tarea.

## 1. Decisiones de este encargo
1. Adoptar Inicio v3 como ancla: carpetas de contorno fino, fondo blanco, mascota original, menta/coral/amarillo y naranja de acción. No reabrir exploración de estilos.
2. Inicio es el destino general tras login verificado. Mi perfil queda en el menú de cuenta. Registro no agrega un paso de completar perfil.
3. Respetar intención previa válida: una invitación o actividad abierta puede preceder a Inicio, nunca conceder acceso por el enlace.
4. Crear aula y Unirse con código viven en Mis Aulas, también para usuarios nuevos. Inicio vacío enlaza a Mis Aulas.
5. Una cuenta puede estudiar y enseñar en aulas diferentes. No elegir rol global al registrarse ni usar un switch que parezca cambiar permisos.
6. Toda V1 está incluida: auth, perfil, inicio, aulas, creación/admisión, cada pestaña por rol, archivos, participación, corrección, resultados, notificaciones y estados excepcionales.
7. Mantener navbar superior y pestañas del aula; no sidebar global, IA, rankings, rachas, pagos, certificados o funciones fuera de V1.
8. Mantener APIs, permisos y reglas académicas. Cambios de presentación no autorizan migraciones ni reescritura backend. Una brecha real de datos se documenta y resuelve con contrato mínimo, no con ficción.
9. Los mockups no imponen errores: prioridad a legibilidad, teclado, semántica y reglas funcionales. Las pantallas no dibujadas necesitan targets de referencia antes de grandes cambios.
10. Implementar en incrementos verificables; no declarar plataforma completa al terminar Inicio/auth.

**Precedencia:** instrucciones actuales del usuario y seguridad → reglas funcionales vigentes → decisiones UX de este plan → targets v3 → detalles ilustrativos del PNG. Las superficies glass actuales son baseline de regresión, no objetivo visual.

## 2. F0 obligatorio: resolver base y preservar trabajo
Leer BASELINE.md. La base completa candidata es main en el worktree p4-p3-integration, no el checkout P3 donde se guarda el plan.

Antes de editar:
- Confirmar cwd, rama, HEAD, status, instrucciones locales y roadmap actuales.
- Correlacionar servidor usado para capturas con ese código (origen, proceso/checkout y build sin exponer secretos). No asumir que localhost usa el workspace del chat.
- Registrar fuentes de verdad y funcionalidades existentes; contrastar el mapa de cobertura con navegación real.
- Preservar todos los cambios ajenos. Reutilizar checkout adecuado o aislar en rama codex/ según autorización; nunca reset/stash/merge de P3 para transportar el plan.
- Copiar este paquete con referencias y comprobar manifest, sin reemplazar documentos ajenos.
- Abrir un registro propio y establecer baseline de pruebas/capturas con fixtures aislados.
- Si la base/runtimes difieren, corregir el mapa del plan y registrar causa; no rehacer funciones ausentes solo por estar en el checkout equivocado.

## 3. Sistema visual transversal

### Tokens iniciales propuestos
Valores para implementar y medir en DOM, no valores extraídos exactamente del PNG.

| Rol | Propuesta |
|---|---|
| Fondo / superficie | #FFFFFF; fondo secundario #F8FAF9 |
| Texto principal / secundario | #202522 / #56615C |
| Contorno principal / separador | #303631 / #DCE3DE |
| Marca/acción | #FF782D con texto oscuro; hover #F26B20 |
| Enlace textual | #9A3E00, subrayado cuando corresponda; no naranja claro sobre blanco |
| Estudio / Enseño / Novedades | #C3F1DF / #FFC4AF / #FFE99B, siempre con rótulo e icono |
| Apoyos | Melocotón #FFF0E1, cian #E1F4FA, lila #E9E3FA |
| Error / éxito / aviso | #8C281C / #235D38 / #775500 + fondo tenue e icono/texto; no equivalen a rol o nota |
| Foco | #214FBD, contorno visible separado del borde |
| Bordes / sombras | Controles 1px, carpeta 1.5px; sombra sólida 3px 3px 0 #F6E1B8, solo niveles principales |
| Radios / separación | Control 10–12px, panel 14–16px; escala 4,8,12,16,24,32,48 |
| Tipografía | Reusar stack local Segoe UI / Trebuchet MS / Arial inicialmente; 16px cuerpo, 14px metadatos, 24–32px títulos, 40–48px saludo escritorio / 28px móvil |
| Movimiento | Feedback 120–180ms, opcional; reduced motion sin animación; no mascota animada constante |

No descargar fuentes remotas ni añadir una librería de componentes para el cambio. Si la tipografía local no alcanza la referencia, tratar la incorporación de una familia redondeada autoalojada/licenciada como decisión explícita de F1, con revisión de licencia, peso y CSP.

### Gramática
- FolderSection para agrupar contenidos de verdad. La pestaña decorativa es un heading, no un botón falso.
- FolderNav para navegación real: enlaces con aria-current o tabs correctamente implementadas según comportamiento; no mezclar ambas semánticas.
- Una acción primaria por contexto de trabajo, no una por fila. Guardar, Publicar y Entregar son acciones distintas.
- Filas dentro de carpetas sin tarjetas anidadas, iconos y tamaños consistentes. Tablas densas donde aportan comparación, no convertir todo en tarjetas.
- Zorro: expresivo en Inicio/acceso y moderado en vacíos; ausente de respuestas, notas y errores sensibles. Usar originales versionados, no recortar el PNG UI ni redibujar generativamente la marca.
- Evitar blur, transparencias y sombras difusas como lenguaje dominante. Originales preservados; cualquier recorte/optimización genera derivados documentados.
- No colorear todo el contenido por rol: menta/coral ubican contexto, mientras herramientas de corrección y evaluación permanecen claras y tranquilas.

### Arquitectura de componentes
Reusar AppNavbar y clientes actuales. Extraer presentación gradualmente, no reescribir máquinas de estado:
- Tokens compartidos en apps/shared-ui/design-tokens.css.
- Familia reutilizable: FolderSection, FolderNavigation, PageHeader, StatusBadge, EmptyState, InlineError, FormField, ActionBar, UploadStatus y AsyncBoundary (nombres propuestos, adaptar al repositorio).
- Una base coherente para Button/Input/Label y los controles hoy escritos directamente en classrooms-ui. Refactor con pruebas de cada grupo, sin cambiar de golpe todos los event handlers.
- Separar AuthShell y presentación del perfil de la lógica de sesión/cliente; conservar token-capture y orden del head.
- Sustituir ordenadamente los imports glass de _app.tsx por estilos del sistema carpetas. Durante migración, aislar estilos por raíz para no contaminar pantallas pendientes; al cierre no quedan dos temas compitiendo ni cadenas de !important.
- Preservar lazy loading de Wizard/ClassroomView y límites de bundle; iconos locales existentes antes que nueva dependencia.
- No modificar contratos Nest/Prisma, scanner, session/CSRF o almacenamiento por motivos estéticos.

## 4. Acceso y onboarding: corregir el problema de raíz

### Tabla de destino
| Situación | Experiencia y destino objetivo |
|---|---|
| Abrir / sin sesión | Login claro, sin error de sesión expirada por defecto |
| Abrir /, /sign-in o /register con sesión verificada | Resolver destino permitido pendiente o /inicio, sin mostrar formulario de login ni perfil durante la comprobación |
| Login válido, cuenta verificada, sin next | replace a /inicio; no toast aislado que exige otro clic |
| Login válido, cuenta no verificada | /verify-email con intención segura preservada; no acceso al aula |
| next interno válido | Priorizar ese destino después de autenticar/verificar; servidor vuelve a comprobar permiso |
| next inválido/externo/manipulado | Descartar y usar /inicio para verificado; nunca redirect externo |
| Registro aceptado (nuevo o existente) | Pantalla/estado neutro «Revisá tu correo»; mismo comportamiento y mensaje genérico para ambos casos; no auto-login |
| Verificación anónima por enlace | Confirmación explícita por POST → éxito → Iniciar sesión conservando intención si está disponible; no crear sesión automáticamente |
| Verificación con sesión vigente | Tras éxito y relectura confirmada de sesión verificada, continuar al destino o Inicio; enlace explícito de respaldo si no puede navegar |
| Verificación correcta pero actualización de sesión falla | Mostrar éxito de verificación y permitir reintentar comprobación; no reportar fracaso de la operación ya confirmada |
| Recuperación completada | Confirmar cierre de sesiones previas → login; después Inicio o intención segura, nunca autologin con el token |
| Logout | Limpiar contexto pendiente apropiadamente y volver a login; sin reingreso al privado vía Back |
| Acceso explícito a perfil | Abrir Mi perfil; no redirigirlo por confundir destino por defecto con ruta prohibida |
| Invitación pendiente | Mostrar aceptación explícita después de verificar; no inscribir por registro/verificación/login |
| Sesión expirada en aula | Login con contexto permitido; sin mostrar datos privados anteriores; recuperar solo borrador persistido confirmado |

Unificar la resolución de destino en una función probada. Cambiar todos los callsites de fallback, logo, continuar cuenta, postverificación y raíz. **No reemplazar ciegamente todos los '/profile'**: enlaces explícitos al perfil deben sobrevivir.

### Registro y formularios
- Un formulario breve: nombre, apellido, correo, contraseña. Sin rol global, avatar obligatorio, datos institucionales, tour o perfil adicional.
- Paso visible «Crear cuenta → Verificar correo → Entrar», sin fingir que el registro ya inició sesión.
- Mensaje genérico de registro: «Si los datos permiten crear una cuenta, vas a recibir un correo con los próximos pasos. Si ya tenés cuenta, podés iniciar sesión o recuperar el acceso». No afirmar que siempre se envió un correo.
- Acciones claras para iniciar sesión/recuperar; reenviar verificación solo por el flujo soportado y con sus límites, no inventar endpoint público.
- Labels persistentes, ayuda junto al campo, errores locales seguros más resumen accesible; foco al primer campo inválido. No mostrar errores por cada tecla antes de interacción.
- Mostrar/ocultar contraseña ya existe: conservar semántica no-submit, autofill y pegado. Ayuda 16–128 solo para nueva contraseña; mantener validación/limpieza segura de secretos.
- No persistir contraseña ni token en URL, localStorage o analítica. Conservar nombres/correo no sensibles en el formulario ante errores sin normalizar su significado.
- Busy localizado: impedir doble envío sin bloquear enlaces de salida o confundir un cooldown de registro con otro formulario.
- Cooldown visible, sin anunciar cada segundo al lector de pantalla. Error de red distinto de credenciales inválidas; retry sin duplicar mutaciones.
- La espera de sesión es un estado real; no un flash de perfil o una UI autenticada prematura.
- Una operación exitosa cuyo refresh posterior falla conserva su éxito y ofrece recuperar estado, no repetirla a ciegas.
- Mantener mailboxes citados/internacionales, dominio minúsculo sin normalización silenciosa y conteo Unicode; input de correo no debe estrechar el formato permitido.

### Primera llegada a Inicio
Sin aula: bienvenida breve, ambos contextos Estudio/Enseño sin aparentar error y una acción «Ir a Mis Aulas». Si existen invitaciones o borradores reales, enlace contextual a gestionarlos allí. Sin botones Crear/Unirse en Inicio, sin obligación de editar perfil.

## 5. Inicio, navegación y datos reales

### Inicio
Saludo compacto, Lo próximo, Estudio y Enseño visibles simultáneamente, novedades. Limitar la vista previa a un número pequeño de aulas y dar «Ver todas en Mis Aulas» cuando exceda; no perder acceso a ninguna. Los dos bloques no son un selector global.

Lo próximo debe usar hechos autorizados:
- Estudiante: actividad aplicable con entrega pendiente o reintento habilitado; fecha efectiva y zona del aula, estado real de recepción. No clasificar como pendiente algo ya entregado por una novedad antigua.
- Docente: entrega recibida pendiente de revisión/publicación, sin mezclarla con un borrador sin entregar. CTA «Revisar entrega» o «Continuar corrección» según datos.
- Ambos: mostrar contexto de rol/aula en cada candidato; máximo una acción destacada y acceso a restantes. No fingir comparación de urgencias entre revisión sin fecha y entrega fechada. Selección inicial propuesta: entrega elegible fechada más próxima, luego revisión más antigua, luego continuar trabajo sin fecha. Validar con fixtures en F3.
- Cerrada, no elegible, archivada o sin permiso: nunca CTA habilitado de entrega; «Ver detalle» cuando corresponda.
- Sin pendientes: mensaje tranquilo, no contenido inventado. Fallo/carga no equivalen a «No tenés pendientes».

El DTO Classroom inspeccionado no incluye unidad actual, y Home hoy consulta aulas/notificaciones: **brecha de contrato pendiente de resolver en F3**. Inventariar APIs de participación/progreso, sin abrir intentos para armar el resumen. Preferir una proyección de lectura autorizada, paginada/acotada, sin N+1 por cada aula y sin traer respuestas o notas privadas al Inicio. Si hace falta endpoint agregado, aislarlo como subtarea explícita con prueba de autorización y presupuesto de consultas; no declararlo existente ni reemplazarlo por fixtures. No cerrar F3 con una tarjeta ficticia o ausencia permanente de Lo próximo.

Novedades: usar eventos realmente disponibles. El ejemplo «Nuevo material» no autoriza inventar una notificación de material si no existe tal evento. Adaptar texto al contrato actual o gestionar ese cambio separado; siempre abrir mediante autorización actual.

### Navegación del aula
- Logo → Inicio para cuenta verificada en todas las superficies. Perfil/configuración de cuenta desde menú.
- Breadcrumb «Mis Aulas / Aula / Sección» y contexto de rol de **esa aula**.
- Entrada por defecto propuesta: Actividades para ambos roles, en vez de lista de personas. Deep link explícito siempre prevalece. No introducir una pestaña Resumen nueva solo por decorar.
- Mantener Alumnos/Compañeros, Actividades, Plan, Muro, Biblioteca y Progreso/Mi Progreso. Historial y Configuración docentes existentes siguen accesibles, como pestañas o menú de gestión etiquetado; nada se elimina.
- Móvil: navegación global compacta, pestañas horizontales desplazables con activa visible; sin sidebar. Gestión secundaria en menú explícito, no hover-only.

### URLs, recarga y Back
El estado de aula actual es local. Incorporar un contrato tipado de navegación, sin inventar permisos:
- Conservar /inicio, /mis-aulas, /profile y rutas de cuenta.
- Propuesta canónica sobre /mis-aulas: aula UUID + seccion de enum cerrado; actividad/intento UUID cuando corresponda. Invitacion y notificacion actuales son destinos separados, con claves y combinaciones permitidas.
- Actualizar serializer/parser y allowlist de next conjuntamente; rechazo de URLs absolutas, //, esquemas, traversal, doble encoding, arrays, IDs malformados y combinaciones extra.
- Back/Forward y refresh restauran sección/registro con permisos vigentes. Cambiar aula limpia selección anterior y revalida rol.
- next no contiene tokens, emails, respuestas ni estado privilegiado. Contexto efímero con vencimiento, no fuente de identidad; limpiar al consumir/logout.
- Mantener enlaces de invitación/notificación existentes. En otra pestaña/dispositivo puede no existir intención guardada: fallback a Inicio/Mis Aulas con invitaciones visibles, nunca prometer continuidad imposible.
- Home/listas/prefetch no inician intentos; apertura explícita de TP conserva su evento de inicio y bloqueo. No consumir pruebas de verificación por GET, render o prefetch.

## 6. UX transversal y contratos que no cambian
- Cada flujo tiene default/loading/empty/error/success/disabled, y cuando aplica forbidden/archived/conflict/offline/pending scan. Ver matriz y pruebas.
- Confirmaciones solo en consecuencias relevantes: entrega final, publicar nota/actividad, archivar, salir/remover alumno, borrar material/Muro. Explicar impacto y conservar Cancelar.
- Formularios largos con avance claro; borradores y guardado veraces. No llamar «Guardado» a un debounce o una selección local.
- Un fallo de una sección no vacía toda la página. Conservar datos confirmados, indicar stale cuando corresponda y retry local.
- Autosave académico existente a 2s y al cambiar pregunta; historial de intentos, single editor, transferencia explícita y bloqueos se preservan.
- Archivo: seleccionado → subiendo → validando/escaneando → disponible o rechazado/error. Solo disponible puede adjuntarse/enviarse. Scanner caído no es aprobación.
- Vencimientos con zona del aula y recepción completa en servidor, no reloj del dispositivo ni hora del clic. Sin cronómetro inventado.
- Corrección privada vs nota publicada inequívocas; guardar no publica. Motivo obligatorio para corregir publicación; auditoría solo docente.
- Completitud, notas y temas dados son medidas distintas. Sin aprobados/desaprobados automáticos, ni notas faltantes convertidas a cero.
- Archivada es lectura para ambos, excepto reactivar docente. Salir/remover conserva historial, reingreso por nueva invitación, código no lo evita.
- Accesibilidad desde componentes: teclado, foco y retorno al cerrar diálogo, nombres accesibles, estados no solo por color, feedback no dependiente de animación.
- Copy consistente en español rioplatense, clara y sobria en errores; conservar términos de negocio: División, Ciclo lectivo, Guardar borrador, Publicar, Entregar.

## 7. Fases ejecutables y condiciones de salida
Todas pendientes; dependencias técnicas, no reducción de alcance.

| Fase | Trabajo y archivos principales | Depende | Condición de salida |
|---|---|---|---|
| F0 Base y baseline | Ver sección 2; completar inventario actual y fixtures | — | Checkout/servidor correlacionados, estado preservado, evidencia de baseline |
| F1 Sistema y targets | shared-ui tokens/navbar/primitivas, muestras auth+aula docente/estudiante+evaluación/corrección desktop/móvil | F0 | Familia validada visualmente, componentes accesibles; ninguna nueva dirección visual |
| F2 Acceso y onboarding | account-screen/navbar, classroom-client, index y rutas de cuenta; resolver destino y estados de registro/verificación | F1 | Tabla completa de destinos probada; login verificado→Inicio; no cambio de seguridad |
| F3 Inicio y Mis Aulas | Home, Classrooms, summary read model, búsqueda/drafts/invitaciones | F1,F2 | v3 integrado con datos reales, ambos contextos visibles, crear/unirse solo Mis Aulas |
| F4 Aula, admisión y creación | Wizard, ClassroomView, URL state y gestión de miembros/configuración | F3 | Crear/retomar/join/accept y cada rol navegable; refresh/Back sin pérdida o escalamiento |
| F5 Plan, Biblioteca, Muro, archivos | Plan, Library, Wall, Notifications, private-file-panel | F4 | Contenido real, escaneo/privacidad y lectura archivada conservados; móvil usable |
| F6 Actividades y participación | Activities, Authoring, AttemptSession, Practical/Questionnaire, History | F4,F5 | Docente publica; estudiante entrega TP/cuestionario/evaluación; autosave/control de editor/deadlines intactos |
| F7 Corrección y progreso | Submissions, GradingEditor, PublishedResult/Correction, Progress | F6 | Guardar/publicar/corregir/reabrir y notas/privacidad exactas por rol |
| F8 Cierre transversal | Todas las superficies de COVERAGE-MATRIX, perfil/notificaciones, errores y responsive | F2–F7 | Sin pantallas antiguas, contratos de estados y accesibilidad verificados |
| F9 Regresión y handoff | Pruebas VERIFICATION, capturas y ledger, documentación final | F8 | Cada fila tiene evidencia real; fallos/skips explícitos, nada crítico abierto; aprobación visual humana separada |

Por fase: escribir pruebas de cambio de comportamiento antes del cambio, implementar un corte vertical, verificar, registrar. No mezclar feature nuevo, cambio backend general y migración CSS sin separar revisiones. Mantener corrección de destinos F2 separada de grandes cambios de layout para facilitar diagnóstico.

F1 requiere targets de las pantallas aún no diseñadas, consistentes con v3: login/registro/verificación, Mis Aulas, aula docente y estudiante, autoría, rendición y corrección. Mostrar para revisión; no reinterpretar «carpetas» como otra exploración de conceptos. El trabajo posterior puede aplicar el sistema sin pedir aprobación por cada control, pero cambios de flujo/reglas fuera del plan requieren decisión explícita.

## 8. Rendimiento, seguridad y cierre
No instalar nueva stack, añadir servicios o desplegar por este plan. Preservar CSP/local assets, captura temprana de tokens, no-store, CSRF renovado, cookies, sesiones y antiabuso. No leer configs privadas ni usar datos reales para screenshots.

Medir bundles/red de baseline y candidato con mismos datos; limitar consultas del resumen, lazy-load de módulos pesados, imágenes con dimensiones y tamaño apropiado. Mantener sesiones y borradores al refactor; no desmontar un editor por cambio de tema.

Estrategia de reversión: cambios de presentación por fase, APIs aditivas si indispensables y bajo contrato; rollback solo de commits propios del candidato, sin reset de historial ajeno ni rollback de datos. No ejecutar publicación o merge por completar pruebas.

**Completo significa:** matriz de superficies/roles/estados satisfecha + criterios funcionales y accesibilidad con evidencia + revisión visual pendiente/aprobada declarada honestamente. Una compilación, screenshots bonitas o tests estáticos no sustituyen aceptación.
