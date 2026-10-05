import type { MuroPost } from '../model/ClassroomWall';

export const createWallFixtures = (): MuroPost[] => [
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
