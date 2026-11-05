# ENCARGO PARA AGENTE DE DESARROLLO — Integración de FoxMind Brújula en el MVP real

## Misión

Implementá **la experiencia visual, de interacción y navegación de la maqueta aprobada FoxMind Brújula** dentro del repositorio real de FoxMind, conectado a su backend y sus datos persistentes. El objetivo **no es publicar la demo**, sino sustituir/mejorar las vistas y flujos reales con un frontend mantenible y coherente con el diseño aprobado. Realizá los ajustes mínimos y necesarios de API, contratos, consultas, validaciones, persistencia y permisos para que el resultado funcione de extremo a extremo.

Este trabajo se ejecuta **sobre el código existente**, no desde cero. Conservá el stack real del repositorio, su arquitectura, seguridad, autenticación, reglas de negocio y datos. No crees otra aplicación paralela. No reemplacés el backend ni agregues librerías importantes si no existe una justificación clara. No hagas un cambio masivo sin pruebas ni un rewrite innecesario.

### Archivos adjuntos (material de referencia)

- `FoxMind-Brujula.html`: **fuente de verdad visual/UX aprobada**, navegable y autocontenida. Revisá **las dos experiencias** (docente y alumno) y sus modales, menú lateral, desplegables, actividades, agenda, notificaciones y chat de Foxy. Es una **simulación funcional**, no código de producción.
- `assets/foxy-oficial/`: imágenes originales del personaje y del logo de Foxy. **No redibujes su identidad** ni sustituyas el personaje por un zorro genérico.
- `assets/extraidos-maqueta/`: imágenes concretas (banners, portadas, variantes y fondos) extraídas del HTML, deduplicadas; usalas para reproducir las pantallas sin volver a generar material.
- `assets/originales-generados/`: originales PNG de las composiciones antes de su adaptación para web.
- `assets/iconos-svg/`: íconos SVG de referencia empleados en la demo (solo los que convenga mantener). Conservá su estilo y alineación.
- `estilos-referencia/`: CSS separado por bloques para facilitar la migración; los archivos son **referencia**, no estilos que deban inyectarse globalmente sin revisar.
- `REFERENCIAS-Y-MAPA.md` y `CRITERIOS-DE-ACEPTACION.md`: guía de transferencia y pruebas.

**Regla de precedencia:** (1) autorizaciones, privacidad, integridad y contratos de negocio verificados en el repositorio; (2) descripción funcional **vigente** que entrega el usuario; (3) maqueta Brújula para aspecto visual, navegación, textos, flujo y jerarquía de información; (4) documentos históricos. Ante discrepancias, no supongas: investigá la implementación y exponé claramente la diferencia. Los datos ficticios de la maqueta **no son datos reales** que deban seedearse en producción.

## Forma de trabajo: auditar, planificar, implementar, probar

### Fase 0 — Inventario y resguardo

1. Reconocé la estructura del monorepo y consultá README, scripts, rutas, componentes, API, contratos, tests y migraciones. Identificá las versiones reales de frontend, backend y BD; no asumas que coinciden con documentos anteriores.
2. Comprobá rama actual y estado de Git; no sobrescribas trabajo ajeno. Abrí una rama específica si el flujo del repositorio lo permite, sin publicar ni fusionar sin instrucciones del proyecto.
3. Enumerá funcionalidades existentes, backend operativo, endpoints útiles, puntos incompletos y pantallas a intervenir. Verificá a qué tipo de dato corresponde cada tarjeta del dashboard; diferenciá métricas auténticas de los números inventados en la demo.
4. Prepará una matriz: `pantalla/acción -> componente actual -> caso de uso -> endpoint/servicio -> estado -> brecha -> solución`. Incluí docente y alumno.
5. Identificá activos y contratos que no deben romperse: sesión, permisos, roles, archivos, contenido académico y registros existentes.

**No te detengas después de la auditoría: usala para ejecutar la migración por partes.** Si encontrás una incompatibilidad grave o una decisión de producto imposible de inferir, anotala con opciones concretas y seguí con las secciones no bloqueadas.

### Fase 1 — Sistema visual y navegación de Brújula

Reproducí fielmente la variante aprobada y adaptala a componentes React/TypeScript reutilizables, o al framework real si difiere. Conservá:

- **Un único navbar lateral izquierdo** en escritorio (sin navbar superior duplicado). Integra logo, búsqueda, secciones por rol, notificaciones con contador, perfil y configuración; en móvil debe transformarse en menú accesible que deje espacio al contenido.
- Tipografía, paleta inspirada en el naranja de Foxy, bordes, separaciones, sombras, estados, tamaños, jerarquía, ilustraciones de banners y portadas, íconos y estilo de tarjetas de la maqueta. Usá variables de diseño centralizadas y tokens semánticos, evitando estilos duplicados o hardcodeados por pantalla.
- **Inicio docente y alumno distintos**, centrados en la próxima acción: por atender/entregas/consultas/agenda/aulas para docente; próximas entregas/borradores/devoluciones/agenda/aulas para estudiante. Indicadores de progreso académico separados en cumplimiento, rendimiento y avance curricular.
- Selecciones/desplegables pulidos: popover consistente, opción seleccionada destacada, navegación por teclado, foco visible, Escape, tamaños y capas de superposición correctos. Usá controles nativos accesibles cuando corresponda.
- Agenda: selector de color con muestra, nombre y previsualización del evento **antes de guardarlo**; la tarjeta de evento en calendario debe usar el color elegido de manera reconocible, sin depender exclusivamente del color.
- Estados cargando, sin datos, sin resultados de búsqueda, error y sin acceso diferenciados; skeletons discretos, feedback claro, sin botones que parezcan funcionar cuando todavía no lo hacen.
- Experiencia responsive con especial revisión de anchos 390, 768, 1280 y 1440 px, sin recortes, scrolls horizontales o superposiciones de diálogos.

No uses el sistema de rutas improvisado ni el localStorage simulado de `FoxMind-Brujula.html` para persistir datos reales. Reconstruí componentes apropiados dentro del router, capa de servicios y estado que ya usa el proyecto. El HTML demo es una **especificación visual comprobable**; no es arquitectura definitiva.

### Fase 2 — Funcionalidades reales de ambos roles

**Roles:** existen cuenta docente y cuenta estudiante, exclusivos. No agregues un rol administrador institucional. No compartas administración del aula entre docentes, salvo que el código y el alcance actual lo autoricen. Separá vistas, capacidades y permisos según el usuario autenticado; **no** confíes en un selector de rol de la demo para autenticar o autorizar.

#### Inicio docente

- Entregas que requieren revisión, por estudiante e intento, incluyendo aula, actividad, fecha y vínculo directo a la corrección; **sin duplicar el registro de la entrega**.
- Consultas de alumnos en el Muro que requieren respuesta, próximos eventos personales y resumen de aulas y del avance de planes.
- Acciones rápidas útiles: crear actividad, cargar material, ir a Foxy AI, abrir agenda, publicar aviso, revisar entregas. Si una acción depende de un aula, mostrar/seleccionar el aula y conservar su contexto.
- Notificaciones reales, leídas/no leídas, enlaces a contenido autorizado, contadores consistentes.

#### Inicio alumno

- Próxima actividad relevante y vencimientos reales, con prórrogas individuales cuando apliquen; borradores recuperables; entregas pendientes, resultados/devoluciones **publicados** y accesos a las aulas.
- Diferenciar con etiquetas y acciones correctas: `Empezar`, `Continuar borrador`, `Ver entrega`, `Leer devolución`.
- Agenda personal separada de vencimientos académicos que provienen de las actividades. No confundir event personal con publicación de actividad.
- Notificaciones reales vinculadas a nuevas actividades, cambios de fecha, notas publicadas/corregidas, intentos reabiertos, invitaciones y respuestas relevantes.

#### Mis aulas y aula

Implementá/ajustá acceso al catálogo activo/archivado, búsqueda, filtros, tarjetas/lista y alta/invitaciones por rol sin modificar permisos. Dentro del aula: **Plan**, **Muro**, **Biblioteca**, **Actividades**, **Progreso/Mi progreso**, **Alumnos/Compañeros**; **Historial** y **Configuración del aula** solo docente. Conservá la distinción entre avance de temas, entregas y notas; historial de bajas fuera de indicadores actuales.

#### Crear actividad

Botón `Crear actividad` -> elección en modal `Crear manualmente` / `Crear con IA` -> formulario -> **revisión** -> `Asignar al aula` o `Guardar borrador`.

- Manual: unidad y tema(s), tipo trabajo práctico/cuestionario/evaluación, título, objetivos, consignas o preguntas (desarrollo/selección simple/múltiple), comentarios, materiales vinculados de Biblioteca, fechas, recepción tardía, opciones de intentos y **rúbrica de evaluación editable y validada**.
- IA: selecciona contexto del aula, tema, tipo y objetivo/observaciones; `Generar consignas con IA` crea propuesta editable. El docente puede modificar consignas, respuestas correctas, fecha y rúbrica; **nunca se asigna automáticamente**.
- Validar coherencia de rúbrica (criterios y ponderaciones si usa pesos), tipo de actividad, fechas y puntajes. Distinguir autoevaluación de preguntas cerradas, sugerencia IA y confirmación de nota. El docente siempre publica la calificación y devolución explícitamente.
- Alumnos: borrador de respuesta real, envío confirmado, adjuntos autorizados, historial de intentos, permisos de reentrega/prórroga y resultados publicados únicamente para su dueño.

#### Corrección y progreso

- Abrir intento individual con consigna, archivo/respuestas, criterios de rúbrica y evidencias; guardar revisión privada, proponer corrección IA cuando exista y publicar por acto docente explícito.
- El resumen del alumno se actualiza con entrega y, luego, con nota/devolución publicada. Docentes ven solo sus aulas y estudiantes autorizados; alumnos solo su información.
- No mezclar métricas de avance del plan, promedio de calificaciones y estado de entregas en un único porcentaje.

#### Foxy AI docente

- Vista central **tipo chat**, con conversaciones persistentes, selector de contexto general/aula y listado de fuentes autorizadas usadas.
- Herramientas a un lado (o panel accesible en móvil): material de estudio, resumen, repaso, esquemas, imágenes si la capacidad existe, ideas de actividad, planificación, rúbricas y consignas.
- Recurso generado: vista previa, edición/revisión, exportación en formatos realmente soportados y, para materiales, publicación confirmada en Biblioteca con aula/unidad/tema. Para actividades, entrada al asistente de creación y confirmación, no publicación directa como material de Biblioteca.
- Si un formato o servicio todavía no existe, no simules una descarga ni respondas con un PDF de mentira: dejá un estado coherente y registrá la brecha. Reutilizá los adaptadores de IA reales, sus cupos, contratos y validaciones; nunca coloques tokens de proveedor en el frontend.

#### Agenda y cuenta

Mantener mes/semana/día, eventos de tipo clase/actividad/evaluación, todo el día, recurrencia y edición de ocurrencia/serie; selección visual de color; privacidad personal. El alumno y docente pueden consultar perfil, cambiar datos editables y contraseña conforme a los permisos y contratos existentes. No modifiques el correo ni el rol desde perfil.

### Fase 3 — Integración y ajustes mínimos de backend

1. **Reutilizá primero** endpoints, handlers, repositorios, servicios y contratos que ya funcionen. Documentá brechas verificadas antes de crear endpoints nuevos.
2. Agregá endpoints/DTOs/casos de uso solo cuando el frontend requiera acciones o datos que el backend no ofrece (p.ej. cola de entregas por intento, contadores de dashboard, recursos de Foxy, estado de lectura). Priorizá proyecciones o consultas eficientes sobre relaciones existentes. Evitá tablas duplicadas de información derivable.
3. Toda autorización debe verificarse en el **servidor** por sesión, rol, pertenencia a aula, titularidad de conversación/archivo/entrega y estado publicado. Nunca aceptes `teacherId` o `studentId` arbitrario del navegador como permiso.
4. Mantener la semántica de estados: borrador, publicado, entregado, corregido sin publicar, devolución publicada, archivado, baja histórica. Sin saltos implícitos.
5. Ajustá persistencia solo si hace falta: migraciones versionadas, retrocompatibilidad y preservación de registros existentes. No borres columnas ni datos sin aprobación explícita.
6. Mantené fechas, zonas horarias, recurrencia, vencimientos y extensiones individuales consistentes con el proyecto; probá las condiciones límite.
7. Usá almacenamiento autorizado para archivos y comprobá tipo/tamaño; no expongas URLs de almacenamiento privado por acceso directo sin permiso.
8. Contratos en la capa compartida/OpenAPI o equivalente; validación de requests y responses, tipos correctos, errores explícitos y estados de carga que permitan recuperación.
9. Si falta IA, trabajar con el adaptador determinista existente **solo para tests**; no presentar resultados falsos en el ambiente real. Respetar revisión humana.
10. Optimizá las consultas de dashboards para evitar N+1, filtrado en cliente de datos ajenos y recargas completas innecesarias.

### Fase 4 — Calidad, seguridad y pruebas

Probá navegando con **dos cuentas de prueba autorizadas** y datos desechables: docente y estudiante. Nunca uses cuentas reales o datos de alumnos sin autorización. Ejecutá tests preexistentes y agregá lo necesario:

- Unitarios: tokens, transformaciones, validaciones de formularios, rúbricas, estado de evento, permisos de UI, estados de acciones.
- Contratos/integración: autenticación, cursos, actividades, intentos, correcciones no publicadas/publicadas, notificaciones, agenda/colores, consultas de dashboard y recursos Foxy.
- E2E por rol: los recorridos de `CRITERIOS-DE-ACEPTACION.md`, incluido el vínculo de una entrega desde la notificación y un cambio de rol real mediante sesiones separadas.
- Seguridad: un alumno no puede leer/cambiar notas, devoluciones o archivos ajenos; un docente no puede consultar aulas ajenas; la IA solo recibe contextos autorizados.
- Accesibilidad: teclado, foco, labels, contraste, `aria-live` de mensajes, menús, selects, modales, lectores de pantalla y zoom 200%. Si el proyecto tiene axe/Playwright, usalos.
- Responsive y regresión visual en las cuatro anchuras clave. Compará con la referencia real, no con una interpretación genérica.
- Verificá estados vacíos y errores de red; nunca ocultes fallas del backend creando resultados ficticios.

### Entregables y criterio de cierre

Quiero código implementado y probado, no solo una lista de recomendaciones. Al cerrar presentá:

1. Resumen de modificaciones y pantallas implementadas por rol.
2. Matriz inicial/final de frontend -> servicio -> endpoint y brechas resueltas.
3. Lista de migraciones/contratos API agregados con justificación.
4. Lista de funcionalidades que no pudiste completar y por qué; **no** las marques como terminadas si están simuladas.
5. Comandos y resultados **reales** de checks/tests/build y capturas representativas de escritorio y móvil (sin datos sensibles).
6. Instrucciones para probar localmente y riesgos/retrocompatibilidad.
7. Estado Git, commits y ruta de la rama de trabajo, si se utilizó. No publiques ni despliegues en producción sin permiso explícito.

## Límites estrictos

- No reescribir todo desde cero ni reemplazar silenciosamente API y BD.
- No copiar `localStorage` de la demo como sistema de datos real.
- No crear admin institucional, cambiar el rol de una cuenta ni permitir más de un docente administrador si no existe en el producto.
- No mezclar Muro (público del aula), mensajes privados, entregas y chat de Foxy.
- No publicar recursos, actividades ni notas sin confirmación docente.
- No romper datos, permisos ni sesiones existentes; migraciones reversibles cuando sea posible.
- No modificar una función real para adaptarla a un dato de ejemplo de la maqueta: adaptá la vista al contrato/semántica reales.
- No enviar datos personales a proveedores externos fuera de los flujos autorizados.
- No usar colores, tipografías o ilustraciones de una plantilla genérica que sustituyan la identidad aprobada de Brújula.
- No afirmar cumplimiento técnico ni éxito sin pruebas ejecutadas.

**Criterio de éxito:** al iniciar sesión como docente o estudiante en FoxMind real, ambas experiencias deben verse y sentirse como Brújula, y cada acción debe modificar o consultar los registros reales que le corresponden, con sus restricciones de visibilidad y sus estados de confirmación, sin depender de la simulación del HTML.
