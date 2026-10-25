# Cobertura funcional y visual

**82 flujos documentados y enlazados a vistas del atlas; 11 páginas públicas de UI existentes inventariadas.** No son 82 nuevas rutas ni 82 pruebas funcionales ejecutadas. Cada ID incluye estados, permisos, acciones y aceptación futura en su contrato. Las composiciones visuales comparten familias y controles; las variantes genéricas de carga/error complementan los casos específicos descritos.

Base: `e7f5d6f67520516fe56fe9794ab8d1ac97633bdd`. [Plan por etapas](implementation-plan.md) · [Atlas](review/screens.html) · [JSON](coverage.json).

## Rutas reales y cambio propuesto

| Ruta actual | Archivo existente | Flujos |
|---|---|---|
| `/` | `apps/web/pages/index.tsx` | AUTH-01 |
| `/sign-in` | `apps/web/pages/sign-in.tsx` | AUTH-01 |
| `/register` | `apps/web/pages/register.tsx` | AUTH-02 |
| `/verify-email` | `apps/web/pages/verify-email.tsx` | AUTH-03 |
| `/forgot-password` | `apps/web/pages/forgot-password.tsx` | AUTH-04 |
| `/recover-password` | `apps/web/pages/recover-password.tsx` | AUTH-05 |
| `/inicio` | `apps/web/pages/inicio.tsx` | HOME-01, HOME-02, NAV-02 |
| `/mis-aulas` | `apps/web/pages/mis-aulas.tsx` | CLASS, PLAN, LIB, WALL, PEOPLE, ACT, AI, SUB, GRADE, PROG |
| `/agenda` | `apps/web/pages/agenda.tsx` | AGENDA-01..10 |
| `/profile` | `apps/web/pages/profile.tsx` | ACC-01, ACC-02 |
| `/files` | `apps/web/pages/files.tsx` | LIB-05 |

`_app.tsx` y `_document.tsx` son infraestructura, no pantallas separadas. Las rutas API son operaciones cubiertas por los contratos funcionales, no páginas de UI. `/settings` es la única ruta nueva propuesta; hoy contraseña/logout viven en cuenta. Las pestañas y diálogos de aula permanecen dentro de `/mis-aulas` con destinos profundos autorizados.

## Matriz completa

| ID | Recorrido y contrato | Vista | Etapa | Recursos |
|---|---|---|---|---|
| NAV-01 | [shell global y orientación](flows/account-and-navigation.md#nav-01--shell-global-y-orientación) | [Abrir](review/screens.html#NAV-01/study/normal) | D2 | brand/logo-horizontal + icons |
| AUTH-01 | [iniciar sesión](flows/account-and-navigation.md#auth-01--iniciar-sesión) | [Abrir](review/screens.html#AUTH-01/default/normal) | D2 | scenes/auth + scenes/security |
| AUTH-02 | [crear cuenta](flows/account-and-navigation.md#auth-02--crear-cuenta) | [Abrir](review/screens.html#AUTH-02/default/normal) | D2 | scenes/auth + scenes/security |
| AUTH-03 | [verificar correo](flows/account-and-navigation.md#auth-03--verificar-correo) | [Abrir](review/screens.html#AUTH-03/default/normal) | D2 | scenes/auth + scenes/security |
| AUTH-04 | [solicitar recuperación](flows/account-and-navigation.md#auth-04--solicitar-recuperación) | [Abrir](review/screens.html#AUTH-04/default/normal) | D2 | scenes/auth + scenes/security |
| AUTH-05 | [establecer nueva contraseña](flows/account-and-navigation.md#auth-05--establecer-nueva-contraseña) | [Abrir](review/screens.html#AUTH-05/default/normal) | D2 | scenes/auth + scenes/security |
| ACC-01 | [Mi perfil](flows/account-and-navigation.md#acc-01--mi-perfil) | [Abrir](review/screens.html#ACC-01/default/normal) | D2 | scenes/profile + scenes/security |
| ACC-02 | [Configuración y cerrar sesión](flows/account-and-navigation.md#acc-02--configuración-y-cerrar-sesión) | [Abrir](review/screens.html#ACC-02/default/normal) | D2 | scenes/profile + scenes/security |
| HOME-01 | [Inicio según aulas actuales](flows/account-and-navigation.md#home-01--inicio-según-aulas-actuales) | [Abrir](review/screens.html#HOME-01/study/normal) | D9 | hero/welcome-learn + hero/welcome-teach |
| HOME-02 | [vacíos, fallos y actualidad](flows/account-and-navigation.md#home-02--vacíos-fallos-y-actualidad) | [Abrir](review/screens.html#HOME-02/study/normal) | D9 | hero/welcome-learn + hero/welcome-teach |
| NAV-02 | [notificaciones y novedades](flows/account-and-navigation.md#nav-02--notificaciones-y-novedades) | [Abrir](review/screens.html#NAV-02/default/normal) | D4 | brand/logo-horizontal + icons |
| ACT-01 | [Encontrar una actividad y elegir su recorrido](flows/activity-authoring.md#act-01--encontrar-una-actividad-y-elegir-su-recorrido) | [Abrir](review/screens.html#ACT-01/teacher/normal) | D5 | icons/clipboard + states/* |
| ACT-02 | [Crear un borrador manual y organizarlo](flows/activity-authoring.md#act-02--crear-un-borrador-manual-y-organizarlo) | [Abrir](review/screens.html#ACT-02/tp/normal) | D5 | icons/clipboard + states/* |
| ACT-03 | [Escribir un trabajo práctico y sus recursos](flows/activity-authoring.md#act-03--escribir-un-trabajo-práctico-y-sus-recursos) | [Abrir](review/screens.html#ACT-03/tp/normal) | D5 | icons/clipboard + states/* |
| ACT-04 | [Construir cuestionario o evaluación](flows/activity-authoring.md#act-04--construir-cuestionario-o-evaluación) | [Abrir](review/screens.html#ACT-04/quiz/normal) | D5 | icons/clipboard + states/* |
| ACT-05 | [Elegir plazo y política de recepción](flows/activity-authoring.md#act-05--elegir-plazo-y-política-de-recepción) | [Abrir](review/screens.html#ACT-05/tp/normal) | D5 | icons/clipboard + states/* |
| ACT-06 | [Revisar, publicar o retirar](flows/activity-authoring.md#act-06--revisar-publicar-o-retirar) | [Abrir](review/screens.html#ACT-06/tp/normal) | D5 | icons/clipboard + states/* |
| ACT-07 | [Corregir organización después de participación](flows/activity-authoring.md#act-07--corregir-organización-después-de-participación) | [Abrir](review/screens.html#ACT-07/tp/normal) | D5 | icons/clipboard + states/* |
| AI-01 | [Preparar una generación explícita y sus fuentes](flows/activity-authoring.md#ai-01--preparar-una-generación-explícita-y-sus-fuentes) | [Abrir](review/screens.html#AI-01/tp/normal) | D5 | icons/spark + states/* |
| AI-02 | [Seguir y recuperar el trabajo durable](flows/activity-authoring.md#ai-02--seguir-y-recuperar-el-trabajo-durable) | [Abrir](review/screens.html#AI-02/tp/normal) | D5 | icons/spark + states/* |
| AI-03 | [Revisar propuesta privada y vista estudiante](flows/activity-authoring.md#ai-03--revisar-propuesta-privada-y-vista-estudiante) | [Abrir](review/screens.html#AI-03/tp/normal) | D5 | icons/spark + states/* |
| AI-04 | [Aplicar la propuesta como nuevo borrador](flows/activity-authoring.md#ai-04--aplicar-la-propuesta-como-nuevo-borrador) | [Abrir](review/screens.html#AI-04/tp/normal) | D5 | icons/spark + states/* |
| AI-05 | [Regenerar, resolver fallos y preservar trabajo](flows/activity-authoring.md#ai-05--regenerar-resolver-fallos-y-preservar-trabajo) | [Abrir](review/screens.html#AI-05/tp/normal) | D5 | icons/spark + states/* |
| AGENDA-01 | [consultar mes, día y zona de vista](flows/agenda.md#agenda-01--consultar-mes-día-y-zona-de-vista) | [Abrir](review/screens.html#AGENDA-01/default/normal) | D8 | scenes/agenda + icons/calendar |
| AGENDA-02 | [leer eventos del día](flows/agenda.md#agenda-02--leer-eventos-del-día) | [Abrir](review/screens.html#AGENDA-02/default/normal) | D8 | scenes/agenda + icons/calendar |
| AGENDA-03 | [próximas entregas y apertura autorizada](flows/agenda.md#agenda-03--próximas-entregas-y-apertura-autorizada) | [Abrir](review/screens.html#AGENDA-03/default/normal) | D8 | scenes/agenda + icons/calendar |
| AGENDA-04 | [crear evento privado](flows/agenda.md#agenda-04--crear-evento-privado) | [Abrir](review/screens.html#AGENDA-04/default/normal) | D8 | scenes/agenda + icons/calendar |
| AGENDA-05 | [repetición semanal completa](flows/agenda.md#agenda-05--repetición-semanal-completa) | [Abrir](review/screens.html#AGENDA-05/default/normal) | D8 | scenes/agenda + icons/calendar |
| AGENDA-06 | [resolver horas inexistentes o repetidas](flows/agenda.md#agenda-06--resolver-horas-inexistentes-o-repetidas) | [Abrir](review/screens.html#AGENDA-06/default/normal) | D8 | scenes/agenda + icons/calendar |
| AGENDA-07 | [editar sin cambiar el día consultado](flows/agenda.md#agenda-07--editar-sin-cambiar-el-día-consultado) | [Abrir](review/screens.html#AGENDA-07/default/normal) | D8 | scenes/agenda + icons/calendar |
| AGENDA-08 | [eliminar evento o serie](flows/agenda.md#agenda-08--eliminar-evento-o-serie) | [Abrir](review/screens.html#AGENDA-08/default/normal) | D8 | scenes/agenda + icons/calendar |
| AGENDA-09 | [conflicto entre pestañas y recuperación](flows/agenda.md#agenda-09--conflicto-entre-pestañas-y-recuperación) | [Abrir](review/screens.html#AGENDA-09/default/normal) | D8 | scenes/agenda + icons/calendar |
| AGENDA-10 | [éxito confirmado, fallos y sesión](flows/agenda.md#agenda-10--éxito-confirmado-fallos-y-sesión) | [Abrir](review/screens.html#AGENDA-10/default/normal) | D8 | scenes/agenda + icons/calendar |
| PLAN-01 | [Consultar unidades, temas y trabajo asociado](flows/classroom-workspace.md#plan-01--consultar-unidades-temas-y-trabajo-asociado) | [Abrir](review/screens.html#PLAN-01/teacher/normal) | D4 | covers/* + icons |
| PLAN-02 | [Marcar el estado de enseñanza](flows/classroom-workspace.md#plan-02--marcar-el-estado-de-enseñanza) | [Abrir](review/screens.html#PLAN-02/teacher/normal) | D4 | covers/* + icons |
| PLAN-03 | [Añadir, renombrar y reordenar currículo](flows/classroom-workspace.md#plan-03--añadir-renombrar-y-reordenar-currículo) | [Abrir](review/screens.html#PLAN-03/teacher/normal) | D4 | covers/* + icons |
| PLAN-04 | [Eliminar tema o unidad sin borrar historial](flows/classroom-workspace.md#plan-04--eliminar-tema-o-unidad-sin-borrar-historial) | [Abrir](review/screens.html#PLAN-04/teacher/normal) | D4 | covers/* + icons |
| PLAN-05 | [Descargar y publicar versiones del archivo del plan](flows/classroom-workspace.md#plan-05--descargar-y-publicar-versiones-del-archivo-del-plan) | [Abrir](review/screens.html#PLAN-05/teacher/normal) | D4 | covers/* + icons |
| LIB-01 | [Encontrar, consultar y descargar materiales](flows/classroom-workspace.md#lib-01--encontrar-consultar-y-descargar-materiales) | [Abrir](review/screens.html#LIB-01/teacher/normal) | D4 | icons/file + states/* |
| LIB-02 | [Cargar archivo privado y publicar material](flows/classroom-workspace.md#lib-02--cargar-archivo-privado-y-publicar-material) | [Abrir](review/screens.html#LIB-02/teacher/normal) | D4 | icons/file + states/* |
| LIB-03 | [Editar nombre/asociación conservando el archivo](flows/classroom-workspace.md#lib-03--editar-nombreasociación-conservando-el-archivo) | [Abrir](review/screens.html#LIB-03/teacher/normal) | D4 | icons/file + states/* |
| LIB-04 | [Eliminar material no vinculado](flows/classroom-workspace.md#lib-04--eliminar-material-no-vinculado) | [Abrir](review/screens.html#LIB-04/teacher/normal) | D4 | icons/file + states/* |
| LIB-05 | [Pantalla contextual de archivos privados](flows/classroom-workspace.md#lib-05--pantalla-contextual-de-archivos-privados) | [Abrir](review/screens.html#LIB-05/teacher/normal) | D4 | icons/file + states/* |
| WALL-01 | [Leer avisos y consultas](flows/classroom-workspace.md#wall-01--leer-avisos-y-consultas) | [Abrir](review/screens.html#WALL-01/teacher/normal) | D4 | icons/chat + states/* |
| WALL-02 | [Publicar aviso/consulta y responder](flows/classroom-workspace.md#wall-02--publicar-avisoconsulta-y-responder) | [Abrir](review/screens.html#WALL-02/teacher/normal) | D4 | icons/chat + states/* |
| WALL-03 | [Editar o moderar texto](flows/classroom-workspace.md#wall-03--editar-o-moderar-texto) | [Abrir](review/screens.html#WALL-03/teacher/normal) | D4 | icons/chat + states/* |
| WALL-04 | [Continuar un hilo desde notificaciones](flows/classroom-workspace.md#wall-04--continuar-un-hilo-desde-notificaciones) | [Abrir](review/screens.html#WALL-04/teacher/normal) | D4 | icons/chat + states/* |
| PEOPLE-01 | [Consultar participantes según rol](flows/classroom-workspace.md#people-01--consultar-participantes-según-rol) | [Abrir](review/screens.html#PEOPLE-01/teacher/normal) | D3 | icons/users + states/* |
| PEOPLE-02 | [Resumen académico y antiguos estudiantes](flows/classroom-workspace.md#people-02--resumen-académico-y-antiguos-estudiantes) | [Abrir](review/screens.html#PEOPLE-02/teacher/normal) | D3 | icons/users + states/* |
| PEOPLE-03 | [Invitar, administrar invitaciones y código](flows/classroom-workspace.md#people-03--invitar-administrar-invitaciones-y-código) | [Abrir](review/screens.html#PEOPLE-03/teacher/normal) | D3 | icons/users + states/* |
| PEOPLE-04 | [Remover o salir conservando historial](flows/classroom-workspace.md#people-04--remover-o-salir-conservando-historial) | [Abrir](review/screens.html#PEOPLE-04/teacher/normal) | D3 | icons/users + states/* |
| CLASS-01 | [Mis aulas y recuperación de pendientes](flows/classrooms-and-membership.md#class-01--mis-aulas-y-recuperación-de-pendientes) | [Abrir](review/screens.html#CLASS-01/default/normal) | D3 | covers/* + states/* |
| CLASS-02 | [datos generales del aula](flows/classrooms-and-membership.md#class-02--datos-generales-del-aula) | [Abrir](review/screens.html#CLASS-02/default/normal) | D3 | covers/* + states/* |
| CLASS-03 | [subir el plan de estudio](flows/classrooms-and-membership.md#class-03--subir-el-plan-de-estudio) | [Abrir](review/screens.html#CLASS-03/default/normal) | D3 | covers/* + states/* |
| CLASS-04 | [extracción, revisión y aplicación explícita](flows/classrooms-and-membership.md#class-04--extracción-revisión-y-aplicación-explícita) | [Abrir](review/screens.html#CLASS-04/default/normal) | D3 | covers/* + states/* |
| CLASS-05 | [unidades manuales y control del borrador](flows/classrooms-and-membership.md#class-05--unidades-manuales-y-control-del-borrador) | [Abrir](review/screens.html#CLASS-05/default/normal) | D3 | covers/* + states/* |
| CLASS-06 | [revisar, crear y empezar a invitar](flows/classrooms-and-membership.md#class-06--revisar-crear-y-empezar-a-invitar) | [Abrir](review/screens.html#CLASS-06/default/normal) | D3 | covers/* + states/* |
| CLASS-07 | [unirse con código](flows/classrooms-and-membership.md#class-07--unirse-con-código) | [Abrir](review/screens.html#CLASS-07/default/normal) | D3 | covers/* + states/* |
| CLASS-08 | [aceptar invitación](flows/classrooms-and-membership.md#class-08--aceptar-invitación) | [Abrir](review/screens.html#CLASS-08/default/normal) | D3 | covers/* + states/* |
| CLASS-09 | [contexto y navegación dentro del aula](flows/classrooms-and-membership.md#class-09--contexto-y-navegación-dentro-del-aula) | [Abrir](review/screens.html#CLASS-09/teacher/normal) | D3 | covers/* + states/* |
| CLASS-10 | [miembros actuales e historial](flows/classrooms-and-membership.md#class-10--miembros-actuales-e-historial) | [Abrir](review/screens.html#CLASS-10/teacher/normal) | D3 | covers/* + states/* |
| CLASS-11 | [invitar, reenviar y revocar](flows/classrooms-and-membership.md#class-11--invitar-reenviar-y-revocar) | [Abrir](review/screens.html#CLASS-11/default/normal) | D3 | covers/* + states/* |
| CLASS-12 | [compartir y regenerar código](flows/classrooms-and-membership.md#class-12--compartir-y-regenerar-código) | [Abrir](review/screens.html#CLASS-12/default/normal) | D3 | covers/* + states/* |
| CLASS-13 | [salir y remover sin borrar historia](flows/classrooms-and-membership.md#class-13--salir-y-remover-sin-borrar-historia) | [Abrir](review/screens.html#CLASS-13/teacher/normal) | D3 | covers/* + states/* |
| CLASS-14 | [configuración, archivar y reactivar](flows/classrooms-and-membership.md#class-14--configuración-archivar-y-reactivar) | [Abrir](review/screens.html#CLASS-14/default/normal) | D3 | covers/* + states/* |
| CLASS-15 | [conservar el plan después de crear](flows/classrooms-and-membership.md#class-15--conservar-el-plan-después-de-crear) | [Abrir](review/screens.html#CLASS-15/teacher/normal) | D4 | covers/* + states/* |
| SUB-01 | [Abrir una actividad y comenzar cuando corresponde](flows/submissions-and-grading.md#sub-01--abrir-una-actividad-y-comenzar-cuando-corresponde) | [Abrir](review/screens.html#SUB-01/tp/normal) | D6 | icons/clipboard + states/* |
| SUB-02 | [Elegibilidad, primera matrícula y reingreso](flows/submissions-and-grading.md#sub-02--elegibilidad-primera-matrícula-y-reingreso) | [Abrir](review/screens.html#SUB-02/tp/normal) | D6 | icons/clipboard + states/* |
| SUB-03 | [Resolver preguntas con guardado verificable](flows/submissions-and-grading.md#sub-03--resolver-preguntas-con-guardado-verificable) | [Abrir](review/screens.html#SUB-03/quiz/normal) | D6 | icons/clipboard + states/* |
| SUB-04 | [Preparar archivos de un TP](flows/submissions-and-grading.md#sub-04--preparar-archivos-de-un-tp) | [Abrir](review/screens.html#SUB-04/tp/normal) | D6 | icons/clipboard + states/* |
| SUB-05 | [Consultar otro dispositivo y transferir edición](flows/submissions-and-grading.md#sub-05--consultar-otro-dispositivo-y-transferir-edición) | [Abrir](review/screens.html#SUB-05/tp/normal) | D6 | icons/clipboard + states/* |
| SUB-06 | [Confirmar envío y recibir comprobante](flows/submissions-and-grading.md#sub-06--confirmar-envío-y-recibir-comprobante) | [Abrir](review/screens.html#SUB-06/tp/normal) | D6 | icons/clipboard + states/* |
| SUB-07 | [Consultar historial y habilitar reentrega](flows/submissions-and-grading.md#sub-07--consultar-historial-y-habilitar-reentrega) | [Abrir](review/screens.html#SUB-07/tp/normal) | D6 | icons/clipboard + states/* |
| SUB-08 | [Habilitar primera entrega fuera de la obligación original](flows/submissions-and-grading.md#sub-08--habilitar-primera-entrega-fuera-de-la-obligación-original) | [Abrir](review/screens.html#SUB-08/tp/normal) | D6 | icons/clipboard + states/* |
| GRADE-01 | [Abrir y guardar corrección privada](flows/submissions-and-grading.md#grade-01--abrir-y-guardar-corrección-privada) | [Abrir](review/screens.html#GRADE-01/tp/normal) | D7 | icons/check + states/* |
| GRADE-02 | [Calcular y publicar calificación](flows/submissions-and-grading.md#grade-02--calcular-y-publicar-calificación) | [Abrir](review/screens.html#GRADE-02/tp/normal) | D7 | icons/check + states/* |
| GRADE-03 | [Rectificar nota publicada con motivo y auditoría privada](flows/submissions-and-grading.md#grade-03--rectificar-nota-publicada-con-motivo-y-auditoría-privada) | [Abrir](review/screens.html#GRADE-03/tp/normal) | D7 | icons/check + states/* |
| GRADE-04 | [Ver resultado propio y devolución publicada](flows/submissions-and-grading.md#grade-04--ver-resultado-propio-y-devolución-publicada) | [Abrir](review/screens.html#GRADE-04/tp/normal) | D7 | icons/check + states/* |
| GRADE-05 | [Llegar desde notificación académica al objeto correcto](flows/submissions-and-grading.md#grade-05--llegar-desde-notificación-académica-al-objeto-correcto) | [Abrir](review/screens.html#GRADE-05/default/normal) | D7 | icons/check + states/* |
| PROG-01 | [Mi progreso: entregas, notas y Plan separados](flows/submissions-and-grading.md#prog-01--mi-progreso-entregas-notas-y-plan-separados) | [Abrir](review/screens.html#PROG-01/student/normal) | D7 | icons/progress + states/* |
| PROG-02 | [Progreso del aula y cálculo de promedio actual](flows/submissions-and-grading.md#prog-02--progreso-del-aula-y-cálculo-de-promedio-actual) | [Abrir](review/screens.html#PROG-02/teacher/normal) | D7 | icons/progress + states/* |
| PROG-03 | [Seguimiento individual docente e historial](flows/submissions-and-grading.md#prog-03--seguimiento-individual-docente-e-historial) | [Abrir](review/screens.html#PROG-03/teacher/normal) | D7 | icons/progress + states/* |

## Cruces y límites

CLASS y PEOPLE se solapan deliberadamente: el primero define alta/membresía y el segundo su contexto en aula; no duplicar endpoints ni estados. LIB-05 conserva archivos privados; NAV-02 y GRADE-05 cubren el mismo sistema de notificaciones en distintos destinos. La API de Home agregada, la nueva ruta settings, los destinos directos de atajos y la ampliación opcional de portadas requieren las tareas explícitas del plan.

Una vista del atlas no ejecuta solicitudes de cuenta, carga, publicación, pago ni envío. La revisión visual observada está en [el informe](checks/README.md); las pruebas de producto se ejecutarán al implementar. Ninguna imagen de referencia agrega una función ausente en los contratos.
