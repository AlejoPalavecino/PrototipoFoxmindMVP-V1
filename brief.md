# FoxMind — Product Brief & Functional Architecture

**Versión del Producto:** 1.0 — Prototipo Funcional  
**Estado:** Especificación de Producto para Fase de Desarrollo  
**Público Objetivo:** Instituciones educativas de nivel secundario (Docentes, Estudiantes, Equipos Directivos y Pedagógicos)  
**Stack de Referencia:** React 19 + TypeScript + Tailwind CSS (v4) + Motion + Express + Supabase  

---

## 1. Visión y Propósito del Producto

**FoxMind** es una plataforma educativa integral para la educación secundaria que actúa como un **copiloto pedagógico inteligente**. Su misión es resolver los dos grandes desafíos de las aulas contemporáneas:
1. **La sobrecarga de gestión y planificación docente**, facilitando herramientas de Inteligencia Artificial curricular, detección temprana de riesgo académico y diseño universal accesible sin trabajo administrativo redundante.
2. **La dispersión y desmotivación del estudiante**, brindando un entorno de estudio autónomo guiado por **Foxy** (un tutor socrático que no resuelve la tarea por el alumno, sino que lo guía paso a paso) y una experiencia gamificada basada en hábitos reales de aprendizaje.

### Pilares Fundamentales
- **Inclusión y DUA (Diseño Universal para el Aprendizaje):** Accesibilidad integrada desde el núcleo: tipografía para dislexia (`OpenDyslexic`), modo de lectura fácil, alto contraste, texto a voz (TTS), redacción adaptada a perfiles cognitivos y rúbricas flexibles.
- **Tutoría Socrática Real:** Foxy nunca entrega las respuestas finales de tareas o exámenes; formula preguntas guía, analogías y pistas incrementales para fomentar la metacognición.
- **Analítica Formativa y Predictiva:** Detección precoz de estudiantes en riesgo (académico, actitudinal o de asistencia) mediante un semáforo de riesgo e intervenciones asistidas.
- **Entorno Seguro y Controlado:** Mensajería pedagógica sin comunicación directa privada entre alumnos (evitando distracciones o acoso escolar) y con supervisión docente en muros públicos.

---

## 2. User Personas & Casos de Uso

### 2.1. Perfil Docente (Ejemplo: Prof. Laura Martínez)
- **Contexto:** Dicta materias en múltiples divisiones (ej. Biología en 3° A y 4° B). Dispone de poco tiempo para preparar adaptaciones curriculares individuales y corregir entregas voluminosas.
- **Necesidades Clave:**
  - Crear planificaciones y secuencias didácticas basadas en el diseño curricular provincial/nacional en minutos.
  - Subir un archivo Word o PDF de actividad y que el sistema genere automáticamente las versiones DUA necesarias para sus alumnos con adaptaciones.
  - Visualizar qué alumnos están rezagados o en riesgo antes de los exámenes bimestrales.
  - Corregir actividades formativas con rúbricas analíticas asistidas por IA.
  - Comunicar avisos, consignas y notas de voz a estudiantes en un canal seguro.

### 2.2. Perfil Alumno (Ejemplo: Valentina Rodríguez)
- **Contexto:** Estudiante de 3° año de secundaria. Se siente abrumada frente a textos largos o exámenes y requiere acompañamiento fuera del horario escolar.
- **Necesidades Clave:**
  - Organizar sus apuntes y programas en "Carpetas de Estudio" ordenadas por materia o interés personal.
  - Contar con un tutor disponible 24/7 que le explique dudas complejas con ejemplos cotidianos (modo fácil) o le tome simulacros evaluativos (modo examen).
  - Convertir textos densos en fichas mnemotécnicas (flashcards), resúmenes, quizzes interactivos y mapas conceptuales visuales.
  - Entregar trabajos en PDF o Word, escuchar consignas en audio cuando le cuesta leer y pedir pistas a Foxy en tiempo real.
  - Medir su constancia mediante experiencia (XP), rachas de días y medallas de logros sin sentirse juzgada.

---

## 3. Arquitectura de Información & Mapa de Navegación

### 3.1. Flujo de Acceso Global
```
                          [ Pantalla de Acceso / Login ]
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼                                     ▼
           [ Rol: Docente ]                        [ Rol: Alumno ]
                    │                                     │
           DocenteLayout (Sidebar)                AlumnoLayout (Sidebar)
                    │                                     │
        ├─ 1. Dashboard                       ├─ 1. Mi Dashboard
        ├─ 2. Agenda                          ├─ 2. Carpeta de Estudio (IA)
        ├─ 3. Mis Aulas                       ├─ 3. Mis Aulas
        ├─ 4. Progreso de Clase               ├─ 4. Mi Progreso
        ├─ 5. Foxy IA (Copiloto)              ├─ 5. Mensajes
        ├─ 6. Mensajes                        └─ 6. Configuración
        └─ 7. Configuración
```

---

## 4. Desglose Funcional y de Navegación por Rol

### 4.1. Rol Docente

#### 4.1.1. Dashboard Docente (`view === 'dashboard'`)
- **Propósito:** Centro de control diario del profesor.
- **Componentes y Secciones:**
  - **Hero Header:** Saludo horario ("Buenas tardes, Prof. Laura"), fecha legible y botón de llamada a la acción principal: *"Planificar con IA"*.
  - **Accesos Rápidos:** 5 botones directos hacia Agenda, Mis Aulas, Reportes (Progreso), Mensajes y Configuración.
  - **KPIs Operativos (4 tarjetas de métricas):** Alumnos activos (total y variación), Tareas por revisar (con badge de urgencia), Alertas de riesgo (contador crítico) y Consultas a Foxy.
  - **Semáforo de Riesgo Académico:** Listado de estudiantes con badges de nivel (Crítico / Alerta / Seguimiento), motivo de riesgo, perfil DUA asociado, botón de contacto directo por mensajería y botón de inspección de perfil.
  - **Clases del Día:** Cronograma secuencial de clases conectadas con la Agenda (horario, materia, aula y estado actual).
  - **Widget Copiloto IA:** Acceso rápido para *Crear secuencia didáctica* y *Adaptar texto mediante DUA*.
  - **Tareas por Revisar:** Widget con entregas pendientes, barra de avance de correcciones y botón para abrir el cajón de calificación formativa.

#### 4.1.2. Agenda Docente (`view === 'agenda'`)
- **Propósito:** Gestión integral del tiempo pedagógico escolar y personal.
- **Componentes y Secciones:**
  - **Header de Controles:** Selector de vista (Día / Semana / Mes), conmutador de semanas/meses (`<` `Hoy` `>`) y botón *"Nuevo Evento"*.
  - **Filtros de Agenda:** Selector de aula (Biología 3° A, Química 4° B, etc.), categorías (Clases, Exámenes, Reuniones, Institucional).
  - **Cuadrícula Interactiva (DayView / WeekView / MonthView):** Bloques de eventos coloreados según la materia, con visualización de horarios, lugar y notas.
  - **Panel Calendario Oficial Escolar (Sidebar derecho):** Feriados nacionales, mesas de examen y jornadas docentes con buscador y filtro por tipo; permite importar con un clic cualquier hito oficial a la agenda propia.
  - **Drawer Asistente Foxy en Agenda:** Recomendaciones de distribución de carga horaria y pausas docentes.
  - **Modal de Creación/Edición de Evento (`AgendaEventModal`):** Asignación de aula, título, horarios, repetición y consignas pedagógicas.

#### 4.1.3. Mis Aulas Docente (`view === 'aulas'`)
- **Propósito:** Administración de comisiones, contenidos y actividades.
- **Componentes y Secciones:**
  - **Vista Lista de Aulas:** Tarjetas por cada curso con código de materia, cantidad de alumnos, promedio, porcentaje de avance temático y tareas activas. Botón *"Crear Aula"*.
  - **Modal de Creación de Aula con IA:** Formulario de datos institucionales (materia, año, división, color) + subida de plan de estudios. Disparador *"Analizar Plan de Estudios con IA"* que genera unidades, temas y subtemas editables antes del guardado definitivo.
  - **Vista Detalle de Aula (Navegación por 6 Pestañas):**
    1. **Alumnos (`RF-DOC-AULA-ALU`):** Lista de alumnos matriculados, código de aula para invitar, modal para invitar por correo (genera mensaje directo al alumno), modal de ficha individual del estudiante con historial y perfil DUA.
    2. **Actividades (`RF-DOC-AULA-ACT`):** Listado de tareas con badges de estado. Creación manual o vía archivo PDF/Word (la IA indexa y extrae consignas) o *"Crear con IA"*. Flujo de rúbrica analítica por puntos y previsualización de adaptaciones DUA antes de la publicación. Modal de corrección rápida (`TeacherGradingDrawer`).
    3. **Currícula (`RF-DOC-AULA-CUR`):** Árbol de unidades temáticas con toggles para marcar temas completados o en curso.
    4. **Biblioteca (`RF-DOC-AULA-BIB`):** Repositorio de recursos (PDFs, PPTX, guías) con subida de archivos y vinculación automática a actividades.
    5. **Rendimiento (`RF-DOC-AULA-REN`):** Métricas del aula: distribución de notas (gráfico de campana/barras), asistencia, tasa de entregas y panel de estudiantes con adaptaciones DUA.
    6. **Muro (`RF-DOC-AULA-MUR`):** Tablón social del aula con redactor asistido por Foxy, publicaciones fijadas (pinned), adjuntos y comentarios entre alumnos y profesor.

#### 4.1.4. Progreso de Clase (`view === 'progreso'`)
- **Propósito:** Supervisión analítica del rendimiento global, hábitos de estudio y gamificación docente.
- **Componentes y Secciones:**
  - **Pestaña Overview:** Rendimiento general, tasa de retención, distribución de notas comparativa y botón *"Historial Pedagógico"*.
  - **Pestaña Aulas:** Tarjetas analíticas por curso con nivel de dominio por conceptos clave.
  - **Pestaña Hábitos:** Tiempo promedio de estudio autónomo de los alumnos, días de mayor actividad y curvas de retención espaciada.
  - **Pestaña Logros:** Nivel del docente (ej. Nivel 8 - Educador Innovador), barra de XP y vitrina de medallas ganadas por buenas prácticas pedagógicas.
  - **Modales de Intervención:** Modal de Intervención Asistida (`IntervencionAsistidaModal`) para generar planes de recuperación personalizados con IA.

#### 4.1.5. Copiloto IA Docente (`view === 'copiloto'`)
- **Propósito:** Espacio de trabajo pedagógico aumentado para diseño de materiales educativos.
- **Componentes y Secciones:**
  - **Selector de Contexto:** Menú desplegable para fijar un aula (inyecta su plan curricular como contexto de prompt) o trabajar en modo general.
  - **Workspace de Chat:** Hilo conversacional con soporte de comandos rápidos (`/rubrica`, `/actividad`, `/mapa`, `/examen`, `/dua`), carga de documentos de apoyo y grabación de voz por micrófono.
  - **Biblioteca de Recursos Creados:** Visualización de presentaciones interactivas, mapas conceptuales, rúbricas e informes creados por Foxy.
  - **Visor / Proyector (Canvas):** Modal interactivo para proyectar presentaciones a pantalla completa en clase o asignarlas como actividad con fecha límite a un curso.
  - **Panel de Recomendaciones:** Sugerencias automáticas clasificadas por *Todas*, *Prioridad*, *DUA* e *Innovación*.

#### 4.1.6. Mensajes Docente (`view === 'mensajes'`)
- **Propósito:** Comunicación pedagógica directa y segura con estudiantes y preceptores.
- **Componentes y Secciones:**
  - **Bandeja de Entrada (Sidebar):** Búsqueda de chats, badges de mensajes no leídos, pines y categorías (Duda TP, Institucional, Urgente).
  - **Área de Conversación:** Mensajes agrupados cronológicamente, soporte de notas de voz (`VoiceNotePlayer`), archivos adjuntos (PDFs, guías) y respuestas directas.
  - **Foxy Message Copilot (`FoxyMessageCopilotModal`):** Asistente que redacta respuestas empáticas o profesionales sugeridas con un clic.
  - **Nueva Conversación:** Modal con filtro exclusivo de alumnos matriculados y directivos.

#### 4.1.7. Configuración Docente (`view === 'config'`)
- **Secciones:** Perfil profesional (foto, nombre, bio; email no editable), Notificaciones (alertas de riesgo, entregas, IA), Preferencias de IA (System Prompt docente, autonomía, rúbricas base) y Apariencia/DUA (temas, fuentes, accesibilidad).

---

### 4.2. Rol Alumno

#### 4.2.1. Mi Dashboard Alumno (`view === 'dashboard'`)
- **Propósito:** Punto de partida amigable y motivador para el estudiante.
- **Componentes y Secciones:**
  - **Hero Card:** Saludo cálido ("¡Hola Valentina!"), frase del día y sugerencia de repaso de Foxy con botón *"Repasar Ahora"*.
  - **Accesos Rápidos (5 accesos):** Carpetas de estudio, Mis Aulas, Mi Progreso, Desafío Express (Trivia rápida con XP) y Mensajes.
  - **Widgets Diarios:** Actividades de hoy (ej. 2/3 completadas), Tiempo con Foxy (minutos de tutoría) y Precisión global (%).
  - **Resumen Semanal de Experiencia (XP):** Gráfico de puntos diarios ganados.
  - **Próximas Actividades / Agenda:** Lista cronológica de tareas pendientes con fecha de vencimiento y materias.
  - **Racha y Logros:** Contador de racha con llama de fuego (ej. 🔥 7 días consecutivos) e insignias recién obtenidas.

#### 4.2.2. Carpeta de Estudio IA (`view === 'estudia'`)
- **Propósito:** Entorno de estudio autónomo guiado por metodologías activas y Foxy.
- **Componentes y Secciones:**
  - **Panel de Carpetas:** Visualización en cuadrícula con filtros (*Todas*, *Aulas vinculadas*, *Estudio personal*), buscador y botón *"Nueva Carpeta"*.
  - **Creación de Carpeta Asistida:** Asignación de nombre, objetivo, color y vinculación a un aula. Posibilidad de adjuntar apuntes o guía y pulsar *"Analizar con la guía"* para extraer temas y subtemas antes de confirmar.
  - **Workspace de Estudio:**
    - **Chat con Foxy:** Tutor conversacional con selector de modo:
      - *Socrático:* Pregunta y da pistas sin revelar la solución.
      - *Fácil:* Explica con analogías sencillas y lenguaje claro.
      - *Examen:* Simula preguntas de examen exigentes.
    - **Herramientas de Estudio (Botones superiores):**
      - *Flashcards:* Tarjetas con animación 3D de giro para repetición espaciada (botones: *No lo sé*, *Duda*, *Dominado*).
      - *Quiz Rápido:* Preguntas de opción múltiple con feedback correctivo inmediato.
      - *Resumen:* Síntesis estructurada en viñetas comprensibles.
      - *Mapa Conceptual:* Diagramación visual de nodos y ramas clave.
      - *Plan de Estudio:* Cronograma calendarizado de repaso.
    - **Panel de Apuntes Desplegable:** Cuaderno lateral para tomar notas durante la sesión de estudio.
    - **Pestañas Internas:** *Tutor IA*, *Biblioteca* (materiales de la carpeta), *Planes* y *Recordatorios*.

#### 4.2.3. Mis Aulas Alumno (`view === 'aulas'`)
- **Propósito:** Acceso a las clases virtuales escolares.
- **Componentes y Secciones:**
  - **Listado de Cursos:** Tarjetas con profesor, horario, tareas pendientes y botón *"Unirse a un aula"* (ingreso mediante código de invitación).
  - **Navegación Interna del Aula (Pestañas):**
    1. **Muro:** Mensajes y dudas públicas visibles para toda la clase.
    2. **Actividades:** Lista categorizada en *Pendientes*, *Entregadas* y *Calificadas*.
       - **Detalle de Actividad (`StudentActivityDetail`):** Consignas con botón de Text-to-Speech (escuchar audio), botón de modo *Lectura Fácil*, apuntes adjuntos del profesor, enlaces a la Biblioteca y panel de entrega (subida de archivos PDF/Word, comentarios y confirmación de envío).
       - **Drawer Tutor Foxy en Actividad (`StudentFoxyTutorDrawer`):** Botón flotante para pedir pistas pedagógicas contextuadas a la consigna sin que la IA haga la tarea por el alumno.
    3. **Currícula:** Programa de la materia en modo lectura con indicación del tema actual.
    4. **Biblioteca:** Documentos y lecturas subidas por el profesor.
    5. **Compañeros:** Lista de alumnos del curso (con restricción de privacidad: no permite ver perfiles ajenos ni enviarles mensajes privados).
    6. **Mi Rendimiento:** Gráficos de evolución individual dentro del aula.

#### 4.2.4. Mi Progreso Alumno (`view === 'progreso'`)
- **Propósito:** Visualización de la evolución pedagógica y gamificación educativa.
- **Componentes y Secciones:**
  - **Overview:** Nivel del estudiante (ej. Nivel 5 - Aprendiz Curioso), barra de XP para el próximo nivel, emblema visual y racha actual.
  - **Materias:** Porcentaje de dominio conceptual desglosado por asignatura con acceso a práctica express.
  - **Hábitos:** Gráfico de constancia semanal, tiempo acumulado de estudio y curvas de retención.
  - **Logros:** Catálogo de insignias desbloqueadas y por desbloquear con requisitos claros.

#### 4.2.5. Mensajes Alumno (`view === 'mensajes'`)
- **Propósito:** Canal institucional exclusivo con profesores y preceptores.
- **Componentes y Secciones:**
  - Lista de conversaciones únicamente con docentes o preceptores (regla de negocio estricta: prohibida la mensajería privada entre estudiantes).
  - Tarjeta destacada de *Invitaciones a Aulas Recibidas*: aviso de nuevas materias a las que el profesor lo invitó, con botón *"Aceptar Invitación"* que lo matricula automáticamente.
  - Envío y recepción de textos, notas de audio y archivos.

#### 4.2.6. Configuración Alumno (`view === 'config'`)
- **Secciones:** Perfil (foto, nombre, correo en solo lectura, metas e intereses escolares), Notificaciones (tareas por vencer, avisos de profesores), Preferencias de IA (estilo de aprendizaje visual/texto, método socrático estricto, resúmenes automáticos), Apariencia y DUA (fuente dislexia, lectura fácil, alto contraste) y Seguridad (cambio de contraseña y sesiones activas).

---

## 5. Reglas de Negocio y Políticas de Convivencia Educativa

1. **Privacidad y Protección Estudiantil:**
   - Queda deshabilitada de forma obligatoria la mensajería privada alumno-a-alumno en toda la plataforma. La interacción entre compañeros se produce exclusivamente en los Muros públicos de cada aula bajo moderación docente.
   - Los alumnos no pueden inspeccionar perfiles personales ni historiales de notas de sus compañeros.
2. **Pedagogía Socrática de Foxy:**
   - Cuando un estudiante solicita directamente la resolución de un ejercicio ("dame la respuesta de este ejercicio"), Foxy descompone el problema en preguntas intermedias y sugiere consultar los apuntes adjuntos.
3. **No Punitividad en DUA:**
   - La activación de herramientas DUA (fuente disléxica, lectura fácil, audio o adaptaciones curriculares) nunca resta puntos de experiencia (XP) ni modifica negativamente las calificaciones del estudiante.
4. **Validación Previa Docente en Materiales IA:**
   - Todo recurso curricular generado por Foxy (unidades didácticas, rúbricas o adaptaciones) requiere una confirmación o ajuste explícito del docente antes de ser persistido o asignado al aula.
