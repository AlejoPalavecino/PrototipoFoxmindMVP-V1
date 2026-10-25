# Acceso, cuenta e Inicio adaptable

Especificación del rediseño 3D aprobado: Foxy naranja, superficies crema/blancas y navegación lateral persistente en escritorio. Define comportamiento para implementación posterior; no cambia producto, contratos de identidad ni el estado de aceptación de V1.

## Lectura y límites

- Fuentes funcionales: [V1 §§2–4 y 12](../../../foxmind-v1-functional-spec.md), [roadmap vigente](../../../implementation-roadmap.md), [referencias seleccionadas](../references/index.json), [Inicio docente](../references/09-home-teacher.webp) e [Inicio estudiante](../references/10-home-learner.webp).
- Código contrastado: `apps/web/pages/`, `apps/web/src/components/{account-screen,classrooms-screen,agenda-screen}.tsx`, `apps/web/src/lib/{account-client,classroom-client}.ts`, `apps/classrooms-ui/{Home,Notifications,Classrooms}.tsx`.
- La barra superior descrita en V1 sigue siendo el producto actual. El lateral, la adaptación de Inicio y separar Configuración son decisiones de esta propuesta visual posterior, no funcionalidades ya entregadas.
- Cada ID hereda los estados comunes y su composición de familia. Las aceptaciones son pruebas futuras requeridas, no resultados observados de este documento.

## NAV-01 — shell global y orientación

**Entrada real:** `/inicio`, `/mis-aulas`, `/agenda`, `/profile`; acceso verificado. `/` muestra actualmente el acceso. **Ruta nueva propuesta:** `/settings`, para contraseña y cierre de sesión separados de los datos personales; no existe hoy en `pages/`. No renombrar rutas actuales para aplicar la apariencia.

**Desktop, propuesta desde 1024 px:** lateral de aproximadamente 232 px, logo arriba, Inicio/Mis aulas/Agenda, acceso a notificaciones y bloque de cuenta al pie con Mi perfil/Configuración. Selección naranja con texto oscuro y `aria-current`; título/breadcrumb y herramientas en el contenido. Área central flexible, fondo crema, tarjetas blancas y bordes suaves. El lateral no reduce el aula a una columna ilegible.

**Tablet y móvil:** bajo 1024 px, encabezado compacto con logo, botón Menú y notificaciones; el menú abre un drawer con los mismos destinos y selección. A 320–390 px, una sola columna, sin lateral permanente ni scroll horizontal de página. Drawer con título, cierre/Escape, foco contenido y retorno al disparador. Los diálogos no quedan debajo de un menú abierto. Acciones de cuenta accesibles sin depender de hover.

**Acciones:** logo → Inicio para cuenta verificada; cada enlace global cierra drawer y coloca foco en el encabezado principal. Entrar a un aula conserva Mis aulas seleccionado. Perfil y Configuración son destinos distintos; no son roles. Mantener navegación Atrás y un enlace real al destino cuando existe URL.

**Estados/aceptación:** comprobación de sesión usa estado anunciado sin contenido privado fugaz; fallo ofrece Reintentar; sesión inválida lleva a acceso y correo pendiente a verificación. El shell no concede permisos ni reactiva aulas. A 320 px, 200 % de zoom y teclado, todos los destinos y la sección activa siguen accesibles; logo e ilustraciones no compiten con las acciones. Assets: `brand/logo-horizontal.svg`; los estados no dependen de que cargue el logo.

## AUTH-01 — iniciar sesión

**Entrada real:** `/sign-in` y `/`; enlaces desde recuperación/registro o una sección protegida. Anónimo; una sesión existente ofrece Continuar con mi cuenta. Desktop: marca y escena 3D a un lado, formulario blanco al otro, sin shell privado. Móvil: marca, título y formulario primero; escena secundaria pequeña o omitida sin quitar información.

**Campos:** Correo electrónico y Contraseña obligatorios. Correo con teclado apropiado, sin autocapitalización y sin normalizar la parte local. Contraseña de 16–128 caracteres según cliente actual; mostrar/ocultar accesible, autocomplete de credenciales y pegado permitido. No añadir Google, selector docente/estudiante ni rol persistente. Botón Iniciar sesión; enlaces Olvidé mi contraseña y Crear cuenta.

**Transición:** verificado → `/inicio` por defecto; si existe `next` permitido → ese destino. No verificado → `/verify-email` conservando el destino limitado. Los destinos permitidos hoy son `/inicio`, `/mis-aulas`, `/agenda`, `/mis-aulas?invitacion=<uuid>` y `/mis-aulas?aula=<uuid>[&actividad=<uuid>]`; una URL externa, extras o ruta arbitraria no se ejecutan. `/settings` requiere adaptación explícita de esta lista si se desea retorno directo futuro.

**Estados/aceptación:** enviando bloquea doble envío y anuncia Iniciando sesión; error de credenciales genérico mantiene correo, limpia contraseña tras solicitud y permite reintentar. Rate limit muestra espera del servidor. Sesión no comprobable es Error, nunca cuenta anónima confirmada. Una sesión ya abierta no elimina el control de correo verificado. Asset `scenes/auth.webp`, decorativo, fuera del orden de foco.

## AUTH-02 — crear cuenta

**Entrada real:** `/register`, manteniendo un `next` válido. Misma familia visual que AUTH-01; pasos informativos Datos → Correo → Aulas, sin aparentar inscripción automática.

**Campos:** Nombre y Apellido obligatorios, no blancos, máximo 80 caracteres cada uno; Correo obligatorio; Contraseña nueva 16–128 caracteres, admite espacios/cualquier idioma. La interfaz no añade una confirmación de contraseña ni casillas legales no acordadas. Dominio del correo debe venir en minúsculas: error explícito, sin corrección silenciosa; preservar mayúsculas, puntos y `+` de la parte local y soporte válido citado/internacional. No usar validación HTML de email que estreche ese contrato.

**Acción:** Crear cuenta → respuesta genérica sobre recepción del correo; no revelar si ya existe, sobrescribir otra cuenta ni aceptar invitaciones. Enlaces a acceso/recuperación. Reenvío o nuevo envío sujeto a mínimo 60 segundos y abuso; el mensaje no promete entrega inmediata.

**Estados/aceptación:** campos inválidos identificados con resumen y foco en el primero; envío ocupado; error técnico reintentable sin perder nombres/correo; éxito anunciado con `states/success.webp` pequeño y acción de acceso. Una cuenta creada sin verificar no puede usar aulas/Agenda. Asset de familia `scenes/auth.webp`; sin selector global de rol.

## AUTH-03 — verificar correo

**Entrada real:** `/verify-email`, desde sesión no verificada o enlace original de correo. Puede confirmar un enlace sin sesión; verificar no inicia sesión ni acepta una invitación. Desktop: tarjeta central breve con Foxy pequeño, instrucción y acciones. Móvil: tarjeta de ancho disponible y botones apilados.

**Variantes:** con prueba válida en memoria, Confirmar verificación; con cuenta no verificada, correo de esa sesión, Reenviar correo, Actualizar estado y Cerrar sesión; ya verificada, Ir a Inicio o continuar al destino permitido; sin sesión, guía y acceso/registro. El token no es un campo editable ni aparece en la URL visible, logs o captura.

**Reglas:** enlace de un uso, una hora; reenvío mínimo 60 segundos e invalida el enlace anterior. Una recarga que pierde la prueba indica volver a abrir el correo original. La comprobación de estado nunca consume automáticamente una prueba de recuperación.

**Estados/aceptación:** sin enlace, inválido/vencido/usado, envío ocupado, cooldown, error de servicio y éxito tienen mensajes distintos de una inscripción. No mostrar contenido privado mientras verifica. Una invitación seguirá pendiente después del éxito; el CTA conserva solo destino permitido y exige la aceptación posterior. Assets `scenes/auth.webp`/`states/success.webp`, decorativos.

## AUTH-04 — solicitar recuperación

**Entrada real:** `/forgot-password`. Anónimo o acceso desde AUTH-01. Tarjeta con título Recupera tu acceso y escena discreta desktop; móvil prioriza el único campo.

**Campo/acción:** Correo electrónico con la política de AUTH-02; Enviar enlace de recuperación. Respuesta idéntica exista o no la cuenta; Volver a iniciar sesión. El enlace vence en 15 minutos y solo permite cambiar contraseña, no verificar correo ni inscribir.

**Estados/aceptación:** envío ocupado, rate limit/cooldown mínimo 60 s, error técnico reintentable y mensaje genérico de solicitud aceptada. Conservar correo; no confirmar existencia ni mostrar una dirección obtenida del servidor. Asset `scenes/security.webp` pequeño; un fallo de imagen no impide recuperar.

## AUTH-05 — establecer nueva contraseña

**Entrada real:** `/recover-password`, abriendo el enlace original. Sin prueba: instrucción para reabrir correo o Solicitar otro enlace, sin formulario funcional de sustitución manual. Misma composición de AUTH-04.

**Campo/acción:** Nueva contraseña 16–128 caracteres; ayuda visible y mostrar/ocultar. Confirmar nueva contraseña usa la prueba del propósito correcto. Éxito limpia prueba y credenciales visibles, cierra todas las sesiones previas y ofrece Iniciar sesión; no promete continuidad de sesión.

**Estados/aceptación:** inválida/vencida/usada produce mensaje seguro y salida de recuperación; ocupado sin doble consumo; error conserva ruta de reintento, no expone token. Prueba de verificación no sirve aquí. Asset `scenes/security.webp`; éxito opcional `states/success.webp` sin animación obligatoria.

## ACC-01 — Mi perfil

**Entrada real:** `/profile`, desde shell. Cuenta verificada; sin sesión → acceso, no verificada → verificación. La propuesta deja aquí datos personales y enlaza a `/settings`; hoy el componente también contiene contraseña/logout.

**Composición:** desktop, encabezado Mi perfil, tarjeta principal con iniciales/nombre y datos; escena `scenes/profile.webp` secundaria en una columna estrecha, sin ocupar el espacio de formulario. Móvil: iniciales compactas, datos en una columna y Guardar visible al final. No fotografía editable ni botón de avatar.

**Campos/acciones:** Nombre y Apellido obligatorios no blancos, máximo 80 cada uno; correo de solo lectura con explicación «El correo no se puede modificar desde el perfil». Guardar cambios → `PATCH /api/v1/account`; Cancelar repone última versión confirmada, sin solicitud. Las iniciales se derivan del nombre confirmado; no atributo nuevo de cuenta. Ir a Configuración es enlace, no tab que mezcle campos.

**Estados/aceptación:** carga de sesión/datos diferenciada; fallo al cargar no renderiza formulario vacío editable; error de validación señala campos; guardando bloquea doble acción; éxito actualiza nombre en shell; error mantiene nombres para corregir. No existe revisión de concurrencia de perfil visible en el cliente: no inventar diálogo de merge ni prometer prevención de última escritura. Sesión perdida limpia datos privados; archivado de aula no afecta perfil. Sin edición de email, rol global, preferencias o eliminación de cuenta.

## ACC-02 — Configuración y cerrar sesión

**Entrada propuesta:** `/settings`, desde shell o perfil; agregar página/selección del shell será trabajo futuro. Hoy las acciones se realizan dentro de `/profile`. Misma cuenta verificada; permisos y endpoints de cuenta sin cambios.

**Composición/campos:** desktop, título Configuración, tarjeta Seguridad con Contraseña actual obligatoria y Nueva contraseña 16–128 caracteres, mostrar/ocultar, ayuda y botón Cambiar contraseña; tarjeta breve de sesión debajo. Escena `scenes/security.webp` pequeña. Móvil: campos apilados; ninguna tarjeta de preferencias vacía o avanzada inventada.

**Transiciones:** cambiar → `POST /api/v1/account/password`; renueva sesión actual y cierra las otras. Mensaje antes y después explica ese efecto. Cerrar sesión → `POST /api/v1/auth/logout` → `/sign-in`; no borra cuenta, aulas, agenda ni trabajos ya autorizados. No mostrar listado/revocación individual de dispositivos porque no existen.

**Estados/aceptación:** actual incorrecta/error de validación, guardando, sesión cambiada/CSRF, servicio no disponible y éxito diferenciados; limpiar contraseñas después de solicitud como hoy. Fallo de logout conserva pantalla y ofrece reintento sin afirmar cierre. Sesión 30 min inactiva/12 h absoluta sigue la política vigente. No se agregan avatar, email editable, preferencias de notificación, tema, idioma, borrado de cuenta o integraciones.

## HOME-01 — Inicio según aulas actuales

**Entrada real:** `/inicio`, destino de acceso ordinario verificado. Datos autorizados de Enseño/Estudio, borradores e invitaciones; sin rol global. Home actual muestra aulas/novedades: las colas de trabajo, feedback destacado y miniagenda de la propuesta requieren composición/proyecciones futuras, no existen como agregado demostrado en `Home.tsx`.

| Participación actual | Jerarquía propuesta desktop | Adaptación y acciones |
|---|---|---|
| Solo Estudio | Saludo, Mis actividades pendientes, miniagenda, feedback publicado y aulas | `hero/welcome-learn.webp` compacto; Abrir actividad, Ver resultado, Ir a Agenda; no cola docente vacía. |
| Solo Enseño | Saludo, Entregas por revisar, consultas recientes, miniagenda y aulas | `hero/welcome-teach.webp`; accesos Crear actividad/Subir material/Publicar aviso siempre eligen aula destino y permiso actual. No actividad estudiantil vacía. |
| Ambas | Saludo único; Pendientes de aprendizaje y Por revisar con contexto; miniagenda, novedades y aulas | Dos secciones claramente rotuladas Estudio/Enseño; nunca selector de rol exclusivo. Hero pequeño, preferencia visual neutra usando `hero/welcome-learn.webp`, sin inferir identidad de estudiante. |
| Ninguna membresía | Bienvenida, Crear aula y Unirse con código; invitaciones/borradores si existen; agenda privada | `states/empty.webp`; ninguna clase ficticia. Tener invitaciones o borradores no equivale a estar inscripto. |

**Móvil:** saludo reducido, primera acción pendiente, segundo contexto solo si existe, miniagenda en lista, novedades y acceso a aulas. Hero no desplaza la primera tarea. Tarjetas con título, aula, tipo/estado y fecha explícita; botón completo y accesible, sin métricas decorativas.

**Datos/criterios de composición:** estudiante ve trabajo propio publicado/elegible y plazo efectivo; confirmado deja de pendiente salvo reentrega habilitada. Vencido y Sin fecha son estados explícitos si la futura cola los incluye, no «Próximas entregas». Docente ve entregas reales por revisar y consultas de sus aulas; no usar cantidad de notificaciones como cantidad de entregas. Feedback solo publicado para esa persona y actividad, nunca una nota privada o un resultado de la misma tarea todavía pendiente sin historial claro. Miniagenda reutiliza eventos privados/plazos reales y zonas, sin copiar fechas del mockup.

**Acciones siempre disponibles:** Ir a Mis aulas, Crear aula y Unirse con código para cualquier cuenta verificada; accesos docentes solo con aula activa seleccionada. Si hay varias, selector local Nombre/División; si una, destino visible; si ninguna activa, explicar y ofrecer crear, sin CTA que falle en silencio. Acciones de autoría no existen hoy como enlaces públicos con query: su navegación dirigida es propuesta a definir al implementar, no URLs documentadas como reales.

## HOME-02 — vacíos, fallos y actualidad

- Con membresía y cero tareas: «Estás al día» con `states/success.webp`, conservar sus aulas/agenda; nunca «Aún no tienes aulas». Una sección de participación inexistente se omite, no muestra fracaso ni obliga a elegir rol.
- Si solo hay aulas archivadas, mostrarlas como consulta y ofrecer acciones de crear/unirse; no contar sus entregas como pendientes accionables. Archivo conserva historia y no invalida agenda privada.
- Carga: skeleton de tarjetas con altura estable y estado anunciado, sin contadores cero anticipados. Error parcial identifica módulo y Reintentar ese módulo; no transforma indisponibilidad en «al día». Error de aulas impide inferir participación.
- Conflicto/cambio de permisos al abrir: revalidar destino, explicar acceso no disponible y refrescar módulo. Una novedad no restaura membresía. Sesión perdida borra la información sensible y recupera acceso con destino permitido.
- Aceptación: ejecutar fixtures sin aulas, solo estudio, solo enseñanza, mixto, cero pendientes con aulas, solo archivadas, invitaciones/borradores sin membresía y fallo parcial. Ningún contador proviene del texto del mockup ni de consultas al frontend sin permiso.

## NAV-02 — notificaciones y novedades

**Entrada real:** campana del shell; diálogo `Notifications` y novedades de Inicio. Apertura profunda existente `/mis-aulas?notificacion=<uuid>`; se revalida en servidor, aunque ese query no forma hoy parte del `next` de autenticación permitido. En una sesión caducada no prometer retorno profundo exacto todavía.

**Composición:** desktop, panel/diálogo a la derecha con título, contador sin leer, lista más reciente primero, texto del evento, aula, fecha/hora y Leída/Sin leer; móvil diálogo de ancho disponible con scroll propio. No feed compartido entre cuentas ni preferencias configurables.

**Acciones/estados:** Abrir llama al destino autorizado, marca/actualiza lectura según flujo actual; Marcar como leída actúa sobre esa notificación. Actualizar, carga, vacío «No hay notificaciones», error y reintento propios. Mantener foco al abrir/cerrar y no leer todo automáticamente. Eventos: avisos, consultas/respuestas propias, actividad/plazo/primera entrega/reapertura, entrega recibida y nota publicada/corregida según rol en aula. Una notificación antigua puede fallar por acceso revocado sin mostrar el registro privado. Asset de vacío `states/empty.webp`, no reemplaza texto.

## Revisión verificable del conjunto

1. Probar navegación y formularios con teclado, lector de pantalla, 320/390/768/1440 px, zoom 200 %, textos largos y reducción de movimiento; contraste real de botón naranja/texto oscuro y foco visible. No aceptar una imagen raster como prueba de interacción.
2. Comprobar errores con `aria-invalid`/descripción, estados con `status`/`alert`, foco al primer error y no pérdida del contexto tras reintentar. Un fallo de asset conserva texto y controles.
3. Comprobar destinos permitidos, correo pendiente, tokens de propósito distinto, enlaces vencidos, cooldown, error CSRF, doble clic y sesión expirada sin filtrar datos. Sin cambios al contrato de identidad por razones visuales.
4. Validar rutas nuevas y proyecciones Home antes de implementar; mantener [aulas/membresías](classrooms-and-membership.md) y [Agenda](agenda.md) como contratos de sus acciones, sin duplicar reglas.
