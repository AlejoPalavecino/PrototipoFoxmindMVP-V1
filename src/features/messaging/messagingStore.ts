import { Conversation, DirectMessageItem, MessageAttachment, MessageReaction, Role, ClassroomInvitationData } from '../../types';
import { classroomRepository } from '../classrooms';
import { loadMessagingConversations, saveMessagingConversations } from './messagingPersistence';
import { sendClassroomInvitation, respondToClassroomInvitation } from './application/classroomInvitation';
import type { SendClassroomInvitationParams, RespondToClassroomInvitationParams } from './application/classroomInvitation';

// Initial pre-populated conversations with true bidirectional link between Docente and Alumno
const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'dm-laura-valentina',
    type: 'direct',
    title: 'Valentina Rodríguez',
    subtitle: 'Alumna — 3° Año B (Literatura)',
    avatarInitial: 'VR',
    colorScheme: 'fox-purple',
    classroomLink: 'c1',
    participants: [
      { id: 'docente-laura', name: 'Prof. Laura Martínez', role: 'docente', course: 'Literatura 3°A/B', status: 'online' },
      { id: 'alumno-valentina', name: 'Valentina Rodríguez', role: 'alumno', course: '3° Año B', status: 'online' }
    ],
    lastMessage: 'Escuché tu audio Valentina. La idea de vincular la ruptura del verso libre...',
    lastMessageTime: '09:25',
    lastMessageSender: 'Prof. Laura Martínez',
    unreadCountDocente: 0,
    unreadCountAlumno: 1,
    isPinned: true,
    tags: ['Literatura', '3°B', 'Ensayo'],
    messages: [
      {
        id: 'msg-lv-1',
        senderId: 'docente-laura',
        senderName: 'Prof. Laura Martínez',
        senderRole: 'docente',
        text: 'Hola Valentina, estuve revisando tu borrador inicial sobre las Vanguardias Literarias. Muy buen desarrollo del concepto de imagen en el Creacionismo.',
        timestamp: 'Ayer 16:40',
        dateGroup: 'Ayer',
        status: 'read',
        reactions: [{ emoji: '❤️', count: 1, users: ['Valentina Rodríguez'] }]
      },
      {
        id: 'msg-lv-2',
        senderId: 'alumno-valentina',
        senderName: 'Valentina Rodríguez',
        senderRole: 'alumno',
        text: '¡Muchas gracias profe! Quería consultarle si para el ensayo final de mañana es necesario incorporar también el "Manifiesto Non Serviam" de Huidobro.',
        timestamp: 'Ayer 17:05',
        dateGroup: 'Ayer',
        status: 'read',
        categoryTag: 'Duda TP'
      },
      {
        id: 'msg-lv-3',
        senderId: 'docente-laura',
        senderName: 'Prof. Laura Martínez',
        senderRole: 'docente',
        text: '¡Exactamente! Es obligatorio citar al menos dos fragmentos textuales (Huidobro y De Torre). Te comparto la guía resumida de citación académica para que no te queden dudas.',
        timestamp: 'Ayer 17:15',
        dateGroup: 'Ayer',
        status: 'read',
        attachment: {
          id: 'att-apa',
          name: 'Guia_Citacion_APA7_Secundaria.pdf',
          size: '1.4 MB',
          type: 'pdf'
        }
      },
      {
        id: 'msg-lv-4',
        senderId: 'alumno-valentina',
        senderName: 'Valentina Rodríguez',
        senderRole: 'alumno',
        text: 'Genial profe, ya lo leí. Le grabo una consulta rápida sobre la conclusión de mi ensayo para ver si voy bien encaminada.',
        timestamp: 'Hoy 09:10',
        dateGroup: 'Hoy',
        status: 'read'
      },
      {
        id: 'msg-lv-5',
        senderId: 'alumno-valentina',
        senderName: 'Valentina Rodríguez',
        senderRole: 'alumno',
        text: '🎙️ Nota de voz: Consulta sobre el párrafo final y la metáfora de la máquina futurista.',
        timestamp: 'Hoy 09:12',
        dateGroup: 'Hoy',
        status: 'read',
        attachment: {
          id: 'att-audio-1',
          name: 'Audio_Consulta_Conclusion.m4a',
          size: '340 KB',
          type: 'audio',
          duration: '0:28'
        }
      },
      {
        id: 'msg-lv-6',
        senderId: 'docente-laura',
        senderName: 'Prof. Laura Martínez',
        senderRole: 'docente',
        text: 'Escuché tu audio Valentina. La idea de vincular la ruptura del verso libre con la velocidad del Futurismo es excelente. Dale para adelante con esa conclusión.',
        timestamp: 'Hoy 09:25',
        dateGroup: 'Hoy',
        status: 'read',
        reactions: [{ emoji: '👏', count: 1, users: ['Valentina Rodríguez'] }, { emoji: '💡', count: 1, users: ['Valentina Rodríguez'] }]
      }
    ]
  },
  {
    id: 'dm-carlos-valentina',
    type: 'direct',
    title: 'Prof. Carlos Silva (Matemática)',
    subtitle: 'Docente — Matemáticas 3°A/B',
    avatarInitial: 'CS',
    colorScheme: 'fox-blue',
    classroomLink: 'c3',
    participants: [
      { id: 'docente-carlos', name: 'Prof. Carlos Silva', role: 'docente', course: 'Matemáticas 3°A/B', status: 'online' },
      { id: 'alumno-valentina', name: 'Valentina Rodríguez', role: 'alumno', course: '3° Año B', status: 'online' }
    ],
    lastMessage: 'Excelente Valentina, la resolución de la función cuadrática está perfecta.',
    lastMessageTime: 'Ayer 18:30',
    lastMessageSender: 'Prof. Carlos Silva',
    unreadCountDocente: 0,
    unreadCountAlumno: 0,
    isPinned: false,
    tags: ['Matemáticas', '3°B'],
    messages: [
      {
        id: 'msg-cv-1',
        senderId: 'alumno-valentina',
        senderName: 'Valentina Rodríguez',
        senderRole: 'alumno',
        text: 'Hola Profe Carlos, ¿el gráfico del ejercicio 4 debe tener marcado el vértice y el eje de simetría?',
        timestamp: 'Ayer 17:40',
        dateGroup: 'Ayer',
        status: 'read',
        categoryTag: 'Duda TP'
      },
      {
        id: 'msg-cv-2',
        senderId: 'docente-carlos',
        senderName: 'Prof. Carlos Silva',
        senderRole: 'docente',
        text: 'Hola Valentina. Sí, exactamente. Recordá señalar las raíces reales y el vértice (-b/2a; f(-b/2a)).',
        timestamp: 'Ayer 18:00',
        dateGroup: 'Ayer',
        status: 'read'
      },
      {
        id: 'msg-cv-3',
        senderId: 'docente-carlos',
        senderName: 'Prof. Carlos Silva',
        senderRole: 'docente',
        text: 'Excelente Valentina, la resolución de la función cuadrática está perfecta.',
        timestamp: 'Ayer 18:30',
        dateGroup: 'Ayer',
        status: 'read',
        reactions: [{ emoji: '👍', count: 1, users: ['Valentina Rodríguez'] }]
      }
    ]
  },
  {
    id: 'dm-gomez-valentina',
    type: 'direct',
    title: 'Prof. Daniel Gómez (Historia)',
    subtitle: 'Docente — Historia Contemporánea 3°A',
    avatarInitial: 'DG',
    colorScheme: 'fox-orange',
    classroomLink: 'c2',
    participants: [
      { id: 'docente-gomez', name: 'Prof. Daniel Gómez', role: 'docente', course: 'Historia 3°A', status: 'online' },
      { id: 'alumno-valentina', name: 'Valentina Rodríguez', role: 'alumno', course: '3° Año B', status: 'online' }
    ],
    lastMessage: '🎓 Invitación al aula Historia Contemporánea (3°A)',
    lastMessageTime: 'Hoy 10:45',
    lastMessageSender: 'Prof. Daniel Gómez',
    unreadCountDocente: 0,
    unreadCountAlumno: 1,
    isPinned: false,
    tags: ['Historia', '3°A', 'Invitación'],
    messages: [
      {
        id: 'msg-gv-1',
        senderId: 'docente-gomez',
        senderName: 'Prof. Daniel Gómez',
        senderRole: 'docente',
        text: 'Hola Valentina, recuerden que para la línea de tiempo pueden usar fuentes primarias del archivo digital escolar.',
        timestamp: 'Lun 14:10',
        dateGroup: 'Lunes',
        status: 'read'
      },
      {
        id: 'msg-gv-invitation-1',
        senderId: 'docente-gomez',
        senderName: 'Prof. Daniel Gómez',
        senderRole: 'docente',
        text: 'Hola Valentina, te comparto la invitación formal para sumarte al aula virtual de Historia Contemporánea 3°A. Podés unirte directamente aceptando la invitación desde esta tarjeta o ingresando con el código de clase.',
        timestamp: 'Hoy 10:45',
        dateGroup: 'Hoy',
        status: 'delivered',
        categoryTag: 'Invitación',
        invitation: {
          classroomId: 'c2',
          subject: 'Historia',
          course: '3°A',
          teacherName: 'Prof. Daniel Gómez',
          code: 'HIST-3A-2026',
          status: 'pending',
          color: 'bg-fox-blue',
          schedule: ['Jueves 08:00 a 09:30 hs', 'Viernes 11:30 hs'],
          description: 'Espacio curricular de análisis histórico contemporáneo, fuentes primarias y procesos sociopolíticos.',
          activeTasks: 2
        }
      }
    ]
  },
  {
    id: 'chan-3a-literatura',
    type: 'channel',
    title: 'Canal 3°A — Literatura',
    subtitle: 'Canal general de la clase, anuncios y consultas académicas',
    avatarInitial: '3A',
    colorScheme: 'fox-primary',
    classroomLink: 'c1',
    participants: [
      { id: 'docente-laura', name: 'Prof. Laura Martínez', role: 'docente', course: 'Literatura 3°A/B', status: 'online' },
      { id: 'alumno-valentina', name: 'Valentina Rodríguez', role: 'alumno', course: '3°A', status: 'online' },
      { id: 'alumno-tomas', name: 'Tomás Gómez', role: 'alumno', course: '3°A', status: 'away' },
      { id: 'alumno-sofia', name: 'Sofía Herrera', role: 'alumno', course: '3°A', status: 'online' },
      { id: 'alumno-lucas', name: 'Lucas Díaz', role: 'alumno', course: '3°A', status: 'offline' }
    ],
    lastMessage: 'Sí Tomás, está cargada en la sección de Aulas > Literatura.',
    lastMessageTime: '09:45',
    lastMessageSender: 'Prof. Laura Martínez',
    unreadCountDocente: 0,
    unreadCountAlumno: 0,
    isPinned: true,
    tags: ['Aula', 'Grupo', '3°A'],
    messages: [
      {
        id: 'msg-c3a-1',
        senderId: 'docente-laura',
        senderName: 'Prof. Laura Martínez',
        senderRole: 'docente',
        text: '📢 Estimados alumnos: Les recuerdo que mañana viernes a las 23:59 vence el plazo para subir el Ensayo de Vanguardias al aula. Recuerden revisar la rúbrica antes de entregar.',
        timestamp: 'Hoy 08:30',
        dateGroup: 'Hoy',
        status: 'read',
        categoryTag: 'Aviso',
        reactions: [{ emoji: '👍', count: 8, users: ['Valentina Rodríguez', 'Sofía Herrera', 'Tomás Gómez'] }]
      },
      {
        id: 'msg-c3a-2',
        senderId: 'alumno-sofia',
        senderName: 'Sofía Herrera',
        senderRole: 'alumno',
        text: 'Hola profe, ¿el trabajo se puede enviar en formato PDF o también Word?',
        timestamp: 'Hoy 09:00',
        dateGroup: 'Hoy',
        status: 'read',
        categoryTag: 'Duda TP'
      },
      {
        id: 'msg-c3a-3',
        senderId: 'docente-laura',
        senderName: 'Prof. Laura Martínez',
        senderRole: 'docente',
        text: 'Preferentemente en PDF para mantener la fidelidad tipográfica y el diseño del ensayo.',
        timestamp: 'Hoy 09:05',
        dateGroup: 'Hoy',
        status: 'read',
        replyTo: {
          id: 'msg-c3a-2',
          senderName: 'Sofía Herrera',
          text: 'Hola profe, ¿el trabajo se puede enviar en formato PDF o también Word?'
        }
      },
      {
        id: 'msg-c3a-4',
        senderId: 'alumno-tomas',
        senderName: 'Tomás Gómez',
        senderRole: 'alumno',
        text: 'Profe, ¿dónde podemos consultar los 4 criterios de evaluación?',
        timestamp: 'Hoy 09:40',
        dateGroup: 'Hoy',
        status: 'read'
      },
      {
        id: 'msg-c3a-5',
        senderId: 'docente-laura',
        senderName: 'Prof. Laura Martínez',
        senderRole: 'docente',
        text: 'Sí Tomás, está cargada en la sección de Aulas > Literatura > Actividad "Ensayo: Vanguardias".',
        timestamp: 'Hoy 09:45',
        dateGroup: 'Hoy',
        status: 'read'
      }
    ]
  },
  {
    id: 'dm-laura-sofia',
    type: 'direct',
    title: 'Sofía Herrera',
    subtitle: 'Alumna — 3° Año B (Perfil DUA: Dislexia)',
    avatarInitial: 'SH',
    colorScheme: 'fox-green',
    classroomLink: 'c1',
    participants: [
      { id: 'docente-laura', name: 'Prof. Laura Martínez', role: 'docente', course: 'Literatura 3°A/B', status: 'online' },
      { id: 'alumno-sofia', name: 'Sofía Herrera', role: 'alumno', course: '3°B', status: 'online', duaProfile: ['Dislexia'] }
    ],
    lastMessage: 'Profe, activé la tipografía OpenDyslexic en la barra y me ayudó un montón.',
    lastMessageTime: 'Ayer',
    lastMessageSender: 'Sofía Herrera',
    unreadCountDocente: 1,
    unreadCountAlumno: 0,
    isPinned: false,
    tags: ['DUA', 'Literatura'],
    messages: [
      {
        id: 'msg-ls-1',
        senderId: 'docente-laura',
        senderName: 'Prof. Laura Martínez',
        senderRole: 'docente',
        text: 'Hola Sofía, ¿cómo vas con la lectura de los poemas de Darío? Si necesitás la versión con audio integrado avisame.',
        timestamp: 'Ayer 11:00',
        dateGroup: 'Ayer',
        status: 'read'
      },
      {
        id: 'msg-ls-2',
        senderId: 'alumno-sofia',
        senderName: 'Sofía Herrera',
        senderRole: 'alumno',
        text: '¡Hola profe! Activé la tipografía OpenDyslexic en el panel de accesibilidad y me ayudó un montón a no cansar la vista. Ya completé la primera parte.',
        timestamp: 'Ayer 15:30',
        dateGroup: 'Ayer',
        status: 'delivered',
        reactions: [{ emoji: '🌟', count: 1, users: ['Prof. Laura Martínez'] }]
      }
    ]
  },
  {
    id: 'dm-laura-tomas',
    type: 'direct',
    title: 'Tomás Gómez',
    subtitle: 'Alumno — 2° Año B (Perfil DUA: TDAH)',
    avatarInitial: 'TG',
    colorScheme: 'fox-orange',
    classroomLink: 'c4',
    participants: [
      { id: 'docente-laura', name: 'Prof. Laura Martínez', role: 'docente', course: 'Literatura 3°A/B', status: 'online' },
      { id: 'alumno-tomas', name: 'Tomás Gómez', role: 'alumno', course: '2°B', status: 'away', duaProfile: ['TDAH'] }
    ],
    lastMessage: 'Terminé el paso 2 de la guía fraccionada en bloques de 15 minutos.',
    lastMessageTime: 'Lun',
    lastMessageSender: 'Tomás Gómez',
    unreadCountDocente: 0,
    unreadCountAlumno: 0,
    isPinned: false,
    tags: ['Seguimiento', 'TDAH'],
    messages: [
      {
        id: 'msg-lt-1',
        senderId: 'docente-laura',
        senderName: 'Prof. Laura Martínez',
        senderRole: 'docente',
        text: 'Hola Tomás, te dividí la actividad en 3 mini pasos con temporizador Pomodoro en Foxy para que sea más dinámico.',
        timestamp: 'Lun 10:15',
        dateGroup: 'Lunes',
        status: 'read'
      },
      {
        id: 'msg-lt-2',
        senderId: 'alumno-tomas',
        senderName: 'Tomás Gómez',
        senderRole: 'alumno',
        text: '¡Muchas gracias profe! Terminé el paso 2 de la guía fraccionada en bloques de 15 minutos.',
        timestamp: 'Lun 16:30',
        dateGroup: 'Lunes',
        status: 'read'
      }
    ]
  },
  {
    id: 'dm-laura-lucas',
    type: 'direct',
    title: 'Lucas Díaz',
    subtitle: 'Alumno — 3° Año A',
    avatarInitial: 'LD',
    colorScheme: 'fox-primary',
    classroomLink: 'c1',
    participants: [
      { id: 'docente-laura', name: 'Prof. Laura Martínez', role: 'docente', course: 'Literatura 3°A/B', status: 'online' },
      { id: 'alumno-lucas', name: 'Lucas Díaz', role: 'alumno', course: '3°A', status: 'offline' }
    ],
    lastMessage: 'Profe, ya subí la corrección con las citas bibliográficas.',
    lastMessageTime: 'Mar 15:20',
    lastMessageSender: 'Lucas Díaz',
    unreadCountDocente: 0,
    unreadCountAlumno: 0,
    isPinned: false,
    tags: ['Literatura', '3°A'],
    messages: [
      {
        id: 'msg-ll-1',
        senderId: 'alumno-lucas',
        senderName: 'Lucas Díaz',
        senderRole: 'alumno',
        text: 'Hola profe, ya subí la corrección con las citas bibliográficas requeridas al aula virtual.',
        timestamp: 'Mar 15:20',
        dateGroup: 'Martes',
        status: 'read'
      }
    ]
  },
  {
    id: 'dm-prof-carlos',
    type: 'direct',
    title: 'Prof. Carlos Silva (Matemática)',
    subtitle: 'Docente — Departamento de Ciencias Exactas',
    avatarInitial: 'CS',
    colorScheme: 'fox-blue',
    classroomLink: 'c3',
    participants: [
      { id: 'docente-laura', name: 'Prof. Laura Martínez', role: 'docente', course: 'Literatura 3°A/B', status: 'online' },
      { id: 'docente-carlos', name: 'Prof. Carlos Silva', role: 'docente', course: 'Matemática', status: 'online' }
    ],
    lastMessage: '¿Coordinamos el proyecto interdisciplinario de estadística y literatura?',
    lastMessageTime: '10:15',
    lastMessageSender: 'Prof. Carlos Silva',
    unreadCountDocente: 1,
    unreadCountAlumno: 0,
    isPinned: false,
    tags: ['Colegas', 'Docentes'],
    messages: [
      {
        id: 'msg-pc-1',
        senderId: 'docente-carlos',
        senderName: 'Prof. Carlos Silva',
        senderRole: 'docente',
        text: 'Hola Laura, ¿cómo estás? Te consulto si te parece que coordinemos el proyecto interdisciplinario de análisis estadístico de vocabulario en el Modernismo.',
        timestamp: 'Hoy 10:15',
        dateGroup: 'Hoy',
        status: 'delivered'
      }
    ]
  },
  {
    id: 'dm-directora',
    type: 'direct',
    title: 'Directora Elena Valenzuela',
    subtitle: 'Equipo Directivo — Escuela Secundaria',
    avatarInitial: 'EV',
    colorScheme: 'fox-orange',
    participants: [
      { id: 'docente-laura', name: 'Prof. Laura Martínez', role: 'docente', course: 'Literatura 3°A/B', status: 'online' },
      { id: 'directivo-elena', name: 'Directora Elena Valenzuela', role: 'directivo', status: 'online' }
    ],
    lastMessage: 'Por favor, revise las planillas de seguimiento DUA para la reunión del viernes.',
    lastMessageTime: '10:30',
    lastMessageSender: 'Directora Elena Valenzuela',
    unreadCountDocente: 2,
    unreadCountAlumno: 0,
    isPinned: true,
    tags: ['Institucional', 'Directivo'],
    messages: [
      {
        id: 'msg-de-1',
        senderId: 'directivo-elena',
        senderName: 'Directora Elena Valenzuela',
        senderRole: 'directivo',
        text: 'Estimada Laura, felicitaciones por la implementación del aula invertida en 3°A. Se observó un gran entusiasmo.',
        timestamp: 'Ayer 09:00',
        dateGroup: 'Ayer',
        status: 'read'
      },
      {
        id: 'msg-de-2',
        senderId: 'directivo-elena',
        senderName: 'Directora Elena Valenzuela',
        senderRole: 'directivo',
        text: 'Por favor, revise las planillas de seguimiento DUA para la reunión pedagógica del viernes.',
        timestamp: 'Hoy 10:30',
        dateGroup: 'Hoy',
        status: 'delivered',
        categoryTag: 'Institucional'
      }
    ]
  },
  {
    id: 'dm-preceptor',
    type: 'direct',
    title: 'Preceptor Juan Manuel',
    subtitle: 'Preceptoría 3° Año — Asistencia y Legajos',
    avatarInitial: 'JM',
    colorScheme: 'fox-purple',
    participants: [
      { id: 'docente-laura', name: 'Prof. Laura Martínez', role: 'docente', status: 'online' },
      { id: 'alumno-valentina', name: 'Valentina Rodríguez', role: 'alumno', course: '3°A', status: 'online' },
      { id: 'preceptor-juan', name: 'Preceptor Juan Manuel', role: 'preceptor', status: 'online' }
    ],
    lastMessage: 'Hola, recuerden entregar los certificados de vacunación antes del viernes.',
    lastMessageTime: 'Mar',
    lastMessageSender: 'Preceptor Juan Manuel',
    unreadCountDocente: 0,
    unreadCountAlumno: 1,
    isPinned: false,
    tags: ['Preceptoría', 'Administrativo'],
    messages: [
      {
        id: 'msg-pj-1',
        senderId: 'preceptor-juan',
        senderName: 'Preceptor Juan Manuel',
        senderRole: 'preceptor',
        text: 'Hola a todos. Recuerden entregar los certificados médicos y justificaciones de inasistencia en la oficina de preceptoría antes del viernes.',
        timestamp: 'Mar 08:20',
        dateGroup: 'Martes',
        status: 'read',
        categoryTag: 'Institucional'
      }
    ]
  },
  {
    id: 'dm-foxy-copilot',
    type: 'bot',
    title: 'Foxy Copiloto IA',
    subtitle: 'Asistente de Comunicación y Estudio FoxMind',
    avatarInitial: '🦊',
    colorScheme: 'fox-gold',
    participants: [
      { id: 'bot-foxy', name: 'Foxy Copiloto IA', role: 'foxy', status: 'online' }
    ],
    lastMessage: '¡Hola! Estoy listo para ayudarte a redactar comunicados o resolver dudas.',
    lastMessageTime: '08:00',
    lastMessageSender: 'Foxy Copiloto IA',
    unreadCountDocente: 0,
    unreadCountAlumno: 0,
    isPinned: true,
    tags: ['IA', 'Foxy', 'Soporte'],
    messages: [
      {
        id: 'msg-foxy-1',
        senderId: 'bot-foxy',
        senderName: 'Foxy Copiloto IA',
        senderRole: 'foxy',
        text: '¡Hola! 🦊 Soy tu asistente pedagógico en FoxMind.\n\nPuedo ayudarte a:\n• Redactar respuestas empáticas y personalizadas\n• Resumir dudas recurrentes de los alumnos en el aula\n• Transformar consignas a formato accesible DUA\n\n¿En qué te gustaría trabajar hoy?',
        timestamp: 'Hoy 08:00',
        dateGroup: 'Hoy',
        status: 'read'
      }
    ]
  }
];

// In-memory singleton with localStorage persistence fallback
class MessagingStore {
  private conversations: Conversation[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.load();
  }

  private load() {
    loadMessagingConversations(
      INITIAL_CONVERSATIONS,
      conversations => { this.conversations = conversations; },
      () => this.save(),
    );
  }

  private save() {
    saveMessagingConversations(() => this.conversations);
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.save();
    this.listeners.forEach(fn => fn());
  }

  public getConversations(): Conversation[] {
    return [...this.conversations];
  }

  public getConversationById(id: string): Conversation | undefined {
    return this.conversations.find(c => c.id === id);
  }

  public getUnreadCount(role: 'docente' | 'alumno'): number {
    return this.conversations.reduce((acc, c) => {
      return acc + (role === 'docente' ? (c.unreadCountDocente || 0) : (c.unreadCountAlumno || 0));
    }, 0);
  }

  public markAsRead(conversationId: string, role: 'docente' | 'alumno') {
    const conv = this.conversations.find(c => c.id === conversationId);
    if (!conv) return;

    if (role === 'docente' && conv.unreadCountDocente > 0) {
      conv.unreadCountDocente = 0;
      this.notify();
    } else if (role === 'alumno' && conv.unreadCountAlumno > 0) {
      conv.unreadCountAlumno = 0;
      this.notify();
    }
  }

  public togglePin(conversationId: string) {
    const conv = this.conversations.find(c => c.id === conversationId);
    if (conv) {
      conv.isPinned = !conv.isPinned;
      this.notify();
    }
  }

  public toggleMute(conversationId: string) {
    const conv = this.conversations.find(c => c.id === conversationId);
    if (conv) {
      conv.isMuted = !conv.isMuted;
      this.notify();
    }
  }

  public addReaction(conversationId: string, messageId: string, emoji: string, userName: string) {
    const conv = this.conversations.find(c => c.id === conversationId);
    if (!conv) return;

    const msg = conv.messages.find(m => m.id === messageId);
    if (!msg) return;

    if (!msg.reactions) msg.reactions = [];
    const existing = msg.reactions.find(r => r.emoji === emoji);

    if (existing) {
      if (existing.users.includes(userName)) {
        // Toggle off
        existing.users = existing.users.filter(u => u !== userName);
        existing.count = existing.users.length;
        if (existing.count === 0) {
          msg.reactions = msg.reactions.filter(r => r.emoji !== emoji);
        }
      } else {
        existing.users.push(userName);
        existing.count = existing.users.length;
      }
    } else {
      msg.reactions.push({ emoji, count: 1, users: [userName] });
    }

    this.notify();
  }

  public sendMessage(params: {
    conversationId: string;
    senderId: string;
    senderName: string;
    senderRole: 'docente' | 'alumno' | 'directivo' | 'preceptor' | 'foxy';
    text: string;
    attachment?: MessageAttachment;
    replyTo?: { id: string; senderName: string; text: string };
    categoryTag?: string;
  }) {
    const conv = this.conversations.find(c => c.id === params.conversationId);
    if (!conv) return;

    // Strict School Policy Enforcement:
    // Alumnos can only send messages to teachers / staff / classroom channels / Foxy.
    // Alumnos cannot message another alumno directly.
    if (params.senderRole === 'alumno' && conv.type === 'direct') {
      const recipient = conv.participants.find(p => p.id !== params.senderId);
      if (recipient && recipient.role === 'alumno') {
        throw new Error('Normativa escolar: Los alumnos únicamente pueden comunicarse directamente con sus docentes y preceptoría.');
      }
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMessage: DirectMessageItem = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      senderId: params.senderId,
      senderName: params.senderName,
      senderRole: params.senderRole,
      text: params.text,
      timestamp: timeStr,
      dateGroup: 'Hoy',
      status: 'sent',
      replyTo: params.replyTo,
      attachment: params.attachment,
      categoryTag: params.categoryTag
    };

    conv.messages.push(newMessage);
    conv.lastMessage = params.attachment 
      ? `📎 ${params.attachment.name} - ${params.text || 'Archivo adjunto'}` 
      : params.text;
    conv.lastMessageTime = timeStr;
    conv.lastMessageSender = params.senderName;

    // Increment unread count for other role
    if (params.senderRole === 'docente') {
      conv.unreadCountAlumno = (conv.unreadCountAlumno || 0) + 1;
    } else if (params.senderRole === 'alumno') {
      conv.unreadCountDocente = (conv.unreadCountDocente || 0) + 1;
    }

    this.notify();

    // If talking to Foxy Bot, simulate intelligent pedagogical response
    if (conv.type === 'bot' || conv.id === 'dm-foxy-copilot') {
      setTimeout(() => {
        this.simulateFoxyBotReply(conv.id, params.text, params.senderRole);
      }, 900);
    }
  }

  private simulateFoxyBotReply(conversationId: string, userText: string, role: 'docente' | 'alumno' | 'foxy' | 'directivo' | 'preceptor' | Role) {
    const conv = this.conversations.find(c => c.id === conversationId);
    if (!conv) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let botReplyText = '';
    const lower = userText.toLowerCase();

    if (role === 'docente') {
      if (lower.includes('ensayo') || lower.includes('rubrica') || lower.includes('evaluacion')) {
        botReplyText = '📋 **Sugerencia pedagógica para evaluación:**\nPara el ensayo de Vanguardias te recomiendo ponderar:\n1. Comprensión de manifiestos (30%)\n2. Justificación de citas textuales (40%)\n3. Coherencia estilística y DUA (30%)\n\n¿Querés que redacte un mensaje de aviso al aula 3°A con estas pautas?';
      } else if (lower.includes('borrador') || lower.includes('mensaje') || lower.includes('aviso')) {
        botReplyText = '✍️ **Borrador de comunicado sugerido:**\n"Estimadas familias y alumnos: Les recordamos que las consultas sobre el trabajo práctico pueden realizarse por este canal hasta las 18:00 hs. ¡Muchos éxitos!"\n\nPodés copiarlo o editarlo libremente.';
      } else {
        botReplyText = `🦊 **Foxy Copiloto:** Entendido. Analicé tu consulta sobre "${userText.slice(0, 40)}...". Te sugiero mantener una respuesta concisa con preguntas de activación socrática para fomentar la autonomía del alumno.`;
      }
    } else {
      if (lower.includes('duda') || lower.includes('ensayo') || lower.includes('vanguardia')) {
        botReplyText = '💡 **Guía de estudio Foxy:**\nPara tu ensayo recordá que Vicente Huidobro (Creacionismo) proponía que *"el poeta es un pequeño Dios"*, mientras que el Ultraísmo buscaba la imagen pura sin adjetivos inútiles.\n\n¿Querés que formulemos una consulta clara para tu profesora Laura Martínez?';
      } else {
        botReplyText = `🦊 **Foxy Tutor:** ¡Muy bien planteado! Recordá que podés consultarle directamente a tus docentes por este canal oficial o dejar tu duda en el canal general de tu aula.`;
      }
    }

    const botMessage: DirectMessageItem = {
      id: `msg-foxy-${Date.now()}`,
      senderId: 'bot-foxy',
      senderName: 'Foxy Copiloto IA',
      senderRole: 'foxy',
      text: botReplyText,
      timestamp: timeStr,
      dateGroup: 'Hoy',
      status: 'read'
    };

    conv.messages.push(botMessage);
    conv.lastMessage = botReplyText.slice(0, 70) + '...';
    conv.lastMessageTime = timeStr;
    conv.lastMessageSender = 'Foxy Copiloto IA';

    if (role === 'docente') {
      conv.unreadCountDocente = (conv.unreadCountDocente || 0) + 1;
    } else {
      conv.unreadCountAlumno = (conv.unreadCountAlumno || 0) + 1;
    }

    this.notify();
  }

  public createConversation(params: {
    title: string;
    type: 'direct' | 'channel';
    participants: { id: string; name: string; role: 'docente' | 'alumno' | 'directivo' | 'preceptor' | 'foxy'; course?: string }[];
    initialMessage: string;
    senderId: string;
    senderName: string;
    senderRole: 'docente' | 'alumno';
    categoryTag?: string;
  }): Conversation {
    // School Policy: Alumnos can only initiate direct messages with Docentes/Preceptors
    if (params.senderRole === 'alumno' && params.type === 'direct') {
      const isRecipientAnotherStudent = params.participants.some(p => p.id !== params.senderId && p.role === 'alumno');
      if (isRecipientAnotherStudent) {
        throw new Error('Normativa escolar: Los alumnos solo pueden comunicarse con docentes y autoridades escolares.');
      }
    }

    const id = `conv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newConv: Conversation = {
      id,
      type: params.type,
      title: params.title,
      subtitle: params.type === 'channel' ? 'Canal de grupo creado' : `${params.participants[0]?.name || 'Contacto'}`,
      avatarInitial: params.title.substring(0, 2).toUpperCase(),
      colorScheme: params.type === 'channel' ? 'fox-primary' : 'fox-orange',
      participants: [
        { id: params.senderId, name: params.senderName, role: params.senderRole, status: 'online' },
        ...params.participants.map(p => ({ ...p, status: 'online' as const }))
      ],
      lastMessage: params.initialMessage,
      lastMessageTime: timeStr,
      lastMessageSender: params.senderName,
      unreadCountDocente: params.senderRole === 'alumno' ? 1 : 0,
      unreadCountAlumno: params.senderRole === 'docente' ? 1 : 0,
      isPinned: false,
      messages: [
        {
          id: `msg-${Date.now()}`,
          senderId: params.senderId,
          senderName: params.senderName,
          senderRole: params.senderRole,
          text: params.initialMessage,
          timestamp: timeStr,
          dateGroup: 'Hoy',
          status: 'sent',
          categoryTag: params.categoryTag
        }
      ]
    };

    this.conversations.unshift(newConv);
    this.notify();
    return newConv;
  }

  public sendClassroomInvitation(params: SendClassroomInvitationParams): { conversationId: string; messageId: string } {
    return sendClassroomInvitation(params, () => this.conversations, () => this.notify());
  }

  public respondToClassroomInvitation(params: RespondToClassroomInvitationParams): void {
    respondToClassroomInvitation(
      params,
      () => this.conversations,
      classroom => classroomRepository.add(classroom),
      () => this.notify(),
    );
  }

  public resetToDefault() {
    this.conversations = INITIAL_CONVERSATIONS;
    this.notify();
  }
}

export const messagingStore = new MessagingStore();
