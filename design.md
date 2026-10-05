# FoxMind — Design System & UI/UX Guidelines

**Versión:** 1.0 — Guía de Diseño y Estilos para Desarrollo  
**Propósito:** Documento de referencia técnico y visual para replicar, maquetar y extender la interfaz de usuario (UI) y la experiencia de usuario (UX) de **FoxMind** en código de producción, manteniendo consistencia absoluta con el prototipo.  
**Frameworks de Referencia:** Tailwind CSS (v4) con `@theme`, Google Fonts (`Montserrat`, `Roboto`), CDN Fonts (`OpenDyslexic`), Lucide Icons, Motion.

---

## 1. Fundamentos del Sistema de Diseño (Design Tokens)

### 1.1. Paleta de Colores y Tokens Semánticos

FoxMind utiliza una paleta cromática inspirada en tonos educativos calmos, con un verde salvia institucional como primario, un naranja vibrante como color de acción e identidad de marca (asociado a *Foxy*), y colores de estado pedagógico.

#### Variables CSS Base (`:root` — Tema Claro)
```css
:root {
  /* Marca e Interfaz Base */
  --color-fox-primary-var:    #489980; /* Verde salvia institucional */
  --color-fox-bg-var:         #e4efea; /* Fondo general calmante */
  --color-fox-surface-var:    #f0f7f4; /* Superficie de tarjetas y paneles */
  --color-fox-border-var:     #cde0d8; /* Bordes suaves y divisores */
  --color-fox-text-main-var:   #1a332a; /* Texto principal de alto contraste */
  --color-fox-text-muted-var:  #4a665d; /* Texto secundario y etiquetas */

  /* Colores de Acento y Estado */
  --color-fox-orange-var:     #f68d2c; /* Color FoxMind / CTAs primarios / Alumno */
  --color-fox-green-var:      #52a874; /* Éxito, completado, riesgo bajo */
  --color-fox-purple-var:     #827397; /* Gamificación, XP, IA secundaria */
  --color-fox-blue-var:       #2563eb; /* Enlaces, información, institucional */
  --color-fox-red-var:        #d96c63; /* Alertas críticas, riesgo alto, eliminar */
  --color-fox-yellow-var:     #e5b842; /* Riesgo medio, advertencia */
  --color-fox-gold-var:       #e5a030; /* Rachas de fuego, trofeos, medallas */
}
```

#### Modo Oscuro (`.theme-dark`)
```css
.theme-dark {
  --color-fox-primary-var:    #6cbfa3;
  --color-fox-bg-var:         #0f1511;
  --color-fox-surface-var:    #16241e;
  --color-fox-border-var:     #243c32;
  --color-fox-text-main-var:   #eff6f3;
  --color-fox-text-muted-var:  #9fb8ae;
}
```

#### Accesibilidad DUA: Modo Alto Contraste (`html.high-contrast`)
```css
html.high-contrast {
  --color-fox-primary-var:    #000000;
  --color-fox-bg-var:         #ffffff;
  --color-fox-surface-var:    #ffffff;
  --color-fox-border-var:     #000000;
  --color-fox-text-main-var:   #000000;
  --color-fox-text-muted-var:  #000000;
  
  --color-fox-green-var:      #000000;
  --color-fox-orange-var:     #000000;
  --color-fox-purple-var:     #000000;
  --color-fox-blue-var:       #000000;
  --color-fox-red-var:        #000000;
  --color-fox-yellow-var:     #000000;
  --color-fox-gold-var:       #000000;
}
html.high-contrast * {
  border-color: #000000 !important;
}
html.high-contrast img, 
html.high-contrast svg {
  filter: contrast(200%) grayscale(100%);
}
```

#### Botón Flotante de Accesibilidad Universal
- **Color Fijo:** `#3BB54A` (Verde internacional de accesibilidad).
- **Efecto Focus:** `ring-4 ring-[#3BB54A]/50`.

---

### 1.2. Sistema Tipográfico

FoxMind implementa dos familias tipográficas estándar y una familia accesible para neurodiversidad:

| Rol | Familia Tipográfica | Pesos Usados | Aplicación |
| :--- | :--- | :--- | :--- |
| **Títulos / Display** | `Montserrat`, sans-serif | 500, 600, 700 (Bold) | `h1` a `h6`, cabeceras de tarjetas, números grandes de KPI |
| **Cuerpo / Textos** | `Roboto`, sans-serif | 400 (Regular), 500 (Medium), 700 | Párrafos, botones, campos de texto, tablas, chat |
| **Accesible (DUA)** | `OpenDyslexic`, sans-serif | Regular, Bold | Sobreescribe `--font-sans` y `--font-heading` cuando `html.font-dyslexic` está activo |

#### Escalas de Texto de la Aplicación
- **Pequeño (`.text-size-pequeno` / `html.a11y-text-s`):** `14px` base.
- **Normal (`.text-size-normal` / `html.a11y-text-m`):** `16px` base (predeterminado).
- **Grande (`.text-size-grande` / `html.a11y-text-l`):** `18px` a `20px` base.

#### Modo Lectura Fácil (`html.easy-read`)
Reglas obligatorias aplicadas a todos los elementos textuales:
```css
line-height: 1.6 !important;
letter-spacing: 0.03em !important;
word-spacing: 0.05em !important;
```

---

### 1.3. Densidad de Información y Espaciado

- **Densidad Cómoda (`.density-comoda`):** `--spacing-scale: 1` (espacios holgados, padding generoso, `p-6` a `p-8` en contenedores).
- **Densidad Compacta (`.density-compacta`):** `--spacing-scale: 0.8` (reduce márgenes y padding en un 20% para visualizar más filas de alumnos o eventos de agenda por pantalla).

---

### 1.4. Radios de Borde y Sombras (Elevation)

- **Radios Predominantes:**
  - `rounded-xl` (`12px`): Botones, inputs, chips de estado, ítems de menú.
  - `rounded-2xl` (`16px`): Tarjetas de KPI, tarjetas de aulas, tarjetas de carpetas.
  - `rounded-3xl` (`24px`): Modales principales, cajón de accesibilidad, hero banners.
  - `rounded-full`: Avatares, badges de XP/racha, botón flotante de Foxy y de accesibilidad.
- **Sombras:**
  - `shadow-sm`: Tarjetas secundarias y botones secundarios.
  - `shadow-md shadow-fox-orange/20`: Ítem de menú activo y botones de acción principal.
  - `shadow-xl` / `shadow-2xl`: Modales, popovers flotantes y cajones laterales (`z-50`).

---

## 2. Arquitectura de Navegación y Layouts

### 2.1. Layout de Escritorio (Desktop Sidebar Layout)
El contenedor principal organiza la vista en dos columnas (`h-screen overflow-hidden bg-fox-bg`):

1. **Sidebar Lateral Izquierdo (`<aside>`):**
   - **Ancho Expandido:** `w-64` (`256px`).
   - **Ancho Colapsado:** `w-20` (`80px`).
   - **Botón de Colapso:** Botón circular/cuadrado flotante en el borde derecho (`-right-3 top-7`), con icono `ChevronLeft` / `ChevronRight`.
   - **Cabecera del Sidebar (`h-20`):** Logo de FoxMind (`/logo.png`, `h-12`).
   - **Cuerpo del Menú (`<nav>`):** Lista vertical con espaciado uniforme (`space-y-2`).
     - **Estado Inactivo:** Fondo transparente, texto `fox-text-muted`, icono tenue, `hover:bg-fox-bg hover:text-fox-orange`.
     - **Estado Activo:** Fondo `bg-fox-orange`, texto blanco en negrita (`font-bold`), sombra `shadow-md shadow-fox-orange/20`.
     - **Badges:** `BETA` o `IA` en chip morado o blanco según estado.
     - **Badge de No Leídos (Mensajes):** Píldora naranja numérica pulsante; en colapso se reduce a un punto indicador (`w-2.5 h-2.5 bg-fox-orange animate-ping`).
   - **Pie del Sidebar (Perfil y Logout):**
     - Avatar con iniciales en gradiente naranja (`bg-gradient-to-br from-fox-orange to-orange-500 text-white`).
     - Nombre completo y cargo/año.
     - Chips de gamificación (en Alumno: 🔥 7 días, ✨ 2,450 XP).
     - Botón *"Cerrar sesión"* con icono `LogOut` y efecto hover a rojo tenue (`hover:bg-red-50 hover:text-fox-red`).

2. **Área de Contenido Principal (`<main>`):**
   - `flex-1 overflow-y-auto relative p-4 md:p-8 max-w-7xl mx-auto`.
   - Scrollbar estilizado sutil (`width: 6px`, fondo transparente, thumb con `fox-border`).

### 2.2. Layout Móvil (Responsive Mobile Layout)
- **Barra Superior Móvil:** Cabecera fija con logo reducido y botón *"Cambiar rol"*.
- **Barra de Navegación Inferior (Bottom Bar):**
  - Fija en la base (`fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-fox-border`).
  - Muestra los primeros 5 destinos clave.
  - Altura mínima de pulsación táctil: `min-w-[44px] min-h-[44px]`.

---

## 3. Catálogo de Componentes UI Reutilizables

### 3.1. Botones (`<button>`)

```html
<!-- Primario (Acción Principal / Fox CTA) -->
<button class="bg-fox-orange hover:bg-fox-orange/90 text-white font-bold py-3 px-5 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2">
  <span>Acción</span>
</button>

<!-- Secundario / Superficie -->
<button class="bg-fox-surface hover:bg-fox-bg border border-fox-border text-fox-text-main font-bold py-2.5 px-4 rounded-xl transition-colors flex items-center gap-2">
  <span>Filtrar</span>
</button>

<!-- Destructivo / Peligro -->
<button class="bg-red-50 hover:bg-red-100 text-fox-red border border-red-200 font-bold py-2.5 px-4 rounded-xl transition-colors">
  <span>Eliminar</span>
</button>

<!-- Ícono Ghost -->
<button class="p-2 text-fox-text-muted hover:text-fox-text-main hover:bg-fox-border/40 rounded-lg transition-colors">
  <Icon size={18} />
</button>
```

### 3.2. Tarjetas y Widgets (`Card`)
- **Fondo:** `bg-fox-surface`.
- **Borde:** `border border-fox-border`.
- **Radio:** `rounded-2xl`.
- **Hover Dinámico:** `hover:shadow-lg hover:border-fox-primary/50 transition-all duration-200`.

### 3.3. Badges y Píldoras de Estado (`Chips`)
- **Riesgo Crítico:** `bg-red-100 text-fox-red border border-red-200 text-xs font-bold px-2.5 py-1 rounded-full`.
- **Riesgo Medio:** `bg-amber-100 text-fox-yellow border border-amber-200 text-xs font-bold px-2.5 py-1 rounded-full`.
- **Riesgo Bajo / Óptimo:** `bg-emerald-100 text-fox-green border border-emerald-200 text-xs font-bold px-2.5 py-1 rounded-full`.
- **Perfil DUA:** `bg-purple-100 text-fox-purple border border-purple-200 text-xs font-bold px-2.5 py-0.5 rounded-full`.
- **XP / Logro:** `bg-fox-purple/10 text-fox-purple text-xs font-bold px-3 py-1 rounded-full`.
- **Racha de Fuego:** `bg-fox-gold/15 text-fox-gold text-xs font-bold px-3 py-1 rounded-full`.

### 3.4. Sistema de Modales y Cajones (Drawers)
- **Fondo Desenfoque (Backdrop):** `fixed inset-0 z-50 bg-black/30 backdrop-blur-sm`.
- **Animación con Motion:** `initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}` con `transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}`.
- **Cabecera del Modal:** Borde inferior `border-b border-fox-border p-5 flex justify-between items-center`, título en `font-heading font-bold text-fox-text-main`.

---

## 4. Especificación Detallada de Pantallas por Rol

### 4.1. Pantalla de Acceso / Selección de Rol (`/`)
- **Estructura Split 50/50:**
  - **Lado Izquierdo (Hero Informativo - solo Desktop):** Fondo `bg-fox-orange` con efectos circulares desenfocados (`blur-3xl`), logo de FoxMind grande, título destacado en `Montserrat` de 5 niveles ("Tu copiloto pedagógico inteligente"), tres viñetas destacadas con iconos circulares (Tutoría socrática 24/7, Planificación y corrección IA, Accesibilidad DUA integrada) y pie legal.
  - **Lado Derecho (Formulario de Ingreso y Demo):** Formulario estilizado con campos *Correo o Usuario* y *Contraseña*, enlace "¿Olvidaste tu contraseña?", botón primario *"Ingresar"*, separador con etiqueta *"Demostración Rápida"* y 2 tarjetas selectoras de rol directo:
    - **"Soy Docente":** Icono `BookOpen` en círculo verde salvia, borde interactivo verde al hover.
    - **"Soy Alumno":** Icono `GraduationCap` en círculo morado, borde interactivo morado al hover.

---

### 4.2. Pantallas del Rol Docente

#### 4.2.1. Dashboard Docente
- **Cabecera:** Saludo dinámico con fecha y hora actual + botón *"Planificar con IA"* (dispara modal o redirige a Foxy Copiloto).
- **Barra de Atajos Rápidos:** 5 botones horizontales en tarjetas compactas (Agenda, Mis Aulas, Reportes, Mensajes, Configuración).
- **Métricas Operativas (Cuadrícula de 4 KPIs):**
  - Alumnos activos (valor grande en `font-heading` + tag de tendencia `+3%`).
  - Tareas por revisar (con badge destacado naranja).
  - Alertas de riesgo (valor numérico en rojo con icono de alerta).
  - Consultas a Foxy (contador en morado).
- **Semáforo de Riesgo:** Tarjetas de alumnos con barra lateral de color (rojo/amarillo/verde), motivo de la alerta ("Baja entrega de TPs", "Ausencias reiteradas"), badges de adaptaciones DUA y dos botones de acción rápida por alumno: *Mensaje* (abre chat directo) y *Ver Perfil*.
- **Widget Clases del Día:** Cronograma interactivo con horario de inicio/fin, nombre de la materia, aula y botón para iniciar clase.
- **Acceso Rápido Copiloto IA:** Acciones directas *"Crear secuencia didáctica"* y *"Adaptar texto mediante DUA"*.
- **Widget Tareas por Revisar:** Barra de progreso de correcciones y botón para desplegar el drawer lateral de calificación formativa.

#### 4.2.2. Agenda Docente
- **Barra de Navegación de Agenda:** Selector de modalidad Día/Semana/Mes con estilo de pestañas redondeadas (`rounded-xl bg-fox-surface border border-fox-border`).
- **Navegación Temporal:** Botones de mes actual, flechas anterior/siguiente y botón *"Hoy"*.
- **Filtros por Aula y Categoría:** Chips toggleables por materia asignada (Biología 3° A, Química 4° B, Reuniones, General).
- **Cuadrícula de Eventos:** Bloques horarios interactivos con borde izquierdo grueso del color de la materia, título del evento, aula y estado. Al hacer clic se abre el modal de detalle/edición.
- **Panel Lateral del Calendario Oficial Escolar:** Buscador de eventos oficiales, filtros por categorías (*Todos*, *Académico*, *Feriados*, *Jornadas*, *Exámenes*) y botón de un clic para añadir cualquier fecha oficial a la agenda docente personal.
- **Drawer Asistente Foxy:** Asistente conversacional flotante para organizar cronogramas.

#### 4.2.3. Mis Aulas Docente
- **Vista Cuadrícula de Cursos:** Tarjetas con banner del color temático asignado al aula, título de la materia, curso y división, indicadores de alumnos inscriptos, promedio general, avance de la currícula y tareas activas.
- **Modal de Creación de Aula:** Formulario con materia, año, división, color de tema y botón *"Analizar Plan de Estudios con IA"*. Al pulsar, muestra un spinner inteligente mientras estructura el programa en unidades, temas y subtemas ordenables antes de guardar.
- **Vista Detalle de Aula (Navegación por Pestañas Horizontales):**
  1. **Alumnos:** Tabla de alumnos con fotos/avatares, estado de entregas, botón para copiar código de invitación, botón de invitar por correo (dispara un mensaje directo simulado al estudiante) y modal de ficha médica/pedagógica DUA.
  2. **Actividades:** Tarjetas de tareas con fecha límite, cantidad de entregas recibidas, botón *"Crear Actividad"* (permite subir Word/PDF, redactar consignas, ponderar rúbricas analíticas por puntos y revisar las versiones adaptadas DUA de cada consigna antes de publicar).
  3. **Currícula:** Acordeón de unidades con checkboxes de avance pedagógico.
  4. **Biblioteca:** Repositorio de documentos clasificados con opciones para descargar, previsualizar y vincular a actividades.
  5. **Rendimiento:** Gráfico de distribución de notas del aula, tasas de puntualidad y panel de estudiantes con apoyos DUA.
  6. **Muro:** Feed interactivo estilo red social educativa con publicaciones fijadas, botón de asistente de redacción Foxy y comentarios en hilo.

#### 4.2.4. Progreso de Clase
- **Selector de Período:** Semana / Mes / Trimestre + botón de Historial Pedagógico completo.
- **Pestaña Overview:** Gráfico general de rendimiento medio por cursos y retención conceptual.
- **Pestaña Aulas:** Tarjetas comparativas entre comisiones con desglose de conceptos dominados y rezagados.
- **Pestaña Hábitos:** Gráficas de horas de estudio autónomo de los alumnos y días de mayor interacción.
- **Pestaña Logros:** Nivel docente, barra de XP acumulada por planificaciones y retroalimentaciones formativas, y galería de insignias desbloqueadas.
- **Modal de Intervención Asistida:** Asistente que propone un plan de acción para alumnos con bajo rendimiento y redacta el mensaje de seguimiento para el estudiante o preceptor.

#### 4.2.5. Copiloto IA (Foxy) Docente
- **Barra Superior de Contexto:** Selector de aula ("Todas las aulas" o aula específica) para enfocar las respuestas en los temas y perfiles DUA del curso.
- **Espacio de Conversación (Chat):** Burbujas de chat diferenciadas (docente en verde salvia / Foxy con avatar del zorro y fondo blanco), soporte de renderizado Markdown completo, fórmulas y tablas.
- **Caja de Entrada Inteligente:** Botón de micrófono para dictado por voz, botón de adjuntar archivos guía y menú de comandos rápidos (`/`).
- **Biblioteca de Recursos:** Pestaña lateral que lista presentaciones, mapas conceptuales generados, rúbricas e informes listos para abrir en el Canvas interactivo.
- **Canvas / Visor de Presentaciones y Mapas:** Modal a pantalla completa para proyectar láminas interactivas con diapositivas animadas o diagramas conceptuales interactivos con opción *"Asignar al aula"*.
- **Panel de Recomendaciones:** Sugerencias automáticas organizadas en tarjetas con tags: *Prioridad*, *DUA*, *Innovación*.

#### 4.2.6. Mensajes Docente
- **Bandeja de Entrada (Sidebar):** Lista de chats activos con foto, nombre del alumno, última hora de mensaje y badge de no leídos.
- **Área Central de Chat:** Mensajes con soporte para archivos adjuntos, reproductor de notas de voz (`VoiceNotePlayer`) y botón *"Sugerir respuesta con Foxy"* que abre un modal con 3 respuestas prearmadas según el tono (empático, aclaratorio, formal).

#### 4.2.7. Configuración Docente
- **Pestañas:** Perfil, Notificaciones, Preferencias IA, Apariencia & DUA.
- **Formularios con estilo FoxMind:** Toggles personalizados, inputs limpios con foco en naranja, radio-buttons de densidad y tamaño de texto.

---

### 4.3. Pantallas del Rol Alumno

#### 4.3.1. Mi Dashboard Alumno
- **Hero Card de Bienvenida:** Saludo personalizado, avatar de Foxy saludando, mensaje motivacional y tarjeta de sugerencia de repaso inmediato con botón *"Repasar Ahora"*.
- **Barra de Accesos Rápidos (5 accesos):** Carpetas de estudio, Mis Aulas, Mi Progreso, Desafío Express (lanza la trivia interactiva de preguntas cortas) y Mensajes.
- **Resumen Semanal y Experiencia:** Puntos XP ganados en la semana con barra de nivel.
- **Tres Widgets de Monitoreo Diario:**
  - Actividades de hoy (completadas vs asignadas).
  - Tiempo con Foxy (minutos de tutoría socrática).
  - Precisión global (% de aciertos en ejercicios y quizzes).
- **Materias y Agenda Próxima:** Tarjetas de asignaturas cursadas y lista vertical de tareas ordenadas por fecha de vencimiento más próxima.
- **Racha y Logros:** Contador de racha con fuego (🔥) y vitrina de medallas recientes.

#### 4.3.2. Carpeta de Estudio (IA)
- **Vista de Carpetas:** Cuadrícula de carpetas de estudio (Biología, Historia, Programación, etc.) con filtros rápidos (*Todas*, *Aulas vinculadas*, *Estudio personal*), barra de búsqueda y botón *"Nueva Carpeta"*.
- **Modal de Creación de Carpeta:** Nombre, objetivo de estudio, color característico, subida de apuntes o programa guía y disparador *"Analizar con la guía"* para organizar temas automáticamente.
- **Espacio de Estudio y Chat con Foxy:**
  - **Selector de Modo de Tutor:** 3 modos conmutables:
    - *Socrático:* El tutor hace preguntas guiadas para que el alumno descubra la respuesta.
    - *Fácil:* Explica con analogías del día a día y vocabulario sencillo.
    - *Examen:* Actúa como un evaluador estricto con preguntas de examen.
  - **Barra Superior de Herramientas de Estudio:**
    - **Flashcards:** Modal con tarjetas interactivas que giran en 3D al hacer clic; botones inferiores de autoevaluación (*No lo sé*, *Duda*, *Dominado*) conectados al progreso.
    - **Quiz Rápido:** Cuestionario de opción múltiple con explicación inmediata tras cada respuesta.
    - **Resumen:** Generador de resúmenes jerárquicos descargables o copiables.
    - **Mapa Conceptual:** Visualizador de nodos conceptuales interconectados.
    - **Plan de Estudio:** Calendario de repetición espaciada y sesiones recomendadas.
  - **Panel de Apuntes Lateral:** Libreta de notas persistente desplegable mientras se interactúa con Foxy.
  - **Pestañas de la Carpeta:** Alternancia fluida entre *Tutor IA*, *Biblioteca* (archivos de la materia), *Planes* y *Recordatorios*.

#### 4.3.3. Mis Aulas Alumno
- **Listado de Aulas:** Tarjetas de comisiones donde está inscripto con nombre del docente, horario de la próxima clase y botón *"Unirse a un aula con código"*.
- **Navegación Interna del Aula (Pestañas):**
  1. **Muro:** Consultas públicas del aula y avisos del profesor con posibilidad de comentar.
  2. **Actividades:** Pestañas *Pendientes*, *Entregadas* y *Calificadas*.
     - **Detalle de Actividad (`StudentActivityDetail`):** Consigna del docente con botón para escuchar por audio (TTS) y botón para activar el modo de *Lectura Fácil*; lista de materiales adjuntos; formulario de entrega para subir PDF o Word con comentarios y botón de confirmación de entrega.
     - **Tutor Socrático Foxy en la Actividad (`StudentFoxyTutorDrawer`):** Botón flotante en la actividad para abrir a Foxy, pedir pistas paso a paso o formular preguntas conceptuales sin que la IA revele la respuesta final.
  3. **Currícula:** Visualización de unidades y temas en modo lectura con indicación del tema actual en clase.
  4. **Biblioteca:** Recursos y archivos de lectura subidos por el docente.
  5. **Compañeros:** Lista de estudiantes de la clase (restringida: sin acceso a perfiles ni mensajería directa entre ellos para garantizar seguridad).
  6. **Mi Rendimiento:** Gráfica de notas individuales y porcentaje de cumplimiento.

#### 4.3.4. Mi Progreso Alumno
- **Pestaña Overview:** Nivel del estudiante (ej. Nivel 5 - Sabueso del Aprendizaje), barra de progreso de XP hacia el próximo nivel, emblema visual y racha acumulada.
- **Pestaña Materias:** Desglose del porcentaje de dominio por cada asignatura con botón *"Práctica Express"* para reforzar temas con menor puntaje.
- **Pestaña Hábitos:** Tiempo de estudio semanal, constancia diaria y gráfico de retención.
- **Pestaña Logros:** Galería de medallas desbloqueadas y por desbloquear con barra de avance para cada hito.

#### 4.3.5. Mensajes Alumno
- **Regla Estricta de Interacción:** La bandeja sólo muestra conversaciones con profesores o autoridades institucionales (nunca entre alumnos).
- **Tarjeta de Invitaciones Recibidas:** Banner visual que avisa cuando un docente ha invitado al alumno a una nueva aula, con botón destacado *"Aceptar Invitación"* que lo matricula al instante.
- **Área de Conversación:** Mensajes de texto, recepción de notas de voz del docente y envío de dudas con archivos adjuntos.

#### 4.3.6. Configuración Alumno
- **Secciones:** Perfil (foto, nombre, correo institucional no editable, intereses y metas), Notificaciones, Preferencias de IA (estilo de aprendizaje, socrático estricto, resúmenes automáticos), Apariencia & DUA y Seguridad (gestión de contraseña y dispositivos).

---

## 5. Panel Flotante Universal de Accesibilidad DUA

El componente `AccessibilityPanel` permanece disponible en todas las vistas de la plataforma para garantizar la accesibilidad universal en cualquier momento:

- **Disparador:** Botón circular flotante fijo en la esquina inferior derecha (`bottom-6 right-6 z-50 w-14 h-14 bg-[#3BB54A] text-white rounded-full shadow-lg`).
- **Comportamiento Accesible (WAI-ARIA & Keyboard Navigation):**
  - Soporte completo para navegación por teclado: flechas `Arriba` y `Abajo` entre controles, tecla `Escape` para cerrar, tecla `Enter` o `Espacio` para conmutar opciones.
  - Al abrirse, el foco se sitúa automáticamente en el primer control interactivo (`dyslexicRef`).
  - Fondo desenfocado con cierre al pulsar fuera (*click-outside backdrop*).
- **Controles Disponibles en el Panel:**
  1. **Fuente OpenDyslexic (Toggle):** Reemplaza todas las tipografías del DOM por `OpenDyslexic` con pesos compensados en la base de cada glifo para prevenir la rotación visual involuntaria de letras.
  2. **Alto Contraste (Toggle):** Aplica la clase `high-contrast` forzando texto negro puro sobre fondo blanco puro y contraste aumentado al 200%.
  3. **Lectura Fácil (Toggle):** Aplica la clase `easy-read` ampliando el interlineado a `1.6`, el espaciado entre letras a `0.03em` y el espaciado de palabras a `0.05em`.
  4. **Tamaño de Texto (Radio Group A / A+ / A++):** Modifica el tamaño tipográfico base global entre Pequeño (`S`), Normal (`M`) y Grande (`L`).

---

## 6. Pautas de Interacción y Micro-Animaciones (UX Polish)

- **Transiciones Suaves:** Todos los estados interactivos (hover, active, focus) utilizan `transition-all duration-200 ease-in-out`.
- **Feedback Háptico Visual:** Los botones implementan escala sutil al interactuar (`whileTap={{ scale: 0.98 }}`).
- **Animaciones de Entrada (Motion):** Las tarjetas y modales aparecen con un leve deslizamiento vertical (`y: 15 -> 0`) y desvanecimiento (`opacity: 0 -> 1`).
- **Giro 3D en Flashcards:** Las tarjetas de memoria de estudio utilizan `perspective: 1000px` y `transform: rotateY(180deg)` con `transform-style: preserve-3d` para una rotación realista.
- **Scrollbars Sutiles:** Las áreas con scroll interno utilizan un carril transparente y un pulgar redondeado fino (`6px`) en color `fox-border` para evitar ruidos visuales.
