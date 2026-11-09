# Carpetas de estudio privadas

El estudiante organiza su estudio en carpetas propias con plan, materiales y un Foxy orientado a aprender. Puede practicar dentro de FoxMind, recibir explicaciones y preparar un examen con repasos en su Agenda.

## Estado y alcance

Especificación aprobada del 2026-11-08. El usuario confirmó el alcance mediante «Voy con tus recomendaciones» y después aprobó expresamente pantallas, solución/modelo e implementación mediante «Si lo apruebo». Implementación y comprobaciones locales registradas en [tareas](../../odd/tasks/study-folders.md) y [recibo](../verification/study-folders.json), con límites de proveedor/QA explícitos. Amplía la frontera anterior que excluía tutores estudiantiles. No implica publicación Git o despliegue.

| Confirmado | Resultado |
|---|---|
| Exclusivo de estudiantes | Carpeta, chats, creaciones, respuestas y resultados privados por dueño |
| Creación como aulas | Nombre, año, banner, plan, unidades/temas editables y confirmación |
| Materiales | Cargas propias y vínculo opcional a una sola aula donde tenga acceso |
| Actualización automática | Reflejar materiales disponibles de Biblioteca; cambios/bajas y pérdida de acceso se respetan |
| Herramientas | Apuntes, esquemas, quizzes, ejercicios con devolución y simulacros respondibles |
| Adaptación | Evidencia de uso por carpeta para ajustar ayudas y próximos repasos |
| Examen | Fecha, temas, disponibilidad; cronograma editable y selección confirmada para Agenda |
| Recordatorios | Avisos dentro de FoxMind con anticipación configurable |

Fuera de alcance: compartir carpetas, acceso docente, modificar aulas o calificaciones oficiales, vincular varias aulas simultáneamente, búsqueda web como fuente, entrenamiento de un modelo, push del sistema/correo/SMS, proveedores nuevos y despliegue. Ningún resultado personal alimenta Progreso del aula.

## Propuesta de experiencia

Conservar Brújula, Lexend, colores y componentes vigentes. No introducir otra identidad visual. Las referencias son [Mis aulas](../design/current/teacher-classrooms.png) y [Foxy](../design/current/teacher-foxy-discovery-desktop.png), inspeccionadas como base, no como prueba de la funcionalidad futura.

### 1. Encontrar y crear una carpeta

Agregar **Carpetas de estudio** a la navegación estudiantil, junto a Mis aulas. Colección con título, **Crear carpeta**, búsqueda y filtros por año y vínculo. Tarjetas con los mismos banners predefinidos y proporciones que aulas; mostrar nombre, año y aula vinculada o «Materiales propios». No mostrar alumnos ni porcentajes de dominio inventados. Propuesta: Activas, Archivadas y Pendientes para creaciones guardadas.

Asistente de cuatro pasos:

1. **Tu carpeta:** nombre, año académico, banner predefinido y plan PDF/DOCX; vínculo a aula opcional. Aclarar que vincular agrega Biblioteca disponible, no importa notas, entregas, compañeros ni automáticamente el plan del aula.
2. **Organizar el plan:** elegir IA o manual. Subir un documento no dispara generación.
3. **Unidades y temas:** revisar y editar estructura; al menos una unidad con un tema.
4. **Revisar y crear:** resumen editable y **Confirmar y crear carpeta**. Guardar borrador no crea una carpeta activa.

Propuesta de validación: nombre/unidad/tema 1–120 puntos de código, año conforme al validador de ciclo existente, planes PDF/DOCX de hasta 20 MB. No exigir materia/división porque no forman parte del pedido estudiantil. Cambiar banner no requiere subir imágenes.

### 2. Estudiar dentro de la carpeta

Distribución propuesta de escritorio, siguiendo Foxy:

```text
Carpetas de estudio > Biología                         Solo para vos
Biología · 2026             [Materiales y Plan] [Nuevo chat] [Opciones]
┌───────────────────────────────────┬───────────────────────────────┐
│ Conversación                     │ Herramientas | Creaciones     │
│ Temas y fuentes utilizadas       │ Apuntes · Esquemas             │
│                                  │ Quizzes · Ejercicios           │
│ Mensajes, respuestas y citas      │ Simulacro · Preparar examen    │
│                                  ├───────────────────────────────┤
│ Escribile a Foxy…         Enviar  │ Conversaciones · Buscar       │
└───────────────────────────────────┴───────────────────────────────┘
```

La carpeta fija el contexto: no ofrecer selector de aulas docentes en el chat. Mostrar temas/fuentes realmente usados y sus avisos de disponibilidad. Herramientas/Creaciones y búsqueda de conversaciones quedan limitadas a esta carpeta. Creaciones permite abrir y editar apuntes/esquemas y volver a prácticas/resultados.

**Materiales y Plan** abre dos vistas: unidades/temas editables; materiales con procedencia «Propio» o «Aula vinculada». Cargar/editar/eliminar sólo recursos propios. Elegir/reemplazar/desvincular aula exige intención explícita y aviso del efecto; no altera chats o recursos del docente. Las altas disponibles se incorporan sin tener que seleccionarlas una por una. La selección de fragmentos relevantes para cada respuesta no promete enviar la biblioteca completa al proveedor.

En móvil, conservar navegación compacta por debajo de 1024 px. Chat ocupa el ancho; Herramientas, Creaciones, Conversaciones y Materiales/Plan tienen accesos rotulados que abren una vista o panel con retorno al chat y restauración del foco. Ningún editor requiere arrastre ni depende de hover.

### 3. Practicar y recibir ayuda

Elegir temas, tipo de práctica y cantidad/dificultad → generar → abrir práctica → responder con autoguardado → revisar → **Finalizar práctica** → devolución y nuevo intento opcional. La propuesta y cada intento conservan versión; cambiar preguntas crea otra versión y no reescribe resultados anteriores.

Quizzes y simulacros admiten selección simple/múltiple y desarrollo. Reutilizar reglas objetivas vigentes para selecciones; mostrar explicación por pregunta. Desarrollo recibe devolución IA orientativa sustentada en las fuentes autorizadas, claramente identificada. Las soluciones no aparecen antes de finalizar. Un fallo de IA conserva respuestas y permite reintentar la devolución sin duplicar intentos. Respuestas vacías requieren advertencia antes de confirmar.

No presentar práctica como entrega docente, nota oficial, diagnóstico o garantía de aprobación. La adaptación puede priorizar temas con errores o menos practicados; debe indicar evidencia suficiente/insuficiente en vez de inventar dominio o porcentajes.

### 4. Preparar un examen

Fecha del examen, temas, zona horaria, días disponibles y tiempo de estudio → propuesta de sesiones de duración visible → edición → elegir sesiones → **Agregar a Agenda** con revisión de fechas y anticipación del aviso. Propuesta inicial para anticipación: sin aviso, al comenzar, 15 minutos, 1 hora o 1 día antes; configurable por sesión. Para eventos de día completo se pide una hora de repaso, evitando avisos a una hora implícita.

La planificación avisa si el tiempo disponible no alcanza, hay superposición o la fecha ya pasó; no cambia la disponibilidad ni promete preparación suficiente. No crea ni mueve eventos sin confirmación. Editar el plan propone diferencias respecto de Agenda; las modificaciones independientes en Agenda no se sobrescriben automáticamente. Reintentar una confirmación no duplica sesiones ni avisos.

Avisos privados con enlace a carpeta/sesión. Si la app está cerrada, el aviso queda disponible al volver; no se promete notificación externa. Propuesta: si una sesión ya terminó cuando se procesa el aviso, no emitir un recordatorio tardío. Reprogramar/cancelar una sesión cancela el aviso obsoleto.

### Estados y usabilidad

Vacíos específicos para primera carpeta, sin material, sin conversaciones, sin prácticas y sin resultados. Carga y generación con estado visible; error conserva entradas y ofrece reintento. Identificar falta de acceso, material retirado, archivo en validación, cuota y conflicto de revisión. Conservar edición ante conflicto, sin reemplazar cambios silenciosamente.

Etiquetas asociadas, teclado completo, foco visible y devuelto al cerrar paneles, mensajes de estado accesibles, contraste verificable, controles táctiles de al menos 44 px y respeto de movimiento reducido. Verificar a 390, 834 y 1440 px, zoom y ausencia de desborde horizontal; no considerar una captura como prueba de persistencia o privacidad.

## Privacidad, fuentes y sincronización

| Situación | Regla propuesta |
|---|---|
| Acceso a una carpeta | Cuenta estudiantil verificada y propiedad; denegar a otros estudiantes y docentes en API, archivos y trabajos IA |
| Aula vinculada | Una relación opcional; requiere pertenencia vigente. Vincular no concede acceso nuevo al aula |
| Material nuevo/revisado | Consultar la versión corriente autorizada; identificar fuentes por ID y versión, no por título |
| Aula archivada | Material que siga siendo consultable puede usarse para estudio privado; no mutar el aula |
| Material eliminado/revocado | No abrirlo ni incluirlo en nuevas solicitudes, aunque aparezca en selección, caché o historial |
| Salida/remoción/desvinculación | Cesar sincronización y uso del material del aula; conservar carpeta, cargas y creaciones propias |
| Historial derivado | Conservar apuntes/prácticas previos con aviso de fuente no disponible. No reutilizar automáticamente contenido derivado revocado como atajo para nuevas respuestas |
| Cambio mientras la IA trabaja | Revalidar al admitir, despachar y completar; si se pierde autoridad antes de aplicar, no incorporar el resultado |
| Memoria adaptativa | Sólo carpeta actual: temas practicados, intentos, errores, resultados y preferencias de estudio. Sin mezcla entre carpetas/personas |

La sincronización propuesta usa referencias vivas a la Biblioteca autorizada, sin copiar automáticamente bytes a propiedad estudiantil. La lista se refresca al entrar/cambiar fuentes y antes de generar; «automática» significa sin importación manual, no que cada alta dispare una llamada IA. Conservar la versión exacta usada en cada resultado. Una nueva revisión no reescribe creaciones o intentos históricos. Datos de materias distintas no se fusionan por coincidir nombres.

Las instrucciones dentro de archivos y mensajes no pueden cambiar permisos o convertir texto en autoridad. La IA usa conocimiento lingüístico para explicar, pero las afirmaciones académicas deben apoyarse en fuentes de la carpeta; cuando no alcancen, informa qué falta. Revisar formato y legibilidad antes de admitir como contexto un archivo aprobado: escaneo limpio no implica extracción textual disponible.

Propuesta de conservación: archivar bloquea nuevas mutaciones y avisos pendientes, conserva consulta y permite reactivar. Eliminar una carpeta exige confirmación, revoca lectura/generación y cancela avisos; no elimina eventos de Agenda ya confirmados sin una elección explícita adicional. Baja lógica inicial, sin prometer purga física ni plazo de retención no definido. Eliminar materiales propios impide uso nuevo; documentos históricos y bytes siguen la política de custodia aplicable. El modelo debe distinguir el material propio de la referencia al aula para que una baja no elimine bytes ajenos.

## Solución y modelo propuestos

Mantener el monolito modular y el stack vigente. Las decisiones siguientes fueron aprobadas antes de escribir migraciones o código.

| Alternativa | Ventajas | Costos y límites |
|---|---|---|
| Extender Classroom y Foxy docente para ambos roles | Menor cantidad inicial de entidades | Mezcla inscripción, publicación y notas oficiales con estudio privado; amplía mucho la superficie de permisos |
| Módulo de estudio privado con servicios compartidos — recomendada | Propiedad clara; comparte archivos, colas, adaptadores y componentes sin habilitar operaciones docentes | Nuevas entidades/contratos y adaptación explícita de capacidades comunes; migraciones aditivas |

Crear una capacidad de carpetas de estudio con dueño estudiante; extraer/reutilizar piezas neutrales de Foxy sin quitar sus controles docentes. No duplicar todo el motor ni llamar directamente servicios administrativos desde el chat del estudiante. Reutilizar el proveedor local autorizado y admisión IA; pruebas automáticas sintéticas por defecto. No requiere nuevo proveedor ni servicio externo.

Modelo conceptual aprobado, materializado en el [modelo físico](../engineering/data-model.md):

| Grupo | Datos y relaciones |
|---|---|
| Carpeta y borrador | Dueño, nombre/año/banner, estado, revisión, aula opcional, unidades/temas y documento del plan |
| Fuentes | Material propio con custodia privada; referencia viva separada a material/versión del aula y procedencia |
| Conversación y creación | Dueño/carpeta, turnos, recurso editable, fuentes/versiones usadas, dependencias de resultados y revisión |
| Práctica e intento | Preguntas/versiones, soluciones privadas del servidor, respuestas, autoguardado, finalización y devolución |
| Adaptación | Evidencia por tema/carpeta y preferencias; trazabilidad al intento sin inferir diagnósticos |
| Examen y sesiones | Temas, fecha/zona, disponibilidad, revisión de plan y vínculo estable de sesión con evento de Agenda |
| Aviso personal | Dueño, sesión/evento, fecha programada, anticipación, estado y clave de deduplicación |

Los avisos actuales requieren aula: agregar un origen personal con permisos propios y unificar sólo su presentación en Notificaciones. No fabricar aulas para satisfacer la relación existente. Las sesiones de repaso necesitan una relación estable con Agenda y operaciones idempotentes; no guardar esa identidad sólo en un texto de descripción. El scheduler durable revalida cancelación, revisión y propiedad antes de emitir.

Contratos previstos bajo una ruta estudiantil propia: colección/borradores, detalle/plan, vínculo y fuentes, conversaciones/creaciones, prácticas/intentos/devolución, exámenes/sesiones/confirmación de Agenda y avisos. Cada mutación con revisión cuando corresponda, límites explícitos y deduplicación de generación/finalización/Agenda. IDs enviados por el cliente no sustituyen autorización. No exponer soluciones en la proyección de un intento activo. Nombres finales de tablas, endpoints, formatos y códigos se fijan al crear las pruebas de contrato, respetando la convención existente.

Controles de implementación: espacio configurable, consumo IA compartido, legibilidad explícita de formatos, exclusión de fuentes/historia revocadas, revisiones y deduplicación, avisos reautorizados y migraciones aditivas. El estado tiene presupuesto operacional de 3.000.000 bytes y la colección usa resúmenes. Sin cuota productiva numérica ni infraestructura productiva aprobadas. [Guía y límites actuales](../engineering/study/README.md).

## Criterios de aceptación

| ID | Condición y acción | Resultado observable / evidencia prevista |
|---|---|---|
| CF01 | Estudiante crea, guarda borrador, retoma y confirma | Persiste datos/estructura; una carpeta; E2E y consulta tras recarga |
| CF02 | Docente u otro estudiante fuerza IDs de carpeta/archivo/intento | API y descarga deniegan, sin exposición; pruebas de permisos |
| CF03 | Estudiante carga archivo propio | Sólo admite bytes aprobados, cuota y formatos autorizados; integración de archivos |
| CF04 | Vincula aula y el docente agrega/revisa/elimina material | Catálogo refleja versión disponible sin importación; integración con roles separados |
| CF05 | Sale del aula o cambia/desvincula durante generación | No descarga ni usa nuevas fuentes revocadas; trabajo no aplica resultado inválido; prueba de carrera |
| CF06 | Abre historia con fuente revocada | Mantiene creación propia y aviso, no reutiliza contexto revocado; prueba de procedencia/historial |
| CF07 | Genera apunte/esquema con fuentes insuficientes | Informa faltantes, no presenta contenido inventado como creación completa; contrato IA |
| CF08 | Responde quiz y simulacro, recarga y finaliza dos veces | Conserva respuestas; solución oculta antes; corrección objetiva exacta; un intento finalizado |
| CF09 | Envía desarrollo y falla devolución IA | Conserva respuestas; identifica devolución orientativa; reintento sin duplicación |
| CF10 | Acumula errores en un tema | Próxima ayuda usa evidencia de esa carpeta; no mezcla carpetas/usuarios ni notas oficiales |
| CF11 | Pide plan con disponibilidad insuficiente/fecha pasada | Explica limitación y permite corregir; no crea eventos sin confirmación |
| CF12 | Confirma sesiones y repite solicitud | Un evento por sesión; zona/plazos válidos; preserva eventos independientes y sus ediciones |
| CF13 | Configura aviso, reprograma/cancela, app cerrada | Un aviso privado vigente, sin aviso obsoleto; disponible al volver; reloj controlado y scheduler |
| CF14 | Archiva o elimina carpeta | Bloquea mutaciones, cancela avisos y revalida enlaces; Agenda sólo cambia con confirmación explícita |
| CF15 | Usa móvil/teclado, falla red y hay edición concurrente | Sin desborde; foco/etiquetas; recuperación sin pérdida ni sobrescritura; QA real y capturas |
| CF16 | Usa Foxy docente, Biblioteca, Agenda y actividades existentes | Regresiones focales pasan; no se habilitan permisos docentes al estudiante |

## Secuencia propuesta y aprobación

La ejecución se registra en un [único TTP](../../odd/tasks/study-folders.md), con resultados y evidencia de carpetas/privacidad, materiales/revocación, Foxy/práctica/adaptación, examen/Agenda/avisos y QA/documentación. Este documento define el comportamiento aprobado; el TTP y el recibo acreditan qué se ejecutó.

Aprobación conjunta de UX, solución/modelo e implementación recibida el 2026-11-08. Actualizar especificación, matriz de roles, guías, diseño, mapa y roadmap junto al comportamiento verificado. Publicación Git y despliegue no están incluidos.

Registro y límites: [trabajo de definición](../work-log/2026-11-08-root-study-folders-design.md). Bases: [arquitectura](../engineering/architecture.md), [modelo actual](../engineering/data-model.md), [Foxy](../engineering/ai/foxy.md), [Biblioteca](../engineering/teaching/library.md), [Agenda](../engineering/agenda/README.md), [diseño actual](../design/README.md).
