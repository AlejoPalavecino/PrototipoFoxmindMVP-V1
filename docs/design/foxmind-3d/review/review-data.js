window.FOX_REVIEW = {
  "screens": [
    {
      "id": "NAV-01",
      "title": "shell global y orientación",
      "sourceDoc": "../flows/account-and-navigation.md#nav-01--shell-global-y-orientación",
      "family": "Inicio",
      "domain": "account-and-navigation",
      "frame": "screens.html#NAV-01/study/normal",
      "hash": "NAV-01/study/normal",
      "variants": [
        "study",
        "teach",
        "mixed",
        "none"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "unavailable"
      ],
      "composition": "Inicio",
      "reviewNote": "Entrada real: `/inicio`, `/mis-aulas`, `/agenda`, `/profile`; acceso verificado. `/` muestra actualmente el acceso. Ruta nueva propuesta: `/settings`, para contraseña y cierre de sesión separados de los datos personales; no existe hoy en `pages/`. No renombrar rutas actuales para aplicar la apariencia."
    },
    {
      "id": "AUTH-01",
      "title": "iniciar sesión",
      "sourceDoc": "../flows/account-and-navigation.md#auth-01--iniciar-sesión",
      "family": "Acceso",
      "domain": "account-and-navigation",
      "frame": "screens.html#AUTH-01/default/normal",
      "hash": "AUTH-01/default/normal",
      "variants": [
        "default"
      ],
      "states": [
        "normal",
        "loading",
        "error",
        "success"
      ],
      "composition": "Acceso",
      "reviewNote": "Entrada real: `/sign-in` y `/`; enlaces desde recuperación/registro o una sección protegida. Anónimo; una sesión existente ofrece Continuar con mi cuenta. Desktop: marca y escena 3D a un lado, formulario blanco al otro, sin shell privado. Móvil: marca, título y formulario primero; escena secundaria pequeña o omitida sin quitar información."
    },
    {
      "id": "AUTH-02",
      "title": "crear cuenta",
      "sourceDoc": "../flows/account-and-navigation.md#auth-02--crear-cuenta",
      "family": "Acceso",
      "domain": "account-and-navigation",
      "frame": "screens.html#AUTH-02/default/normal",
      "hash": "AUTH-02/default/normal",
      "variants": [
        "default"
      ],
      "states": [
        "normal",
        "loading",
        "error",
        "success"
      ],
      "composition": "Acceso",
      "reviewNote": "Entrada real: `/register`, manteniendo un `next` válido. Misma familia visual que AUTH-01; pasos informativos Datos → Correo → Aulas, sin aparentar inscripción automática."
    },
    {
      "id": "AUTH-03",
      "title": "verificar correo",
      "sourceDoc": "../flows/account-and-navigation.md#auth-03--verificar-correo",
      "family": "Acceso",
      "domain": "account-and-navigation",
      "frame": "screens.html#AUTH-03/default/normal",
      "hash": "AUTH-03/default/normal",
      "variants": [
        "default"
      ],
      "states": [
        "normal",
        "loading",
        "error",
        "success"
      ],
      "composition": "Acceso",
      "reviewNote": "Entrada real: `/verify-email`, desde sesión no verificada o enlace original de correo. Puede confirmar un enlace sin sesión; verificar no inicia sesión ni acepta una invitación. Desktop: tarjeta central breve con Foxy pequeño, instrucción y acciones. Móvil: tarjeta de ancho disponible y botones apilados."
    },
    {
      "id": "AUTH-04",
      "title": "solicitar recuperación",
      "sourceDoc": "../flows/account-and-navigation.md#auth-04--solicitar-recuperación",
      "family": "Acceso",
      "domain": "account-and-navigation",
      "frame": "screens.html#AUTH-04/default/normal",
      "hash": "AUTH-04/default/normal",
      "variants": [
        "default"
      ],
      "states": [
        "normal",
        "loading",
        "error",
        "success"
      ],
      "composition": "Acceso",
      "reviewNote": "Entrada real: `/forgot-password`. Anónimo o acceso desde AUTH-01. Tarjeta con título Recupera tu acceso y escena discreta desktop; móvil prioriza el único campo."
    },
    {
      "id": "AUTH-05",
      "title": "establecer nueva contraseña",
      "sourceDoc": "../flows/account-and-navigation.md#auth-05--establecer-nueva-contraseña",
      "family": "Acceso",
      "domain": "account-and-navigation",
      "frame": "screens.html#AUTH-05/default/normal",
      "hash": "AUTH-05/default/normal",
      "variants": [
        "default"
      ],
      "states": [
        "normal",
        "loading",
        "error",
        "success"
      ],
      "composition": "Acceso",
      "reviewNote": "Entrada real: `/recover-password`, abriendo el enlace original. Sin prueba: instrucción para reabrir correo o Solicitar otro enlace, sin formulario funcional de sustitución manual. Misma composición de AUTH-04."
    },
    {
      "id": "ACC-01",
      "title": "Mi perfil",
      "sourceDoc": "../flows/account-and-navigation.md#acc-01--mi-perfil",
      "family": "Cuenta",
      "domain": "account-and-navigation",
      "frame": "screens.html#ACC-01/default/normal",
      "hash": "ACC-01/default/normal",
      "variants": [
        "default"
      ],
      "states": [
        "normal",
        "loading",
        "error",
        "success"
      ],
      "composition": "Cuenta",
      "reviewNote": "Entrada real: `/profile`, desde shell. Cuenta verificada; sin sesión → acceso, no verificada → verificación. La propuesta deja aquí datos personales y enlaza a `/settings`; hoy el componente también contiene contraseña/logout."
    },
    {
      "id": "ACC-02",
      "title": "Configuración y cerrar sesión",
      "sourceDoc": "../flows/account-and-navigation.md#acc-02--configuración-y-cerrar-sesión",
      "family": "Cuenta",
      "domain": "account-and-navigation",
      "frame": "screens.html#ACC-02/default/normal",
      "hash": "ACC-02/default/normal",
      "variants": [
        "default"
      ],
      "states": [
        "normal",
        "loading",
        "error",
        "success"
      ],
      "composition": "Cuenta",
      "reviewNote": "Entrada propuesta: `/settings`, desde shell o perfil; agregar página/selección del shell será trabajo futuro. Hoy las acciones se realizan dentro de `/profile`. Misma cuenta verificada; permisos y endpoints de cuenta sin cambios."
    },
    {
      "id": "HOME-01",
      "title": "Inicio según aulas actuales",
      "sourceDoc": "../flows/account-and-navigation.md#home-01--inicio-según-aulas-actuales",
      "family": "Inicio",
      "domain": "account-and-navigation",
      "frame": "screens.html#HOME-01/study/normal",
      "hash": "HOME-01/study/normal",
      "variants": [
        "study",
        "teach",
        "mixed",
        "none"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "unavailable"
      ],
      "composition": "Inicio",
      "reviewNote": "Entrada real: `/inicio`, destino de acceso ordinario verificado. Datos autorizados de Enseño/Estudio, borradores e invitaciones; sin rol global. Home actual muestra aulas/novedades: las colas de trabajo, feedback destacado y miniagenda de la propuesta requieren composición/proyecciones futuras, no existen como agregado demostrado en `Home.tsx`."
    },
    {
      "id": "HOME-02",
      "title": "vacíos, fallos y actualidad",
      "sourceDoc": "../flows/account-and-navigation.md#home-02--vacíos-fallos-y-actualidad",
      "family": "Inicio",
      "domain": "account-and-navigation",
      "frame": "screens.html#HOME-02/study/normal",
      "hash": "HOME-02/study/normal",
      "variants": [
        "study",
        "teach",
        "mixed",
        "none"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "unavailable"
      ],
      "composition": "Inicio",
      "reviewNote": "- Con membresía y cero tareas: «Estás al día» con `states/success.webp`, conservar sus aulas/agenda; nunca «Aún no tienes aulas». Una sección de participación inexistente se omite, no muestra fracaso ni obliga a elegir rol.\n- Si solo hay aulas archivadas, mostrarlas como consulta y ofrecer acciones de crear/unirse; no contar sus entregas como pendientes accionables. Archivo conserva historia y no invalida agenda privada.\n- Carga: skeleton de tarjetas con altura estable y estado anunciado, sin contadores cero anticipados. Error parcial identifica módulo y Reintentar ese módulo; no transforma indisponibilidad en «al día». Error de aulas impide inferir participación.\n- Conflicto/cambio de permisos al abrir: revalidar destino, explicar acceso no disponible y refrescar módulo. Una novedad no restaura membresía. Sesión perdida borra la información sensible y recupera acceso con destino permitido.\n- Aceptación: ejecutar fixtures sin aulas, solo estudio, solo enseñanza, mixto, cero pendientes con aulas, solo archivadas, invitaciones/borradores sin membresía y fallo parcial. Ningún contador proviene del texto del mockup ni de consultas al frontend sin permiso."
    },
    {
      "id": "NAV-02",
      "title": "notificaciones y novedades",
      "sourceDoc": "../flows/account-and-navigation.md#nav-02--notificaciones-y-novedades",
      "family": "Notificaciones",
      "domain": "account-and-navigation",
      "frame": "screens.html#NAV-02/default/normal",
      "hash": "NAV-02/default/normal",
      "variants": [
        "default"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "unavailable"
      ],
      "composition": "Notificaciones",
      "reviewNote": "Entrada real: campana del shell; diálogo `Notifications` y novedades de Inicio. Apertura profunda existente `/mis-aulas?notificacion=<uuid>`; se revalida en servidor, aunque ese query no forma hoy parte del `next` de autenticación permitido. En una sesión caducada no prometer retorno profundo exacto todavía."
    },
    {
      "id": "CLASS-01",
      "title": "Mis aulas y recuperación de pendientes",
      "sourceDoc": "../flows/classrooms-and-membership.md#class-01--mis-aulas-y-recuperación-de-pendientes",
      "family": "Aulas",
      "domain": "classrooms-and-membership",
      "frame": "screens.html#CLASS-01/default/normal",
      "hash": "CLASS-01/default/normal",
      "variants": [
        "default"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Aulas",
      "reviewNote": "Entrada real: `/mis-aulas`; lista de `teach`, `study`, borradores e invitaciones. Desktop: encabezado, búsqueda y Crear aula/Unirse con código; cuadrícula de tarjetas iguales, portada acotada, nombre, materia, división, ciclo lectivo, docente y rol por aula. Mixto: bloques Estudio/Enseño; una participación: una cuadrícula sin bloque vacío del otro contexto. Móvil: herramientas apiladas y tarjetas de una columna, texto sin recorte que oculte identificación."
    },
    {
      "id": "CLASS-02",
      "title": "datos generales del aula",
      "sourceDoc": "../flows/classrooms-and-membership.md#class-02--datos-generales-del-aula",
      "family": "Crear aula · Datos",
      "domain": "classrooms-and-membership",
      "frame": "screens.html#CLASS-02/default/normal",
      "hash": "CLASS-02/default/normal",
      "variants": [
        "default"
      ],
      "states": [
        "normal",
        "loading",
        "error",
        "conflict",
        "success"
      ],
      "composition": "Crear aula · Datos",
      "reviewNote": "Entrada real: Crear aula en Inicio/Mis aulas → estado interno `Wizard` bajo `/mis-aulas`; Continuar creación abre un borrador propio. No existen rutas públicas independientes por paso. Desktop: título Crear aula, Guardar y salir, stepper Datos generales → Plan de estudio → Unidades y temas → Revisión, tarjeta de formulario y estado de guardado; portada pequeña, sin hero promocional. Móvil: «Paso 1 de 4» y nombre del paso, listado de pasos desplegable o scroll accesible; controles de una columna sin etiquetas ocultas."
    },
    {
      "id": "CLASS-03",
      "title": "subir el plan de estudio",
      "sourceDoc": "../flows/classrooms-and-membership.md#class-03--subir-el-plan-de-estudio",
      "family": "Crear aula · Archivo",
      "domain": "classrooms-and-membership",
      "frame": "screens.html#CLASS-03/default/normal",
      "hash": "CLASS-03/default/normal",
      "variants": [
        "default"
      ],
      "states": [
        "normal",
        "loading",
        "error",
        "conflict",
        "success"
      ],
      "composition": "Crear aula · Archivo",
      "reviewNote": "Entrada real: paso 2 de Wizard. Desktop/móvil: tarjeta Elegir plan de estudio, formatos/límite, archivo seleccionado con nombre/estado, acción Consultar estado o Descargar plan aprobado; móvil sin área de drop que exija arrastrar."
    },
    {
      "id": "CLASS-04",
      "title": "extracción, revisión y aplicación explícita",
      "sourceDoc": "../flows/classrooms-and-membership.md#class-04--extracción-revisión-y-aplicación-explícita",
      "family": "Crear aula · IA",
      "domain": "classrooms-and-membership",
      "frame": "screens.html#CLASS-04/default/normal",
      "hash": "CLASS-04/default/normal",
      "variants": [
        "default"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "conflict",
        "success"
      ],
      "composition": "Crear aula · IA",
      "reviewNote": "Entrada real: bloque `PlanExtraction` en pasos Plan de estudio y Unidades y temas; trabajo durable del borrador propio. Aviso previo visible: Gemini procesa el documento para sugerir estructura; la persona revisa antes de incorporarla. PDF se procesa como documento; DOCX aporta texto de párrafos/tablas, sin leer sus imágenes. No prometer interpretación completa de imágenes Word ni inventar contenido ausente."
    },
    {
      "id": "CLASS-05",
      "title": "unidades manuales y control del borrador",
      "sourceDoc": "../flows/classrooms-and-membership.md#class-05--unidades-manuales-y-control-del-borrador",
      "family": "Crear aula · Unidades",
      "domain": "classrooms-and-membership",
      "frame": "screens.html#CLASS-05/default/normal",
      "hash": "CLASS-05/default/normal",
      "variants": [
        "default"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "conflict",
        "success"
      ],
      "composition": "Crear aula · Unidades",
      "reviewNote": "Entrada real: paso 3 Wizard; manual desde inicio, mientras espera IA o después de aplicarla. Composición: unidades numeradas en tarjetas, nombre de unidad, temas correspondientes en filas y acciones Agregar tema/Quitar; móvil botones accesibles sin exigir drag-and-drop."
    },
    {
      "id": "CLASS-06",
      "title": "revisar, crear y empezar a invitar",
      "sourceDoc": "../flows/classrooms-and-membership.md#class-06--revisar-crear-y-empezar-a-invitar",
      "family": "Crear aula · Revisión",
      "domain": "classrooms-and-membership",
      "frame": "screens.html#CLASS-06/default/normal",
      "hash": "CLASS-06/default/normal",
      "variants": [
        "default"
      ],
      "states": [
        "normal",
        "loading",
        "error",
        "conflict",
        "success"
      ],
      "composition": "Crear aula · Revisión",
      "reviewNote": "Entrada real: paso 4 Wizard. Composición: resumen portada/datos/zona, archivo aprobado y unidades/temas; Editar plan y Volver permiten corregir. Desktop en dos columnas si cabe; móvil una columna, CTA al final sin tapar contenido con sticky excesivo."
    },
    {
      "id": "CLASS-07",
      "title": "unirse con código",
      "sourceDoc": "../flows/classrooms-and-membership.md#class-07--unirse-con-código",
      "family": "Ingreso e invitaciones",
      "domain": "classrooms-and-membership",
      "frame": "screens.html#CLASS-07/default/normal",
      "hash": "CLASS-07/default/normal",
      "variants": [
        "default"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Ingreso e invitaciones",
      "reviewNote": "Entrada real: botón Unirse con código en Inicio o `/mis-aulas`; diálogo interno, no ruta nueva. Cuenta verificada, primer ingreso a un aula ajena activa. Desktop/móvil: diálogo breve Código del aula, Volver/Cancelar y Ver aula; luego previsualización con nombre/materia/división/ciclo/docente y Confirmar inscripción."
    },
    {
      "id": "CLASS-08",
      "title": "aceptar invitación",
      "sourceDoc": "../flows/classrooms-and-membership.md#class-08--aceptar-invitación",
      "family": "Ingreso e invitaciones",
      "domain": "classrooms-and-membership",
      "frame": "screens.html#CLASS-08/default/normal",
      "hash": "CLASS-08/default/normal",
      "variants": [
        "default"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Ingreso e invitaciones",
      "reviewNote": "Entrada real: `/mis-aulas?invitacion=<uuid>` del correo o tarjeta pendiente; si no tiene cuenta, registro → verificación → invitación aún pendiente. Solo correo invitado verificado. Composición: tarjeta nombre de aula/docente, vencimiento e indicación Invitación seleccionada; móvil al inicio de Pendientes sin ocultar otras."
    },
    {
      "id": "CLASS-09",
      "title": "contexto y navegación dentro del aula",
      "sourceDoc": "../flows/classrooms-and-membership.md#class-09--contexto-y-navegación-dentro-del-aula",
      "family": "Plan de estudio",
      "domain": "classrooms-and-membership",
      "frame": "screens.html#CLASS-09/teacher/normal",
      "hash": "CLASS-09/teacher/normal",
      "variants": [
        "teacher",
        "student"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Plan de estudio",
      "reviewNote": "Entrada real: tarjeta de aula abre estado `ClassroomView`; destino profundo soportado `/mis-aulas?aula=<uuid>[&actividad=<uuid>]`. Actualmente la entrada ordinaria selecciona Alumnos/Compañeros; la vista 3D abrirá Plan para ambos roles. Ese cambio de pestaña inicial debe declararse y probarse en implementación. Los destinos explícitos de actividad/notificación prevalecen sobre Plan y conservan su sección autorizada."
    },
    {
      "id": "CLASS-10",
      "title": "miembros actuales e historial",
      "sourceDoc": "../flows/classrooms-and-membership.md#class-10--miembros-actuales-e-historial",
      "family": "Participantes",
      "domain": "classrooms-and-membership",
      "frame": "screens.html#CLASS-10/teacher/normal",
      "hash": "CLASS-10/teacher/normal",
      "variants": [
        "teacher",
        "student"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Participantes",
      "reviewNote": "Entrada real: pestaña Alumnos/Compañeros en `ClassroomView`; Historial solo docente. Desktop: lista/tabla legible con iniciales, nombre y acciones por fila. Móvil: tarjetas con las mismas etiquetas/acciones, sin columnas ocultas de importancia."
    },
    {
      "id": "CLASS-11",
      "title": "invitar, reenviar y revocar",
      "sourceDoc": "../flows/classrooms-and-membership.md#class-11--invitar-reenviar-y-revocar",
      "family": "Ingreso e invitaciones",
      "domain": "classrooms-and-membership",
      "frame": "screens.html#CLASS-11/default/normal",
      "hash": "CLASS-11/default/normal",
      "variants": [
        "default"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Ingreso e invitaciones",
      "reviewNote": "Entrada real: Alumnos → Invitar estudiantes; bloque Invitaciones de esa aula. Solo docente y aula activa. Composición: diálogo Correo electrónico, explicación de aceptación con ese correo y Enviar invitación; lista de pendientes con vencimiento, estado de entrega y Reenviar/Revocar. Móvil misma información en tarjetas."
    },
    {
      "id": "CLASS-12",
      "title": "compartir y regenerar código",
      "sourceDoc": "../flows/classrooms-and-membership.md#class-12--compartir-y-regenerar-código",
      "family": "Ingreso e invitaciones",
      "domain": "classrooms-and-membership",
      "frame": "screens.html#CLASS-12/default/normal",
      "hash": "CLASS-12/default/normal",
      "variants": [
        "default"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Ingreso e invitaciones",
      "reviewNote": "Entrada real: Alumnos → Código del aula; solo docente. Código devuelto tras creación o regenerado; no afirmar disponibilidad de lectura de un código previo si el cliente no lo tiene. Sin valor: «Generá un código nuevo para compartirlo»."
    },
    {
      "id": "CLASS-13",
      "title": "salir y remover sin borrar historia",
      "sourceDoc": "../flows/classrooms-and-membership.md#class-13--salir-y-remover-sin-borrar-historia",
      "family": "Participantes",
      "domain": "classrooms-and-membership",
      "frame": "screens.html#CLASS-13/teacher/normal",
      "hash": "CLASS-13/teacher/normal",
      "variants": [
        "teacher",
        "student"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Participantes",
      "reviewNote": "Entrada real: estudiante → Salir del aula; docente → Remover en fila de alumno actual. Aula activa. Diálogo desktop/móvil nombra acción/persona, pérdida de acceso, conservación de entregas/notas/conversaciones y necesidad de invitación nueva para volver; Cancelar es salida segura."
    },
    {
      "id": "CLASS-14",
      "title": "configuración, archivar y reactivar",
      "sourceDoc": "../flows/classrooms-and-membership.md#class-14--configuración-archivar-y-reactivar",
      "family": "Configuración del aula",
      "domain": "classrooms-and-membership",
      "frame": "screens.html#CLASS-14/default/normal",
      "hash": "CLASS-14/default/normal",
      "variants": [
        "default"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Configuración del aula",
      "reviewNote": "Entrada real: Configuración de `ClassroomView`, solo docente. Campos: nombre/materia/división/ciclo con límites de CLASS-02; zona fija de solo lectura. Guardar usa revisión de aula; no upload de portada libre ni cambio de propietario. Desktop tarjeta de datos y bloque de ciclo de vida separado; móvil una columna sin mezclar configuración personal."
    },
    {
      "id": "CLASS-15",
      "title": "conservar el plan después de crear",
      "sourceDoc": "../flows/classrooms-and-membership.md#class-15--conservar-el-plan-después-de-crear",
      "family": "Plan de estudio",
      "domain": "classrooms-and-membership",
      "frame": "screens.html#CLASS-15/teacher/normal",
      "hash": "CLASS-15/teacher/normal",
      "variants": [
        "teacher",
        "student"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Plan de estudio",
      "reviewNote": "Entrada real: Plan del aula y sus controles docentes; el detalle pedagógico vive en el contrato de aprendizaje del rediseño. Estudiante consulta archivo/unidades/temas; docente activo mantiene versiones y estructura, sin reabrir el asistente de borrador publicado."
    },
    {
      "id": "PLAN-01",
      "title": "Consultar unidades, temas y trabajo asociado",
      "sourceDoc": "../flows/classroom-workspace.md#plan-01--consultar-unidades-temas-y-trabajo-asociado",
      "family": "Plan de estudio",
      "domain": "classroom-workspace",
      "frame": "screens.html#PLAN-01/teacher/normal",
      "hash": "PLAN-01/teacher/normal",
      "variants": [
        "teacher",
        "student"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Plan de estudio",
      "reviewNote": "Entrada real y rol. `/mis-aulas` → abrir aula → Plan; docente de esa aula o estudiante actual verificado. Carga `GET /api/v1/classrooms/:id` con `units`, `topics`, `plans` y revisión. Biblioteca/actividades se consultan por sus endpoints autorizados cuando se muestran en contexto."
    },
    {
      "id": "PLAN-02",
      "title": "Marcar el estado de enseñanza",
      "sourceDoc": "../flows/classroom-workspace.md#plan-02--marcar-el-estado-de-enseñanza",
      "family": "Plan de estudio",
      "domain": "classroom-workspace",
      "frame": "screens.html#PLAN-02/teacher/normal",
      "hash": "PLAN-02/teacher/normal",
      "variants": [
        "teacher"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Plan de estudio",
      "reviewNote": "Entrada/rol. Plan → acción `Estado de enseñanza` del tema; solo docente, aula activa. `POST /api/v1/classrooms/:id/plan` con `{revision, operation:{action:'setTopicState', id, status}}`; estados técnicos `PENDING`, `NEXT`, `TAUGHT`."
    },
    {
      "id": "PLAN-03",
      "title": "Añadir, renombrar y reordenar currículo",
      "sourceDoc": "../flows/classroom-workspace.md#plan-03--añadir-renombrar-y-reordenar-currículo",
      "family": "Plan de estudio",
      "domain": "classroom-workspace",
      "frame": "screens.html#PLAN-03/teacher/normal",
      "hash": "PLAN-03/teacher/normal",
      "variants": [
        "teacher"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Plan de estudio",
      "reviewNote": "Entrada/rol. Plan → `Administrar plan`, solo docente activo. Mismo endpoint/revisión de PLAN-02. Operaciones existentes: `addUnit{name}`, `renameUnit{id,name}`, `reorderUnits{ids}`, `addTopic{unitId,name}`, `renameTopic{id,name}`, `reorderTopics{unitId,ids}`."
    },
    {
      "id": "PLAN-04",
      "title": "Eliminar tema o unidad sin borrar historial",
      "sourceDoc": "../flows/classroom-workspace.md#plan-04--eliminar-tema-o-unidad-sin-borrar-historial",
      "family": "Plan de estudio",
      "domain": "classroom-workspace",
      "frame": "screens.html#PLAN-04/teacher/normal",
      "hash": "PLAN-04/teacher/normal",
      "variants": [
        "teacher"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Plan de estudio",
      "reviewNote": "Entrada/rol y contrato. Plan → administración → `Eliminar tema/unidad`, docente activo. `deleteTopic{id,confirm:true}` o `deleteUnit{id,confirm:true}` dentro del envelope de revisión."
    },
    {
      "id": "PLAN-05",
      "title": "Descargar y publicar versiones del archivo del plan",
      "sourceDoc": "../flows/classroom-workspace.md#plan-05--descargar-y-publicar-versiones-del-archivo-del-plan",
      "family": "Plan de estudio",
      "domain": "classroom-workspace",
      "frame": "screens.html#PLAN-05/teacher/normal",
      "hash": "PLAN-05/teacher/normal",
      "variants": [
        "teacher",
        "student"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Plan de estudio",
      "reviewNote": "Entrada/rol. `Archivo del plan` desde Plan. Ambos roles actuales consultan versiones autorizadas; solo docente activo publica una nueva. Archivos P4 privados y `appendVersion{fileId}` en el endpoint de Plan."
    },
    {
      "id": "LIB-01",
      "title": "Encontrar, consultar y descargar materiales",
      "sourceDoc": "../flows/classroom-workspace.md#lib-01--encontrar-consultar-y-descargar-materiales",
      "family": "Biblioteca",
      "domain": "classroom-workspace",
      "frame": "screens.html#LIB-01/teacher/normal",
      "hash": "LIB-01/teacher/normal",
      "variants": [
        "teacher",
        "student"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Biblioteca",
      "reviewNote": "Entrada/rol. Aula → Biblioteca o material del Plan/actividad. Docente/estudiante actual; `GET /api/v1/classrooms/:id/library`. API de contenido privada `/api/v1/files/:fileId/content?mode=preview|download`."
    },
    {
      "id": "LIB-02",
      "title": "Cargar archivo privado y publicar material",
      "sourceDoc": "../flows/classroom-workspace.md#lib-02--cargar-archivo-privado-y-publicar-material",
      "family": "Biblioteca",
      "domain": "classroom-workspace",
      "frame": "screens.html#LIB-02/teacher/normal",
      "hash": "LIB-02/teacher/normal",
      "variants": [
        "teacher"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Biblioteca",
      "reviewNote": "Entrada/rol. Biblioteca → `Publicar material`, docente activo. `POST /api/v1/files` admite scope de aula/purpose `material`; `PUT /files/:id/content` envía bytes; `GET /files/:id` consulta revisión; después `POST /classrooms/:id/library` con `{revision,operation:{action:'publish',title,fileId,unitId,topicId}}`."
    },
    {
      "id": "LIB-03",
      "title": "Editar nombre/asociación conservando el archivo",
      "sourceDoc": "../flows/classroom-workspace.md#lib-03--editar-nombreasociación-conservando-el-archivo",
      "family": "Biblioteca",
      "domain": "classroom-workspace",
      "frame": "screens.html#LIB-03/teacher/normal",
      "hash": "LIB-03/teacher/normal",
      "variants": [
        "teacher"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Biblioteca",
      "reviewNote": "Entrada/rol/contrato. Biblioteca → fila → `Editar datos`, docente activo; `operation:{action:'edit',id,title,unitId,topicId}` y revisión de aula."
    },
    {
      "id": "LIB-04",
      "title": "Eliminar material no vinculado",
      "sourceDoc": "../flows/classroom-workspace.md#lib-04--eliminar-material-no-vinculado",
      "family": "Biblioteca",
      "domain": "classroom-workspace",
      "frame": "screens.html#LIB-04/teacher/normal",
      "hash": "LIB-04/teacher/normal",
      "variants": [
        "teacher"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Biblioteca",
      "reviewNote": "Entrada/rol/contrato. Biblioteca → `Eliminar material`, docente activo; `operation:{action:'delete',id,confirm:true}`. Material vinculado deshabilita control con explicación textual; el servidor revalida también referencias compartidas."
    },
    {
      "id": "LIB-05",
      "title": "Pantalla contextual de archivos privados",
      "sourceDoc": "../flows/classroom-workspace.md#lib-05--pantalla-contextual-de-archivos-privados",
      "family": "Biblioteca",
      "domain": "classroom-workspace",
      "frame": "screens.html#LIB-05/teacher/normal",
      "hash": "LIB-05/teacher/normal",
      "variants": [
        "teacher"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Biblioteca",
      "reviewNote": "Entrada real. `/files?kind=classroom&id=<uuid>&purpose=plan|material`, o `kind=draft&purpose=plan` para creación. La página `files.tsx` y `PrivateFilePanel` exigen contexto exacto; claves adicionales, ID inválido o combinación no admitida devuelven “Abrí los archivos desde un borrador o aula existente con su contexto completo”. No es un drive global ni lista de todas las entregas."
    },
    {
      "id": "WALL-01",
      "title": "Leer avisos y consultas",
      "sourceDoc": "../flows/classroom-workspace.md#wall-01--leer-avisos-y-consultas",
      "family": "Muro",
      "domain": "classroom-workspace",
      "frame": "screens.html#WALL-01/teacher/normal",
      "hash": "WALL-01/teacher/normal",
      "variants": [
        "teacher",
        "student"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Muro",
      "reviewNote": "Entrada/rol/contrato. Aula → Muro; ambos roles actuales; `GET /api/v1/classrooms/:id/wall` devuelve revisión/posts. Notificación abre IDs de publicación/respuesta comprobados por servidor y enfoca el elemento real."
    },
    {
      "id": "WALL-02",
      "title": "Publicar aviso/consulta y responder",
      "sourceDoc": "../flows/classroom-workspace.md#wall-02--publicar-avisoconsulta-y-responder",
      "family": "Muro",
      "domain": "classroom-workspace",
      "frame": "screens.html#WALL-02/teacher/normal",
      "hash": "WALL-02/teacher/normal",
      "variants": [
        "teacher",
        "student"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Muro",
      "reviewNote": "Entrada/rol/contrato. Muro → `Publicar aviso` docente o `Publicar consulta` estudiante; hilo → `Responder publicación`. `POST /:id/wall` con `{revision,operation:{action:'publish',body}}` o `{action:'reply',postId,body}`. El servidor deriva tipo/rol, no el formulario."
    },
    {
      "id": "WALL-03",
      "title": "Editar o moderar texto",
      "sourceDoc": "../flows/classroom-workspace.md#wall-03--editar-o-moderar-texto",
      "family": "Muro",
      "domain": "classroom-workspace",
      "frame": "screens.html#WALL-03/teacher/normal",
      "hash": "WALL-03/teacher/normal",
      "variants": [
        "teacher",
        "student"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Muro",
      "reviewNote": "Entrada/rol. Menú de contenido → `Editar` solo autor; `Eliminar` autor o docente del aula. El docente no puede reescribir texto ajeno. Capacidades `canEdit/canRemove` del servidor gobiernan controles."
    },
    {
      "id": "WALL-04",
      "title": "Continuar un hilo desde notificaciones",
      "sourceDoc": "../flows/classroom-workspace.md#wall-04--continuar-un-hilo-desde-notificaciones",
      "family": "Muro",
      "domain": "classroom-workspace",
      "frame": "screens.html#WALL-04/teacher/normal",
      "hash": "WALL-04/teacher/normal",
      "variants": [
        "teacher",
        "student"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Muro",
      "reviewNote": "Entrada/rol. Centro de notificaciones → item P6 → `Abrir publicación`; `POST /api/v1/classrooms/notifications/:id/open` con `{}` devuelve classroomId/postId/replyId y marca leído. `POST /notifications/:id/read` marca leído sin abrir y es idempotente."
    },
    {
      "id": "PEOPLE-01",
      "title": "Consultar participantes según rol",
      "sourceDoc": "../flows/classroom-workspace.md#people-01--consultar-participantes-según-rol",
      "family": "Participantes",
      "domain": "classroom-workspace",
      "frame": "screens.html#PEOPLE-01/teacher/normal",
      "hash": "PEOPLE-01/teacher/normal",
      "variants": [
        "teacher",
        "student"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Participantes",
      "reviewNote": "Entrada/rol/contrato. Aula → Alumnos (docente) o Compañeros (estudiante), `GET /api/v1/classrooms/:id/members`. Rol pertenece al aula, sin interruptor global; una cuenta puede enseñar otra materia."
    },
    {
      "id": "PEOPLE-02",
      "title": "Resumen académico y antiguos estudiantes",
      "sourceDoc": "../flows/classroom-workspace.md#people-02--resumen-académico-y-antiguos-estudiantes",
      "family": "Participantes",
      "domain": "classroom-workspace",
      "frame": "screens.html#PEOPLE-02/teacher/normal",
      "hash": "PEOPLE-02/teacher/normal",
      "variants": [
        "teacher"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Participantes",
      "reviewNote": "Entrada/rol/contrato. Solo docente → `Ver resumen` actual o Historial. `GET /:id/members/:studentId` y `/members/:studentId/progress`; antiguos se listan por `GET /:id/history`. No hay directorio público."
    },
    {
      "id": "PEOPLE-03",
      "title": "Invitar, administrar invitaciones y código",
      "sourceDoc": "../flows/classroom-workspace.md#people-03--invitar-administrar-invitaciones-y-código",
      "family": "Participantes",
      "domain": "classroom-workspace",
      "frame": "screens.html#PEOPLE-03/teacher/normal",
      "hash": "PEOPLE-03/teacher/normal",
      "variants": [
        "teacher"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Participantes",
      "reviewNote": "Entrada/rol. Alumnos → `Invitar estudiantes`, bloque Invitaciones y Código; solo docente activo. Conserva los flujos de acceso definidos en la especificación, sin convertir invitación enviada en inscripción."
    },
    {
      "id": "PEOPLE-04",
      "title": "Remover o salir conservando historial",
      "sourceDoc": "../flows/classroom-workspace.md#people-04--remover-o-salir-conservando-historial",
      "family": "Participantes",
      "domain": "classroom-workspace",
      "frame": "screens.html#PEOPLE-04/teacher/normal",
      "hash": "PEOPLE-04/teacher/normal",
      "variants": [
        "teacher",
        "student"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Participantes",
      "reviewNote": "Entrada/rol/contrato. Docente Alumnos → Remover → `POST /:id/members/:studentId/remove {}`; estudiante actual → `Salir del aula` → `POST /:id/leave {}`. No remover docente, transferir propiedad o añadir co-docentes."
    },
    {
      "id": "ACT-01",
      "title": "Encontrar una actividad y elegir su recorrido",
      "sourceDoc": "../flows/activity-authoring.md#act-01--encontrar-una-actividad-y-elegir-su-recorrido",
      "family": "Actividades",
      "domain": "activity-authoring",
      "frame": "screens.html#ACT-01/teacher/normal",
      "hash": "ACT-01/teacher/normal",
      "variants": [
        "teacher",
        "student"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Actividades",
      "reviewNote": "Entrada y rol. Actividades desde aula/Plan/notificación. `GET /:id/activities`: docente ve borradores privados, publicadas y retiradas; estudiante únicamente lo publicado autorizado. Seleccionar unidad/tema es filtro, no cambia la asociación de ninguna actividad."
    },
    {
      "id": "ACT-02",
      "title": "Crear un borrador manual y organizarlo",
      "sourceDoc": "../flows/activity-authoring.md#act-02--crear-un-borrador-manual-y-organizarlo",
      "family": "Autoría manual",
      "domain": "activity-authoring",
      "frame": "screens.html#ACT-02/tp/normal",
      "hash": "ACT-02/tp/normal",
      "variants": [
        "tp",
        "quiz",
        "exam"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Autoría manual",
      "reviewNote": "Entrada/rol/contrato. Crear actividad → Manual → tipo, docente activo. `POST /:id/activities {revision,operation:{action:'create',type}}`, `type=ASSIGNMENT|QUESTIONNAIRE|EVALUATION`; crea ID privado y abre editor. Guardar usa `operation:{action:'save',id,payload}`."
    },
    {
      "id": "ACT-03",
      "title": "Escribir un trabajo práctico y sus recursos",
      "sourceDoc": "../flows/activity-authoring.md#act-03--escribir-un-trabajo-práctico-y-sus-recursos",
      "family": "Autoría · Trabajo práctico",
      "domain": "activity-authoring",
      "frame": "screens.html#ACT-03/tp/normal",
      "hash": "ACT-03/tp/normal",
      "variants": [
        "tp"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Autoría · Trabajo práctico",
      "reviewNote": "Entrada/rol. Editor de ASSIGNMENT, docente activo, antes de primera participación para contenido. Guardado por ACT-02; carga privada de instrucciones con purpose `instructions`, scope de la misma aula y target `activityId`."
    },
    {
      "id": "ACT-04",
      "title": "Construir cuestionario o evaluación",
      "sourceDoc": "../flows/activity-authoring.md#act-04--construir-cuestionario-o-evaluación",
      "family": "Autoría · Preguntas",
      "domain": "activity-authoring",
      "frame": "screens.html#ACT-04/quiz/normal",
      "hash": "ACT-04/quiz/normal",
      "variants": [
        "quiz",
        "exam"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Autoría · Preguntas",
      "reviewNote": "Entrada/rol/contrato. Editor QUESTIONNAIRE/EVALUATION → Agregar pregunta; docente activo antes de primer intento. `questions[]` con `type,prompt,points,scoringRule,options[{text,correct}]`. Pregunta y opciones reciben IDs persistidos al guardar; después de participación no se reconstruyen mediante metadata."
    },
    {
      "id": "ACT-05",
      "title": "Elegir plazo y política de recepción",
      "sourceDoc": "../flows/activity-authoring.md#act-05--elegir-plazo-y-política-de-recepción",
      "family": "Autoría · Plazo",
      "domain": "activity-authoring",
      "frame": "screens.html#ACT-05/tp/normal",
      "hash": "ACT-05/tp/normal",
      "variants": [
        "tp",
        "quiz",
        "exam"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Autoría · Plazo",
      "reviewNote": "Entrada/rol. Editor → Entrega y fecha límite; docente activo. Resolver hora: `POST /:id/activities/deadline {local}` → zona/choices. Guardado inicial en payload; después del bloqueo: `operation:{action:'deadline',id,deadline,allowLate}` con revisión actual."
    },
    {
      "id": "ACT-06",
      "title": "Revisar, publicar o retirar",
      "sourceDoc": "../flows/activity-authoring.md#act-06--revisar-publicar-o-retirar",
      "family": "Publicación",
      "domain": "activity-authoring",
      "frame": "screens.html#ACT-06/tp/normal",
      "hash": "ACT-06/tp/normal",
      "variants": [
        "tp",
        "quiz",
        "exam"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Publicación",
      "reviewNote": "Entrada/rol/contrato. Lista/editor confirmado → Vista previa docente o Publicar/Retirar. `GET /:id/activities/:activityId/preview`; `POST /:id/activities {revision,operation:{action:'publish'|'withdraw',id}}`. Solo docente activo, sin primer intento para publicar/retirar."
    },
    {
      "id": "ACT-07",
      "title": "Corregir organización después de participación",
      "sourceDoc": "../flows/activity-authoring.md#act-07--corregir-organización-después-de-participación",
      "family": "Autoría · Contenido bloqueado",
      "domain": "activity-authoring",
      "frame": "screens.html#ACT-07/tp/normal",
      "hash": "ACT-07/tp/normal",
      "variants": [
        "tp",
        "quiz",
        "exam"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Autoría · Contenido bloqueado",
      "reviewNote": "Entrada/rol/contrato. Editar actividad con `locked=true`; docente activo. `metadata{id,title,unitId,topicIds}`; plazo por ACT-05. Estudiante TP inicia al abrir instrucciones; cuestionario/evaluación al Comenzar; preview docente nunca inicia."
    },
    {
      "id": "AI-01",
      "title": "Preparar una generación explícita y sus fuentes",
      "sourceDoc": "../flows/activity-authoring.md#ai-01--preparar-una-generación-explícita-y-sus-fuentes",
      "family": "Autoría con IA",
      "domain": "activity-authoring",
      "frame": "screens.html#AI-01/tp/normal",
      "hash": "AI-01/tp/normal",
      "variants": [
        "tp",
        "quiz",
        "exam"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Autoría con IA",
      "reviewNote": "Entrada/rol/contrato. Actividades → Generar con IA, solo docente actual activo. `GET /:id/activity-generations/sources` devuelve plan vigente y materiales no eliminados del aula, procesables o no con motivo. `GET /:id/activity-generations` recupera últimos 20 trabajos. Abrir/recargar/seleccionar fuentes solo lee; no llama a generar."
    },
    {
      "id": "AI-02",
      "title": "Seguir y recuperar el trabajo durable",
      "sourceDoc": "../flows/activity-authoring.md#ai-02--seguir-y-recuperar-el-trabajo-durable",
      "family": "Autoría con IA",
      "domain": "activity-authoring",
      "frame": "screens.html#AI-02/tp/normal",
      "hash": "AI-02/tp/normal",
      "variants": [
        "tp",
        "quiz",
        "exam"
      ],
      "states": [
        "normal",
        "queued",
        "running",
        "ready",
        "failed",
        "stale",
        "applied",
        "unknown",
        "loading",
        "error",
        "readonly",
        "unavailable"
      ],
      "composition": "Autoría con IA",
      "reviewNote": "Entrada/contrato. Tras generar o Generaciones recientes → Recuperar. `POST /:id/activity-generations` devuelve 202 nuevo o 200 replay; `GET /:id/activity-generations/:jobId` consulta. Mismo rol docente y aula incluso para GET."
    },
    {
      "id": "AI-03",
      "title": "Revisar propuesta privada y vista estudiante",
      "sourceDoc": "../flows/activity-authoring.md#ai-03--revisar-propuesta-privada-y-vista-estudiante",
      "family": "Autoría con IA",
      "domain": "activity-authoring",
      "frame": "screens.html#AI-03/tp/normal",
      "hash": "AI-03/tp/normal",
      "variants": [
        "tp",
        "quiz",
        "exam"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Autoría con IA",
      "reviewNote": "Entrada/rol. READY → `Revisar esta propuesta`; docente del aula. Copia local de propuesta persistida; no se guarda una corrección docente de propuesta por cada tecla. Solo aplicar crea borrador durable con esa copia revisada."
    },
    {
      "id": "AI-04",
      "title": "Aplicar la propuesta como nuevo borrador",
      "sourceDoc": "../flows/activity-authoring.md#ai-04--aplicar-la-propuesta-como-nuevo-borrador",
      "family": "Autoría con IA",
      "domain": "activity-authoring",
      "frame": "screens.html#AI-04/tp/normal",
      "hash": "AI-04/tp/normal",
      "variants": [
        "tp",
        "quiz",
        "exam"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Autoría con IA",
      "reviewNote": "Entrada/rol/contrato. Revisión válida READY → `Usar propuesta revisada como borrador`, docente activo. `POST /:id/activity-generations/:jobId/apply {revision,requestId,proposal}` → generationId/activityId/revision."
    },
    {
      "id": "AI-05",
      "title": "Regenerar, resolver fallos y preservar trabajo",
      "sourceDoc": "../flows/activity-authoring.md#ai-05--regenerar-resolver-fallos-y-preservar-trabajo",
      "family": "Autoría con IA",
      "domain": "activity-authoring",
      "frame": "screens.html#AI-05/tp/normal",
      "hash": "AI-05/tp/normal",
      "variants": [
        "tp",
        "quiz",
        "exam"
      ],
      "states": [
        "normal",
        "error",
        "unknown",
        "stale",
        "readonly",
        "conflict",
        "unavailable"
      ],
      "composition": "Autoría con IA",
      "reviewNote": "Entrada/rol/contrato. READY/FAILED/STALE → `Preparar regeneración completa`; docente activo. `POST /:id/activity-generations/:jobId/regenerate` con StartActivityGeneration completo más `acknowledgePossibleCharge`. Genera sucesor nuevo; anterior permanece recuperable. No endpoint de reintento implícito ni cancelación prometida."
    },
    {
      "id": "SUB-01",
      "title": "Abrir una actividad y comenzar cuando corresponde",
      "sourceDoc": "../flows/submissions-and-grading.md#sub-01--abrir-una-actividad-y-comenzar-cuando-corresponde",
      "family": "Resolución y entrega",
      "domain": "submissions-and-grading",
      "frame": "screens.html#SUB-01/tp/normal",
      "hash": "SUB-01/tp/normal",
      "variants": [
        "tp",
        "quiz",
        "exam"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Resolución y entrega",
      "reviewNote": "Entrada/rol/contrato. Estudiante actual → actividad publicada; `GET /:id/activities/:activityId/session` devuelve expected/eligibilityReason, recepción, serverTime, intento/capacidades y contenido seguro. Docente usa preview, no el camino de estudiante. Inicio explícito: `POST /:id/activities/:activityId/start {}`."
    },
    {
      "id": "SUB-02",
      "title": "Elegibilidad, primera matrícula y reingreso",
      "sourceDoc": "../flows/submissions-and-grading.md#sub-02--elegibilidad-primera-matrícula-y-reingreso",
      "family": "Resolución y entrega",
      "domain": "submissions-and-grading",
      "frame": "screens.html#SUB-02/tp/normal",
      "hash": "SUB-02/tp/normal",
      "variants": [
        "tp",
        "quiz",
        "exam"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Resolución y entrega",
      "reviewNote": "Entrada/rol. Consulta de actividad o Mi progreso; estudiante actual; docente ve elegibilidad en `GET /:id/activities/:activityId/eligibility` para habilitar primera entrega, no por mirar una nota faltante."
    },
    {
      "id": "SUB-03",
      "title": "Resolver preguntas con guardado verificable",
      "sourceDoc": "../flows/submissions-and-grading.md#sub-03--resolver-preguntas-con-guardado-verificable",
      "family": "Resolución · Preguntas",
      "domain": "submissions-and-grading",
      "frame": "screens.html#SUB-03/quiz/normal",
      "hash": "SUB-03/quiz/normal",
      "variants": [
        "quiz",
        "exam"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Resolución · Preguntas",
      "reviewNote": "Entrada/rol/contrato. Intento DRAFT de cuestionario/evaluación con editor vigente. `POST /:id/attempts/:attemptId/answer` con revisión de intento y respuesta de la pregunta, encabezados de editor/epoch gestionados por cliente existente. Sin editor la consulta solo muestra respuestas confirmadas."
    },
    {
      "id": "SUB-04",
      "title": "Preparar archivos de un TP",
      "sourceDoc": "../flows/submissions-and-grading.md#sub-04--preparar-archivos-de-un-tp",
      "family": "Resolución · Trabajo práctico",
      "domain": "submissions-and-grading",
      "frame": "screens.html#SUB-04/tp/normal",
      "hash": "SUB-04/tp/normal",
      "variants": [
        "tp"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Resolución · Trabajo práctico",
      "reviewNote": "Entrada/rol/contrato. Intento TP DRAFT con editor vigente. Carga P4 privada: `POST /api/v1/files` con scope aula, purpose `attachment`, targetId de intento; `PUT /files/:fileId/content` con editor/epoch; estado recuperado en sesión. Quitar selección persistida: `POST /:id/attempts/:attemptId/attachments-remove {revision,fileId}`."
    },
    {
      "id": "SUB-05",
      "title": "Consultar otro dispositivo y transferir edición",
      "sourceDoc": "../flows/submissions-and-grading.md#sub-05--consultar-otro-dispositivo-y-transferir-edición",
      "family": "Transferencia de edición",
      "domain": "submissions-and-grading",
      "frame": "screens.html#SUB-05/tp/normal",
      "hash": "SUB-05/tp/normal",
      "variants": [
        "tp",
        "quiz",
        "exam"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Transferencia de edición",
      "reviewNote": "Entrada/rol/contrato. Mismo estudiante abre intento DRAFT en otra pestaña/dispositivo; sesión inicialmente de solo consulta. `POST /:id/attempts/:attemptId/transfer {revision}` devuelve capacidad/epoch nueva. Token/epoch son privados de memoria de la pestaña; no URL, cookie ni storage compartido."
    },
    {
      "id": "SUB-06",
      "title": "Confirmar envío y recibir comprobante",
      "sourceDoc": "../flows/submissions-and-grading.md#sub-06--confirmar-envío-y-recibir-comprobante",
      "family": "Confirmación y comprobante",
      "domain": "submissions-and-grading",
      "frame": "screens.html#SUB-06/tp/normal",
      "hash": "SUB-06/tp/normal",
      "variants": [
        "tp",
        "quiz",
        "exam"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Confirmación y comprobante",
      "reviewNote": "Entrada/rol/contratos. Estudiante con intento abierto, expected y editor vigente. TP: `POST /:id/attempts/:attemptId/submit-practical {revision,confirm:true}`. Preguntas: `POST /:id/attempts/:attemptId/submit-answers {revision,confirm:true,confirmIncomplete}`. El cliente primero confirma respuestas pendientes; ninguna escritura de borrador entrega sola."
    },
    {
      "id": "SUB-07",
      "title": "Consultar historial y habilitar reentrega",
      "sourceDoc": "../flows/submissions-and-grading.md#sub-07--consultar-historial-y-habilitar-reentrega",
      "family": "Historial y reentrega",
      "domain": "submissions-and-grading",
      "frame": "screens.html#SUB-07/tp/normal",
      "hash": "SUB-07/tp/normal",
      "variants": [
        "tp",
        "quiz",
        "exam",
        "teacher-tp",
        "teacher-quiz",
        "teacher-exam"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Historial y reentrega",
      "reviewNote": "Entrada/rol/contratos. Estudiante `Ver mis intentos`: `GET /:id/activities/:activityId/history`. Docente `Ver entregas recibidas`: `/history-submissions`. Detalle `GET /:id/attempts/:attemptId/history`. Reabrir: `POST /:id/activities/:activityId/reopen {revision,studentId,deadline,confirm:true}` solo docente activo."
    },
    {
      "id": "SUB-08",
      "title": "Habilitar primera entrega fuera de la obligación original",
      "sourceDoc": "../flows/submissions-and-grading.md#sub-08--habilitar-primera-entrega-fuera-de-la-obligación-original",
      "family": "Habilitación individual",
      "domain": "submissions-and-grading",
      "frame": "screens.html#SUB-08/tp/normal",
      "hash": "SUB-08/tp/normal",
      "variants": [
        "tp",
        "quiz",
        "exam"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Habilitación individual",
      "reviewNote": "Entrada/rol/contratos. Docente de aula activa → actividad publicada → Habilitar primera entrega. `GET /:id/activities/:activityId/eligibility` → estudiantes actuales con no expected y motivo; `POST /:id/activities/:activityId/authorize-first {revision,studentId,deadline}`."
    },
    {
      "id": "GRADE-01",
      "title": "Abrir y guardar corrección privada",
      "sourceDoc": "../flows/submissions-and-grading.md#grade-01--abrir-y-guardar-corrección-privada",
      "family": "Corrección y resultados",
      "domain": "submissions-and-grading",
      "frame": "screens.html#GRADE-01/tp/normal",
      "hash": "GRADE-01/tp/normal",
      "variants": [
        "tp",
        "quiz",
        "exam"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Corrección y resultados",
      "reviewNote": "Entrada/rol/contrato. Docente → entregas/historial → `Corregir intento N`. `GET /:id/attempts/:attemptId/grading`; `POST` misma ruta con `{revision,overallGrade,overallFeedback,questions:[{questionId,points,feedback}]}`. Solo intentos confirmados, nunca borrador privado estudiante. Docente puede consultar historia de antiguo miembro; escribir depende de capacidades actuales servidor/aula."
    },
    {
      "id": "GRADE-02",
      "title": "Calcular y publicar calificación",
      "sourceDoc": "../flows/submissions-and-grading.md#grade-02--calcular-y-publicar-calificación",
      "family": "Corrección y resultados",
      "domain": "submissions-and-grading",
      "frame": "screens.html#GRADE-02/tp/normal",
      "hash": "GRADE-02/tp/normal",
      "variants": [
        "tp",
        "quiz",
        "exam"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Corrección y resultados",
      "reviewNote": "Entrada/rol/contrato. Corrección guardada completa → `Publicar calificación`, solo docente activo. `POST /:id/attempts/:attemptId/publish-grade {revision,confirm:true}`. Acción separada de guardar; usa estado guardado, no campos locales sin confirmar."
    },
    {
      "id": "GRADE-03",
      "title": "Rectificar nota publicada con motivo y auditoría privada",
      "sourceDoc": "../flows/submissions-and-grading.md#grade-03--rectificar-nota-publicada-con-motivo-y-auditoría-privada",
      "family": "Corrección y resultados",
      "domain": "submissions-and-grading",
      "frame": "screens.html#GRADE-03/tp/normal",
      "hash": "GRADE-03/tp/normal",
      "variants": [
        "tp",
        "quiz",
        "exam"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Corrección y resultados",
      "reviewNote": "Entrada/rol/contrato. Docente → corrección de intento ya publicado → `Rectificar calificación publicada`. `GET /:id/attempts/:attemptId/grade-corrections`; `POST {revision,newGrade,reason,confirm:true}`."
    },
    {
      "id": "GRADE-04",
      "title": "Ver resultado propio y devolución publicada",
      "sourceDoc": "../flows/submissions-and-grading.md#grade-04--ver-resultado-propio-y-devolución-publicada",
      "family": "Resultado publicado",
      "domain": "submissions-and-grading",
      "frame": "screens.html#GRADE-04/tp/normal",
      "hash": "GRADE-04/tp/normal",
      "variants": [
        "tp",
        "quiz",
        "exam"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Resultado publicado",
      "reviewNote": "Entrada/rol/contrato. Estudiante → historial → intento SUBMITTED, notificación GRADE_PUBLISHED/GRADE_CORRECTED o actividad propia → `GET /:id/attempts/:attemptId/result`. Solo propio y con acceso actual; docente consulta bajo sus permisos, no desde identidad estudiante."
    },
    {
      "id": "GRADE-05",
      "title": "Llegar desde notificación académica al objeto correcto",
      "sourceDoc": "../flows/submissions-and-grading.md#grade-05--llegar-desde-notificación-académica-al-objeto-correcto",
      "family": "Notificaciones",
      "domain": "submissions-and-grading",
      "frame": "screens.html#GRADE-05/default/normal",
      "hash": "GRADE-05/default/normal",
      "variants": [
        "default"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Notificaciones",
      "reviewNote": "Entrada/contratos. Centro de notificaciones global o `/mis-aulas?notificacion=<uuid>`; `POST /api/v1/classrooms/notifications/:id/open {}` valida destinatario/membresía/target y marca leído. Destino académico tiene kind activity/attempt/submission/grade, classroomId/activityId/attemptId y gradeId cuando aplica."
    },
    {
      "id": "PROG-01",
      "title": "Mi progreso: entregas, notas y Plan separados",
      "sourceDoc": "../flows/submissions-and-grading.md#prog-01--mi-progreso-entregas-notas-y-plan-separados",
      "family": "Progreso",
      "domain": "submissions-and-grading",
      "frame": "screens.html#PROG-01/student/normal",
      "hash": "PROG-01/student/normal",
      "variants": [
        "student"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Progreso",
      "reviewNote": "Entrada/rol/contrato. Estudiante → Mi progreso; `GET /:id/progress` scope self. Solo datos propios y estado global no personal del Plan."
    },
    {
      "id": "PROG-02",
      "title": "Progreso del aula y cálculo de promedio actual",
      "sourceDoc": "../flows/submissions-and-grading.md#prog-02--progreso-del-aula-y-cálculo-de-promedio-actual",
      "family": "Progreso",
      "domain": "submissions-and-grading",
      "frame": "screens.html#PROG-02/teacher/normal",
      "hash": "PROG-02/teacher/normal",
      "variants": [
        "teacher"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Progreso",
      "reviewNote": "Entrada/rol/contrato. Docente → Progreso; `GET /:id/progress` scope classroom. No endpoint de exportación ni ranking nuevo."
    },
    {
      "id": "PROG-03",
      "title": "Seguimiento individual docente e historial",
      "sourceDoc": "../flows/submissions-and-grading.md#prog-03--seguimiento-individual-docente-e-historial",
      "family": "Progreso individual",
      "domain": "submissions-and-grading",
      "frame": "screens.html#PROG-03/teacher/normal",
      "hash": "PROG-03/teacher/normal",
      "variants": [
        "teacher"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "readonly",
        "conflict",
        "success",
        "unavailable"
      ],
      "composition": "Progreso individual",
      "reviewNote": "Entrada/rol/contrato. Alumnos/Historial → Ver resumen; solo docente. `GET /:id/members/:studentId/progress` scope member y resumen de entregas. La consulta de otro estudiante por un estudiante se deniega."
    },
    {
      "id": "AGENDA-01",
      "title": "consultar mes, día y zona de vista",
      "sourceDoc": "../flows/agenda.md#agenda-01--consultar-mes-día-y-zona-de-vista",
      "family": "Agenda",
      "domain": "agenda",
      "frame": "screens.html#AGENDA-01/default/normal",
      "hash": "AGENDA-01/default/normal",
      "variants": [
        "default"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "success",
        "conflict"
      ],
      "composition": "Agenda",
      "reviewNote": "Entrada real: shell → `/agenda`; Inicio puede enlazar como acceso global. Desktop: título Mi Agenda y breve descripción, Hoy/Nuevo evento, mes con anterior/siguiente, cuadrícula de lunes a domingo, día seleccionado y próximas entregas en columna lateral. Escena `scenes/agenda.webp` pequeña en cabecera sin quitar ancho al calendario. Móvil 320–390 px: cabecera compacta, cuadrícula de números/indicadores sin títulos comprimidos, lista completa debajo y próximas entregas en bloque propio; no scroll horizontal de página."
    },
    {
      "id": "AGENDA-02",
      "title": "leer eventos del día",
      "sourceDoc": "../flows/agenda.md#agenda-02--leer-eventos-del-día",
      "family": "Agenda",
      "domain": "agenda",
      "frame": "screens.html#AGENDA-02/default/normal",
      "hash": "AGENDA-02/default/normal",
      "variants": [
        "default"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "success",
        "conflict"
      ],
      "composition": "Agenda",
      "reviewNote": "Entrada real: selección de fecha en AGENDA-01. Composición: lista con fecha completa como título; desktop tarjetas compactas y móvil tarjetas de ancho disponible. Cada evento privado muestra categoría, Privado, Semanal si corresponde, título, intervalo/día completo, notas si existen y Editar evento/serie. El diseño propone mostrar inicio y fin completos en la tarjeta, derivados del evento, sin depender solo del resumen de inicio actual. Eventos de varios días indican extensión sin duplicar el mismo evento como si fueran altas distintas."
    },
    {
      "id": "AGENDA-03",
      "title": "próximas entregas y apertura autorizada",
      "sourceDoc": "../flows/agenda.md#agenda-03--próximas-entregas-y-apertura-autorizada",
      "family": "Agenda",
      "domain": "agenda",
      "frame": "screens.html#AGENDA-03/default/normal",
      "hash": "AGENDA-03/default/normal",
      "variants": [
        "default"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "success",
        "conflict"
      ],
      "composition": "Agenda",
      "reviewNote": "Entrada real: panel `Upcoming` de `/agenda`; propuesta de miniagenda en Inicio debe reutilizar la misma política. Datos de estudiante: actividad publicada/elegible, membresía actual, último intento y plazo efectivo con prórroga individual. Primera entrega confirmada sale de pendientes; reentrega habilitada puede volver. Excluir borradores/retiradas, no esperadas, sin plazo, vencidas, archivadas y accesos revocados. Datos de docente: plazos generales de sus aulas con Enseño, sin plazos individuales ni registros de estudiantes en el calendario."
    },
    {
      "id": "AGENDA-04",
      "title": "crear evento privado",
      "sourceDoc": "../flows/agenda.md#agenda-04--crear-evento-privado",
      "family": "Evento privado",
      "domain": "agenda",
      "frame": "screens.html#AGENDA-04/default/normal",
      "hash": "AGENDA-04/default/normal",
      "variants": [
        "default"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "success",
        "conflict"
      ],
      "composition": "Evento privado",
      "reviewNote": "Entrada real: Nuevo evento en cabecera o Agregar evento este día. Cuenta verificada sin necesidad de aula. Desktop: diálogo contenido, grupos Qué/Cuándo/Repetición/Más opciones, resumen y pie Cancelar/Crear evento. Móvil: diálogo con ancho disponible y scroll interno, título/cierre visible, campos apilados y sin teclado tapando el campo activo. Mantener foco y regreso al disparador."
    },
    {
      "id": "AGENDA-05",
      "title": "repetición semanal completa",
      "sourceDoc": "../flows/agenda.md#agenda-05--repetición-semanal-completa",
      "family": "Evento privado",
      "domain": "agenda",
      "frame": "screens.html#AGENDA-05/default/normal",
      "hash": "AGENDA-05/default/normal",
      "variants": [
        "default"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "success",
        "conflict"
      ],
      "composition": "Evento privado",
      "reviewNote": "Entrada real: AGENDA-04/edición → Cada semana. Composición desktop/móvil: fecha Repetir hasta (incluido), día de la semana, cantidad, fecha de última ocurrencia efectiva y límite 53. Default actual hasta inicio +28 días, cinco encuentros; si cambia inicio y la persona no editó el final, se recalcula; si lo editó, se conserva."
    },
    {
      "id": "AGENDA-06",
      "title": "resolver horas inexistentes o repetidas",
      "sourceDoc": "../flows/agenda.md#agenda-06--resolver-horas-inexistentes-o-repetidas",
      "family": "Evento privado",
      "domain": "agenda",
      "frame": "screens.html#AGENDA-06/default/normal",
      "hash": "AGENDA-06/default/normal",
      "variants": [
        "default"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "success",
        "conflict"
      ],
      "composition": "Evento privado",
      "reviewNote": "Entrada real: validación de evento con horario en zona IANA. Solo propietario; el error no se resuelve con timezone local implícita del proceso. Desktop/móvil: error junto a inicio/fin y selector de opciones humanas si hora ambigua, con primera/segunda vez y el momento correspondiente; no campo de offset numérico."
    },
    {
      "id": "AGENDA-07",
      "title": "editar sin cambiar el día consultado",
      "sourceDoc": "../flows/agenda.md#agenda-07--editar-sin-cambiar-el-día-consultado",
      "family": "Evento privado",
      "domain": "agenda",
      "frame": "screens.html#AGENDA-07/default/normal",
      "hash": "AGENDA-07/default/normal",
      "variants": [
        "default"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "success",
        "conflict"
      ],
      "composition": "Evento privado",
      "reviewNote": "Entrada real: Editar evento/Editar serie en lista del día. Solo dueño. Recupera título/categoría/notas/color/horario/zona/repetición actuales, no los defaults de alta. Desktop/móvil usan AGENDA-04 con título Editar evento, Guardar cambios y Eliminar/Eliminar serie."
    },
    {
      "id": "AGENDA-08",
      "title": "eliminar evento o serie",
      "sourceDoc": "../flows/agenda.md#agenda-08--eliminar-evento-o-serie",
      "family": "Evento privado",
      "domain": "agenda",
      "frame": "screens.html#AGENDA-08/default/normal",
      "hash": "AGENDA-08/default/normal",
      "variants": [
        "default"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "success",
        "conflict"
      ],
      "composition": "Evento privado",
      "reviewNote": "Entrada real: edición → Eliminar; solo dueño, sin conflicto pendiente. Composición: confirmación breve con título y alcance: evento único o toda la serie incluidas fechas pasadas. En rediseño se propone diálogo coherente con el sistema; actualmente las confirmaciones de descarte/guardar serie/eliminar usan `window.confirm`, por lo que reemplazarlas es trabajo UI futuro, conservando semántica y teclado."
    },
    {
      "id": "AGENDA-09",
      "title": "conflicto entre pestañas y recuperación",
      "sourceDoc": "../flows/agenda.md#agenda-09--conflicto-entre-pestañas-y-recuperación",
      "family": "Evento privado",
      "domain": "agenda",
      "frame": "screens.html#AGENDA-09/default/normal",
      "hash": "AGENDA-09/default/normal",
      "variants": [
        "default"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "success",
        "conflict"
      ],
      "composition": "Evento privado",
      "reviewNote": "Entrada real: guardar/eliminar recibe `CONFLICT` o detecta revisión diferente. Desktop/móvil: aviso en editor, campos propios intactos y guardado/eliminación bloqueados; acción «Revisar versión guardada y conservar mis cambios». Recuperar muestra versión guardada (título, notas, resumen y color) junto al borrador propio para comparación; no fusionar ni reescribir silenciosamente."
    },
    {
      "id": "AGENDA-10",
      "title": "éxito confirmado, fallos y sesión",
      "sourceDoc": "../flows/agenda.md#agenda-10--éxito-confirmado-fallos-y-sesión",
      "family": "Agenda",
      "domain": "agenda",
      "frame": "screens.html#AGENDA-10/default/normal",
      "hash": "AGENDA-10/default/normal",
      "variants": [
        "default"
      ],
      "states": [
        "normal",
        "loading",
        "empty",
        "error",
        "success",
        "conflict"
      ],
      "composition": "Agenda",
      "reviewNote": "- Escritura confirmada + refresco fallido: mantener Evento creado/Cambios guardados/Evento eliminado, indicar «No pudimos actualizar la vista; reintenta la consulta, no hace falta volver a guardar». Reintento solo GET, no repite PUT/PATCH/DELETE ni reabre un editor como si hubiera fallado la escritura.\n- Consulta fallida/parcial: paginación debe completarse; fallo/cursor repetido informa error, sin mostrar conjunto incompleto como calendario completo. Cambio rápido de mes/zona invalida respuestas anteriores. Estado loading no muestra próximos pendientes cero como resultado confirmado.\n- Servicio desconectado: error legible y Reintentar consulta; formulario abierto conserva campos mientras sigue autorizado. La persistencia entre recargas de un formulario no está garantizada: no prometer autosave de eventos nuevos.\n- Sesión/correo: AUTH_REQUIRED retira datos privados y pasa a `/sign-in?next=%2Fagenda`; EMAIL_VERIFICATION_REQUIRED a `/verify-email` con ese destino. No copiar notas a una URL ni storage persistente nuevo. Reautenticar exige revalidar evento/revisión antes de escribir; CSRF/origen inválidos no se convierten en «guardado».\n- Archivo/revocación de aula: próxima consulta/abrir destino elimina plazos ya no autorizados; eventos propios independientes siguen disponibles. No existe estado archivado para evento personal ni reactivación de serie eliminada en este alcance.\n- Assets: `states/empty.webp`, `states/success.webp`, `states/unavailable.webp` pequeños según estado; `scenes/agenda.webp` solo de acompañamiento. Todos con alternativa decorativa vacía cuando el texto ya transmite el significado."
    }
  ],
  "assets": [
    {
      "id": "brand/favicon",
      "default": "assets/brand/favicon.svg",
      "description": "Marca vectorial · favicon.svg",
      "variants": []
    },
    {
      "id": "brand/logo-horizontal-inverse",
      "default": "assets/brand/logo-horizontal-inverse.svg",
      "description": "Marca vectorial · logo-horizontal-inverse.svg",
      "variants": []
    },
    {
      "id": "brand/logo-horizontal",
      "default": "assets/brand/logo-horizontal.svg",
      "description": "Marca vectorial · logo-horizontal.svg",
      "variants": []
    },
    {
      "id": "brand/logo-mono",
      "default": "assets/brand/logo-mono.svg",
      "description": "Marca vectorial · logo-mono.svg",
      "variants": []
    },
    {
      "id": "brand/logo-stacked",
      "default": "assets/brand/logo-stacked.svg",
      "description": "Marca vectorial · logo-stacked.svg",
      "variants": []
    },
    {
      "id": "brand/mark-mono",
      "default": "assets/brand/mark-mono.svg",
      "description": "Marca vectorial · mark-mono.svg",
      "variants": []
    },
    {
      "id": "brand/mark",
      "default": "assets/brand/mark.svg",
      "description": "Marca vectorial · mark.svg",
      "variants": []
    },
    {
      "id": "brand/wordmark",
      "default": "assets/brand/wordmark.svg",
      "description": "Marca vectorial · wordmark.svg",
      "variants": []
    },
    {
      "id": "hero/welcome-learn",
      "description": "Foxy junto a libros; saludo de aprendizaje, mixto o neutro.",
      "default": "assets/hero/welcome-learn.webp",
      "master": "masters/hero/welcome-learn.webp",
      "sourceDimensions": {
        "width": 2172,
        "height": 724
      },
      "decorative": true,
      "alt": "",
      "objectPosition": "right center",
      "textSafe": "left 0–54%; use HTML text, mobile separate image/text",
      "variants": [
        {
          "path": "assets/hero/welcome-learn-480.webp",
          "width": 480,
          "height": 160,
          "bytes": 6520,
          "format": "webp",
          "alpha": false,
          "sha256": "376eba5baa09cdc8fd24b09858aa415f8ed4be3535dd14a14a90837bab6ad951"
        },
        {
          "path": "assets/hero/welcome-learn-960.webp",
          "width": 960,
          "height": 320,
          "bytes": 14934,
          "format": "webp",
          "alpha": false,
          "sha256": "61abc3ce3fb018bc60e0e9066dee02edc355fdf920dbf2624b4dc50cd59e3f2f"
        },
        {
          "path": "assets/hero/welcome-learn.webp",
          "width": 1600,
          "height": 533,
          "bytes": 27450,
          "format": "webp",
          "alpha": false,
          "sha256": "00e585d8407f4bad4348401aca3642f2e6e2325ae4a9179922f35da7a484a15b"
        }
      ]
    },
    {
      "id": "hero/welcome-teach",
      "description": "Foxy escribiendo; saludo de enseñanza.",
      "default": "assets/hero/welcome-teach.webp",
      "master": "masters/hero/welcome-teach.webp",
      "sourceDimensions": {
        "width": 2172,
        "height": 724
      },
      "decorative": true,
      "alt": "",
      "objectPosition": "right center",
      "textSafe": "left 0–54%; use HTML text, mobile separate image/text",
      "variants": [
        {
          "path": "assets/hero/welcome-teach-480.webp",
          "width": 480,
          "height": 160,
          "bytes": 6946,
          "format": "webp",
          "alpha": false,
          "sha256": "2d2279fe62b7cac78acbf81df6a8ee764d0dcdfc80a625b3f1f6d368aac888dd"
        },
        {
          "path": "assets/hero/welcome-teach-960.webp",
          "width": 960,
          "height": 320,
          "bytes": 16080,
          "format": "webp",
          "alpha": false,
          "sha256": "3c939df923183ea360cd8a0e269611727cb9755ba89d5464fe82faa792e35533"
        },
        {
          "path": "assets/hero/welcome-teach.webp",
          "width": 1600,
          "height": 533,
          "bytes": 30170,
          "format": "webp",
          "alpha": false,
          "sha256": "1f3cc0ee6e5e299251b9d6058870833079776e1a50739ed8e44158c376a8a74f"
        }
      ]
    },
    {
      "id": "scenes/auth",
      "description": "Foxy da la bienvenida junto a un libro.",
      "default": "assets/scenes/auth.webp",
      "master": "masters/scenes/auth.webp",
      "sourceDimensions": {
        "width": 1122,
        "height": 1402
      },
      "decorative": true,
      "alt": "",
      "objectPosition": "center",
      "textSafe": null,
      "variants": [
        {
          "path": "assets/scenes/auth-320.webp",
          "width": 320,
          "height": 400,
          "bytes": 12356,
          "format": "webp",
          "alpha": false,
          "sha256": "c413a8b84234bb51aae3ab8577651d9ea8ae7eaeea30e4a61a361d7d24cac45e"
        },
        {
          "path": "assets/scenes/auth-640.webp",
          "width": 640,
          "height": 800,
          "bytes": 28124,
          "format": "webp",
          "alpha": false,
          "sha256": "82e4ad5b9362472cabd6c28b78284c09a3c4c6937d1b746d313a47a97a516f13"
        },
        {
          "path": "assets/scenes/auth.webp",
          "width": 960,
          "height": 1200,
          "bytes": 45188,
          "format": "webp",
          "alpha": false,
          "sha256": "a9144f3e265c3edd2ad65aed8eac19f96c4d3c7cd3ba438fff791ff91748c20e"
        }
      ]
    },
    {
      "id": "scenes/profile",
      "description": "Foxy sentado junto a un cuaderno.",
      "default": "assets/scenes/profile.webp",
      "master": "masters/scenes/profile.webp",
      "sourceDimensions": {
        "width": 1122,
        "height": 1402
      },
      "decorative": true,
      "alt": "",
      "objectPosition": "center",
      "textSafe": null,
      "variants": [
        {
          "path": "assets/scenes/profile-320.webp",
          "width": 320,
          "height": 400,
          "bytes": 9160,
          "format": "webp",
          "alpha": false,
          "sha256": "9010a03422b97b4539f196d7bfbe37039dee9cd8868c198351747866bba06583"
        },
        {
          "path": "assets/scenes/profile-640.webp",
          "width": 640,
          "height": 800,
          "bytes": 21054,
          "format": "webp",
          "alpha": false,
          "sha256": "51cad88d75cb359a981dfcca23a25f4bfc67ae8a50a047ea16ab8cde001798a4"
        },
        {
          "path": "assets/scenes/profile.webp",
          "width": 960,
          "height": 1200,
          "bytes": 33402,
          "format": "webp",
          "alpha": false,
          "sha256": "7195e45c60c4ee8e11c2bc5938620b1f381d76695fe5981b8ef4d62f9338d2ca"
        }
      ]
    },
    {
      "id": "scenes/security",
      "description": "Foxy y escudo; acompañamiento de seguridad.",
      "default": "assets/scenes/security.webp",
      "master": "masters/scenes/security.webp",
      "sourceDimensions": {
        "width": 1254,
        "height": 1254
      },
      "decorative": true,
      "alt": "",
      "objectPosition": "center",
      "textSafe": null,
      "variants": [
        {
          "path": "assets/scenes/security-320.webp",
          "width": 320,
          "height": 320,
          "bytes": 9180,
          "format": "webp",
          "alpha": false,
          "sha256": "e5f8283a388261740c07d356b65f63cf56e5cae7949d6d9e658af6f62c618bc3"
        },
        {
          "path": "assets/scenes/security-640.webp",
          "width": 640,
          "height": 640,
          "bytes": 20752,
          "format": "webp",
          "alpha": false,
          "sha256": "1a92ca8799350da51ab905bd49cf7010f58deb5acbff2452c9320348dbcc5166"
        },
        {
          "path": "assets/scenes/security.webp",
          "width": 960,
          "height": 960,
          "bytes": 33866,
          "format": "webp",
          "alpha": false,
          "sha256": "572a6cb64408e755b40ace625b6dd90dfbbd4d464ca152c973acbee1f2adf8bd"
        }
      ]
    },
    {
      "id": "scenes/agenda",
      "description": "Foxy y calendario decorativo sin fechas.",
      "default": "assets/scenes/agenda.webp",
      "master": "masters/scenes/agenda.webp",
      "sourceDimensions": {
        "width": 1536,
        "height": 1024
      },
      "decorative": true,
      "alt": "",
      "objectPosition": "center",
      "textSafe": null,
      "variants": [
        {
          "path": "assets/scenes/agenda-320.webp",
          "width": 320,
          "height": 213,
          "bytes": 7780,
          "format": "webp",
          "alpha": false,
          "sha256": "0e2658a6541ce32a66186a355c45933736d236b013183cca0f000c62ace00af5"
        },
        {
          "path": "assets/scenes/agenda-640.webp",
          "width": 640,
          "height": 427,
          "bytes": 18108,
          "format": "webp",
          "alpha": false,
          "sha256": "080c2e0924329ed662c3717a61f96eed8b51331d88336b9895a6f651a7a5c53a"
        },
        {
          "path": "assets/scenes/agenda.webp",
          "width": 960,
          "height": 640,
          "bytes": 30016,
          "format": "webp",
          "alpha": false,
          "sha256": "8fbd0cdf46ada2175ddfe7826a30cc9fea2c13802152242f7c1d4bd2c435b235"
        }
      ]
    },
    {
      "id": "states/empty",
      "description": "Foxy y caja vacía; inicio o colección sin contenido.",
      "default": "assets/states/empty.webp",
      "master": "masters/states/empty.webp",
      "sourceDimensions": {
        "width": 1254,
        "height": 1254
      },
      "decorative": true,
      "alt": "",
      "objectPosition": "center",
      "textSafe": null,
      "variants": [
        {
          "path": "assets/states/empty-160.webp",
          "width": 160,
          "height": 160,
          "bytes": 7500,
          "format": "webp",
          "alpha": true,
          "sha256": "d6a3a069eb2a88f095ea64c2836e6d36b550caba8a01091a33a3b05f733184db"
        },
        {
          "path": "assets/states/empty-320.webp",
          "width": 320,
          "height": 320,
          "bytes": 18980,
          "format": "webp",
          "alpha": true,
          "sha256": "b7ef7c2998cd3a633614db48b714a89f798f56b3e33789155a9a85b97e47423c"
        },
        {
          "path": "assets/states/empty.webp",
          "width": 640,
          "height": 640,
          "bytes": 47466,
          "format": "webp",
          "alpha": true,
          "sha256": "154fc4269f31531dc5c4d5306a7aa62642a109dbdeff71e4490cb6e0ac9bcb52"
        }
      ]
    },
    {
      "id": "states/success",
      "description": "Foxy con confirmación; solo tras éxito confirmado.",
      "default": "assets/states/success.webp",
      "master": "masters/states/success.webp",
      "sourceDimensions": {
        "width": 1254,
        "height": 1254
      },
      "decorative": true,
      "alt": "",
      "objectPosition": "center",
      "textSafe": null,
      "variants": [
        {
          "path": "assets/states/success-160.webp",
          "width": 160,
          "height": 160,
          "bytes": 7024,
          "format": "webp",
          "alpha": true,
          "sha256": "f9551f4430ad13275768c1e19019500f153ba6312eeff68ceb8f68269ab7ee71"
        },
        {
          "path": "assets/states/success-320.webp",
          "width": 320,
          "height": 320,
          "bytes": 17654,
          "format": "webp",
          "alpha": true,
          "sha256": "0f5c5dbc6dcb69a0a22847d6dfa375d341a03a0e10ece9b0964243976fff9cb2"
        },
        {
          "path": "assets/states/success.webp",
          "width": 640,
          "height": 640,
          "bytes": 43832,
          "format": "webp",
          "alpha": true,
          "sha256": "71dbeb7b04e2418edbc9bea80c2545d5e81ae3aa5c42e01b2c52c5d561bfe66a"
        }
      ]
    },
    {
      "id": "states/unavailable",
      "description": "Foxy con lupa; búsqueda o recuperación, según texto.",
      "default": "assets/states/unavailable.webp",
      "master": "masters/states/unavailable.webp",
      "sourceDimensions": {
        "width": 1254,
        "height": 1254
      },
      "decorative": true,
      "alt": "",
      "objectPosition": "center",
      "textSafe": null,
      "variants": [
        {
          "path": "assets/states/unavailable-160.webp",
          "width": 160,
          "height": 160,
          "bytes": 7330,
          "format": "webp",
          "alpha": true,
          "sha256": "d0bba58680d8e1c10a1f2974a8e386a8c7704b325a32e1992716b1c2cf0d480c"
        },
        {
          "path": "assets/states/unavailable-320.webp",
          "width": 320,
          "height": 320,
          "bytes": 19096,
          "format": "webp",
          "alpha": true,
          "sha256": "c46c5342d6ed3147c5178c2000ca8d00ea7a734d438cbded3f3983c07bd37a7d"
        },
        {
          "path": "assets/states/unavailable.webp",
          "width": 640,
          "height": 640,
          "bytes": 47706,
          "format": "webp",
          "alpha": true,
          "sha256": "b69e5bd6c4ca74c7e9e699cc96682125e208597cc27d2e08c8297beec7617a5b"
        }
      ]
    },
    {
      "id": "covers/literature",
      "description": "Libro y castillo; literatura.",
      "default": "assets/covers/literature.webp",
      "master": "masters/covers/literature.webp",
      "sourceDimensions": {
        "width": 1536,
        "height": 1024
      },
      "decorative": true,
      "alt": "",
      "objectPosition": "center",
      "textSafe": null,
      "variants": [
        {
          "path": "assets/covers/literature-320.webp",
          "width": 320,
          "height": 213,
          "bytes": 10882,
          "format": "webp",
          "alpha": false,
          "sha256": "e6c3e7ea9b53904f7e987c99133df3a6c4b1f879292974934a8e1ab297fc4c6e"
        },
        {
          "path": "assets/covers/literature-640.webp",
          "width": 640,
          "height": 427,
          "bytes": 26152,
          "format": "webp",
          "alpha": false,
          "sha256": "6374e75b3228d026fef33f90a917971745dd04c4ef9d07c0540e7c7c4a2a2975"
        },
        {
          "path": "assets/covers/literature.webp",
          "width": 1200,
          "height": 800,
          "bytes": 55304,
          "format": "webp",
          "alpha": false,
          "sha256": "2f5d70efbf572b6e5748ecac6e694f090e44f827a14a217c4f7d237c1f852d77"
        }
      ]
    },
    {
      "id": "covers/math",
      "description": "Cuerpos geométricos; matemática.",
      "default": "assets/covers/math.webp",
      "master": "masters/covers/math.webp",
      "sourceDimensions": {
        "width": 1536,
        "height": 1024
      },
      "decorative": true,
      "alt": "",
      "objectPosition": "center",
      "textSafe": null,
      "variants": [
        {
          "path": "assets/covers/math-320.webp",
          "width": 320,
          "height": 213,
          "bytes": 8558,
          "format": "webp",
          "alpha": false,
          "sha256": "fef1e4a61ac01c87ee8186d377c682cef63d45248350634532d495cfd2a0b8d5"
        },
        {
          "path": "assets/covers/math-640.webp",
          "width": 640,
          "height": 427,
          "bytes": 20380,
          "format": "webp",
          "alpha": false,
          "sha256": "1d163ca8ad3212da0b27e1a22a7704c793b9993cf3a6c6bb95a8b1c6a329a379"
        },
        {
          "path": "assets/covers/math.webp",
          "width": 1200,
          "height": 800,
          "bytes": 43684,
          "format": "webp",
          "alpha": false,
          "sha256": "f7dd1b04896aef310bc77c1446f38ce715fb5cebe88a180bf28306eaf45c7ee2"
        }
      ]
    },
    {
      "id": "covers/biology",
      "description": "Microscopio y planta; biología.",
      "default": "assets/covers/biology.webp",
      "master": "masters/covers/biology.webp",
      "sourceDimensions": {
        "width": 1536,
        "height": 1024
      },
      "decorative": true,
      "alt": "",
      "objectPosition": "center",
      "textSafe": null,
      "variants": [
        {
          "path": "assets/covers/biology-320.webp",
          "width": 320,
          "height": 213,
          "bytes": 12610,
          "format": "webp",
          "alpha": false,
          "sha256": "e9f995d72a2f15cd5297b2c4ea1c733336186eb15331c89ae3306ccc1a3f77ad"
        },
        {
          "path": "assets/covers/biology-640.webp",
          "width": 640,
          "height": 427,
          "bytes": 31142,
          "format": "webp",
          "alpha": false,
          "sha256": "05bf9f6e573b030e4754cbd654365e3cc95df0dc5ae95a868d71e1214f3fae71"
        },
        {
          "path": "assets/covers/biology.webp",
          "width": 1200,
          "height": 800,
          "bytes": 68732,
          "format": "webp",
          "alpha": false,
          "sha256": "b61493f1339ad50c69b5359e4c275d752b6f381f73f2086dbb87ef45c068e4f2"
        }
      ]
    },
    {
      "id": "covers/society",
      "description": "Globo y arquitectura; ciencias sociales.",
      "default": "assets/covers/society.webp",
      "master": "masters/covers/society.webp",
      "sourceDimensions": {
        "width": 1536,
        "height": 1024
      },
      "decorative": true,
      "alt": "",
      "objectPosition": "center",
      "textSafe": null,
      "variants": [
        {
          "path": "assets/covers/society-320.webp",
          "width": 320,
          "height": 213,
          "bytes": 10616,
          "format": "webp",
          "alpha": false,
          "sha256": "e429b5fb2914dc91c6bd98eb0d9d8cc0d5319eba697a18f2002212962e38d58e"
        },
        {
          "path": "assets/covers/society-640.webp",
          "width": 640,
          "height": 427,
          "bytes": 25380,
          "format": "webp",
          "alpha": false,
          "sha256": "4c42306a6c26a09d86dce8f075b3c965c601b8a70422a9980b434a97fef2e585"
        },
        {
          "path": "assets/covers/society.webp",
          "width": 1200,
          "height": 800,
          "bytes": 53616,
          "format": "webp",
          "alpha": false,
          "sha256": "5defb0cb3ee65650f89a36d164d97a425a2cf762d32310e124a203686957d84d"
        }
      ]
    },
    {
      "id": "covers/science",
      "description": "Modelo, matraz y computadora; ciencias y tecnología.",
      "default": "assets/covers/science.webp",
      "master": "masters/covers/science.webp",
      "sourceDimensions": {
        "width": 1536,
        "height": 1024
      },
      "decorative": true,
      "alt": "",
      "objectPosition": "center",
      "textSafe": null,
      "variants": [
        {
          "path": "assets/covers/science-320.webp",
          "width": 320,
          "height": 213,
          "bytes": 10186,
          "format": "webp",
          "alpha": false,
          "sha256": "9beef879f822e61afc2faac4256ac4c2d42058954c2a27b67c2cdf045239a705"
        },
        {
          "path": "assets/covers/science-640.webp",
          "width": 640,
          "height": 427,
          "bytes": 24290,
          "format": "webp",
          "alpha": false,
          "sha256": "2b646586d362543c102a4b0c9747a581965c3469c0eecb793c3c195b95cba225"
        },
        {
          "path": "assets/covers/science.webp",
          "width": 1200,
          "height": 800,
          "bytes": 51634,
          "format": "webp",
          "alpha": false,
          "sha256": "49db66f3f16c2c2b6b85876340e7b4debcdd34fcd2172612e3b40c34daf2d553"
        }
      ]
    },
    {
      "id": "covers/creative",
      "description": "Paleta e instrumento; creación artística.",
      "default": "assets/covers/creative.webp",
      "master": "masters/covers/creative.webp",
      "sourceDimensions": {
        "width": 1536,
        "height": 1024
      },
      "decorative": true,
      "alt": "",
      "objectPosition": "center",
      "textSafe": null,
      "variants": [
        {
          "path": "assets/covers/creative-320.webp",
          "width": 320,
          "height": 213,
          "bytes": 9424,
          "format": "webp",
          "alpha": false,
          "sha256": "5578ee76eed8dea6e54d605000b231a9f0801b93866bbf43fb93df76dd96ac1b"
        },
        {
          "path": "assets/covers/creative-640.webp",
          "width": 640,
          "height": 427,
          "bytes": 23224,
          "format": "webp",
          "alpha": false,
          "sha256": "bdd04b54c1956b1a41663b6e28df1394b8795576e4b1e9ed88deda0a0b6c2196"
        },
        {
          "path": "assets/covers/creative.webp",
          "width": 1200,
          "height": 800,
          "bytes": 51142,
          "format": "webp",
          "alpha": false,
          "sha256": "9abc562018873ca91f710bbf21c4bc8aaf3cdda161ce394ad0d6782182bbe659"
        }
      ]
    },
    {
      "id": "covers/general",
      "description": "Libros y útiles; cualquier materia.",
      "default": "assets/covers/general.webp",
      "master": "masters/covers/general.webp",
      "sourceDimensions": {
        "width": 1536,
        "height": 1024
      },
      "decorative": true,
      "alt": "",
      "objectPosition": "center",
      "textSafe": null,
      "variants": [
        {
          "path": "assets/covers/general-320.webp",
          "width": 320,
          "height": 213,
          "bytes": 8746,
          "format": "webp",
          "alpha": false,
          "sha256": "dd3e7e26058462532b4ac47f03bca4c1b161d317ddc381c8f2555348623579cf"
        },
        {
          "path": "assets/covers/general-640.webp",
          "width": 640,
          "height": 427,
          "bytes": 20784,
          "format": "webp",
          "alpha": false,
          "sha256": "969548ff3e4bf416594ad8c39f9008e92211dc29785982ea832102a4c1ae4161"
        },
        {
          "path": "assets/covers/general.webp",
          "width": 1200,
          "height": 800,
          "bytes": 45024,
          "format": "webp",
          "alpha": false,
          "sha256": "2dd7945fec74a9f45b8c1d700432aa68264d129e1d5068c9c25bc896cf923afa"
        }
      ]
    }
  ],
  "icons": [
    {
      "id": "icons/archive",
      "path": "assets/icons/archive.svg",
      "bytes": 209
    },
    {
      "id": "icons/arrow-left",
      "path": "assets/icons/arrow-left.svg",
      "bytes": 199
    },
    {
      "id": "icons/arrow-right",
      "path": "assets/icons/arrow-right.svg",
      "bytes": 200
    },
    {
      "id": "icons/attach",
      "path": "assets/icons/attach.svg",
      "bytes": 249
    },
    {
      "id": "icons/bell",
      "path": "assets/icons/bell.svg",
      "bytes": 219
    },
    {
      "id": "icons/book",
      "path": "assets/icons/book.svg",
      "bytes": 244
    },
    {
      "id": "icons/calendar",
      "path": "assets/icons/calendar.svg",
      "bytes": 263
    },
    {
      "id": "icons/chat",
      "path": "assets/icons/chat.svg",
      "bytes": 276
    },
    {
      "id": "icons/check",
      "path": "assets/icons/check.svg",
      "bytes": 193
    },
    {
      "id": "icons/chevron-down",
      "path": "assets/icons/chevron-down.svg",
      "bytes": 191
    },
    {
      "id": "icons/chevron-right",
      "path": "assets/icons/chevron-right.svg",
      "bytes": 191
    },
    {
      "id": "icons/clipboard",
      "path": "assets/icons/clipboard.svg",
      "bytes": 289
    },
    {
      "id": "icons/clock",
      "path": "assets/icons/clock.svg",
      "bytes": 221
    },
    {
      "id": "icons/close",
      "path": "assets/icons/close.svg",
      "bytes": 199
    },
    {
      "id": "icons/copy",
      "path": "assets/icons/copy.svg",
      "bytes": 202
    },
    {
      "id": "icons/download",
      "path": "assets/icons/download.svg",
      "bytes": 213
    },
    {
      "id": "icons/edit",
      "path": "assets/icons/edit.svg",
      "bytes": 212
    },
    {
      "id": "icons/eye-off",
      "path": "assets/icons/eye-off.svg",
      "bytes": 252
    },
    {
      "id": "icons/eye",
      "path": "assets/icons/eye.svg",
      "bytes": 254
    },
    {
      "id": "icons/file",
      "path": "assets/icons/file.svg",
      "bytes": 217
    },
    {
      "id": "icons/filter",
      "path": "assets/icons/filter.svg",
      "bytes": 202
    },
    {
      "id": "icons/folder",
      "path": "assets/icons/folder.svg",
      "bytes": 197
    },
    {
      "id": "icons/help",
      "path": "assets/icons/help.svg",
      "bytes": 242
    },
    {
      "id": "icons/home",
      "path": "assets/icons/home.svg",
      "bytes": 236
    },
    {
      "id": "icons/link",
      "path": "assets/icons/link.svg",
      "bytes": 243
    },
    {
      "id": "icons/lock",
      "path": "assets/icons/lock.svg",
      "bytes": 259
    },
    {
      "id": "icons/logout",
      "path": "assets/icons/logout.svg",
      "bytes": 211
    },
    {
      "id": "icons/menu",
      "path": "assets/icons/menu.svg",
      "bytes": 202
    },
    {
      "id": "icons/minus",
      "path": "assets/icons/minus.svg",
      "bytes": 187
    },
    {
      "id": "icons/more",
      "path": "assets/icons/more.svg",
      "bytes": 259
    },
    {
      "id": "icons/plus",
      "path": "assets/icons/plus.svg",
      "bytes": 195
    },
    {
      "id": "icons/profile",
      "path": "assets/icons/profile.svg",
      "bytes": 234
    },
    {
      "id": "icons/progress",
      "path": "assets/icons/progress.svg",
      "bytes": 200
    },
    {
      "id": "icons/refresh",
      "path": "assets/icons/refresh.svg",
      "bytes": 210
    },
    {
      "id": "icons/search",
      "path": "assets/icons/search.svg",
      "bytes": 226
    },
    {
      "id": "icons/settings",
      "path": "assets/icons/settings.svg",
      "bytes": 270
    },
    {
      "id": "icons/shield",
      "path": "assets/icons/shield.svg",
      "bytes": 227
    },
    {
      "id": "icons/spark",
      "path": "assets/icons/spark.svg",
      "bytes": 236
    },
    {
      "id": "icons/trash",
      "path": "assets/icons/trash.svg",
      "bytes": 227
    },
    {
      "id": "icons/upload",
      "path": "assets/icons/upload.svg",
      "bytes": 213
    },
    {
      "id": "icons/users",
      "path": "assets/icons/users.svg",
      "bytes": 274
    },
    {
      "id": "icons/warning",
      "path": "assets/icons/warning.svg",
      "bytes": 206
    }
  ]
};
