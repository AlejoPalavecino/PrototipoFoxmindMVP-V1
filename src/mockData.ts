import { StudentRisk, Classroom, ChatMessage, StudyFolder, Achievement, MuroPost } from './types';

export const mockStudentsRisk: StudentRisk[] = [
  { id: '1', name: 'Marcos Pérez', course: '3° A', riskLevel: 'ALTO', reason: 'Sin entregas hace 8 días' },
  { id: '2', name: 'Sofía Herrera', course: '3° B', riskLevel: 'MEDIO', reason: 'Baja participación en Foxy', duaProfile: ['Dislexia'] },
  { id: '3', name: 'Lucas Díaz', course: '2° A', riskLevel: 'MEDIO', reason: 'Nota en caída' },
  { id: '4', name: 'Ana Torres', course: '3° A', riskLevel: 'BAJO', reason: 'En seguimiento' },
  { id: '5', name: 'Tomás Gómez', course: '2° B', riskLevel: 'BAJO', reason: 'Estable', duaProfile: ['TDAH'] },
];

export const mockClassroomsDocente: Classroom[] = [
  { id: 'c1', subject: 'Literatura', course: '3°A', studentsCount: 28, progress: 65, activeTasks: 3, pendingSubmissions: 5, avgGrade: 7.8, color: 'bg-fox-purple' },
  { id: 'c3', subject: 'Matemáticas', course: '3°B', studentsCount: 26, progress: 70, activeTasks: 4, pendingSubmissions: 10, avgGrade: 6.5, color: 'bg-fox-orange' },
  { id: 'c4', subject: 'Ciencias', course: '2°A', studentsCount: 29, progress: 55, activeTasks: 2, pendingSubmissions: 1, avgGrade: 8.5, color: 'bg-fox-green' },
];

export let mockClassroomsAlumno: Classroom[] = [
  { id: 'c1', subject: 'Literatura', course: '3°A', studentsCount: 28, progress: 80, activeTasks: 1, pendingSubmissions: 0, avgGrade: 8.5, color: 'bg-fox-purple', teacherName: 'Profa. Martínez', nextClass: 'Mañana 10:00', lastActivity: 'Ayer' },
  { id: 'c3', subject: 'Matemáticas', course: '3°A', studentsCount: 28, progress: 50, activeTasks: 1, pendingSubmissions: 1, avgGrade: 6.0, color: 'bg-fox-orange', teacherName: 'Prof. Silva', nextClass: 'Viernes 11:30', lastActivity: 'Hoy' },
  { id: 'c4', subject: 'Ciencias', course: '3°A', studentsCount: 28, progress: 75, activeTasks: 0, pendingSubmissions: 0, avgGrade: 9.0, color: 'bg-fox-green', teacherName: 'Profa. Ruiz', nextClass: 'Lunes 09:00', lastActivity: 'Hace 1 semana' },
];

export const addClassroomToAlumno = (classroom: Partial<Classroom> & { id: string; subject: string; course: string }) => {
  const existing = mockClassroomsAlumno.find(c => c.id === classroom.id || (c.subject === classroom.subject && c.course === classroom.course));
  if (existing) return existing;

  const newClassroom: Classroom = {
    id: classroom.id,
    subject: classroom.subject,
    course: classroom.course,
    studentsCount: classroom.studentsCount || 26,
    progress: classroom.progress || 0,
    activeTasks: classroom.activeTasks ?? 1,
    pendingSubmissions: 0,
    avgGrade: classroom.avgGrade || 0,
    color: classroom.color || 'bg-fox-blue',
    teacherName: classroom.teacherName || 'Docente Titular',
    nextClass: classroom.nextClass || 'Próximamente',
    lastActivity: 'Recién unida'
  };

  mockClassroomsAlumno = [newClassroom, ...mockClassroomsAlumno];
  return newClassroom;
};

export const updateClassroomsAlumno = (classrooms: Classroom[]) => {
  mockClassroomsAlumno = classrooms;
};

export const mockCopilotoMessages: ChatMessage[] = [
  { id: 'm1', sender: 'user', text: 'Necesito una evaluación para el tema Vanguardias Literarias, con rúbrica.', timestamp: '10:00' },
  { id: 'm2', sender: 'ai', text: '📋 Generando evaluación... Aquí tienes:\n**Evaluación — Vanguardias Literarias**\nCriterios: Comprensión lectora (30%), Análisis crítico (40%), Producción escrita (30%)\nRúbrica incluida con 4 niveles de desempeño...', timestamp: '10:01' },
];

export const mockEstudiaMessages: ChatMessage[] = [
  { id: 'e1', sender: 'user', text: 'No entiendo la diferencia entre el Ultraísmo y el Creacionismo. ¿Me explicás?', timestamp: '15:30' },
  { id: 'e2', sender: 'ai', text: '¡Buena pregunta, Valentina! Antes de explicarte, te hago una pregunta para activar lo que ya sabés: ¿Recordás en qué país surgió cada movimiento? Pensá un momento... 🤔', timestamp: '15:30' },
  { id: 'e3', sender: 'user', text: 'Creo que el Ultraísmo es de España...', timestamp: '15:31' },
  { id: 'e4', sender: 'ai', text: '¡Exacto! El Ultraísmo nació en España con Guillermo de Torre. Ahora, ¿y el Creacionismo? Aquí va una pista: pensá en Vicente Huidobro y en un país sudamericano 🌎', timestamp: '15:31' },
  { id: 'e5', sender: 'user', text: '¿Chile?', timestamp: '15:32' },
  { id: 'e6', sender: 'ai', text: '¡Perfecto! 🎉 Huidobro era chileno. Ahora construyamos la diferencia juntos: el Ultraísmo busca la imagen pura eliminando todo lo decorativo. El Creacionismo propone que el poeta debe CREAR la realidad, no imitarla. ¿Podés explicarme con tus palabras qué entendiste? 💬', timestamp: '15:32' },
];

export const mockStudyFolders: StudyFolder[] = [
  { 
    id: 'f1', 
    name: 'Examen Final — Literatura', 
    linkedClassroom: 'Literatura 3°A', 
    nextReview: 'Hoy', 
    progress: 68,
    color: 'purple',
    focusArea: 'Preparación de Examen / Parcial',
    observation: 'Repasar autores del modernismo y vanguardias latinoamericanas.',
    topics: [
      { id: 'u1', name: 'Unidad 1: Modernismo y Simbolismo', subtopics: ['Rubén Darío y Azul...', 'Métrica y sonoridad', 'Exotismo modernista'] },
      { id: 'u2', name: 'Unidad 2: Vanguardias Literarias', subtopics: ['Creacionismo (Huidobro)', 'Ultraísmo (Guillermo de Torre)', 'Manifiestos y ruptura'] }
    ]
  },
  { 
    id: 'f2', 
    name: 'Fracciones y Decimales', 
    linkedClassroom: 'Matemáticas 3°A', 
    nextReview: 'Mañana', 
    progress: 45,
    color: 'orange',
    focusArea: 'Repaso Semanal de Clases',
    observation: 'Practicar ejercicios combinados con números racionales.',
    topics: [
      { id: 'u1', name: 'Unidad 1: Operaciones Básicas', subtopics: ['Suma y resta con distinto denominador', 'Multiplicación y simplificación'] },
      { id: 'u2', name: 'Unidad 2: Conversión a Decimales', subtopics: ['Fracciones periódicas', 'Representación en la recta'] }
    ]
  },
  { 
    id: 'f3', 
    name: 'Revolución Francesa', 
    linkedClassroom: 'Historia 3°A', 
    nextReview: 'Jueves', 
    progress: 30,
    color: 'blue',
    focusArea: 'Refuerzo Conceptual',
    observation: 'Foco en la cronología desde los Estados Generales hasta la Convención.',
    topics: [
      { id: 'u1', name: 'Unidad 1: Causas y Estados Generales', subtopics: ['Crisis económica de 1789', 'Toma de la Bastilla', 'Declaración de Derechos'] },
      { id: 'u2', name: 'Unidad 2: Etapa Republicana y el Terror', subtopics: ['Ejecución de Luis XVI', 'Robespierre y la Convención Nacional'] }
    ]
  },
  { 
    id: 'f4', 
    name: 'Mi preparación personal', 
    isPersonal: true, 
    nextReview: 'Viernes', 
    progress: 20,
    color: 'green',
    focusArea: 'Lectura y Resúmenes',
    observation: 'Espacio para hábitos de estudio autónomo.',
    topics: [
      { id: 'u1', name: 'Módulo 1: Técnicas de Aprendizaje', subtopics: ['Active Recall y repetición espaciada', 'Mapas conceptuales interactivos'] }
    ]
  },
];

export let sharedActivities = [
  { 
    id: 1, 
    title: 'Ensayo: Vanguardias Literarias', 
    type: 'Evaluación', 
    status: 'Activa', 
    due: 'Mañana', 
    submissions: '23/28', 
    description: 'Lee los manifiestos adjuntos de Vicente Huidobro y Guillermo de Torre. Luego, redacta un breve ensayo (max. 500 palabras) comparando cómo cada movimiento aborda la creación de imágenes poéticas.',
    longInstructions: [
      { title: 'Lectura y Análisis', content: 'Debes leer cuidadosamente el "Manifiesto Non Serviam" de Huidobro y "Hélices" de Guillermo de Torre. Toma nota de los conceptos principales sobre la creación poética.' },
      { title: 'Estructura del Ensayo', content: 'El ensayo debe estructurarse en tres partes: una breve introducción presentando ambos movimientos, el cuerpo principal donde contrastarás las ideas de los autores, y la conclusión personal.' },
      { title: 'Extensión y Formato', content: 'El ensayo debe tener entre 300 y 500 palabras. Utiliza fuente tipográfica legible.' },
      { title: 'Citas y Referencias', content: 'Al menos debes incorporar dos citas textuales de cada autor para respaldar tus argumentos.' }
    ],
    attachment: { name: 'Instrucciones_Ensayo.pdf', size: '2.4 MB', url: '#' } 
  },
  { id: 2, title: 'Foro: El Boom Latinoamericano', type: 'Participación', status: 'Activa', due: 'En 3 días', submissions: '15/28', description: 'Participa en el foro debatiendo sobre el impacto del Realismo Mágico en la literatura europea. Debes comentar al menos a dos compañeros.', longInstructions: [] },
  { id: 3, title: 'Cuestionario: Modernismo', type: 'Práctica', status: 'Cerrada', due: 'Semana pasada', submissions: '28/28', description: 'Cuestionario de opción múltiple sobre las características principales del Modernismo y la obra de Rubén Darío.', longInstructions: [] },
];

// Live compatibility exports: classrooms owns the same synchronous session array.
export {
  submissions as sharedSubmissions,
  replaceSubmissions as updateSharedSubmissions,
} from './features/classrooms/data/inMemorySubmissionRepository';

export const updateSharedActivities = (newActivities: any[]) => {
  sharedActivities = newActivities;
};

export let sharedMuroPosts: MuroPost[] = [
  {
    id: 'post-1',
    authorName: 'Profa. Martínez',
    authorRole: 'docente',
    timestamp: 'Hoy a las 09:30',
    title: '📢 Pautas para la entrega del Ensayo de Vanguardias',
    content: 'Estimados alumnos: Recuerden que para la entrega de mañana deben incluir al menos 2 citas textuales de los manifiestos trabajados en clase (Huidobro y De Torre). Quienes tengan dudas sobre la citación pueden consultar los materiales en la Biblioteca.',
    isPinned: true,
    type: 'announcement',
    attachment: { name: 'Guia_Citacion_APA7.pdf', size: '1.2 MB', type: 'PDF' },
    likesCount: 14,
    isLiked: false,
    comments: [
      {
        id: 'c-1',
        authorName: 'Sofía Herrera',
        authorRole: 'alumno',
        timestamp: 'Hoy a las 10:15',
        content: '¡Gracias profe! ¿La extensión máxima sigue siendo de 500 palabras?'
      },
      {
        id: 'c-2',
        authorName: 'Profa. Martínez',
        authorRole: 'docente',
        timestamp: 'Hoy a las 10:20',
        content: 'Exactamente Sofía, entre 300 y 500 palabras. ¡Éxitos!'
      }
    ]
  },
  {
    id: 'post-2',
    authorName: 'Foxy Copiloto',
    authorRole: 'foxy',
    timestamp: 'Ayer a las 16:00',
    title: '✨ Nuevo material disponible en la Biblioteca',
    content: 'Se ha agregado el documento "Manual de Biología Celular y Guía de Trabajos Prácticos" a la pestaña de Biblioteca del aula para consulta libre.',
    isPinned: false,
    type: 'material_notice',
    likesCount: 9,
    isLiked: true,
    comments: []
  },
  {
    id: 'post-3',
    authorName: 'Lucas Díaz',
    authorRole: 'alumno',
    timestamp: 'Hace 2 días',
    title: 'Consulta sobre el grupo de estudio de literatura',
    content: 'Hola a todos, armamos una sala de estudio colaborativo con Foxy para repasar el Modernismo este jueves a las 18 hs. ¡El que quiera sumarse es bienvenido!',
    isPinned: false,
    type: 'doubt',
    likesCount: 11,
    isLiked: false,
    comments: [
      {
        id: 'c-3',
        authorName: 'Valentina Gómez',
        authorRole: 'alumno',
        timestamp: 'Hace 2 días',
        content: '¡Me sumo! Paso el enlace por el chat de grupo.'
      }
    ]
  }
];

export const updateSharedMuroPosts = (newPosts: MuroPost[]) => {
  sharedMuroPosts = newPosts;
};

export const mockAchievements: Achievement[] = [

  { id: 'a1', title: 'Racha Semanal', icon: '🔥', earned: true },
  { id: 'a2', title: 'Maestro del Active Recall', icon: '🧠', earned: true },
  { id: 'a3', title: 'Organizador', icon: '📁', earned: true, description: '3 carpetas creadas' },
  { id: 'a4', title: 'Superador', icon: '🌟', earned: true, description: 'Mejoró nota después de error' },
  { id: 'a5', title: 'Consistente', icon: '🎯', earned: false, description: '30 días de racha' },
];
