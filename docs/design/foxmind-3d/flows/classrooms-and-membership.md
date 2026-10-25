# Aulas, membresías y asistente de creación

El rediseño presenta aulas en tarjetas ordenadas y mantiene una misma cuenta capaz de enseñar y aprender en aulas diferentes. La nueva apariencia no crea roles globales, permisos, inscripciones automáticas ni un asistente que publique por su cuenta.

## Base contrastada y reglas comunes

- Fuentes: [V1 §§2–6, 10 y 11](../../../foxmind-v1-functional-spec.md), [extracción IA vigente y cierres posteriores](../../../../odd/tasks/classroom-ai-extraction.md), [roadmap](../../../implementation-roadmap.md) y [selección 3D](../references/index.json).
- Código: `apps/classrooms-ui/{Classrooms,Wizard,PlanExtraction,ExtractionEditor,ClassroomView,components}.tsx`, su cliente `api.ts` y destino en `apps/web/src/lib/classroom-client.ts`. Los estados IA históricos fallidos no son bloqueos actuales; las aceptaciones posteriores PDF/DOCX y la integración conservan esos antecedentes.
- Permisos comunes a todos los IDs: sesión vigente y correo verificado; propietario del borrador para creación; permisos derivados de la membresía del aula para consulta/gestión. Cualquier cuenta verificada puede Crear aula y Unirse con código; nadie enseña y estudia simultáneamente en la misma aula. Docente único, sin cotitulares ni transferencia.
- Estados comunes: carga anunciada; error con reintento sin falsa lista vacía; escritura ocupada bloquea doble acción; sesión perdida retira datos y pasa a acceso, correo no verificado a verificación. Origin/CSRF y permisos se revalidan en servidor. Un conflicto de revisión no se resuelve con sobrescritura automática.
- Composición común: [shell NAV-01](account-and-navigation.md), blanco/crema y acentos por materia con texto; tarjetas de radios y separación coherentes. Desktop usa el lateral; móvil una columna, campos con etiqueta y acciones en flujo. Diálogos retienen foco, Escape/cierre seguro y retorno al disparador. Ningún color o ilustración sustituye nombre, rol o estado.

## CLASS-01 — Mis aulas y recuperación de pendientes

**Entrada real:** `/mis-aulas`; lista de `teach`, `study`, borradores e invitaciones. **Desktop:** encabezado, búsqueda y Crear aula/Unirse con código; cuadrícula de tarjetas iguales, portada acotada, nombre, materia, división, ciclo lectivo, docente y rol por aula. Mixto: bloques Estudio/Enseño; una participación: una cuadrícula sin bloque vacío del otro contexto. **Móvil:** herramientas apiladas y tarjetas de una columna, texto sin recorte que oculte identificación.

**Campos/acciones:** Buscar aula filtra nombre/materia/división, sin consulta de datos ajenos. Entrar al aula abre el detalle; Crear aula crea borrador privado y abre CLASS-02; Unirse abre CLASS-07. Pendientes separados: Continuar creación recupera borrador propio y Aceptar invitación abre CLASS-08. Borrador incompleto nunca se cuenta como aula publicada.

**Estados:** ninguna membresía → «Aún no tienes aulas», dos acciones de acceso y pendientes si existen; búsqueda sin coincidencias → «No encontramos aulas con esa búsqueda» y Limpiar búsqueda; solo un bloque sin resultados no equivale a cero aulas. Archivada muestra «Archivada · Solo lectura» y sigue consultable según permiso. No filtrar archivadas silenciosamente. La propuesta permite filtro local Activas/Todas/Archivadas como mejora de presentación, sin esconder por defecto su existencia ni crear estado de servidor.

**Assets/aceptación:** `covers/{literature,math,biology,society,science,creative,general}.webp` como biblioteca visual propuesta; `states/empty.webp`. Verificar cero/una/muchas, nombres largos, búsqueda, mixto, solo archivadas, acceso revocado y borradores sin aula; crear y unirse permanecen disponibles en todas las participaciones.

### Portadas sin inventar un contrato

Hoy `coverKey` permite `explore`, `create`, `discover`, presentados como Explorar/Crear/Descubrir; no hay carga de imágenes. Se mapearán visualmente a `covers/general.webp`, `covers/creative.webp`, `covers/science.webp`, respectivamente. El [plan D3-COV](../implementation-plan.md#d1-integración-de-gráficos-y-portadas) define la ampliación futura para seleccionar las siete portadas entregadas, conservando esas claves históricas; no son nuevos valores ya persistibles. `Materia` sigue texto libre: no deducir automáticamente una portada o una clasificación obligatoria. Una portada desconocida usa general sin perder el nombre del aula.

## CLASS-02 — datos generales del aula

**Entrada real:** Crear aula en Inicio/Mis aulas → estado interno `Wizard` bajo `/mis-aulas`; Continuar creación abre un borrador propio. No existen rutas públicas independientes por paso. **Desktop:** título Crear aula, Guardar y salir, stepper Datos generales → Plan de estudio → Unidades y temas → Revisión, tarjeta de formulario y estado de guardado; portada pequeña, sin hero promocional. **Móvil:** «Paso 1 de 4» y nombre del paso, listado de pasos desplegable o scroll accesible; controles de una columna sin etiquetas ocultas.

| Campo | Validación y ayuda reales |
|---|---|
| Nombre del aula | Obligatorio no blanco, hasta 120 caracteres; no necesita ser único. |
| Materia | Texto libre obligatorio no blanco, hasta 120; sin catálogo impuesto. |
| División | Texto libre obligatorio no blanco, hasta 60; ayuda «Grupo o comisión». No renombrar a curso/año. |
| Ciclo lectivo | Entero de 1 a 9999; año académico/calendario, no nivel educativo. |
| Zona horaria | Zona IANA válida sugerida por navegador y seleccionable; queda fija tras crear. Mostrar ciudad legible más identificación técnica si hace falta, sin confundir con zona de Agenda. |
| Portada | Una ilustración predefinida del catálogo compatible; radio seleccionado identificable con texto/foco. Sin upload. |

**Acciones/estados:** Continuar valida el paso y espera guardado confirmado; editar actualiza borrador privado con revisión; estados Cambios sin guardar/Guardando borrador/Borrador guardado/No se pudo guardar reflejan confirmación real, no solo un debounce. Guardar y salir espera la cola; si falla, permanece con cambios y explicación. Ante revisión obsoleta o resultado incierto, detener escrituras y volver a abrir versión guardada, sin auto-merge. Salida del navegador con cambios/upload avisa. Assets de portada; Foxy opcional pequeño `states/empty.webp`, sin gráfico que parezca progreso académico.

**Aceptación:** required, espacios, cada límite exacto/+1, año no entero, zona inválida, portada, nombres repetidos, autosave/reapertura y dos pestañas; ninguna escritura de borrador habilita matrícula.

## CLASS-03 — subir el plan de estudio

**Entrada real:** paso 2 de Wizard. **Desktop/móvil:** tarjeta Elegir plan de estudio, formatos/límite, archivo seleccionado con nombre/estado, acción Consultar estado o Descargar plan aprobado; móvil sin área de drop que exija arrastrar.

**Campos/validaciones:** un PDF o DOCX, hasta 20.000.000 bytes; `.doc` no aceptado. Extensión/MIME/contenido y análisis de seguridad del servidor autoritativos. Subiendo/Validando/Analizando seguridad/Aprobado/Rechazado/Error son estados distinguibles; «aprobado» no significa extracción IA finalizada. No extraer ni habilitar continuación con un archivo pendiente, rechazado o ajeno.

**Transición:** elegir → carga privada → aprobación → guardar `planFileId` → iniciar extracción automática si capacidad habilitada; Continuar solo después de aprobación. Reemplazar el archivo cambia la fuente y puede invalidar propuesta anterior; no aplica esa propuesta en el nuevo plan. Descargar usa endpoint autorizado, sin publicar una URL de archivo privado.

**Estados/aceptación:** fallo conserva borrador y ofrece reintento/otro archivo; estado desconocido ofrece consulta sin fingir éxito; sesión perdida exige reautenticación; cargar no publica ni invita. Asset de acompañamiento opcional `states/unavailable.webp` para fallo, no thumbnail inventado del documento. Probar PDF/DOCX válidos, límite, archivo incompatible, rechazo/pendiente, red y reemplazo de fuente.

## CLASS-04 — extracción, revisión y aplicación explícita

**Entrada real:** bloque `PlanExtraction` en pasos Plan de estudio y Unidades y temas; trabajo durable del borrador propio. Aviso previo visible: Gemini procesa el documento para sugerir estructura; la persona revisa antes de incorporarla. PDF se procesa como documento; DOCX aporta texto de párrafos/tablas, sin leer sus imágenes. No prometer interpretación completa de imágenes Word ni inventar contenido ausente.

| Estado real | Presentación y siguiente acción |
|---|---|
| Sin trabajo/capacidad deshabilitada | Archivo aprobado y camino manual disponible; no spinner indefinido ni promesa de llamada IA. |
| `QUEUED` / `RUNNING` | «Estamos leyendo el plan» y posibilidad de continuar con unidades manuales. Consultar análisis si se interrumpe consulta; no porcentaje o ETA inventados. |
| `READY` | Paso 2 anuncia propuesta lista; paso 3 muestra editor de propuesta separado del editor del borrador. |
| `FAILED` | Motivo seguro: sin estructura, límite, proveedor/cuota/budget/timeout u otro error conocido. Volver a analizar solo cuando es reintentable; siempre Continuar manualmente. Resultado del proveedor desconocido no dispara retry automático. |
| `STALE` | Fuente/borrador ya no corresponde; no habilitar Usar. Volver al plan actual/reabrir o seguir manualmente. |
| `APPLIED` | «Las unidades revisadas están guardadas»; seguir editando y continuar a Revisión. No dice Aula creada. |

**Editor desktop/móvil:** nombres de unidad y temas editables, Agregar/Quitar con nombre accesible de posición. Advertencias `PARTIAL_STRUCTURE` y `DOCX_IMAGES_OMITTED` legibles cerca de la propuesta. Máximo 100 unidades, 100 temas por unidad y 500 totales; al menos una unidad con al menos un tema, nombres no blancos ≤120 caracteres. Sin botón decorativo «aceptar todo» que omita revisión.

**Aplicar:** Usar unidades revisadas es acción distinta de Continuar y Crear aula. Si el borrador ya tiene unidades, confirmar reemplazo explícito; cambiar la propuesta reinicia esa confirmación. No fusionar/deduplicar nombres silenciosamente. Respuesta tardía no pisa edición manual. Aplicar usa revisión actual y confirma guardado; conflicto conserva propuesta/camino manual, bloquea sobrescritura y pide abrir versión guardada. Reabrir consulta el mismo trabajo/fuente antes de iniciar otra llamada.

**Assets/aceptación:** `states/success.webp` pequeño tras aplicar; `states/unavailable.webp` opcional tras fallo. Verificar ambos formatos en espera/listo/editado/aplicado, warning Word/parcial, edición manual concurrente, sustitución de plan, rechazo de revisión vieja y reintento explícito; el payload del aula no cambia al llegar `READY` ni la IA publica.

## CLASS-05 — unidades manuales y control del borrador

**Entrada real:** paso 3 Wizard; manual desde inicio, mientras espera IA o después de aplicarla. **Composición:** unidades numeradas en tarjetas, nombre de unidad, temas correspondientes en filas y acciones Agregar tema/Quitar; móvil botones accesibles sin exigir drag-and-drop.

**Datos/acciones:** nombres no blancos ≤120; creación final requiere al menos una unidad y un tema por unidad. Agregar unidad crea un editor con primer tema; Quitar en borrador no elimina contenido publicado. Conservar orden de unidades/temas. La propuesta de reordenar con botones Subir/Bajar es interacción futura compatible con el orden del payload, no afirmación de controles existentes. Los topes explícitos 100/100/500 se aplican a la propuesta IA; no presentar como observado un tope manual nuevo sin contrastar el validador de publicación.

**Estados/aceptación:** hereda autosave de CLASS-02; Continuar no permite nombres vacíos/unidad sin temas. Aplicar propuesta es siempre CLASS-04, no guardado implícito. Sin unidades → instrucción manual con Agregar unidad, no error técnico. Asset mínimo `states/empty.webp` solo cuando no hay unidades. Verificar adición, eliminación, orden guardado, retorno de pasos y que Enter en el editor de propuesta no publique el formulario padre.

## CLASS-06 — revisar, crear y empezar a invitar

**Entrada real:** paso 4 Wizard. **Composición:** resumen portada/datos/zona, archivo aprobado y unidades/temas; Editar plan y Volver permiten corregir. Desktop en dos columnas si cabe; móvil una columna, CTA al final sin tapar contenido con sticky excesivo.

**Acción:** Crear aula espera cola de guardado y publica bajo revisión; invitaciones solo después. Éxito abre aula creada, confirma nombre y muestra código si el servidor lo devuelve; Ir a Alumnos/Invitar estudiantes. `states/success.webp` pequeño; `covers/*` del aula. No usar código ficticio del mockup como dato real ni declarar creación por respuesta IA.

**Estados/aceptación:** guardando/creando bloquea doble clic; error de validación permite volver al paso responsable; conflicto no crea aula parcial ni pierde borrador; respuesta incierta pide comprobar versión/lista en vez de duplicar publicación. Prueba: borrador incompleto no publica, archivo pendiente no publica, publicación conserva plan/unidades revisadas y salida/reapertura distingue borrador de aula real.

## CLASS-07 — unirse con código

**Entrada real:** botón Unirse con código en Inicio o `/mis-aulas`; diálogo interno, no ruta nueva. Cuenta verificada, primer ingreso a un aula ajena activa. **Desktop/móvil:** diálogo breve Código del aula, Volver/Cancelar y Ver aula; luego previsualización con nombre/materia/división/ciclo/docente y Confirmar inscripción.

**Campos/acción:** código obligatorio, se recorta espacio exterior al enviar; no imponer patrón visual `FOX-...` no acordado. Primera solicitud solo previsualiza; segunda confirma con comprobante del servidor y entra como estudiante. La vista previa no permite materiales, compañeros ni historia.

**Estados/aceptación:** código inválido, membresía existente, docente propio o reingreso restringido muestran aviso genérico, permanecen en formulario y no redirigen/duplican/cambian rol. Aula archivada o código regenerado entre preview/confirmación no inscribe. Regresar permite corregir; ocupado evita doble confirmación. Sin assets necesarios; `states/success.webp` solo tras alta real. Probar dos pasos y expiración/cambio de validez, no basta un toast.

## CLASS-08 — aceptar invitación

**Entrada real:** `/mis-aulas?invitacion=<uuid>` del correo o tarjeta pendiente; si no tiene cuenta, registro → verificación → invitación aún pendiente. Solo correo invitado verificado. **Composición:** tarjeta nombre de aula/docente, vencimiento e indicación Invitación seleccionada; móvil al inicio de Pendientes sin ocultar otras.

**Acción:** Aceptar invitación explícito → membresía estudiante; refrescar listas con confirmación. No inventar botón Rechazar si no hay contrato actual. Registro, login, abrir correo o verificar no aceptan automáticamente. Invitación vence a siete días; reenviar renueva validez sin duplicar pendientes para aula/correo.

**Estados/aceptación:** otro usuario, vencida, revocada/usada o no pendiente → aviso genérico en contexto, opción volver a lista/cambiar cuenta mediante sesión, sin exponer datos privados. Archivada bloquea aceptación. Antiguas invitaciones no sirven después de salir/remoción; reingreso exige invitación nueva. Error conserva tarjeta con reintento; assets de estado comunes, no mensaje de éxito antes de confirmar.

## CLASS-09 — contexto y navegación dentro del aula

**Entrada real:** tarjeta de aula abre estado `ClassroomView`; destino profundo soportado `/mis-aulas?aula=<uuid>[&actividad=<uuid>]`. Actualmente la entrada ordinaria selecciona Alumnos/Compañeros; la vista 3D abrirá Plan para ambos roles. Ese cambio de pestaña inicial debe declararse y probarse en implementación. Los destinos explícitos de actividad/notificación prevalecen sobre Plan y conservan su sección autorizada.

**Desktop:** shell lateral global, breadcrumb Mis aulas / Nombre, cabecera acotada con portada, materia/división/ciclo, rol de esta aula, docente y zona. Navegación de secciones separada del contenido; pestañas o rail local no duplican navegación global. **Móvil:** título/rol visibles, portada reducida y pestañas horizontales desplazables con selección accesible; sin tabla de miembros para desplazarse horizontalmente.

**Destinos:** docente Alumnos, Historial, Plan, Biblioteca, Actividades, Progreso, Muro, Configuración del aula; estudiante Compañeros, Plan, Biblioteca, Actividades, Mi progreso, Muro. Configuración del aula no es ACC-02. El diseño puede reordenarlos para aprender/trabajar, sin eliminar capacidades ni inventar una ruta `/aulas/:id` existente. Actividades/evaluaciones mantienen sus contratos propios y header reducido durante evaluación.

**Estados/aceptación:** Archivada · Solo lectura persistente; consultas aún autorizadas y todas las mutaciones bloqueadas salvo Reactivar docente. Permiso revocado carga aviso seguro sin seguir mostrando datos. Apertura dirigida verifica recurso actual y no cae silenciosamente en otro estudiante/actividad. Assets `covers/*` coherentes con la tarjeta; no gran hero en herramientas de aula.

## CLASS-10 — miembros actuales e historial

**Entrada real:** pestaña Alumnos/Compañeros en `ClassroomView`; Historial solo docente. **Desktop:** lista/tabla legible con iniciales, nombre y acciones por fila. **Móvil:** tarjetas con las mismas etiquetas/acciones, sin columnas ocultas de importancia.

**Permisos/datos:** estudiante solo nombre/apellido de compañeros, sin email, perfil público, acciones individuales ni resultados ajenos. Docente ve sus estudiantes, periodos actuales/históricos y Ver resumen; resumen muestra entregas/calificaciones y estado publicado/privado según permiso docente. Historial de salidas/remociones no se mezcla con alumnos activos ni duplica promedios; sin presentarlo como matrícula actual.

**Estados/acciones/aceptación:** vacío actual «Todavía no hay estudiantes» y CTA Invitar si activo/docente; histórico vacío «No hay salidas registradas». Carga/error por consulta; resumen en diálogo vuelve a la fila al cerrar. Aula archivada permite lectura autorizada, no remoción/invitación. Asset `states/empty.webp` opcional. Probar rol estudiante y acceso directo a resumen ajeno denegado.

## CLASS-11 — invitar, reenviar y revocar

**Entrada real:** Alumnos → Invitar estudiantes; bloque Invitaciones de esa aula. Solo docente y aula activa. **Composición:** diálogo Correo electrónico, explicación de aceptación con ese correo y Enviar invitación; lista de pendientes con vencimiento, estado de entrega y Reenviar/Revocar. Móvil misma información en tarjetas.

**Validación/acción:** correo válido según política amplia/domino minúsculo de identidad, sin reescribir local part ni añadir importación masiva. Guardar invita, no inscribe; mensaje «Invitación guardada para enviar». Reenviar renueva siete días sin duplicar invitaciones pendientes; Revocar confirma invalidación y conserva historia.

**Estados/aceptación:** Pendiente/Aceptada/Vencida/Revocada separados del correo En cola/Aceptado para envío/Error; SMTP aceptado no equivale a leído o entregado. Error conserva email al fallar alta; reintento de envío desde invitación existente. Cambio de archivo de aula no relevante; archivado concurrente bloquea. Probar correo incorrecto, duplicado pendiente, reenvío, revocación y aceptación invalidada; assets comunes de éxito/error sin reemplazar estados de texto.

## CLASS-12 — compartir y regenerar código

**Entrada real:** Alumnos → Código del aula; solo docente. Código devuelto tras creación o regenerado; no afirmar disponibilidad de lectura de un código previo si el cliente no lo tiene. Sin valor: «Generá un código nuevo para compartirlo».

**Desktop/móvil:** panel con código seleccionable, Copiar código y Generar código nuevo; aviso «Solo para el primer ingreso». Regenerar requiere confirmar que invalida anterior y preserva matrículas actuales. No tiene expiración automática fija: activo mientras aula activa/código vigente. Archivado bloquea generación/uso. Clipboard fallido no muestra Copiado; permitir seleccionar texto. Aceptación: código nuevo funciona, anterior no, membresías intactas y ninguna ruta de reingreso por código. Sin ilustración necesaria.

## CLASS-13 — salir y remover sin borrar historia

**Entrada real:** estudiante → Salir del aula; docente → Remover en fila de alumno actual. Aula activa. Diálogo desktop/móvil nombra acción/persona, pérdida de acceso, conservación de entregas/notas/conversaciones y necesidad de invitación nueva para volver; Cancelar es salida segura.

**Transición:** confirmar salida/remoción → cambia membresía; quien sale vuelve a Mis aulas, docente refresca actuales/historial. Nunca borrar aula/cuenta ni registros históricos. Error mantiene contexto para reintentar; doble acción no duplica periodos. Archivado concurrente bloquea; acceso perdido se refleja en navegación profunda, Agenda y novedades. Asset de estado `states/unavailable.webp` solo si ayuda. Probar conservar historia docente, denegar alumno saliente y rechazar código/invitación antigua tras salida.

## CLASS-14 — configuración, archivar y reactivar

**Entrada real:** Configuración de `ClassroomView`, solo docente. **Campos:** nombre/materia/división/ciclo con límites de CLASS-02; zona fija de solo lectura. Guardar usa revisión de aula; no upload de portada libre ni cambio de propietario. Desktop tarjeta de datos y bloque de ciclo de vida separado; móvil una columna sin mezclar configuración personal.

**Archivar:** confirmación explica solo lectura, sin nuevas inscripciones/publicaciones/entregas/modificaciones; conserva matrículas, archivos, conversaciones, intentos y notas. No publica notas privadas. **Reactivar:** única mutación permitida allí para docente de aula archivada; confirma que no mueve plazos ni reinicia intentos/locks.

**Estados/aceptación:** guardando/error/éxito, conflicto de revisión obliga Actualizar aula antes de volver a guardar, no sobreescritura automática. Archivada mantiene cabecera y CTA Reactivar docente; alumno no ve ni puede ejecutar ese CTA. No hay eliminación permanente. Probar conflicto de dos pestañas y que reactivar no extienda fechas. Assets de cubierta existentes, sin celebración que sugiera fin de curso completado.

## CLASS-15 — conservar el plan después de crear

**Entrada real:** Plan del aula y sus controles docentes; el detalle pedagógico vive en el contrato de aprendizaje del rediseño. Estudiante consulta archivo/unidades/temas; docente activo mantiene versiones y estructura, sin reabrir el asistente de borrador publicado.

**Datos/acciones:** reemplazar PDF/DOCX agrega versión y conserva anteriores; no reescribe consignas, entregas ni notas. Agregar/renombrar/reordenar unidades/temas mantiene relaciones. Tema eliminable solo Pendiente y sin materiales/actividades enlazados; unidad solo vacía y sin vínculos. Unidades de plan dadas/siguiente/pendiente son avance docente, no dominio individual ni porcentaje de cumplimiento académico.

**Composición/estados/aceptación:** desktop panel de estructura + contenido; móvil acordeones/selección de unidad y lista, conservando acciones de orden por teclado. Consulta vacía/error legible; mutación ocupada/conflicto reconsulta y archivo pendiente no se ofrece como listo. Archivado bloquea mantenimiento. Probar versiones anteriores consultables, eliminación restringida y vínculos conservados. Assets `covers/*`; sin nuevos endpoints IA de mantenimiento inferidos del asistente inicial.

## Handoff para implementación y revisión

Validar cada ID con cuenta verificada/no verificada, docente/estudiante/ajeno, activa/archivada, 320/390/768/1440 px y teclado. En backend usar pruebas de permisos, revisiones e idempotencia existentes y fixtures propios; en UI futura capturar estados reales con ego(lite), no aceptar solo renders. Esta entrega solo especifica; no ejecuta RED/GREEN ni publica cambios. La ampliación de portadas está definida en D3-COV y Plan es la entrada inicial para ambos roles; comprobar compatibilidad de claves/rutas antes de programar.
