# Agenda privada y plazos académicos

La propuesta 3D conserva el calendario mensual, la lista accesible del día y próximas entregas reales. Las ilustraciones acompañan la organización del tiempo; un evento privado nunca se convierte en actividad de aula, aviso compartido o recordatorio por correo.

## Fuentes y alcance común

- [Comportamiento actual de Agenda](../../../agenda.md), [V1 §4 y reglas académicas](../../../foxmind-v1-functional-spec.md), [contrato Agenda](../../../../odd/tasks/agenda.md), [formulario compacto](../../../../odd/tasks/agenda-compact-event-form.md), [colores](../../../../odd/tasks/agenda-event-color.md), [roadmap vigente](../../../implementation-roadmap.md) y [pantalla 3D seleccionada](../references/04-agenda.webp).
- Código contrastado: `apps/web/pages/agenda.tsx`, `apps/web/src/components/agenda-screen.tsx`, `apps/agenda-ui/index.ts`, `Agenda`, `AgendaMonth`, `AgendaDay`, `Upcoming`, `EventForm`, componentes de campos, borrador/validación, acciones del editor y hooks de carga/resultado/vista. El barril `src/core/domain/index.ts` es la frontera de contratos compartidos, no una nueva fuente de permisos.
- Todos los IDs entran bajo `/agenda`, con sesión verificada. El dueño de eventos se deriva del servidor; ningún campo dueño/rol/aula en el formulario. No requiere membresía. Los plazos académicos se filtran por acceso vigente y conservan las reglas del módulo de aulas.
- El lateral del [shell NAV-01](account-and-navigation.md) es propuesta nueva; la ruta actual ya existe. Los formularios/detalles son estados internos o diálogos, sin rutas públicas nuevas por evento. No presentar `/agenda/:id` como navegación existente.
- Composición común: crema/blanco, tarjetas ordenadas, naranja para acción primaria, colores de eventos con etiquetas. Desktop con calendario y columna de próximas entregas; móvil prioriza lista del día y herramientas apiladas. Carga/error/conflicto/sesión deben quedar legibles aunque falle un asset.

## AGENDA-01 — consultar mes, día y zona de vista

**Entrada real:** shell → `/agenda`; Inicio puede enlazar como acceso global. **Desktop:** título Mi Agenda y breve descripción, Hoy/Nuevo evento, mes con anterior/siguiente, cuadrícula de lunes a domingo, día seleccionado y próximas entregas en columna lateral. Escena `scenes/agenda.webp` pequeña en cabecera sin quitar ancho al calendario. **Móvil 320–390 px:** cabecera compacta, cuadrícula de números/indicadores sin títulos comprimidos, lista completa debajo y próximas entregas en bloque propio; no scroll horizontal de página.

**Datos/acciones:** mes/año, fecha seleccionada, zona de la vista y cantidad de eventos/entregas por fecha. Seleccionar día actualiza lista; cambiar mes selecciona su primer día; Hoy selecciona fecha real en la zona activa. Indicar hoy y selección con estados diferentes y texto accesible, no dos colores ambiguos. El componente actual tiene 42 casillas y días de meses adyacentes: no dibujar datos que la consulta no trajo ni inventar eventos fuera del rango.

**Zona:** etiqueta «Hora de Buenos Aires»/ciudad o «Hora universal», Cambiar muestra selector de ciudades legibles y zona heredada válida; sin entrada libre de IANA ni geolocalización. Zona inicial del navegador, con recuperación de mes/día/zona desde storage de sesión opcional validado. No crear una preferencia global de cuenta ni prometer persistencia entre dispositivos. Cambiar zona conserva la selección de fecha y el mes, reconsulta agrupación; no cambia eventos guardados ni plazos del aula.

**Estados/aceptación:** durante consulta, estado anunciado y skeleton sin mostrar «día libre» prematuro. Éxito sin entradas → vacío del día, no afirmación de ausencia de aulas; error de lectura → Reintentar, sin calendario vacío confirmado. Cargas fuera de orden y foco de pestaña no sustituyen un rango nuevo con datos viejos. Probar límites de mes/año/bisiesto, hoy diferente por zona y navegación rápida; mes y día deben concordar tras cada acción.

## AGENDA-02 — leer eventos del día

**Entrada real:** selección de fecha en AGENDA-01. **Composición:** lista con fecha completa como título; desktop tarjetas compactas y móvil tarjetas de ancho disponible. Cada evento privado muestra categoría, Privado, Semanal si corresponde, título, intervalo/día completo, notas si existen y Editar evento/serie. El diseño propone mostrar inicio y fin completos en la tarjeta, derivados del evento, sin depender solo del resumen de inicio actual. Eventos de varios días indican extensión sin duplicar el mismo evento como si fueran altas distintas.

**Color:** Automático por categoría, Azul/Verde/Amarillo/Naranja/Rosa/Violeta elegibles; misma elección en cuadrícula, indicadores y lista, toda la serie. Texto de categoría/privacidad permite entender sin color. Evento heredado sin color explícito sigue Automático; entregas académicas tienen tratamiento propio, no se recolorean con el color personal.

**Estados/acciones/aceptación:** día sin entradas → «Un día libre en tu agenda» y Agregar evento este día; no invita a unirse a un aula para crear. Editar obtiene evento completo del dueño, no solo la ocurrencia renderizada. Error de datos conserva aviso de indisponibilidad, nunca tarjeta ficticia. Asset vacío `states/empty.webp` pequeño; teclado abre edición y regresa a tarjeta o encabezado válido. La eliminación no intenta enfocar un elemento que ya no existe.

## AGENDA-03 — próximas entregas y apertura autorizada

**Entrada real:** panel `Upcoming` de `/agenda`; propuesta de miniagenda en Inicio debe reutilizar la misma política. **Datos de estudiante:** actividad publicada/elegible, membresía actual, último intento y plazo efectivo con prórroga individual. Primera entrega confirmada sale de pendientes; reentrega habilitada puede volver. Excluir borradores/retiradas, no esperadas, sin plazo, vencidas, archivadas y accesos revocados. **Datos de docente:** plazos generales de sus aulas con Enseño, sin plazos individuales ni registros de estudiantes en el calendario.

**Composición:** tarjeta con Estudio/Enseño, Reentrega si aplica, título, aula, fecha/hora y zona del aula, Abrir actividad. Sin filtro de rol global. El calendario del rango puede mostrar plazos pasados/completados con «Sin entrega pendiente»; eso no los convierte en próximas entregas pendientes. Vista inicial consulta hasta cinco próximas entregas; no mostrar como total absoluto el número de tarjetas visibles.

**Transición real:** Abrir actividad llama a la validación de destino de Agenda → `/mis-aulas?aula=<uuid>&actividad=<uuid>`; si el destino solo contiene aula, omite actividad. No inicia intento ni cambia fecha/notas. Apertura revalida permiso; FORBIDDEN informa y refresca la agenda para quitar datos obsoletos.

**Estados/aceptación:** carga propia, vacío «No tienes entregas próximas pendientes», fallo con reintento y acceso no disponible distintos. Aula archivada no aporta próximos pendientes, eventos personales se conservan. `states/success.webp` puede acompañar cero pendientes, sin decir que completó todas las actividades. Probar extensión individual, envío, reapertura, archivo/revocación y cuenta mixta; un docente nunca ve fecha especial de un alumno aquí.

## AGENDA-04 — crear evento privado

**Entrada real:** Nuevo evento en cabecera o Agregar evento este día. Cuenta verificada sin necesidad de aula. **Desktop:** diálogo contenido, grupos Qué/Cuándo/Repetición/Más opciones, resumen y pie Cancelar/Crear evento. **Móvil:** diálogo con ancho disponible y scroll interno, título/cierre visible, campos apilados y sin teclado tapando el campo activo. Mantener foco y regreso al disparador.

| Grupo/campo | Contrato observable |
|---|---|
| Categoría | Clase / Actividad / Evaluación, selección única accesible. Default actual Clase. Texto «Solo visible para vos. No crea una actividad del aula». |
| Título | Obligatorio, recortado no vacío, máximo 160 caracteres; ejemplo contextual, texto plano. No confundir con límite de título de actividad académica. |
| Color | Automático y seis colores nombrados; radio y muestra visual, no solo swatches. Se conserva al cambiar tipo/horario y al editar. |
| Fecha e inicio | Fecha real y hora local a precisión de minuto, separadas. Nuevos: día seleccionado, 09:00 y 60 minutos como defaults actuales editables, zona de Agenda. |
| Duración | Atajos 30/60/90 min y Ajustar fin. En duración, cambiar inicio recalcula fin por fecha local incluso cruzando medianoche. Manual conserva fin y valida si queda anterior. |
| Día completo | Toggle oculta horas/zona, conserva horas/fechas y selección de fin del borrador al volver; no transforma fechas en medianoche UTC. Último día incluido en UI, fin exclusivo al persistir. |
| Repetición | Una vez / Cada semana, defaults sin repetición. Semanal requiere final incluido y preview; AGENDA-05. |
| Notas | Opcionales, máximo 4000 caracteres, en Más opciones; campo ya cargado se revela o identifica «Con datos». |
| Ocupa varios días | En Más opciones, fecha de fin; final incluido para día completo. Activado/revelado automáticamente si editar trae múltiples días. |
| Ciudad del evento | Solo con horario, en Más opciones → Cambiar; ciudad legible, sin IANA libre/offset numérico; conserva hora escrita y cambia instante real, con aviso junto al selector. Edición mantiene zona guardada. |

**Resumen:** título/fecha/intervalo o Día completo y, si semanal, cantidad/último día real. Derivado del mismo borrador; incompleto muestra dato pendiente sin romper render. Ajustar fin revela campo necesario. El evento debe terminar después de empezar; igualdad horaria no es duración cero válida. No truncar texto ni ajustar silenciosamente un fin inválido.

**Acción:** validar localmente/servidor, PUT con ID estable del editor; doble clic o reintento idéntico no duplica. Misma ID con payload distinto da conflicto. No hay owner/aula/ubicación/invitados/alertas, ni botones de sincronización. Al cerrar con cambios se confirma descarte; cancelar un formulario intacto no escribe.

**Estados/aceptación:** guardando bloquea controles, errores inline con `aria-invalid`/descripción y foco primer error; abrir Más opciones si contiene ese campo. Error conserva formulario. Alta confirmada cierra editor, selecciona día del evento según zona de vista, actualiza mes si hace falta, anuncia Evento creado y ofrece Ver evento; si es serie, Ver inicio de la serie. Asset `states/success.webp` pequeño, sin modal adicional que exija confirmación de éxito.

## AGENDA-05 — repetición semanal completa

**Entrada real:** AGENDA-04/edición → Cada semana. **Composición desktop/móvil:** fecha Repetir hasta (incluido), día de la semana, cantidad, fecha de última ocurrencia efectiva y límite 53. Default actual hasta inicio +28 días, cinco encuentros; si cambia inicio y la persona no editó el final, se recalcula; si lo editó, se conserva.

**Reglas:** intervalos de siete días en la fecha/hora local de la zona guardada, no 168 horas UTC fijas. Fecha límite inclusiva, al menos primera ocurrencia y máximo 53; 54 se rechaza, nunca se corta. Última ocurrencia real puede preceder a la fecha final elegida; mostrar ambas sin contradicción. La duración y color son de toda la serie.

**Acciones/estados/aceptación:** editar o eliminar afecta todas las ocurrencias incluidas pasadas; aviso antes de confirmar, no opción «solo esta» inexistente. Mensaje de fechas estacionales conflictivas permite cambiar horario/final. No desplazar/omitir una clase automáticamente. Probar 1/5/53/54, final antes de inicio, final entre dos fechas y cruce de cambio estacional. `scenes/agenda.webp` solo en cabecera global, sin repetición decorativa dentro del formulario.

## AGENDA-06 — resolver horas inexistentes o repetidas

**Entrada real:** validación de evento con horario en zona IANA. Solo propietario; el error no se resuelve con timezone local implícita del proceso. **Desktop/móvil:** error junto a inicio/fin y selector de opciones humanas si hora ambigua, con primera/segunda vez y el momento correspondiente; no campo de offset numérico.

**Reglas/transiciones:** hora inexistente → elegir otra hora; hora que ocurre dos veces → elegir una de las opciones válidas del servidor/dominio para ese extremo. Si ambos extremos requieren elección, resolver sucesivamente sin perder primera elección válida. Cambiar un extremo invalida solo su offset; duración que mueve fin invalida el de fin; cambiar zona invalida ambos. Toggle Día completo conserva horas/offsets en memoria pero no los envía en ALL_DAY.

**Serie:** si una futura ocurrencia cae en hueco/ambigüedad, señalar fecha/ciudad y pedir ajustar horario o fecha final; elegir offset de la primera no autoriza corregir futuras en silencio. Error no crea evento parcial. Aceptación con zonas de transición reales y serie conflictiva; en Buenos Aires ordinaria no mostrar un diálogo DST innecesario. Asset `states/unavailable.webp` opcional mínimo; la explicación textual es la información útil.

## AGENDA-07 — editar sin cambiar el día consultado

**Entrada real:** Editar evento/Editar serie en lista del día. Solo dueño. Recupera título/categoría/notas/color/horario/zona/repetición actuales, no los defaults de alta. Desktop/móvil usan AGENDA-04 con título Editar evento, Guardar cambios y Eliminar/Eliminar serie.

**Acción:** PATCH con revisión actual e ID original. Si antes o después es semanal, confirmar alcance completo incluidas fechas pasadas; no mutar al abrir ni al cambiar un campo. Éxito cierra editor, anuncia Cambios guardados y conserva día/mes que se consultaba; Ver evento/Ver inicio de la serie permite ir explícitamente al inicio real, con foco a tarjeta cuando termina de cargar.

**Estados/aceptación:** error conserva campos y permite corregir; Cancelar con cambios pregunta descarte. Evento ajeno/inexistente no muestra datos, misma denegación segura. Si edición mueve evento a otro mes, no saltar automáticamente como en alta. Probar color antiguo/actual, cambio entre único/semanal, horario/día completo y edición de ocurrencia intermedia de una serie. No convertir edición de una fecha en excepción individual.

## AGENDA-08 — eliminar evento o serie

**Entrada real:** edición → Eliminar; solo dueño, sin conflicto pendiente. **Composición:** confirmación breve con título y alcance: evento único o toda la serie incluidas fechas pasadas. En rediseño se propone diálogo coherente con el sistema; actualmente las confirmaciones de descarte/guardar serie/eliminar usan `window.confirm`, por lo que reemplazarlas es trabajo UI futuro, conservando semántica y teclado.

**Acción:** comprobar revisión vigente antes de pedir/confirmar y DELETE con revisión. Cancelar no escribe. Éxito cierra editor, anuncia Evento eliminado y actualiza vista, sin enlace Ver evento inexistente; nunca elimina una actividad académica ni afecta otra cuenta. Si falla o cambió versión, conserva el contexto, explica y lleva a revisión de AGENDA-09. Prueba: único, serie, revisión concurrente, doble clic, cancelación y acceso ajeno. Asset de estado opcional pequeño; no celebración de completar una tarea académica.

## AGENDA-09 — conflicto entre pestañas y recuperación

**Entrada real:** guardar/eliminar recibe `CONFLICT` o detecta revisión diferente. **Desktop/móvil:** aviso en editor, campos propios intactos y guardado/eliminación bloqueados; acción «Revisar versión guardada y conservar mis cambios». Recuperar muestra versión guardada (título, notas, resumen y color) junto al borrador propio para comparación; no fusionar ni reescribir silenciosamente.

**Transición:** GET de versión vigente actualiza revisión base y desbloquea solo tras revisión; persona mantiene/revisa sus campos y pulsa Guardar de nuevo. Si ya no existe o no tiene permiso, error seguro y salida al calendario, sin recrear el evento automáticamente. Si falla recuperación, conserva conflicto y borrador para reintentar. No hay conflicto por solapamiento de horas definido: dos eventos personales pueden coincidir; no inventar detección/bloqueo de disponibilidad.

**Aceptación:** dos pestañas editan, primera guarda, segunda 409; segunda no puede forzar guardar/eliminar antes de revisar. Conservar color/horario/notas locales y mostrar versión remota; eliminar desde otra pestaña no genera un alta accidental. `states/unavailable.webp` puede acompañar aviso, nunca sustituye comparación textual.

## AGENDA-10 — éxito confirmado, fallos y sesión

- **Escritura confirmada + refresco fallido:** mantener Evento creado/Cambios guardados/Evento eliminado, indicar «No pudimos actualizar la vista; reintenta la consulta, no hace falta volver a guardar». Reintento solo GET, no repite PUT/PATCH/DELETE ni reabre un editor como si hubiera fallado la escritura.
- **Consulta fallida/parcial:** paginación debe completarse; fallo/cursor repetido informa error, sin mostrar conjunto incompleto como calendario completo. Cambio rápido de mes/zona invalida respuestas anteriores. Estado loading no muestra próximos pendientes cero como resultado confirmado.
- **Servicio desconectado:** error legible y Reintentar consulta; formulario abierto conserva campos mientras sigue autorizado. La persistencia entre recargas de un formulario no está garantizada: no prometer autosave de eventos nuevos.
- **Sesión/correo:** AUTH_REQUIRED retira datos privados y pasa a `/sign-in?next=%2Fagenda`; EMAIL_VERIFICATION_REQUIRED a `/verify-email` con ese destino. No copiar notas a una URL ni storage persistente nuevo. Reautenticar exige revalidar evento/revisión antes de escribir; CSRF/origen inválidos no se convierten en «guardado».
- **Archivo/revocación de aula:** próxima consulta/abrir destino elimina plazos ya no autorizados; eventos propios independientes siguen disponibles. No existe estado archivado para evento personal ni reactivación de serie eliminada en este alcance.
- **Assets:** `states/empty.webp`, `states/success.webp`, `states/unavailable.webp` pequeños según estado; `scenes/agenda.webp` solo de acompañamiento. Todos con alternativa decorativa vacía cuando el texto ya transmite el significado.

## Criterios de entrega verificable

1. Vista real en 1440/1024/768/390/320 px, teclado, 200 % zoom y lectura de lista; día activo y hoy distinguibles, fechas/nombres largos sin solapamientos. Drawer/diálogo devuelven foco; errores enfocados y estados anunciados. Color no es único identificador.
2. Matriz privada: cuenta sin aulas crea/edita/elimina; otra cuenta no lee ni escribe IDs ajenos; no verificada no accede. Cuenta mixta mantiene privacidad propia y rol por aula. Ninguna acción de Agenda modifica consignas, notas o plazos.
3. Matriz temporal: fin inválido, medianoche, multiday, día completo sin UTC, cambio de zona de vista/evento, duración/manual, DST inicial/futuro, 53/54 y serie completa. Preview y persistencia coinciden sin truncado.
4. Matriz de fallos: doble clic, retry idempotente, revisión vieja, borrado concurrente, errores inline, API indisponible, consulta tardía, respuesta paginada incompleta y escritura confirmada sin refresco. No duplicados ni falsos vacíos.
5. Flujo académico: prórroga, entrega/reentrega, plazo vencido/sin fecha, archivado/revocación y apertura autorizada; próximos cinco no se rotulan total global. Sin email de aviso, sincronización externa, invitados, eventos compartidos, drag-and-drop u otras frecuencias/excepciones.

Estos son requisitos para futura implementación/validación de la nueva presentación. La presente unidad es documental; no ejecuta tests funcionales ni declara que las imágenes validaron sesiones, accesibilidad o persistencia.
