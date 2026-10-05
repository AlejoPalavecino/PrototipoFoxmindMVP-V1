# FoxMind — Especificación de Requisitos Funcionales: Rol Alumno

**Documento consolidado y normalizado para el Prototipo FoxMind**  
**Versión:** 1.0 (Consolidación normativa base — 29 de agosto de 2026)  
**Alcance:** 47 Requisitos Funcionales del Rol Alumno (RF-ALU) + Mapeo de Interacciones e Inclusión DUA  
**Fuente:** Especificación funcional oficial y validación del prototipo front-end.

---

## 1. Introducción y Propósito

El presente documento especifica de manera formal y detallada las capacidades, flujos de interacción y comportamientos funcionales del **Rol Alumno** dentro de la plataforma educativa **FoxMind**. 

FoxMind proporciona al estudiante de nivel secundario un entorno de aprendizaje adaptativo, interactivo e inclusivo fundamentado en los principios del **Diseño Universal para el Aprendizaje (DUA)** y la **metodología socrática**. Acompañado por el tutor virtual **Foxy**, el alumno autogestiona su estudio autónomo, interactúa con sus aulas escolares y realiza un seguimiento transparente de su progreso formativo.

---

## 2. Matriz de Requisitos Funcionales Normalizados (47 Requisitos)

| Identificador | Requisito Funcional |
| :--- | :--- |
| **3.1. Mi Dashboard** | |
| `RF-ALU-DASH-001` | El sistema deberá recibir al estudiante en Mi Dashboard mediante un mensaje de bienvenida. |
| `RF-ALU-DASH-002` | El sistema deberá mostrar una sugerencia de Foxy que permita iniciar un repaso de manera rápida. |
| `RF-ALU-DASH-003` | El sistema deberá ofrecer cinco accesos rápidos adicionales a la barra de navegación: Carpetas de estudio, Mis Aulas, Mi Progreso, Desafío, Mensajes. |
| `RF-ALU-DASH-004` | El sistema deberá mostrar un resumen semanal que incluya la experiencia acumulada por el estudiante. |
| `RF-ALU-DASH-005` | El sistema deberá mostrar tres widgets de seguimiento diario: Actividades de hoy, Tiempo con Foxy, Precisión global. |
| `RF-ALU-DASH-006` | El sistema deberá mostrar las materias o aulas en las que el estudiante está inscripto y un widget de Agenda con las próximas actividades que debe resolver. |
| `RF-ALU-DASH-007` | El sistema deberá mostrar la racha de días de uso de FoxMind y los logros recientes obtenidos por el estudiante. |
| **3.2. Carpetas de Estudio** | |
| `RF-ALU-CARP-001` | El sistema deberá mostrar las carpetas de estudio ya creadas mediante tarjetas. |
| `RF-ALU-CARP-002` | El sistema deberá permitir buscar carpetas por material, tema o examen. |
| `RF-ALU-CARP-003` | El sistema deberá permitir filtrar las carpetas por Todas, Aulas vinculadas y Estudio personal. |
| `RF-ALU-CARP-004` | El sistema deberá permitir crear una nueva carpeta de estudio y registrar su información principal: Nombre de la carpeta, Vinculación con un aula virtual o condición Sin vincular para estudio personal, Objetivo o enfoque de la carpeta, Color distintivo. |
| `RF-ALU-CARP-005` | Durante la creación, el sistema deberá permitir cargar de forma opcional un programa o apuntes guía, además de registrar notas de estudio y observaciones del parcial. |
| `RF-ALU-CARP-006` | El sistema deberá ofrecer la acción Analizar con la guía y, al ejecutarla, la inteligencia artificial deberá estructurar un plan de estudio en unidades, temas y subtemas. |
| `RF-ALU-CARP-007` | Antes de crear la carpeta, el sistema deberá permitir al estudiante revisar y corregir la estructura extraída por la inteligencia artificial. |
| `RF-ALU-CARP-008` | Al confirmar la estructura revisada, el sistema deberá crear la carpeta de estudio. |
| `RF-ALU-CARP-009` | Dentro de cada carpeta de estudio, el sistema deberá proporcionar un chat para que el estudiante se comunique con Foxy. |
| `RF-ALU-CARP-010` | El espacio de estudio deberá ofrecer herramientas de flashcards, quiz rápido, resumen, mapa conceptual y plan de estudio, y permitir configurar las opciones disponibles para cada herramienta. |
| `RF-ALU-CARP-011` | El sistema deberá permitir seleccionar el modo de tutor Socrático, Fácil o Examen. |
| `RF-ALU-CARP-012` | El sistema deberá permitir al estudiante tomar apuntes mientras conversa con Foxy y mostrar u ocultar el panel de apuntes. |
| `RF-ALU-CARP-013` | El espacio de la carpeta deberá permitir alternar entre Tutor IA, Biblioteca, Planes y Recordatorios. |
| `RF-ALU-CARP-014` | El sistema deberá permitir visualizar el contexto y el historial de la carpeta, así como iniciar la creación de una nueva herramienta de estudio. |
| `RF-ALU-CARP-015` | El sistema deberá permitir crear un nuevo chat, consultar el historial de chats y continuar conversaciones anteriores. |
| **3.3. Mis Aulas** | |
| `RF-ALU-AULA-001` | El sistema deberá mostrar las aulas a las que el estudiante se encuentra unido. |
| `RF-ALU-AULA-002` | El sistema deberá permitir al estudiante unirse a un aula mediante el código de invitación proporcionado previamente por el docente. |
| `RF-ALU-AULA-003` | Dentro de un aula, el sistema deberá permitir visualizar a los compañeros; el estudiante no deberá poder escribirles ni acceder a sus perfiles. |
| `RF-ALU-AULA-004` | El sistema deberá mostrar las actividades publicadas por el docente y permitir al estudiante realizar entregas, ver la entrega efectuada o consultar la devolución, según el estado de cada actividad. |
| `RF-ALU-AULA-005` | El sistema deberá permitir visualizar la Currícula y el tema por el que avanza la materia; la edición de la Currícula deberá estar reservada al docente. |
| `RF-ALU-AULA-006` | El sistema deberá permitir al estudiante consultar la Biblioteca con los materiales cargados por el docente. |
| `RF-ALU-AULA-007` | El sistema deberá permitir al estudiante visualizar su rendimiento dentro del aula seleccionada. |
| `RF-ALU-AULA-008` | El Muro del aula deberá permitir al estudiante comunicarse y realizar consultas visibles para todos los participantes del aula, y no únicamente para el docente. |
| `RF-ALU-AULA-009` | Dentro de cada actividad, el sistema deberá permitir escuchar la consigna y activar un modo de lectura fácil. |
| `RF-ALU-AULA-010` | El sistema deberá mostrar las consignas, los apuntes o archivos adjuntos por el docente y los materiales de la Biblioteca relacionados con la actividad, de modo que el estudiante pueda leerlos y repasarlos. |
| `RF-ALU-AULA-011` | El sistema deberá proporcionar un espacio para realizar la actividad y permitir cargar una entrega en formato Word o PDF, agregar un comentario y confirmar el envío. |
| `RF-ALU-AULA-012` | El sistema deberá permitir abrir al tutor socrático Foxy desde la actividad para recibir pistas sin que la inteligencia artificial resuelva la tarea por el estudiante, así como formular consultas destinadas a mejorar la comprensión. |
| **3.4. Mi Progreso** | |
| `RF-ALU-PROG-001` | El sistema deberá permitir al estudiante consultar su historial completo y realizar prácticas express. |
| `RF-ALU-PROG-002` | El sistema deberá mostrar un resumen general del progreso y el dominio por materia. |
| `RF-ALU-PROG-003` | El sistema deberá mostrar información sobre hábitos y retención, además de los logros e insignias obtenidos durante el uso de la plataforma. |
| `RF-ALU-PROG-004` | El sistema deberá mostrar el nivel del estudiante, su emblema, la experiencia que le falta para alcanzar el siguiente nivel y el próximo elemento por desbloquear. |
| **3.5. Mensajes** | |
| `RF-ALU-MEN-001` | El sistema deberá permitir al estudiante comunicarse únicamente con docentes; no deberá habilitar la comunicación directa entre estudiantes. |
| `RF-ALU-MEN-002` | La sección Mensajes deberá mostrar las invitaciones recibidas para incorporarse a aulas. |
| `RF-ALU-MEN-003` | El sistema deberá identificar las invitaciones pendientes mediante una notificación o recordatorio y permitir al estudiante aceptarlas. |
| **3.6. Configuración** | |
| `RF-ALU-CONF-001` | La sección Configuración deberá permitir al estudiante cargar una foto de perfil, visualizar su nombre y apellido, mostrar el correo electrónico sin posibilidad de modificación y registrar sus intereses y metas en la plataforma. |
| `RF-ALU-CONF-002` | La sección Configuración deberá incluir apartados de Notificaciones, Preferencias de IA, Apariencia y Seguridad. |
| `RF-ALU-CONF-003` | El sistema deberá permitir configurar notificaciones para recordatorios de tareas, nuevos materiales y sugerencias de Foxy. |
| `RF-ALU-CONF-004` | El sistema deberá permitir configurar las preferencias de inteligencia artificial: Estilo de aprendizaje preferido (p. ej., visual o basado en texto), Método socrático estricto, Resúmenes automáticos. |
| `RF-ALU-CONF-005` | El sistema deberá permitir configurar la apariencia y las opciones de accesibilidad DUA: Tema visual (claro, oscuro o automático), Densidad de información (cómoda o compacta), Tamaño de fuente (pequeño, normal o grande), Accesibilidad DUA (fuente OpenDyslexic, lectura fácil y alto contraste). |
| `RF-ALU-CONF-006` | El sistema deberá proporcionar un apartado de Seguridad dentro de la configuración del estudiante. |

---

## 3. Especificación Detallada por Módulos y Secciones

### 3.1. Mi Dashboard (`RF-ALU-DASH-001` a `007`)
1. **Encabezado y Bienvenida:** Saludo personalizado al estudiante con indicador de fecha y estado de ánimo educativo (`RF-ALU-DASH-001`).
2. **Sugerencia de Repaso IA:** Widget de Foxy contextualizado según compromisos cercanos del alumno con disparador de repaso rápido en un clic (`RF-ALU-DASH-002`).
3. **Barra de Accesos Rápidos:** 5 accesos directos principales: *Carpetas de estudio*, *Mis Aulas*, *Mi Progreso*, *Desafío* (práctica express interactiva) y *Mensajes* (`RF-ALU-DASH-003`).
4. **Resumen Semanal y Experiencia:** Contador de XP (puntos de experiencia) acumulados en la semana por actividades formativas y sesiones con Foxy (`RF-ALU-DASH-004`).
5. **Métricas Diarias de Seguimiento:** Tres widgets operativos clave: *Actividades de hoy* (completadas vs totales), *Tiempo con Foxy* (minutos de tutoría activa) y *Precisión global* (% de aciertos en quizzes/trivias) (`RF-ALU-DASH-005`).
6. **Materias y Agenda Próxima:** Visualización en cuadrícula de las aulas matriculadas y panel de agenda con tareas próximas y fechas de entrega límite (`RF-ALU-DASH-006`).
7. **Racha y Logros Recientes:** Contador de días continuos de estudio autónomo (con símbolo de llama) y vitrina de insignias o trofeos recientemente desbloqueados (`RF-ALU-DASH-007`).

---

### 3.2. Carpetas de Estudio (`RF-ALU-CARP-001` a `015`)
1. **Gestión y Búsqueda de Carpetas:** Visualización de carpetas en tarjetas con código de color, buscador por material, tema o examen, y filtros rápidos por *Todas*, *Aulas vinculadas* y *Estudio personal* (`RF-ALU-CARP-001` a `003`).
2. **Creación Asistida con IA:** Formulario para definir nombre, vinculación a un aula o estudio personal, objetivo pedagógico y color distintivo (`RF-ALU-CARP-004`). Posibilidad de adjuntar programas en PDF/Word o notas breves (`RF-ALU-CARP-005`), ejecutar *Analizar con la guía* para que la IA extraiga automáticamente unidades, temas y subtemas (`RF-ALU-CARP-006`), permitir al estudiante editar/reordenar la estructura antes de confirmar (`RF-ALU-CARP-007`) y persistir la carpeta creada (`RF-ALU-CARP-008`).
3. **Espacio de Estudio y Chat con Foxy:** Hilo conversacional enriquecido con renderizado Markdown, soporte para ecuaciones y código (`RF-ALU-CARP-009`).
4. **Herramientas de Estudio Inteligentes:** 
   - **Flashcards:** Barajas interactivas con giro 3D y autoevaluación de dominio (No me lo sé, Más o menos, Me lo sé) conectada al motor de repetición espaciada (`RF-ALU-CARP-010`).
   - **Quiz Rápido:** Cuestionarios interactivos con retroalimentación inmediata explicativa.
   - **Resumen Estructurado:** Generación jerárquica de síntesis de lectura.
   - **Mapa Conceptual:** Diagramación conceptual visual e interactiva.
   - **Plan de Estudio:** Estructuración de cronogramas y repasos calendarizados.
5. **Modos de Tutor:** Selector dinámico entre *Socrático* (guía mediante preguntas y pistas sin dar respuestas directas), *Fácil* (explicaciones simplificadas y analogías DUA) y *Examen* (simulacro evaluativo riguroso) (`RF-ALU-CARP-011`).
6. **Panel de Apuntes Integrado:** Libreta de notas persistente desplegable durante la conversación para registrar apuntes personales (`RF-ALU-CARP-012`).
7. **Pestañas de Trabajo:** Navegación interna entre *Tutor IA*, *Biblioteca* (archivos de la carpeta), *Planes* (rutinas de repetición) y *Recordatorios* (`RF-ALU-CARP-013`).
8. **Contexto e Historial:** Visualizador del contexto de documentos activos, historial de chats y capacidad de crear nuevas conversaciones o reanudar previas (`RF-ALU-CARP-014`, `RF-ALU-CARP-015`).

---

### 3.3. Mis Aulas (`RF-ALU-AULA-001` a `012`)
1. **Acceso y Matrícula:** Listado de aulas asignadas y botón para ingresar mediante código de invitación alfanumérico entregado por el docente (`RF-ALU-AULA-001`, `RF-ALU-AULA-002`).
2. **Privacidad y Lista de Compañeros:** Visualización del listado de alumnos del curso con restricción estricta: el estudiante no puede enviar mensajes directos a compañeros ni acceder a perfiles ajenos (`RF-ALU-AULA-003`).
3. **Actividades y Estados de Entrega:** Visualizador de tareas clasificadas en *Pendiente*, *Entregada* o *Calificada* con acceso a retroalimentación del docente (`RF-ALU-AULA-004`).
4. **Currícula Oficial:** Vista en solo lectura del programa temático estructurado y marcado del tema que el docente se encuentra dictando actualmente (`RF-ALU-AULA-005`).
5. **Biblioteca del Aula:** Repositorio de recursos teóricos, guías y presentaciones publicadas por el profesor (`RF-ALU-AULA-006`).
6. **Rendimiento Individual:** Métricas de notas, puntualidad y cumplimiento del estudiante dentro de la materia (`RF-ALU-AULA-007`).
7. **Muro Colaborativo:** Tablón para enviar consultas públicas y avisos compartidos entre toda la clase y el docente (`RF-ALU-AULA-008`).
8. **Inclusión DUA en Actividades:** Opción de escuchar las consignas mediante síntesis de voz (Text-to-Speech) y conmutar a tipografía y formato de Lectura Fácil (`RF-ALU-AULA-009`).
9. **Detalle de Consigna y Materiales:** Vista de pautas completas, adjuntos del profesor y enlaces directos a la Biblioteca (`RF-ALU-AULA-010`).
10. **Entrega de Trabajos:** Área de subida de archivos en formato PDF o Word, campo de comentarios para el docente y botón de confirmación de entrega (`RF-ALU-AULA-011`).
11. **Tutor Socrático Foxy en Actividades:** Drawer lateral de Foxy que asiste al estudiante con pistas conceptuales, preguntas guía y aclaraciones teóricas sin resolver ni escribir la tarea por él (`RF-ALU-AULA-012`).

---

### 3.4. Mi Progreso (`RF-ALU-PROG-001` a `004`)
1. **Historial Completo y Prácticas Express:** Visualización cronológica de actividades resueltas y botón de práctica express para afianzar conceptos débiles (`RF-ALU-PROG-001`).
2. **Dominio por Materia:** Gráficos de barras y porcentajes de comprensión conceptual discriminados por asignatura (`RF-ALU-PROG-002`).
3. **Hábitos, Retención e Insignias:** Métricas de constancia de estudio, curvas de retención y vitrina de medallas e insignias logradas (`RF-ALU-PROG-003`).
4. **Gamificación y Nivel:** Indicador del nivel actual del estudiante, emblema visual representativo, barra de XP requerida para el siguiente rango y próximo beneficio por desbloquear (`RF-ALU-PROG-004`).

---

### 3.5. Mensajes (`RF-ALU-MEN-001` a `003`)
1. **Canal Restringido:** Comunicación bidireccional permitida exclusivamente entre el estudiante y sus docentes o preceptores (sin mensajería privada alumno-alumno) (`RF-ALU-MEN-001`).
2. **Invitaciones a Aulas:** Visualización de invitaciones enviadas por docentes para integrarse a nuevas materias (`RF-ALU-MEN-002`).
3. **Gestión de Invitaciones:** Notificación destacada de invitaciones pendientes con acción directa para aceptar e incorporarse inmediatamente al aula (`RF-ALU-MEN-003`).

---

### 3.6. Configuración (`RF-ALU-CONF-001` a `006`)
1. **Perfil del Estudiante:** Carga de foto de perfil, visualización de nombre y apellido, correo institucional en solo lectura y registro editable de intereses y metas formativas (`RF-ALU-CONF-001`).
2. **Estructura de Ajustes:** 4 secciones operativas: *Notificaciones*, *Preferencias de IA*, *Apariencia* y *Seguridad* (`RF-ALU-CONF-002`).
3. **Notificaciones:** Configuración de alertas para vencimiento de tareas, nuevos materiales en Biblioteca y sugerencias automáticas de Foxy (`RF-ALU-CONF-003`).
4. **Preferencias de IA:** Selección de estilo de aprendizaje (Visual, Textual, Práctico), forzar método socrático estricto y activación de resúmenes automáticos (`RF-ALU-CONF-004`).
5. **Apariencia y DUA:** Selector de tema (Claro / Oscuro / Automático), densidad (Cómoda / Compacta), tamaño tipográfico (Pequeño / Normal / Grande) y conmutadores de accesibilidad DUA: fuente OpenDyslexic, modo Lectura Fácil y Alto Contraste (`RF-ALU-CONF-005`).
6. **Seguridad:** Gestión de credenciales y controles de sesión del estudiante (`RF-ALU-CONF-006`).

---

## 4. Aspectos Pendientes de Definición Funcional Relacionados

| Referencia | Punto Pendiente | Estado / Criterio Aplicado en Prototipo |
| :--- | :--- | :--- |
| `AP-02` | El Dashboard del alumno menciona un acceso rápido denominado *Desafío*, pero el documento base no define una sección independiente ni funcionalidades adicionales para ese acceso. | En el prototipo front-end se implementa como un modal interactivo de *Trivia / Preguntas Express* de opción múltiple que refuerza conceptos clave y otorga XP inmediato. |
| `AP-05` | La Configuración del alumno incluye un apartado de *Seguridad*, pero el documento base no detalla qué operaciones debe ofrecer. | En el prototipo se proporciona el panel para cambio de contraseña y control de sesiones activas. |
