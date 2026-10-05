# FoxMind — Especificación de Requisitos Funcionales: Rol Docente

**Documento consolidado y normalizado para el Prototipo FoxMind**  
**Versión:** 1.0 (Consolidación normativa base — 29 de agosto de 2026)  
**Alcance:** 63 Requisitos Funcionales del Rol Docente (RF-DOC) + Mapeo de Interacciones, Copiloto IA y DUA  
**Fuente:** Especificación funcional oficial y validación del prototipo front-end.

---

## 1. Introducción y Propósito

El presente documento consolida y especifica los requisitos funcionales correspondientes al **Rol Docente** dentro del ecosistema educativo **FoxMind**.

FoxMind dota al docente de nivel secundario de herramientas avanzadas para la gestión ágil de cursos, la planificación de clases asistida por inteligencia artificial (**Foxy IA**), el diseño de secuencias didácticas y actividades adaptadas según los principios del **Diseño Universal para el Aprendizaje (DUA)**, el seguimiento preventivo del riesgo académico y la comunicación pedagógica con los alumnos.

---

## 2. Matriz de Requisitos Funcionales Normalizados (63 Requisitos)

| Identificador | Requisito Funcional |
| :--- | :--- |
| **2.1. Dashboard** | |
| `RF-DOC-DASH-001` | El sistema deberá recibir al docente en el Dashboard mediante un mensaje de saludo y la visualización de la fecha actual. |
| `RF-DOC-DASH-002` | El sistema deberá proporcionar en el Dashboard un botón de acceso rápido para iniciar una planificación con inteligencia artificial. |
| `RF-DOC-DASH-003` | El sistema deberá ofrecer cinco accesos rápidos adicionales a la barra de navegación: Agenda, Mis Aulas, Reportes, Mensajes, Configuración. |
| `RF-DOC-DASH-004` | El sistema deberá mostrar un resumen operativo con los siguientes indicadores: Alumnos activos, Tareas por revisar, Alertas de riesgo, Consultas Foxy. |
| `RF-DOC-DASH-005` | El sistema deberá presentar un semáforo de riesgo que permita visualizar a los estudiantes identificados en situación de riesgo e incluir una acción para ver el listado completo. |
| `RF-DOC-DASH-006` | Desde el semáforo de riesgo, el sistema deberá permitir al docente contactar a cada estudiante y acceder a su perfil. |
| `RF-DOC-DASH-007` | El sistema deberá mostrar un widget con las clases del día, alimentado por los eventos correspondientes registrados en la sección Agenda. |
| `RF-DOC-DASH-008` | El sistema deberá mostrar un widget de acceso rápido al Copiloto IA con las opciones de crear una secuencia didáctica y adaptar un texto mediante DUA. |
| `RF-DOC-DASH-009` | El sistema deberá mostrar un widget de tareas por revisar con las actividades pendientes de corrección, una acción para acceder a Correcciones y una acción rápida para corregir una actividad específica. |
| **2.2. Agenda** | |
| `RF-DOC-AGEN-001` | El sistema deberá permitir al docente visualizar la agenda en las modalidades Día, Semana y Mes. |
| `RF-DOC-AGEN-002` | El sistema deberá permitir al docente crear un nuevo evento y registrar su información: Datos principales (título y tipo de evento), Programación (fecha y horario de inicio, fecha y horario de finalización y repetición), Asignación (aula o materia), Información complementaria (ubicación o enlace, color de identificación y notas o consignas pedagógicas opcionales). |
| `RF-DOC-AGEN-003` | El sistema deberá incluir un widget de Calendario Oficial Escolar que permita visualizar los eventos escolares oficiales. |
| `RF-DOC-AGEN-004` | El sistema deberá permitir al docente agregar a su agenda un evento seleccionado desde el Calendario Oficial Escolar. |
| `RF-DOC-AGEN-005` | El Calendario Oficial Escolar deberá permitir buscar eventos y filtrarlos por las categorías Todos, Académico, Feriados, Jornadas y Exámenes. |
| `RF-DOC-AGEN-006` | El sistema deberá permitir filtrar la agenda por aula y por categoría de evento: Aula identificada por nombre y división, Reunión/Otro, General/Institucional. |
| `RF-DOC-AGEN-007` | El sistema deberá proporcionar en la Agenda un botón de acceso rápido al asistente Foxy. |
| `RF-DOC-AGEN-008` | El asistente Foxy integrado en la Agenda deberá ofrecer sugerencias y responder consultas formuladas por el docente. |
| **2.3. Mis Aulas** | |
| *2.3.1. Gestión general y creación de aula* | |
| `RF-DOC-AULA-001` | El sistema deberá mostrar las aulas del docente mediante tarjetas organizadas. |
| `RF-DOC-AULA-002` | El sistema deberá permitir al docente iniciar la creación de una nueva aula. |
| `RF-DOC-AULA-003` | Durante la creación del aula, el sistema deberá permitir registrar la información académica y de identificación requerida: Nombre de la materia, Año escolar, División o comisión, Observaciones para el aula (opcional), Color de identificación, Plan de estudios. |
| `RF-DOC-AULA-004` | El sistema deberá utilizar la información cargada durante la creación del aula como contexto inicial para el procesamiento con inteligencia artificial. |
| `RF-DOC-AULA-005` | El sistema deberá ofrecer la acción Analizar Plan de Estudios con IA y, al ejecutarla, la inteligencia artificial deberá estructurar el plan en unidades, temas y subtemas. |
| `RF-DOC-AULA-006` | Antes de confirmar la creación del aula, el sistema deberá permitir al docente modificar las unidades y los temas propuestos por la inteligencia artificial. |
| `RF-DOC-AULA-007` | Al confirmar la estructura del plan de estudios, el sistema deberá crear el aula y persistir su información en la base de datos. |
| `RF-DOC-AULA-008` | Dentro de cada aula, el sistema deberá proporcionar acceso a las subsecciones Alumnos, Actividades, Currícula, Biblioteca, Rendimiento y Muro. |
| *2.3.2. Alumnos* | |
| `RF-DOC-AULA-ALU-001` | El sistema deberá permitir al docente invitar estudiantes mediante un código de invitación. |
| `RF-DOC-AULA-ALU-002` | El sistema deberá permitir al docente invitar estudiantes mediante la carga de sus direcciones de correo electrónico; las invitaciones realizadas por esta modalidad deberán presentarse a los estudiantes como un mensaje de invitación en la sección Mensajes. |
| `RF-DOC-AULA-ALU-003` | El sistema deberá mostrar el listado de estudiantes que ya integran el aula. |
| `RF-DOC-AULA-ALU-004` | Al seleccionar un estudiante del listado, el sistema deberá mostrar una descripción detallada de dicho estudiante. |
| *2.3.3. Actividades* | |
| `RF-DOC-AULA-ACT-001` | El sistema deberá permitir al docente visualizar las actividades del aula e iniciar la creación de una nueva actividad. |
| `RF-DOC-AULA-ACT-002` | El sistema deberá permitir crear una actividad a partir de un archivo PDF o Word que contenga consignas previamente preparadas por el docente. |
| `RF-DOC-AULA-ACT-003` | Cuando se cargue una actividad en PDF o Word, la inteligencia artificial deberá indexar el archivo y generar las adaptaciones DUA correspondientes. |
| `RF-DOC-AULA-ACT-004` | El sistema deberá ofrecer una modalidad Crear con IA que genere una propuesta de consignas contextualizadas, fechas, objetivos pedagógicos y rúbricas a partir de los temas del plan curricular. |
| `RF-DOC-AULA-ACT-005` | En la modalidad Crear con IA, el sistema deberá permitir al docente definir los parámetros de la actividad: Tema de la Currícula, Tipo de actividad, Fecha de inicio y fecha de entrega, Instrucciones adicionales para la inteligencia artificial. |
| `RF-DOC-AULA-ACT-006` | El sistema deberá permitir asociar material teórico a la actividad, ya sea seleccionándolo desde la Biblioteca o cargando un material nuevo; el material nuevo deberá incorporarse automáticamente a la Biblioteca del aula. |
| `RF-DOC-AULA-ACT-007` | Una vez generada la actividad, el sistema deberá permitir al docente revisarla y realizar las modificaciones que considere necesarias. |
| `RF-DOC-AULA-ACT-008` | El sistema deberá permitir al docente incorporar una rúbrica de evaluación y asignar un puntaje a cada criterio agregado. |
| `RF-DOC-AULA-ACT-009` | El flujo de creación deberá incluir una instancia de revisión de las adaptaciones DUA generadas para los estudiantes con perfiles DUA, con la posibilidad de que el docente modifique cada adaptación cuando resulte necesario. |
| `RF-DOC-AULA-ACT-010` | Al finalizar la revisión de la actividad, la rúbrica y las adaptaciones DUA, el sistema deberá permitir confirmar y asignar la actividad. |
| *2.3.4. Currícula* | |
| `RF-DOC-AULA-CUR-001` | El sistema deberá mostrar en la subsección Currícula el plan de estudios estructurado por la inteligencia artificial en unidades, temas y subtemas. |
| `RF-DOC-AULA-CUR-002` | El sistema deberá permitir al docente marcar los temas de la Currícula para llevar el seguimiento de su avance. |
| *2.3.5. Biblioteca* | |
| `RF-DOC-AULA-BIB-001` | El sistema deberá permitir cargar materiales en la Biblioteca del aula, incluyendo documentos, archivos PDF y presentaciones PPTX, entre otros formatos admitidos. |
| *2.3.6. Rendimiento* | |
| `RF-DOC-AULA-REN-001` | La subsección Rendimiento deberá mostrar los indicadores generales del aula: Promedio general, Asistencia regular, Entregas a tiempo, Cantidad de estudiantes con DUA. |
| `RF-DOC-AULA-REN-002` | La subsección Rendimiento deberá mostrar información analítica complementaria: Distribución de calificaciones del aula, Evolución del rendimiento del aula, Estudiantes en seguimiento prioritario, Alertas DUA. |
| *2.3.7. Muro* | |
| `RF-DOC-AULA-MUR-001` | En el Muro del aula, el sistema deberá permitir al docente enviar mensajes a los estudiantes, redactarlos con asistencia de Foxy, adjuntar archivos y fijar mensajes. |
| **2.4. Progreso de Clase** | |
| `RF-DOC-PROG-001` | El sistema deberá permitir al docente visualizar el progreso de clase por semana, mes y trimestre, además de consultar un historial pedagógico. |
| `RF-DOC-PROG-002` | El sistema deberá mostrar un resumen general del progreso y el dominio por aula. |
| `RF-DOC-PROG-003` | El sistema deberá mostrar información sobre hábitos y retención, así como hitos e insignias. |
| `RF-DOC-PROG-004` | El sistema deberá mostrar el nivel del docente, su experiencia acumulada (XP) y los logros obtenidos. |
| **2.5. Foxy IA (Copiloto)** | |
| `RF-DOC-FOXY-001` | El sistema deberá proporcionar al docente un chat para interactuar con Foxy y permitir la creación de un nuevo chat. |
| `RF-DOC-FOXY-002` | El espacio de Foxy IA deberá permitir acceder al Canvas y al historial de conversaciones. |
| `RF-DOC-FOXY-003` | El sistema deberá permitir seleccionar un aula como contexto de la conversación o continuar sin asociar un aula, y deberá mostrar los materiales utilizados como contexto. |
| `RF-DOC-FOXY-004` | El chat de Foxy deberá ofrecer comandos rápidos, permitir adjuntar archivos y admitir interacción mediante micrófono. |
| `RF-DOC-FOXY-005` | El sistema deberá incluir una Biblioteca de recursos con las presentaciones, mapas conceptuales, rúbricas e informes creados con Foxy. |
| `RF-DOC-FOXY-006` | La Biblioteca de recursos deberá permitir acceder, editar, proyectar y asignar los recursos disponibles. |
| `RF-DOC-FOXY-007` | El sistema deberá incluir una subsección Recomendaciones con sugerencias proactivas basadas en el calendario escolar, las entregas de los estudiantes y los perfiles DUA; las recomendaciones deberán poder filtrarse por Todas, Prioridad, DUA e Innovación. |
| `RF-DOC-FOXY-008` | La inteligencia artificial deberá permitir crear rúbricas, adaptaciones, actividades, evaluaciones, informes, material de estudio, resúmenes, mapas conceptuales y quizzes. |
| **2.6. Mensajes** | |
| `RF-DOC-MEN-001` | El sistema deberá permitir al docente mantener conversaciones privadas con los estudiantes desde la sección Mensajes. |
| `RF-DOC-MEN-002` | En las conversaciones privadas, el sistema deberá permitir enviar recordatorios, mensajes de ayuda, audios y archivos. |
| **2.7. Configuración** | |
| `RF-DOC-CONF-001` | La sección Configuración deberá permitir al docente cargar una foto de perfil y modificar su nombre, apellido y biografía; el correo electrónico deberá mostrarse sin posibilidad de modificación. |
| `RF-DOC-CONF-002` | El sistema deberá permitir configurar notificaciones relacionadas con alertas de estudiantes en riesgo, entregas de tareas y sugerencias del Copiloto IA. |
| `RF-DOC-CONF-003` | El sistema deberá permitir configurar las preferencias de inteligencia artificial: Definición de una instrucción de sistema (system prompt), Nivel de autonomía de Foxy, Gestión de rúbricas base, Adaptación DUA automática. |
| `RF-DOC-CONF-004` | El sistema deberá permitir configurar la apariencia y las opciones de accesibilidad DUA: Tema visual (claro, oscuro o automático), Densidad de información (cómoda o compacta), Tamaño de fuente (pequeño, normal o grande), Accesibilidad DUA (fuente OpenDyslexic, alto contraste y lectura fácil). |

---

## 3. Especificación Detallada por Módulos y Secciones

### 3.1. Dashboard Docente (`RF-DOC-DASH-001` a `009`)
1. **Bienvenida Contextual:** Encabezado con saludo horario personalizado y visualización de fecha actual en formato legible (`RF-DOC-DASH-001`).
2. **Acción Principal de Planificación IA:** Botón destacado para saltar inmediatamente a planificar una clase o secuencia con Foxy (`RF-DOC-DASH-002`).
3. **Barra de Accesos Rápidos:** 5 accesos directos: *Agenda*, *Mis Aulas*, *Reportes* (Progreso de clase), *Mensajes* y *Configuración* (`RF-DOC-DASH-003`).
4. **KPIs Operativos:** Indicadores numéricos en tiempo real de *Alumnos activos*, *Tareas por revisar*, *Alertas de riesgo* y *Consultas Foxy* (`RF-DOC-DASH-004`).
5. **Semáforo de Riesgo Académico:** Identificación visual de alumnos en niveles de riesgo (Crítico/Alerta/Seguimiento) con enlace a listado exhaustivo (`RF-DOC-DASH-005`) y botones directos para contactar al estudiante por mensajería o inspeccionar su perfil pedagógico (`RF-DOC-DASH-006`).
6. **Clases del Día:** Widget de cronograma alimentado automáticamente por los eventos registrados en la sección Agenda (`RF-DOC-DASH-007`).
7. **Acceso Rápido al Copiloto:** Módulo de invocación ágil para *Crear secuencia didáctica* y *Adaptar texto mediante DUA* (`RF-DOC-DASH-008`).
8. **Tareas por Revisar / Correcciones:** Listado de entregas pendientes de corrección con atajo directo para corregir o abrir el drawer de calificación formativa (`RF-DOC-DASH-009`).

---

### 3.2. Agenda Docente (`RF-DOC-AGEN-001` a `008`)
1. **Modalidades de Visualización:** Alternancia de cuadrícula entre vistas de *Día*, *Semana* y *Mes* con selector de navegación temporal (`RF-DOC-AGEN-001`).
2. **Creación y Edición de Eventos:** Modal para registro de título, tipo de evento (Clase, Examen, Reunión), fechas y horarios de inicio/fin, reglas de repetición semanal, asignación a aula/materia, ubicación o enlace virtual, código de color y notas pedagógicas (`RF-DOC-AGEN-002`).
3. **Calendario Oficial Escolar:** Panel lateral que lista los hitos oficiales del colegio (`RF-DOC-AGEN-003`) con buscador y filtros por *Todos*, *Académico*, *Feriados*, *Jornadas* y *Exámenes* (`RF-DOC-AGEN-005`), permitiendo importar cualquier evento oficial a la agenda personal con un solo clic (`RF-DOC-AGEN-004`).
4. **Filtrado Avanzado:** Filtros cruzados por aula específica (nombre y división), reuniones u otros, y eventos institucionales generales (`RF-DOC-AGEN-006`).
5. **Asistente Foxy en Agenda:** Botón flotante y drawer de Foxy que asiste en la reorganización horaria, sugiere pausas pedagógicas y responde dudas de cronograma (`RF-DOC-AGEN-007`, `RF-DOC-AGEN-008`).

---

### 3.3. Mis Aulas (`RF-DOC-AULA-001` a `008` y Subsecciones)
1. **Tarjetas de Aulas:** Visualización de todas las comisiones con indicadores de alumnos, promedios y progreso de unidad (`RF-DOC-AULA-001`).
2. **Creación de Aula Asistida por IA:** Flujo de alta con datos institucionales (materia, año escolar, división, observaciones, color) y carga de plan de estudios (`RF-DOC-AULA-002`, `RF-DOC-AULA-003`). El sistema contextualiza la IA (`RF-DOC-AULA-004`) y mediante la acción *Analizar Plan de Estudios con IA* estructura automáticamente el programa en unidades, temas y subtemas (`RF-DOC-AULA-005`), permitiendo al docente editarlos y afinarlos (`RF-DOC-AULA-006`) antes de guardar en la base de datos (`RF-DOC-AULA-007`).
3. **Estructura Interna de Aula (6 Subsecciones):** Cada aula contiene las pestañas *Alumnos*, *Actividades*, *Currícula*, *Biblioteca*, *Rendimiento* y *Muro* (`RF-DOC-AULA-008`).

#### Subsección Alumnos (`RF-DOC-AULA-ALU-001` a `004`)
- Invitación mediante código de acceso único (`RF-DOC-AULA-ALU-001`).
- Invitación directa por correo electrónico con generación automática de notificación en la bandeja de Mensajes del estudiante (`RF-DOC-AULA-ALU-002`).
- Listado de alumnos matriculados (`RF-DOC-AULA-ALU-003`) y ficha descriptiva detallada con perfil DUA y notas al seleccionar (`RF-DOC-AULA-ALU-004`).

#### Subsección Actividades (`RF-DOC-AULA-ACT-001` a `010`)
- Listado de actividades y modal de creación (`RF-DOC-AULA-ACT-001`).
- Carga de actividades desde archivos Word o PDF existentes (`RF-DOC-AULA-ACT-002`), donde la IA indexa el contenido y genera adaptaciones DUA inmediatas (`RF-DOC-AULA-ACT-003`).
- Modalidad *Crear con IA* basada en temas de la currícula escolar (`RF-DOC-AULA-ACT-004`, `RF-DOC-AULA-ACT-005`).
- Vinculación obligatoria o voluntaria de material teórico desde la Biblioteca o carga de nuevo material que se auto-guarda en la Biblioteca del curso (`RF-DOC-AULA-ACT-006`).
- Edición libre de consignas generadas (`RF-DOC-AULA-ACT-007`), creación de rúbrica con ponderación por criterios (`RF-DOC-AULA-ACT-008`), revisión y ajuste individual de las versiones DUA generadas para estudiantes con necesidades registradas (`RF-DOC-AULA-ACT-009`) y publicación oficial (`RF-DOC-AULA-ACT-010`).

#### Subsección Currícula (`RF-DOC-AULA-CUR-001` a `002`)
- Visualización jerárquica del plan de estudios (unidades, temas, subtemas) (`RF-DOC-AULA-CUR-001`).
- Control interactivo de avance para marcar los temas dictados (`RF-DOC-AULA-CUR-002`).

#### Subsección Biblioteca (`RF-DOC-AULA-BIB-001`)
- Repositorio digital con subida y previsualización de archivos PDF, Word, presentaciones PowerPoint (PPTX) y recursos didácticos (`RF-DOC-AULA-BIB-001`).

#### Subsección Rendimiento (`RF-DOC-AULA-REN-001` a `002`)
- Indicadores generales: promedio, asistencia regular, tasa de entregas a tiempo y cantidad de alumnos con DUA (`RF-DOC-AULA-REN-001`).
- Analítica avanzada: gráfico de distribución de calificaciones, evolución temporal, alumnos en seguimiento prioritario y panel de alertas DUA (`RF-DOC-AULA-REN-002`).

#### Subsección Muro (`RF-DOC-AULA-MUR-001`)
- Tablón de publicaciones para toda la comisión con asistente de redacción Foxy, adjuntos de archivos y opción para fijar anuncios importantes en la cabecera (`RF-DOC-AULA-MUR-001`).

---

### 3.4. Progreso de Clase (`RF-DOC-PROG-001` a `004`)
1. **Horizontes Temporales e Historial:** Visualización analítica filtrada por semana, mes y trimestre, con consulta de historial pedagógico y bitácora de intervenciones (`RF-DOC-PROG-001`).
2. **Resumen y Dominio por Aula:** Gráficos comparativos de dominio conceptual y rendimiento promedio entre aulas (`RF-DOC-PROG-002`).
3. **Hábitos, Retención e Hitos:** Estadísticas sobre hábitos de estudio de las clases, retención de conocimientos e hitos alcanzados (`RF-DOC-PROG-003`).
4. **Nivel Docente y Gamificación:** Puntos de experiencia (XP), nivel profesional del docente y catálogo de insignias/logros obtenidos en la plataforma (`RF-DOC-PROG-004`).

---

### 3.5. Foxy IA / Copiloto (`RF-DOC-FOXY-001` a `008`)
1. **Chat Interactivo:** Conversación fluida con Foxy y gestión de nuevos chats (`RF-DOC-FOXY-001`).
2. **Canvas e Historial:** Editor de trabajo visual (Canvas) e historial de conversaciones previas (`RF-DOC-FOXY-002`).
3. **Contexto Pedagógico:** Capacidad de asociar un aula como contexto de consulta o trabajar de forma libre con visualización de los materiales fuentes utilizados (`RF-DOC-FOXY-003`).
4. **Comandos Rápidos y Voz:** Menú de barra inclinada (`/`), adjuntos de documentos y dictado por micrófono (`RF-DOC-FOXY-004`).
5. **Biblioteca de Recursos Creados:** Repositorio central de presentaciones interactivas, mapas conceptuales, rúbricas analíticas e informes generados con Foxy (`RF-DOC-FOXY-005`) con herramientas para previsualizar, editar, proyectar a pantalla completa en el aula o asignar directamente como actividad (`RF-DOC-FOXY-006`).
6. **Recomendaciones Proactivas:** Sugerencias automáticas organizadas por *Todas*, *Prioridad*, *DUA* e *Innovación*, sincronizadas con el calendario escolar y los perfiles de los estudiantes (`RF-DOC-FOXY-007`).
7. **Generadores Especializados:** Creación automatizada de rúbricas, adaptaciones DUA, actividades, evaluaciones, informes pedagógicos, material de estudio, resúmenes, mapas conceptuales y quizzes (`RF-DOC-FOXY-008`).

---

### 3.6. Mensajes (`RF-DOC-MEN-001` a `002`)
1. **Canal de Comunicación Privada:** Mensajería individual y segura con los estudiantes matriculados (`RF-DOC-MEN-001`).
2. **Herramientas de Comunicación:** Envío de recordatorios formativos, mensajes de apoyo, notas de audio grabadas y archivos adjuntos (`RF-DOC-MEN-002`).

---

### 3.7. Configuración (`RF-DOC-CONF-001` a `004`)
1. **Perfil:** Carga de foto de perfil, edición de nombre, apellido y biografía profesional; correo electrónico institucional en modo solo lectura (`RF-DOC-CONF-001`).
2. **Notificaciones:** Gestión de avisos de estudiantes en riesgo, recepción de entregas y sugerencias del Copiloto IA (`RF-DOC-CONF-002`).
3. **Preferencias de IA:** Definición del System Prompt docente, selector de nivel de autonomía de Foxy, gestión de rúbricas base del colegio y toggle de adaptación DUA automática (`RF-DOC-CONF-003`).
4. **Apariencia y DUA:** Modo Claro / Oscuro / Automático, densidad cómoda/compacta, tamaño de fuente y conmutadores de accesibilidad DUA (OpenDyslexic, alto contraste y lectura fácil) (`RF-DOC-CONF-004`).

---

## 4. Aspectos Pendientes de Definición Funcional Relacionados

| Referencia | Punto Pendiente | Estado / Criterio Aplicado en Prototipo |
| :--- | :--- | :--- |
| `AP-01` | El acceso rápido *Reportes* del Dashboard docente convive con la sección principal denominada *Progreso de clase*; no se asumió que ambas representen exactamente el mismo alcance. | En el prototipo actual, el acceso *Reportes* vincula fluidamente con la vista analítica integral de *Progreso de clase*. |
| `AP-03` | El Dashboard docente menciona una acción para acceder a *Correcciones*, aunque no se especifica una sección funcional independiente con ese nombre. | En el prototipo se despliega el cajón y modal de corrección rápida (*TeacherGradingDrawer*) enfocado en las tareas pendientes del aula. |
| `AP-04` | La sección Foxy IA menciona el acceso a un *Canvas*, pero no describe sus herramientas, contenido ni operaciones internas. | En el prototipo se presenta como un visualizador y editor de documentos interactivos enriquecidos para proyectar y editar recursos generados por la IA. |
