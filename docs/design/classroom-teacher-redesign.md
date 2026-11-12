# Mis aulas docente: diseño detallado

## Decisiones aprobadas

El diseño se aprobó el 2026-11-11 sobre `3895f4d`. El usuario aprobó los recorridos unificados, las invitaciones múltiples y el código numérico de seis dígitos vigente hasta su regeneración. Después se implementaron ambos roles y se integraron a `main`.

Este registro conserva criterios y decisiones de diseño. La guía de Aulas describe el contrato en uso y la galería muestra la aplicación compilada. [Aulas e ingreso](../engineering/classrooms/README.md) · [Galería](current/README.md#mis-aulas) · [Evidencia de integración](../verification/classrooms-ux-unification.json)

### Revisión de fluidez para el docente

La siguiente revisión concentra las acciones frecuentes junto al plan. Desde «Prepará tu próxima clase» se puede subir material, crear una actividad o publicar un aviso. El tema seleccionado conserva sus acciones específicas para agregar recursos a ese tema.

La creación destaca el paso actual con una cápsula y comunica los pasos completados con un check. Cada pantalla presenta una instrucción breve y una acción principal. Las opciones manual y Foxy muestran el resultado esperado antes de elegir. El archivo elegido ocupa una tarjeta que permite reemplazarlo.

En Biblioteca, «Organizar en el plan» agrupa unidad, tema y uso en una sección desplegable. Se abre al llegar desde un tema. En actividades, la rúbrica también es desplegable y se abre cuando tiene criterios. Los campos obligatorios ocultos se revelan al validar.

Las cargas usan indicador indeterminado, texto de estado y, al generar una actividad, una vista provisional de su estructura. La maqueta simula la resolución en 700 ms para revisar la transición. La implementación conectada deberá reflejar la duración real de cada operación. Las acciones locales inmediatas responden sin espera añadida.

Los éxitos aparecen en un aviso flotante que puede cerrarse y conserva la posición del contenido. Los pasos y diálogos usan desplazamientos de 5–8 px durante 180–200 ms. Las superficies del diálogo permanecen opacas durante la animación. La preferencia de movimiento reducido desactiva desplazamientos, giro y brillo, manteniendo los mensajes de estado.

**Actores:** docente dueño de aula activa; docente consultando aula archivada; estudiante verificado ingresando por código o aceptando invitación. Los controles compartidos requieren regresión en Carpetas y vistas estudiantiles. Progreso, Historial y Configuración mantienen sus reglas; sólo se ajusta presentación compartida cuando sea necesario.

**Fuera de alcance:** cambio de stack, proveedor, precios/cuotas, roles, calificaciones, reglas de participación, nuevo sistema de edición enriquecida, importación CSV de alumnos, institucionalización y rediseño global de otras secciones.

## 1. Sistema visual y componentes

La experiencia parte de Brújula, con el logo de Foxy, las portadas ilustradas, los iconos, Lexend, la barra lateral y las ocho secciones del aula. Las referencias están en la [galería de Mis aulas](current/README.md#mis-aulas). En el interior se usa también la cabecera durazno que define el CSS actual. El toque cálido se aplica a selección, acciones y avisos. El fondo, las superficies y la jerarquía visual siguen el entorno de FoxMind.

| Función | Valor de diseño |
|---|---|
| Fondo de área / superficie | `#F2F5FC` / `#FFFFFF`; lienzo móvil `#FCF8F1` |
| Texto principal / secundario | `#252646` / `#555D77` |
| Acción principal / texto sobre acción | `#B8490C` / `#FFFFFF` |
| Selección suave / texto seleccionado | `#FFF0E1` / `#9A3E00` |
| Éxito / superficie de éxito | `#235D38` / `#EDF8F1` |
| Error / superficie de error | `#8C281C` / `#FFF1EF` |
| Borde decorativo / borde de control / foco | `#DCE2F0` / `#AEB9CE` / `#9A3E00` en el prototipo. Ajustar el borde de control al contraste requerido en los componentes de producción. |
| Radios | 14 px controles, 20 px tarjetas, 24 px diálogos; cápsula completa sólo para selección/badges |
| Espaciado | Escala 4/8/12/16/24/32 px; 24–32 px dentro de superficies amplias |
| Texto | Cuerpo 16 px, etiquetas 14 px, apoyo mínimo 12 px; títulos 24–32 px; interlineado 1,5–1,7 |
| Elevación | Superficie normal sin sombra o sombra tenue; selección corta; diálogo con sombra amplia |

El naranja identifica acción/selección, no todo elemento interactivo. Éxito/error combinan texto e icono; ningún significado depende sólo del color. Tarjetas de archivos distinguen formato por nombre e icono, sin una paleta arbitraria por extensión.

**Componentes reutilizables:** selector segmentado, selector de opciones, marco de diálogo, indicador de pasos, carga de archivo, aviso contextual, fila de invitación y cabecera de contenido. Reutilizar entradas de features y shared-ui existentes; no trasladar reglas de dominio a shared-ui. No se elige una nueva librería en esta fase.

### Interacción común

- Una acción principal por paso; verbos concretos: Guardar plan y continuar, Publicar en Biblioteca, Asignar al aula. Acciones destructivas separadas visualmente.
- Foco visible de 3 px, objetivos táctiles efectivos de al menos 44×44 px y etiquetas persistentes. Iconos decorativos ocultos a lectores; botones icon-only con nombre accesible.
- Selector de filtro: grupo con selección única comunicada mediante `aria-pressed`, conservando el patrón actual. No simular tabs si sólo filtra una colección.
- Selector desplegable: navegación por flechas, Home/End, búsqueda por escritura, Enter/Espacio para seleccionar, Escape para cerrar y retorno de foco. Menú reposicionado si llega al borde; en móvil debe caber en el viewport. Reutilizar un patrón accesible comprobado antes de escribir interacción propia.
- Diálogos con título, foco contenido, Escape/cierre gestionados, fondo inerte y retorno al disparador. Si desaparece, volver al encabezado correspondiente. Evitar diálogos anidados: confirmaciones de reemplazo/cierre usan una vista de confirmación dentro del mismo marco.
- Error de campo junto al control y resumen al intentar avanzar; foco en el primer error. Error de operación cerca del botón; conservar entradas. Los errores no se autoocultan.
- Éxito breve cerca del resultado, anunciado por `role=status`; desaparece visualmente sólo si el resultado permanece reconocible. Deshacer no depende de alcanzar un toast temporal.
- Transiciones 160–240 ms; confirmación de check hasta 320 ms. Sin rebotes grandes, confeti, cambio de foco por animación ni espera artificial. Reduced-motion elimina desplazamientos, resorte y pulsos.

### Responsive y lectura

| Ancho de revisión | Composición |
|---|---|
| 1440 px | Conservar shell/sidebar actual; área centrada, formularios de ancho legible; diálogos de creación hasta 960 px |
| 768 px | Formularios según espacio real; metadatos en dos columnas si mantienen etiquetas completas; acciones sin desbordar |
| 390 y 320 px | Una columna; márgenes 12–16 px; búsqueda en fila propia; filtros en dos columnas o apilados según contenido; nada depende de hover |
| Zoom 200 % / viewport de poca altura | Reflujo y acceso completo por scroll; cabecera/pie se compactan y dejan de fijarse si impedirían editar el contenido |

Las pestañas del aula conservan todos los destinos existentes; se adapta su presentación sin quitar secciones. En móvil, el indicador de creación muestra «Paso 3 de 4 · Unidades y temas» y acceso a pasos anteriores, sin cuatro etiquetas comprimidas. Textos largos envuelven; no se recortan consignas ni nombres editables. El teclado virtual no puede tapar el campo enfocado ni la acción para continuar.

## 2. Mis aulas

**Jerarquía:** título y Crear aula → píldora Activas/Archivadas/Pendientes con contadores → búsqueda/filtros/vista → resultados. La píldora tiene riel crema hundido y selección elevada con borde/texto terracota; el contador activo usa contraste alto. No mover foco ni resetear filtros al cambiar estado.

Los contadores conservan su significado actual de total por estado; los resultados filtrados se informan aparte («2 aulas encontradas»). Ciclo y división muestran estado activo cuando su valor no es Todos/Todas. Mantener chips removibles y Limpiar filtros. Cambiar vista tarjetas/lista conserva búsqueda, filtros y aula enfocada.

| Estado | Contenido y acción |
|---|---|
| Sin aulas activas | «Todavía no tenés aulas activas» + Crear aula |
| Sin archivadas / pendientes | Explicación del estado; no mostrar un error ni una invitación estudiantil como pendiente docente |
| Sin coincidencias | «No encontramos aulas con estos filtros» + Limpiar filtros |
| Cargando | Esqueleto estable con etiqueta accesible; no mostrar cero antes de resolver |
| Error | «No pudimos cargar tus aulas» + Reintentar, conservando criterios |
| Pendiente existente | Nombre o «Aula sin nombre», resumen disponible, Continuar creación y Eliminar pendiente con confirmación |

## 3. Crear o continuar aula

### Marco y recorrido

Diálogo hasta 960 px, máximo aproximado de 90dvh. Cabecera con título/cerrar y pasos; centro con un único scroll; pie con estado de guardado, Guardar y salir, Atrás y acción principal. En móvil se adapta casi a pantalla completa. La cabecera opaca no tapa pasos ni contenido.

```text
Crear aula
  1 Datos del aula → 2 Cargar plan → 3 Unidades y temas → 4 Revisar y crear
  [contenido del paso; scroll único]
  Guardado / Sin guardar / Guardando…       Atrás   Acción principal
  Guardar y salir
```

| Paso | Contenido | Acción principal y condición |
|---|---|---|
| 1. Datos del aula | Nombre, materia, división, ciclo, zona y portada del catálogo | Continuar al plan; datos básicos válidos |
| 2. Cargar plan | Archivo PDF/DOCX hasta 20 MB + elección IA/manual | IA: Analizar plan y continuar; manual: Continuar a unidades; archivo aprobado y método elegido |
| 3. Unidades y temas | Estructura editable común; análisis de IA dentro de este paso | Guardar plan y continuar; estructura válida y guardado/aplicación confirmados |
| 4. Revisar y crear | Datos, documento, portada y resumen del plan; Editar cada sección | Confirmar y crear aula; revalidar todos los requisitos |

La reorganización no elimina el documento obligatorio del recorrido manual ni cambia la zona fija después de publicar. Subir un archivo no inicia IA. Un paso completado significa validación de su contenido vigente; editar una dependencia puede invalidar pasos posteriores. Se puede volver a pasos anteriores disponibles; no saltar validaciones futuras.

### Documento, extracción y edición

1. Zona de arrastre con Seleccionar archivo y límites visibles. Arrastrar resalta el borde sin deformar el layout. Archivo incompatible: mensaje concreto, selección anterior válida conservada hasta completar el reemplazo.
2. Nombre y tamaño locales visibles durante la subida; distinguir Subiendo, Verificando documento y Listo para usar. El porcentaje sólo aparece si se dispone de bytes reales. Validación/escaneo utilizan indicador indeterminado.
3. Consultar automáticamente estados pendientes con espera progresiva, pausa al ocultar/cerrar y cancelación de lectura al cambiar de archivo. Un rechazo detiene la espera; desconexión ofrece Reintentar consulta. Nunca asociar resultados tardíos al archivo nuevo.
4. Al terminar IA, mostrar directamente resumen y editor, sin disclosure exterior. Primera unidad e incompletas abiertas; otras muestran nombre y cantidad de temas. Expandir/contraer todas es opcional. Mantener apertura, cursor y posición al escribir.
5. Campos de nombres multilínea que crecen para mostrar el texto completo; conservar límites de 120 caracteres y límites de estructura vigentes. Agregar tema enfoca el nuevo campo; quitar un tema o unidad permite deshacer la última eliminación antes de otra edición o de guardar/salir.
6. Manual ofrece el mismo editor; el auxiliar de texto permanece secundario y claramente diferenciado del análisis IA. Editar como texto advierte antes de reemplazar estructura existente.
7. Aplicar IA y avanzar es una única intención. Si reemplaza unidades guardadas: resumen «Se reemplazarán N unidades y M temas» y acción explícita Reemplazar plan y continuar. Volver a editar invalida esa confirmación. No publicar el aula en esta operación.
8. Si sólo falla el refresco después de una aplicación confirmada, recuperar el borrador vigente; no volver a aplicar ni generar automáticamente. Un error sin confirmación conserva la edición y la identidad de solicitud cuando exista.

### Salida y recuperación

En la maqueta, el paso 3 presenta un resumen de unidades/temas y controles Expandir todas/Contraer. Cada unidad tiene número, nombre actualizado mientras se escribe y contador de temas. Los temas son filas numeradas con campos multilínea; agregar tema queda dentro de su unidad y agregar unidad al final del conjunto. Eliminar está separado de las acciones de avance y ofrece deshacer inmediato. El pie conserva Atrás, Guardar y salir y Guardar plan y continuar.

Guardar y salir espera confirmación y vuelve a Pendientes; cerrar y Escape siguen ese recorrido cuando se puede guardar. Si queda una propuesta editada aún no aplicada, ofrecer Volver a revisar, Guardar plan y salir o Salir sin guardar la propuesta, explicando qué datos sí se guardaron. No llamar «guardado» al texto que sólo existe en memoria. Durante carga, ofrecer permanecer o salir con aviso sobre el archivo pendiente, sin prometer cancelar un análisis ya despachado. Conflicto de revisión: conservar edición visible y ofrecer abrir versión guardada; no sobrescribir cambios ajenos.

Al publicar: estado Creando aula…, impedir duplicados y volver a Activas con el aula identificable. Ante publicación de resultado incierto, reconciliar borrador/aula antes de habilitar un segundo intento.

## 4. Interior: Plan, Muro y Biblioteca

### Plan

La maqueta revisada muestra tarjetas de unidad numeradas, nombre completo, cantidad de temas dados y una línea de progreso. Los filtros Todos, Por dar y Dados tienen contadores; el avance total queda sobre la lista. La selección durazno identifica el tema consultado y el check verde identifica lo dado, sin tachar nombres.

Hay dos accesos al mismo cambio: el check junto a cada tema y el botón del detalle. Usar el check de otro tema conserva el detalle actual. La confirmación muestra el nombre afectado y Deshacer; un pulso breve acompaña el check, respetando movimiento reducido. El detalle agrupa materiales y actividades con cantidades y acciones específicas, y ofrece Anterior/Siguiente. En móvil se apila debajo de la lista y seleccionar un tema lleva al detalle.

Mantener árbol de unidades/temas y detalle contextual. Seleccionar un tema y marcarlo son acciones distintas, con objetivos separados. El control usa «Marcar como dado» o «Tema dado» y comunica su estado. La lectura y el desplazamiento siguen disponibles mientras se guarda; coordinar escrituras para no pisar revisiones.

Secuencia: selección inmediata en estado pendiente de guardar → confirmación del servidor → check breve y contador/progreso de unidad actualizados. Si falla: restaurar estado confirmado, explicar el error junto al tema y ofrecer reintento. No autoasignar NEXT ni interpretar avance como rendimiento académico.

Mostrar «Tema marcado como dado · Deshacer» cerca del detalle. El mensaje puede desaparecer; sigue disponible desmarcar desde el mismo control. El deshacer inmediato restaura exactamente el estado previo, incluido NEXT, no lo convierte siempre en PENDING. Aula archivada/estudiante: consulta sin controles de mutación.

### Muro

Cabecera común con avatar/nombre/fecha, tipo y controles dentro del flujo flex/grid, sin offsets absolutos que dependan de cantidad de acciones. En móvil puede ocupar dos filas; respuestas con indentación moderada y sin estrechar el texto excesivamente. Fecha legible y fecha/hora completa accesible. Aviso/Consulta se identifican por texto, sin apariencia de mensajería privada.

Filtros en píldora; compositor con título, texto, audiencia «Visible para toda el aula» y acción Publicar aviso. Respuestas inline con Enviar respuesta y Cancelar. Publicando/Enviando bloquea duplicados, conserva el contenido y no cierra antes de confirmar. Carga con esqueletos; vacío con acción autorizada. Error no borra texto. Resultado: «Aviso publicado en el aula», «Respuesta publicada» o «Cambios guardados», resaltando el contenido afectado sin salto de lectura.

Editar/eliminar conserva permisos actuales. Eliminar advierte irreversibilidad del contenido y conservación de respuestas; no ofrecer un deshacer que el servicio no admite. Si el POST se confirmó y falla la lectura posterior, ofrecer Actualizar muro, sin repetir la publicación.

### Biblioteca

Agregar material abre un diálogo de hasta 720 px, opaco y con una sola superficie. Selector Subir archivo / Escribir material; cambiar de modo conserva temporalmente las entradas de cada modo dentro de la sesión del diálogo, pero sólo publica el modo activo. Cerrar con contenido no publicado confirma descarte; no prometer un borrador persistente inexistente.

| Modo | Contenido y estados |
|---|---|
| Archivo | Zona de arrastre, formatos/límite 50 MB vigentes, tarjeta de archivo, verificación automática y cambio de archivo. Título sugerido desde nombre sólo si estaba vacío. Descripción opcional separada del contenido escrito |
| Escrito | Título y cuerpo con límites del contrato; al publicar genera documento privado, valida/escanea y asocia el material. Si queda pendiente, conservar fuente y estado para continuar sin regenerar bytes iguales |

Metadatos compartidos: unidad («Sin unidad»), tema («Sin tema»), uso («Material de estudio», «Recomendado», «Complementario»). Ubicación y uso son dimensiones distintas. Al entrar desde un tema, precargar ese destino y permitir cambiarlo; cambiar unidad invalida un tema incompatible.

Publicar en Biblioteca es explícito. En modo escrito, la acción incluye preparación/verificación y publicación; si se pierde continuidad, informar qué quedó aprobado sin publicarlo automáticamente al reabrir. Éxito: fila nueva identificable, «Material publicado» y Ver material. FILE conserva bytes; revisiones TEXT conservan identidades anteriores y vínculos. Eliminar mantiene confirmación y reglas de cuota/borrado existentes.

Listado alineado: icono/formato, título, ubicación/uso y acciones; en móvil metadatos envuelven. Leer material conserva contexto y búsqueda al volver. No alterar fuentes, descarga ni permisos por mejorar apariencia.

## 5. Actividades: editor común

### Revisión navegable de autoría, entrega y devolución

La ampliación solicitada conserva la identidad y los componentes del aula. Autoría manual y asistida comparten tres pasos: **Preparar → Consignas → Revisar y asignar**. El método sólo modifica cómo llega el contenido al editor; la consigna final, las preguntas, criterios, plazo y revisión tienen la misma presentación. Generar una propuesta no asigna la actividad. Guardar borrador mantiene su carácter privado.

La lectura responde primero qué hay que hacer y cómo entregarlo: título, tipo/plazo, objetivo, consigna con párrafos o pasos legibles, preguntas numeradas y criterios. El detalle docente separa Consigna y Entregas; el estudiante usa la misma lectura y sus acciones de participación. La vista previa docente no crea un intento ni muestra claves de respuesta.

| Tipo | Preparación del estudiante | Evidencia que consulta el docente |
|---|---|---|
| Trabajo práctico | Texto y/o archivos según la consigna; adjuntar no confirma entrega | Respuesta escrita, archivos y recibo de entrega |
| Cuestionario | Desarrollo, selección única y múltiple; guardar antes de revisar | Respuesta por pregunta, tipo, puntos y criterios de corrección privados |
| Evaluación | Inicio explícito, preguntas y revisión antes de confirmar | Intento y respuestas por pregunta; mismo flujo de corrección y publicación |

La revisión docente conserva dos intenciones: **Guardar en privado** y **Revisar y publicar**. El alumno sólo consulta su resultado publicado. Abrir la actividad no inicia automáticamente la evaluación. Revisar entrega permite volver a editar; confirmar conserva una recepción y bloquea la edición. La reentrega requiere habilitación docente y conserva los recibos anteriores. La maqueta usa datos ficticios persistidos localmente; los archivos se representan mediante sus metadatos, y las operaciones con Foxy y espera son simulaciones.

### Corrección manual y asistida: una misma mesa de trabajo

El recorrido comienza en Entregas: elegir estudiante, leer su trabajo, valorar, preparar devolución y revisar antes de publicar. Anterior/Siguiente recorre las entregas confirmadas sin volver a la lista. En escritorio, evidencia a la izquierda y corrección a la derecha; en móvil, respuestas primero y valoración después. Se conserva Lexend, superficies claras, acentos cálidos y controles redondeados del resto del aula.

- **Trabajo práctico:** texto y metadatos de adjuntos, con consigna consultable. **Cuestionarios y evaluaciones:** cada pregunta contiene en el mismo bloque su respuesta, puntos y comentario opcional; opciones objetivas y respuestas vacías muestran cálculo automático. Las claves son exclusivamente docentes.
- **Rúbrica:** criterios con evidencia esperada, peso, valoración 0–10 y orientación opcional. La suma ponderada es una nota orientativa; «Usar esta nota» la adopta de forma expresa. Cambiar un criterio nunca reemplaza la nota final ingresada. Sin rúbrica, las preguntas aportan puntos; un TP permite nota manual. Cero es válido y las entradas admiten hasta dos decimales. El cálculo conserva fracciones hasta el redondeo final.
- **Devolución:** tres campos breves —Qué hizo bien, Qué puede mejorar, Próximo paso— y comentario general opcional. Los comentarios específicos permanecen junto a la pregunta o criterio. Cambios locales se conservan al navegar y recargar; «Guardar en privado» guarda una corrección válida sin mostrarla al alumno.
- **Foxy:** asistencia opcional en la misma pantalla, con carga no bloqueante, propuesta lista, error recuperable y descarte. Revisar abre una vista previa; «Usar y guardar en privado» confirma el reemplazo de la corrección en preparación. Cancelar, descartar o fallar conserva el trabajo manual. La llegada de la sugerencia no mueve el foco de un campo en edición. El botón y el fallo de ejemplo simulan estados locales: no ejecutan modelos ni cambian la activación automática por aula del contrato real.
- **Publicación:** «Revisar y publicar» valida y guarda en privado; abre exactamente la versión que verá el estudiante. Volver a corregir no publica. «Publicar devolución» confirma esa versión y recepción. Una corrección publicada queda en lectura; habilitar reentrega conserva su historial.
- **Estudiante:** la devolución aparece primero al abrir una actividad corregida, con nota y fecha, «Lo que hiciste bien», «Para mejorar» y «Tu próximo paso». Después, criterios y orientaciones por pregunta con su consigna. Consigna completa y comprobante permanecen consultables. No se muestran claves, puntos internos ni propuestas de IA. Si corresponde a una entrega anterior, se indica expresamente.

La implementación mantiene la corrección privada separada de la publicación revisada. [Calificación](../engineering/grading/README.md) · [Asistencia IA](../engineering/ai/grading-assistance.md)

### Aula estudiantil con componentes compartidos

El catálogo, cabecera, pestañas, unidades, recursos y actividad comparten tipografía, superficies, controles y jerarquía con el docente. Los destinos estudiantiles son Plan, Muro, Biblioteca, Actividades, Mi progreso y Compañeros. Plan permite consultar el avance docente; Biblioteca sólo lectura; Muro permite consultas propias y respuestas. Mi progreso presenta únicamente entregas y devoluciones publicadas de Marina Demo; Compañeros no muestra correos, notas ni intentos de pares.

La revisión de comodidad estudiantil conserva los mismos componentes compartidos y cambia el contenido/las acciones según el rol:

- En móvil, las pestañas se organizan en una grilla visible para ambos roles. El control de personaje de la maqueta ocupa menos altura. El detalle de un tema permite volver a «Unidades y temas» con foco en el tema seleccionado.
- Mi progreso prioriza tres cantidades propias: actividades para continuar, entregas esperando devolución y actividades con devolución. Primero aparecen las tareas que se pueden continuar; el avance docente del plan queda en una sección desplegable independiente, sin confundirse con rendimiento individual.
- Las acciones reflejan el estado: Ver consigna, Continuar borrador, Preparar reentrega, Ver mi entrega y Ver devolución. Continuar borrador abre directamente el editor; Ver mi entrega abre su comprobante. Pendiente usa acento cálido, En curso lavanda y Entregada/Calificada verde, siempre con texto.
- Preparar → Revisar → Entregar muestra la ubicación actual. La revisión contiene advertencia de preguntas vacías y consecuencias de entregar; «Confirmar y entregar» es la única confirmación final, sin un segundo modal redundante. Volver a editar no envía. Consultar una evaluación no inicia un intento: su inicio sigue siendo explícito. La confirmación conserva recepción inmutable e impide repetir envío en la maqueta.
- Seleccionar archivos sigue siendo distinto de subirlos al borrador. El bloque señala «Seleccionados · falta subirlos» y «Subirlos no entrega la actividad». El estado de borrador especifica almacenamiento local y avisa si no está disponible; no promete sincronización con un servidor.
- Biblioteca comparte filas y lector entre roles: formato, uso, título y tema; búsqueda por título, archivo, unidad y tema sin exigir tildes. El lector usa ancho de lectura y tipografía más cómoda. Muro conserva la misma publicación/conversación, con administración según autoría. Los filtros del catálogo estudiantil derivan sólo de sus aulas visibles.
- El ingreso admite pegar seis números con espacios. Validación conserva el campo y explica qué corregir; ver destino y confirmar inscripción siguen separados.

Estas simplificaciones pertenecen al prototipo. La integración posterior deberá conservar autorización, validación/escaneo de archivos, reloj del servidor y capacidad/revisión de intentos; el almacenamiento local de la maqueta no sustituye esos contratos.

El selector «Docente / Estudiante» es una herramienta de revisión de la maqueta. No representa cambio de rol dentro de una cuenta real: el contrato vigente mantiene el rol global exclusivo. El catálogo estudiantil muestra aulas de las que participa el personaje; ingresar por código requiere ver el destino y confirmar, y salir requiere confirmación. Aula archivada permite consulta y salida, sin mutaciones académicas.

Criterios de revisión del prototipo: completar creación manual y con Foxy; revisar sin claves como estudiante; resolver y confirmar un TP y preguntas; consultar sus evidencias como docente; guardar una corrección y comprobar que sigue privada; publicarla y verla como alumno; comprobar navegación de seis secciones, ausencia de controles docentes, recarga de borradores locales y geometría móvil. La autorización/aislamiento de datos se verificará en integración, no mediante ocultamiento de botones en este HTML.

Crear actividad abre una pantalla dentro del aula, no un modal de formulario largo. Encabezado «Crear actividad», volver, estado Borrador privado y selección Escribir / Con Foxy. Ambos caminos comparten campos, revisión y cierre. Cambiar método conserva datos y no ejecuta IA.

| Paso | Campos y comportamiento | Acción |
|---|---|---|
| 1. Contexto y objetivo | Tipo TP/cuestionario/evaluación, unidad, temas y objetivo. Con Foxy agrega fuentes compatibles, nivel/dificultad, duración, cantidades y contexto del contrato actual | Continuar a consignas / Generar propuesta |
| 2. Consignas y evaluación | Título, consignas, comentario, preguntas según tipo, materiales y rúbrica. Datos generados se editan aquí | Continuar a revisión |
| 3. Revisar y asignar | Vista estudiantil autorizada, contexto, materiales, rúbrica, entrega/plazo/zona y tardías; accesos a editar | Guardar borrador o Asignar al aula |

Al generar, conservar el marco y mostrar cola/análisis/resultado real. READY muestra el editor si sigue en la espera de esa solicitud; si el docente volvió a editar, mostrar Propuesta disponible y no navegar ni reemplazar automáticamente. Mantener referencias de fuentes como detalle secundario. Resultado incierto o cuota agotada conserva la solicitud; no lanzar otra generación ni cobrar otra operación silenciosamente. Regenerar exige intención explícita y advertencia si reemplaza ediciones.

La generación no crea una asignación. Aplicar una propuesta privada puede requerir guardar un borrador en el servicio; esa transición no debe volver a abrir otro asistente ni perder contexto. Deshacer edición local no equivale a deshacer una publicación.

### Rúbrica, preguntas y guardado

- Criterios mantienen nombre, evidencia y peso; total visible. Repartir pesos equitativamente es voluntario: 3 criterios → 34/33/33, residuo asignado en orden estable. No modificar nombres/evidencias ni redistribuir al agregar/quitar un criterio sin pedirlo.
- No agregar un criterio pedagógico genérico automáticamente. Conservar máximo de 12 y pesos enteros positivos del contrato vigente. Total distinto de 100 muestra cuánto falta/sobra y bloquea revisión/asignación cuando corresponde.
- Tarjetas de pregunta con número, tipo, consigna, puntos y opciones. Simple usa selección única; múltiple permite varias y muestra su regla de puntuación. Puntos/soluciones privados sólo en edición docente.
- Guardar borrador conserva validaciones admitidas por el backend: no prometer guardar cualquier formulario incompleto. Si faltan datos exigidos para guardar, indicar los campos y mantener edición. No introducir autoguardado de actividad sin diseñar el contrato correspondiente.
- Volver/cerrar con cambios: Seguir editando, Guardar borrador y salir si válido, o Descartar cambios. No descartar silenciosamente. El botón Asignar al aula en la revisión es la confirmación explícita de publicación.
- Actividad con participación mantiene bloqueo de contenido; sólo las modificaciones permitidas de metadatos/plazos siguen habilitadas. No aplicar el nuevo formulario como validación retroactiva de actividades antiguas.

### Listado y lectura

Píldora de estados y filas/tarjetas con tipo, título, unidad/temas, estado y plazo. Mostrar contadores de entregas pendientes sólo si están disponibles y autorizados; sin métricas ficticias. Contextos extensos envuelven o se expanden con una etiqueta «Ver temas».

Detalle: contexto resumido, objetivo, consigna como bloque principal, materiales, preguntas cuando corresponde y rúbrica. Ancho de lectura cómodo; Entregas e intentos utiliza el ancho de sección y no resta una columna inexistente. Vista previa estudiantil y vista docente son modos diferenciados: soluciones/puntos privados no viajan al estudiante por reutilizar el componente. La consulta no inicia intentos ni sustituye el acceso específico vigente a consignas de TP.

## 6. Alumnos e invitaciones múltiples

### Estructura

Encabezado Alumnos + Invitar estudiantes. Bloque de acceso con código y acciones. Dos secciones estables: Integrantes e Invitaciones; contador de pendientes de aceptación, separación de vencidas/revocadas/aceptadas y estados vacíos. Historial de exalumnos continúa en su sección actual.

Filas de invitación: correo, estado de aceptación, vencimiento, estado del correo y acciones permitidas. «Correo aceptado para envío» nunca se transforma en «Entregado» sin evidencia. Reenviar/renovar respeta al menos 60 segundos entre emisiones actuales. Revocar confirma pérdida de acceso por esa invitación, no elimina un integrante ya inscrito.

### Modal de invitación múltiple

**Secuencia:** escribir/pegar correos → revisar destinatarios → Enviar N invitaciones → resultados por destinatario.

- Campo con instrucción «Pegá correos separados por coma, punto y coma o salto de línea». Enter completa un correo; espacios externos se recortan. No separar ciegamente por cualquier espacio interno, ni aceptar nombres de contactos como si fueran direcciones.
- Chips removibles con botón accesible; se puede volver a editar un inválido. Deduplicar según normalización del servidor (sin distinguir mayúsculas); no quitar puntos ni sufijos `+`, ni inventar equivalencias entre proveedores.
- Propuesta operativa: hasta 50 destinatarios únicos por tanda, sin limitar el total de alumnos del aula. Si se supera, conservar la entrada y explicar cómo dividirla; nunca truncar silenciosamente. Es un parámetro de diseño para validar antes de implementación, no un límite previamente existente.
- Mostrar válidos, inválidos y duplicados omitidos. No enviar hasta corregir o quitar inválidos. Destinatarios ya integrantes se omiten con estado explicativo si el servidor lo confirma; no revelar si una cuenta existe fuera del aula.
- Invitaciones pendientes vigentes detectadas se muestran como Ya invitado y se omiten por defecto. Renovarlas requiere una acción explícita separada; no reenviar a todos los pegados automáticamente.
- El botón anuncia la cantidad exacta. Cada destinatario es una operación independiente: un error no revierte invitaciones confirmadas de otros. No crear una conversación grupal ni exponer direcciones a otros destinatarios.
- En proceso mostrar resultados confirmados y Pendiente/Procesando para el resto. Cancelar detiene lo aún no enviado y espera/reconcilia lo ya en curso; no revoca correos ni invitaciones emitidas. Cerrar no promete continuar una tanda en segundo plano.

| Resultado individual | Presentación | Recuperación |
|---|---|---|
| Confirmado | Invitación creada · correo en cola; luego estado real de correo | Sin reenvío automático |
| Fallo confirmado | No se creó la invitación + motivo accionable cuando esté permitido | Reintentar sólo fallidos elegibles |
| Resultado incierto | No pudimos confirmar el resultado | Consultar estado antes de habilitar renovación/reenvío |
| Ya integrante / ya invitado | Estado explicativo, no contado como nueva invitación | Abrir integrante o invitación existente |
| No enviado por cancelación/límite | No enviada | Seleccionar para una nueva tanda |

Resumen: «N invitaciones creadas, M requieren atención». Mantener destinatarios fallidos e inciertos hasta resolver/cerrar; no almacenar correos en logs, URLs o memoria del agente. La lista del servidor permite recuperar invitaciones confirmadas al volver; no prometer persistencia del texto de una tanda aún no enviada.

### Contrato de lote implementado

El servicio actual recibe un correo, crea/renueva invitación y encola correo en una transacción; vigencia 7 días y reemisión mínima 60 s. Esto **no cambia** por hacer permanente el código del aula. No hay envío masivo existente que pueda darse por implementado. Ver [operación actual](../../apps/api/src/modules/classrooms/infrastructure/invitations-operations.ts).

El lote reserva un recibo por solicitud y procesa cada posición de forma idempotente. Ante un resultado incierto, el cliente recupera el recibo y continúa las posiciones pendientes. [Contrato vigente](../engineering/classrooms/README.md#ingreso-y-pertenencia)

## 7. Código de seis dígitos sin vencimiento temporal

**Decisión confirmada:** seis dígitos numéricos, vigente hasta regeneración explícita docente. Se recomienda usar cadena de seis posiciones, incluidos ceros iniciales (`000000`–`999999`), sin interpretación numérica que los elimine. Ejemplo ficticio de presentación: `482 915`; Copiar código copia `482915`.

- Docente: bloque con código, «Vigente hasta que generes otro», Copiar código y Generar otro. Copiado se confirma sólo si el portapapeles responde; ante fallo permitir selección manual.
- Generar otro abre confirmación: «El código anterior dejará de funcionar. Quienes ya están en el aula conservarán su acceso». Cancelar no cambia nada. Éxito muestra el nuevo; error conserva el anterior. La rotación y revocación son atómicas.
- No hay rotación programada ni expiración por inactividad. Archivar el aula bloquea inscripciones por las reglas vigentes; no equivale a vencer el código ni autoriza regenerarlo automáticamente. Reactivar conserva la política actual.
- Estudiante: un solo campo pegable, no seis cajas que dificulten lectura/pegado. Permitir espacios de agrupación del formato nuevo; conservar intactos los códigos legacy con guiones/guiones bajos. No normalizar ambos formatos con la misma eliminación de caracteres.
- Ver aula obtiene el destino mínimo permitido; Confirmar inscripción sigue siendo obligatorio. Regenerar entre esos dos pasos invalida la confirmación previa. Exalumno removido/salido sigue necesitando invitación nueva.
- Transición recomendada: generar formato nuevo para aulas nuevas y regeneraciones explícitas. Los códigos antiguos siguen aceptados hasta su rotación; no limitar el input al patrón numérico durante la transición. No rotar masivamente ni sustituir códigos ya compartidos sin decisión docente.

### Reserva y protección

Generación criptográficamente segura y reserva única atómica con reintentos acotados; mantener el código anterior si no se puede reservar el nuevo. La consulta previa a insertar no resuelve carreras. Conservar digest/envelope y evitar exposición en logs/telemetría.

El espacio corto y permanente requiere protección específica por cuenta verificada e IP, detección de enumeración distribuida y monitoreo agregado sin códigos. Un límite por IP debe contemplar aulas detrás de la misma red. No usar una constante de ejemplo como prueba de seguridad ni una memoria de proceso como garantía de límite compartido en varios procesos. Al limitar intentos, informar espera sin revelar existencia del aula ni invalidar el código.

Para conservar la revocación, la recomendación inicial es no reasignar un código histórico a otro destino, preservando la unicidad global actual. Esto impone un espacio finito de un millón de valores; vigilar capacidad y detener generación de forma controlada antes de agotarlo. La política de reutilización o ampliación futura requerirá decisión explícita; no reactivar códigos revocados ni cambiar longitud silenciosamente. No se diseña aquí una migración destructiva ni se declara seguridad validada.

## 8. Aceptación y comprobación

Datos de prueba sintéticos: aula Biología 4.º A, unidad Ecosistemas, temas cortos/largos y vacíos; archivo válido/rechazado/pendiente; actividad TP y cuestionario con tres tipos; correos bajo `example.test`. Evitar servicios reales durante pruebas automatizadas. Proveedor real sólo bajo autorización correspondiente.

| ID | Situación y acción | Resultado observable | Evidencia futura |
|---|---|---|---|
| UX-01 | Cambiar estados y filtros de Mis aulas | Selección inequívoca, contadores correctos, filtros conservados; textos completos a 320 px | Navegador escritorio/móvil + estado de colección |
| UX-02 | Usar selector sólo con teclado | Opciones, Escape, selección y retorno de foco correctos | Recorrido real de teclado |
| UX-03 | Abrir creación y desplazar una unidad larga | Encabezado/pie accesibles; ningún campo o texto recortado; scroll sin capas superpuestas | 1440/768/390/320 px, zoom 200 % |
| UX-04 | Subir documento, cambiarlo mientras llega una respuesta tardía | Estado sólo del archivo vigente; sin asociación tardía ni doble análisis | Test de concurrencia + navegador |
| UX-05 | Extracción READY nueva | Editor visible directamente; una acción guarda y avanza | Flujo sintético integrado |
| UX-06 | Sustituir plan existente y volver a editar | Advertencia explícita; confirmación corresponde al contenido final | Prueba de reemplazo y cancelación |
| UX-07 | Guardar/salir y retomar creación | Reaparecen datos confirmados; propuesta no guardada nunca se anuncia persistida | Lectura tras recarga |
| UX-08 | Publicación/guardado confirmado y refresco fallido | Recuperación por consulta sin repetir la mutación confirmada | Fallo inducido de lectura |
| UX-09 | Marcar tema, fallar y deshacer | Estado correcto tras error; éxito sólo confirmado; deshacer restaura PENDING o NEXT exacto | API/estado y navegador |
| UX-10 | Aula archivada o rol estudiante | Lectura permitida según contrato; mutaciones rechazadas también en servidor | Camino negativo API |
| UX-11 | Muro con cero/uno/dos botones y nombres largos | Cabeceras alineadas, acciones accesibles, respuestas legibles | Capturas e interacción responsive |
| UX-12 | Publicar/responder con error | Texto conservado y resultado confirmado sin duplicados | Fallos de red y relectura |
| UX-13 | Alternar Archivo/Escrito en Biblioteca | Sólo publica el modo activo; entradas no desaparecen al alternar | Interacción + payload |
| UX-14 | Archivo rechazado o TEXT pendiente | No se publica antes de aprobación; no se regeneran bytes iguales al consultar | Pipeline sintético y UI |
| UX-15 | Crear manual e IA con el mismo contexto | Mismo editor y revisión; datos preservados; generación no asigna | Dos recorridos integrados |
| UX-16 | IA termina tras editar o volver atrás | No reemplaza contenido ni cambia de paso inesperadamente | Respuesta tardía controlada |
| UX-17 | Repartir rúbrica de 3 criterios | 34/33/33, total 100, nombres/evidencias preservados; cambios posteriores explícitos | Regla ejecutable |
| UX-18 | Estudiante consulta vista previa | Sin claves/puntos privados ni inicio incidental de intento | Contrato de respuesta y navegador |
| UX-19 | Actividad bloqueada por participación | Conserva restricciones y plazos; rediseño no habilita edición prohibida | Permisos/estado preexistente |
| UX-20 | Pegar válidos, inválidos, duplicados y más de 50 correos | Validación por destinatario, sin truncar ni emitir nada antes de confirmar | Prueba de normalización + UI |
| UX-21 | Lote con éxito, fallo e incertidumbre | Resultado individual; reintentar no reenvía confirmados ni inciertos | Prueba de idempotencia/reconciliación |
| UX-22 | Cancelar lote parcialmente procesado | Éxitos conservados, pendientes detenidos; ningún envío prometido en segundo plano | Recibo por destinatario |
| UX-23 | Reenviar pendiente y aceptar invitación | Respeta espera 60 s y vencimiento 7 días; aceptación expresa y cuenta correspondiente | Integración de invitaciones |
| UX-24 | Código con cero inicial, espacios y legacy con guión | Conserva identidad; preview y confirmación correctos en ambos formatos | Normalización + ingreso |
| UX-25 | Avanzar reloj sin regenerar código | Mismo código sigue vigente; invitaciones sí conservan su vencimiento | Prueba temporal de dominio |
| UX-26 | Colisión/rotaciones concurrentes/error de reserva | Unicidad, revocación atómica, anterior conservado si falla; token viejo inválido | DB/concurrencia |
| UX-27 | Intentos masivos y varios usuarios en una IP | Protección específica comprobada, sin bloquear indebidamente una clase normal | Ensayo sintético y revisión de seguridad |
| UX-28 | Reduced-motion, teclado, zoom y red lenta | Sin movimiento innecesario, foco útil, estados anunciados y acciones alcanzables | Navegador y revisión de accesibilidad |

Las condiciones de aceptación se contrastan con el [recibo de integración](../verification/classrooms-ux-unification.json). Comprensión con docentes representativos y rendimiento con cargas extensas siguen pendientes.

## Fuentes y límites

- [Aulas e ingreso actuales](../engineering/classrooms/README.md), [especificación vigente](../foxmind-v1-functional-spec.md) y [arquitectura](../engineering/architecture.md).
- [Wizard actual](../../apps/web/src/application/academic-Wizard.tsx), [editor de propuesta](../../apps/web/src/features/curriculum/ui/ExtractionEditor.tsx), [extracción](../../apps/web/src/features/curriculum/model/extraction-client.ts).
- [Plan](../../apps/web/src/features/curriculum/ui/Plan.tsx), [Muro](../../apps/web/src/features/communication/ui/Wall.tsx), [Biblioteca](../../apps/web/src/features/materials/ui/Library.tsx).
- [Autoría](../../apps/web/src/features/activity-authoring/ui/ActivityAuthoring.tsx), [consulta de actividad](../../apps/web/src/application/academic-activity-preview.tsx), [generación](../engineering/ai/activity-generation.md).
- [Invitaciones](../../apps/api/src/modules/classrooms/infrastructure/invitations-operations.ts), [códigos](../../apps/api/src/modules/classrooms/infrastructure/classroom-codes.ts), [ingreso](../../apps/api/src/modules/classrooms/infrastructure/memberships-operations-1.ts).
- [Registro de diseño y comprobaciones](../work-log/2026-11-11-root-teacher-classroom-design.md). El informe aportado y las capturas históricas orientan la auditoría; no prueban tamaño de CSS descargado ni causa definitiva de una transparencia sin inspección runtime.
