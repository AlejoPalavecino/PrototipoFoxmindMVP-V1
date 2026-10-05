import { 
  TeacherProgressData, 
  Timeframe, 
  DuaProfileStat, 
  TeacherMilestone, 
  TeacherHistoryEntry, 
  ClassroomPerformance 
} from './progresoDocenteTypes';

export const mockDuaProfilesDocente: DuaProfileStat[] = [
  { 
    profile: 'Dislexia', 
    count: 12, 
    percentage: 8, 
    color: '#3BB54A',
    description: 'Beneficiados con tipografías legibles y lectura de pantalla Foxy.'
  },
  { 
    profile: 'TDAH', 
    count: 15, 
    percentage: 10, 
    color: '#7D519C',
    description: 'Mayor retención con consignas fragmentadas y micro-pausas cognitivas.'
  },
  { 
    profile: 'TEA', 
    count: 4, 
    percentage: 3, 
    color: '#1F3F6D',
    description: 'Estructuras visuales predecibles y rúbricas explícitas paso a paso.'
  },
  { 
    profile: 'Altas Capacidades', 
    count: 3, 
    percentage: 2, 
    color: '#F48220',
    description: 'Desafíos de profundización y proyectos de investigación autónomos.'
  },
];

export const mockTeacherMilestones: TeacherMilestone[] = [
  {
    id: 'm1',
    title: 'Guardián del Aprendizaje',
    description: 'Atendiste y resolviste 10 alertas tempranas de estudiantes en riesgo este mes.',
    icon: '🛡️',
    category: 'seguimiento',
    earned: true,
    earnedDate: 'Hace 2 días',
    pointsReward: 150,
    rarity: 'Raro'
  },
  {
    id: 'm2',
    title: 'Inclusión Total (DUA 100%)',
    description: 'Generaste consignas adaptadas para el 100% de estudiantes con perfiles DUA registrados.',
    icon: '✨',
    category: 'dua',
    earned: true,
    earnedDate: 'Hace 1 semana',
    pointsReward: 250,
    rarity: 'Épico'
  },
  {
    id: 'm3',
    title: 'Impulsor de Rendimiento',
    description: 'Lograste que un curso eleve su promedio general en más de +1.0 punto.',
    icon: '📈',
    category: 'rendimiento',
    earned: true,
    earnedDate: 'Hace 2 semanas',
    pointsReward: 300,
    rarity: 'Legendario'
  },
  {
    id: 'm4',
    title: 'Feedback Instantáneo',
    description: 'Calificaste el 90% de las entregas en menos de 48 horas desde su envío.',
    icon: '⚡',
    category: 'seguimiento',
    earned: true,
    earnedDate: 'Hace 3 semanas',
    pointsReward: 100,
    rarity: 'Común'
  },
  {
    id: 'm5',
    title: 'Tutor Cercano',
    description: 'Completaste 5 sesiones de tutoría 1-a-1 programadas con seguimiento pedagógico.',
    icon: '🤝',
    category: 'comunidad',
    earned: false,
    progress: 3,
    maxProgress: 5,
    pointsReward: 200,
    rarity: 'Raro'
  },
  {
    id: 'm6',
    title: 'Arquitecto Curricular',
    description: 'Completaste el 80% del plan de estudios anual antes del cierre del trimestre.',
    icon: '🏛️',
    category: 'rendimiento',
    earned: false,
    progress: 68,
    maxProgress: 80,
    pointsReward: 350,
    rarity: 'Épico'
  },
  {
    id: 'm7',
    title: 'Alianza Familiar Fuerte',
    description: 'Enviaste 10 comunicaciones proactivas a las familias sobre avances de aprendizaje.',
    icon: '📬',
    category: 'comunidad',
    earned: true,
    earnedDate: 'Ayer',
    pointsReward: 180,
    rarity: 'Raro'
  },
  {
    id: 'm8',
    title: 'Maestro de la Memoria Activa',
    description: 'Aplicaste 12 dinámicas de repaso espaciado recomendadas por Foxy.',
    icon: '🧠',
    category: 'rendimiento',
    earned: false,
    progress: 8,
    maxProgress: 12,
    pointsReward: 220,
    rarity: 'Raro'
  }
];

export const mockTeacherHistory: TeacherHistoryEntry[] = [
  {
    id: 'h1',
    title: 'Resolución de Alerta Pedagógica',
    subject: 'Biología',
    course: '4° A',
    type: 'intervencion',
    date: 'Hoy',
    time: '11:30',
    impactScore: '+0.8 pts proyectados',
    pointsEarned: 50,
    summary: 'Se envió comunicación a la familia de Marcos Pérez con plan de entregas escalonadas.'
  },
  {
    id: 'h2',
    title: 'Adaptación DUA Generada',
    subject: 'Física',
    course: '5° B',
    type: 'dua',
    date: 'Ayer',
    time: '16:45',
    impactScore: '3 alumnos beneficiados',
    pointsEarned: 60,
    summary: 'Foxy generó rúbrica visual y opción de entrega en audio para la Unidad 2 de Dinámica.'
  },
  {
    id: 'h3',
    title: 'Tutoría 1-a-1 Completada',
    subject: 'Química',
    course: '4° B',
    type: 'tutoria',
    date: 'Hace 2 días',
    time: '14:00',
    impactScore: 'Compromiso renovado',
    pointsEarned: 80,
    summary: 'Reunión de 15 minutos con Tomás Gómez para revisar conceptos de Estequiometría.'
  },
  {
    id: 'h4',
    title: 'Reporte Trimestral Exportado',
    subject: 'Todas las aulas',
    course: 'Global',
    type: 'reporte',
    date: 'Hace 4 días',
    time: '09:15',
    pointsEarned: 40,
    summary: 'Exportación de métricas de rendimiento y retención para el equipo directivo.'
  },
  {
    id: 'h5',
    title: 'Evaluación Formativa con IA',
    subject: 'Ciencias de la Tierra',
    course: '6° A',
    type: 'evaluacion',
    date: 'Hace 6 días',
    time: '17:20',
    impactScore: '89% de precisión',
    pointsEarned: 70,
    summary: 'Corrección asistida por rúbrica de 28 informes sobre Tectónica de Placas.'
  }
];

export const mockTeacherDataByTimeframe: Record<Timeframe, TeacherProgressData> = {
  semana: {
    stats: {
      promedio: 7.9,
      tendenciaPromedio: '+0.1',
      tasaEntrega: '88%',
      tendenciaEntrega: '+3%',
      alumnosRiesgo: 4,
      totalAlumnos: 145,
      consultasFoxy: 89,
      adaptacionesDua: 14,
      promedioHistory: [7.6, 7.7, 7.8, 7.8, 7.9, 7.9],
      entregaHistory: [80, 82, 85, 86, 87, 88],
      evolutionData: [
        { period: 'Lun', promedio: 7.6, entrega: 80, consultas: 12 },
        { period: 'Mar', promedio: 7.7, entrega: 82, consultas: 18 },
        { period: 'Mié', promedio: 7.8, entrega: 85, consultas: 24 },
        { period: 'Jue', promedio: 7.8, entrega: 86, consultas: 15 },
        { period: 'Vie', promedio: 7.9, entrega: 87, consultas: 10 },
        { period: 'Sáb', promedio: 7.9, entrega: 88, consultas: 10 },
      ]
    },
    aulas: [
      {
        id: 1,
        subject: 'Biología',
        course: '4° A',
        studentsCount: 32,
        avgGrade: 7.9,
        progress: 68,
        status: 'optimal',
        trend: 'up',
        trendValue: '+0.3 pts esta semana',
        color: 'bg-fox-primary',
        bgLight: 'bg-fox-primary/10',
        textColor: 'text-fox-primary',
        activeTasks: 3,
        pendingSubmissions: 4,
        keyCompetencies: [
          { name: 'Comprensión conceptual celular', score: 85 },
          { name: 'Interpretación de experimentos', score: 78 },
          { name: 'Comunicación científica escrita', score: 74 },
          { name: 'Pensamiento crítico y bioética', score: 82 },
        ],
        strengths: ['Excelente comprensión en genética básica', 'Participación activa en foros'],
        weaknesses: ['Informes de laboratorio entregados a último momento'],
        foxyRecommendation: 'Reforzar la estructura de informe científico con una plantilla DUA guiada.',
        priorityStudents: [
          { name: 'Marcos Pérez', issue: '3 trabajos sin entregar', risk: 'ALTO' },
          { name: 'Sofía Herrera', issue: 'Dificultad en lectura de papers', risk: 'MEDIO' }
        ]
      },
      {
        id: 2,
        subject: 'Física',
        course: '5° B',
        studentsCount: 28,
        avgGrade: 7.1,
        progress: 42,
        status: 'critical',
        trend: 'flat',
        trendValue: 'Estable pero bajo objetivo',
        color: 'bg-fox-orange',
        bgLight: 'bg-fox-orange/10',
        textColor: 'text-fox-orange',
        activeTasks: 2,
        pendingSubmissions: 9,
        keyCompetencies: [
          { name: 'Resolución analítica de problemas', score: 62 },
          { name: 'Modelado y vectores', score: 58 },
          { name: 'Aplicación en situaciones reales', score: 75 },
          { name: 'Uso de unidades y conversiones', score: 80 },
        ],
        strengths: ['Alta intuición física en demostraciones prácticas'],
        weaknesses: ['Dificultades en despeje matemático de fórmulas cinemáticas'],
        foxyRecommendation: 'Proponer ejercicios interactivos paso a paso con Active Recall guiado.',
        priorityStudents: [
          { name: 'Julieta Silva', issue: 'Calificación 4.0 en última evaluación', risk: 'ALTO' },
          { name: 'Esteban Ruiz', issue: 'Falta de participación en clase', risk: 'MEDIO' }
        ]
      },
      {
        id: 3,
        subject: 'Química',
        course: '4° B',
        studentsCount: 30,
        avgGrade: 8.3,
        progress: 72,
        status: 'optimal',
        trend: 'up',
        trendValue: '+0.5 pts esta semana',
        color: 'bg-fox-green',
        bgLight: 'bg-fox-green/10',
        textColor: 'text-fox-green',
        activeTasks: 4,
        pendingSubmissions: 2,
        keyCompetencies: [
          { name: 'Estequiometría y balanceo', score: 88 },
          { name: 'Tabla periódica y enlaces', score: 92 },
          { name: 'Laboratorio y seguridad', score: 84 },
          { name: 'Resolución de problemas molares', score: 76 },
        ],
        strengths: ['Excelente ritmo de entrega y dominio teórico', 'Récord de asistencia del mes'],
        weaknesses: ['Requiere actividades de extensión para alumnos avanzados'],
        foxyRecommendation: 'Habilitar desafíos opcionales de nivel universitario (+XP).',
        priorityStudents: [
          { name: 'Tomás Gómez', issue: 'Ausencias reiteradas', risk: 'ALTO' }
        ]
      },
      {
        id: 4,
        subject: 'Ciencias de la Tierra',
        course: '6° A',
        studentsCount: 26,
        avgGrade: 7.6,
        progress: 58,
        status: 'needs_review',
        trend: 'up',
        trendValue: '+0.2 pts',
        color: 'bg-fox-purple',
        bgLight: 'bg-fox-purple/10',
        textColor: 'text-fox-purple',
        activeTasks: 2,
        pendingSubmissions: 5,
        keyCompetencies: [
          { name: 'Tectónica y dinámica geológica', score: 80 },
          { name: 'Lectura de mapas y capas', score: 71 },
          { name: 'Sostenibilidad y cambio climático', score: 85 },
          { name: 'Análisis de datos geoespaciales', score: 68 },
        ],
        strengths: ['Fuerte compromiso con temas de impacto ambiental'],
        weaknesses: ['Lectura analítica de perfiles estratigráficos'],
        foxyRecommendation: 'Incorporar visualizaciones 3D interactivas antes del cierre de unidad.',
        priorityStudents: [
          { name: 'Lucía Fernández', issue: 'Entrega tardía de proyecto', risk: 'MEDIO' }
        ]
      }
    ],
    alerts: [
      {
        id: 1,
        student: 'Marcos Pérez',
        course: 'Biología 4° A',
        subject: 'Biología',
        issue: '3 trabajos prácticos sin entregar consecutivamente',
        severity: 'high',
        time: 'Hace 2h',
        status: 'active',
        duaTag: 'Seguimiento Familiar',
        suggestedAction: 'Redactar mensaje empático a la familia con fechas reprogramadas.'
      },
      {
        id: 2,
        student: 'Julieta Silva',
        course: 'Física 5° B',
        subject: 'Física',
        issue: 'Bajo rendimiento en última evaluación de Cinemática (4.0)',
        severity: 'medium',
        time: 'Ayer',
        status: 'active',
        duaTag: 'Refuerzo Conceptual',
        suggestedAction: 'Agendar micro-tutoría de 10 min y habilitar quiz de recuperación adaptativo.'
      },
      {
        id: 3,
        student: 'Tomás Gómez',
        course: 'Química 4° B',
        subject: 'Química',
        issue: 'Ausencias reiteradas en las últimas 3 clases de laboratorio',
        severity: 'high',
        time: 'Hace 3 días',
        status: 'active',
        duaTag: 'Asistencia y Retención',
        suggestedAction: 'Coordinar sesión DUA con el gabinete pedagógico.'
      }
    ],
    scheduledInterventions: [
      {
        id: 'int-1',
        subject: 'Física',
        course: '5° B',
        studentOrGroup: 'Julieta Silva',
        type: 'tutoria',
        date: 'Mañana',
        time: '11:30',
        urgency: 'alta',
        estimatedImpact: '+1.5 pts en Cinemática'
      },
      {
        id: 'int-2',
        subject: 'Biología',
        course: '4° A',
        studentOrGroup: 'Marcos Pérez',
        type: 'comunicacion_familia',
        date: 'Jueves',
        time: '14:00',
        urgency: 'alta',
        estimatedImpact: 'Recuperación de 3 tareas'
      },
      {
        id: 'int-3',
        subject: 'Ciencias de la Tierra',
        course: '6° A',
        studentOrGroup: 'Grupo Estratigrafía (4 alumnos)',
        type: 'dua_adaptacion',
        date: 'Viernes',
        time: '10:00',
        urgency: 'media',
        estimatedImpact: 'Nivelación de competencias'
      }
    ],
    foxySummary: '¡Semana productiva! El promedio general subió a 7.9 (+0.1 pts) y la tasa de entrega alcanzó el 88%. En Química 4° B el rendimiento es sobresaliente (8.3), mientras que Física 5° B presenta mayor dispersión de notas. Te recomiendo priorizar la intervención con Marcos Pérez y agendar la tutoría breve de Cinemática con Julieta Silva.'
  },

  mes: {
    stats: {
      promedio: 7.8,
      tendenciaPromedio: '+0.4',
      tasaEntrega: '85%',
      tendenciaEntrega: '+2%',
      alumnosRiesgo: 5,
      totalAlumnos: 145,
      consultasFoxy: 342,
      adaptacionesDua: 48,
      promedioHistory: [6.5, 6.8, 7.1, 7.4, 7.6, 7.8],
      entregaHistory: [70, 75, 72, 80, 82, 85],
      evolutionData: [
        { period: 'Semana 1', promedio: 6.8, entrega: 75, consultas: 60 },
        { period: 'Semana 2', promedio: 7.1, entrega: 78, consultas: 85 },
        { period: 'Semana 3', promedio: 7.5, entrega: 82, consultas: 95 },
        { period: 'Semana 4', promedio: 7.8, entrega: 85, consultas: 102 },
      ]
    },
    aulas: [
      {
        id: 1,
        subject: 'Biología',
        course: '4° A',
        studentsCount: 32,
        avgGrade: 7.8,
        progress: 65,
        status: 'optimal',
        trend: 'up',
        trendValue: '+0.4 pts en el mes',
        color: 'bg-fox-primary',
        bgLight: 'bg-fox-primary/10',
        textColor: 'text-fox-primary',
        activeTasks: 3,
        pendingSubmissions: 5,
        keyCompetencies: [
          { name: 'Comprensión conceptual celular', score: 84 },
          { name: 'Interpretación de experimentos', score: 76 },
          { name: 'Comunicación científica escrita', score: 73 },
          { name: 'Pensamiento crítico y bioética', score: 80 },
        ],
        strengths: ['Gran entusiasmo en debates sobre ecología'],
        weaknesses: ['Puntualidad en entrega de rúbricas complejas'],
        foxyRecommendation: 'Recordatorios visuales en el muro 48h antes de cada entrega.',
        priorityStudents: [
          { name: 'Marcos Pérez', issue: '3 trabajos sin entregar', risk: 'ALTO' }
        ]
      },
      {
        id: 2,
        subject: 'Física',
        course: '5° B',
        studentsCount: 28,
        avgGrade: 6.9,
        progress: 40,
        status: 'critical',
        trend: 'flat',
        trendValue: 'Desempeño irregular',
        color: 'bg-fox-orange',
        bgLight: 'bg-fox-orange/10',
        textColor: 'text-fox-orange',
        activeTasks: 2,
        pendingSubmissions: 11,
        keyCompetencies: [
          { name: 'Resolución analítica de problemas', score: 60 },
          { name: 'Modelado y vectores', score: 56 },
          { name: 'Aplicación en situaciones reales', score: 74 },
          { name: 'Uso de unidades y conversiones', score: 78 },
        ],
        strengths: ['Trabajo colaborativo en mesas prácticas'],
        weaknesses: ['Evaluaciones individuales escritas'],
        foxyRecommendation: 'Aplicar quizzes formativos rápidos en clase antes del examen.',
        priorityStudents: [
          { name: 'Julieta Silva', issue: 'Calificación 4.0 en última evaluación', risk: 'ALTO' },
          { name: 'Damián Soria', issue: 'Dificultad en cinemática 2D', risk: 'MEDIO' }
        ]
      },
      {
        id: 3,
        subject: 'Química',
        course: '4° B',
        studentsCount: 30,
        avgGrade: 8.2,
        progress: 70,
        status: 'optimal',
        trend: 'up',
        trendValue: '+0.6 pts en el mes',
        color: 'bg-fox-green',
        bgLight: 'bg-fox-green/10',
        textColor: 'text-fox-green',
        activeTasks: 4,
        pendingSubmissions: 3,
        keyCompetencies: [
          { name: 'Estequiometría y balanceo', score: 87 },
          { name: 'Tabla periódica y enlaces', score: 91 },
          { name: 'Laboratorio y seguridad', score: 85 },
          { name: 'Resolución de problemas molares', score: 78 },
        ],
        strengths: ['Alto compromiso grupal y entregas completas'],
        weaknesses: ['Diferencias de ritmo entre alumnos'],
        foxyRecommendation: 'Tutorías entre pares guiadas por alumnos de alto rendimiento.',
        priorityStudents: [
          { name: 'Tomás Gómez', issue: 'Ausencias reiteradas', risk: 'ALTO' }
        ]
      },
      {
        id: 4,
        subject: 'Ciencias de la Tierra',
        course: '6° A',
        studentsCount: 26,
        avgGrade: 7.5,
        progress: 55,
        status: 'needs_review',
        trend: 'up',
        trendValue: '+0.3 pts en el mes',
        color: 'bg-fox-purple',
        bgLight: 'bg-fox-purple/10',
        textColor: 'text-fox-purple',
        activeTasks: 2,
        pendingSubmissions: 6,
        keyCompetencies: [
          { name: 'Tectónica y dinámica geológica', score: 78 },
          { name: 'Lectura de mapas y capas', score: 70 },
          { name: 'Sostenibilidad y cambio climático', score: 84 },
          { name: 'Análisis de datos geoespaciales', score: 66 },
        ],
        strengths: ['Excelentes propuestas en el proyecto ambiental'],
        weaknesses: ['Fijación de terminología geomorfológica'],
        foxyRecommendation: 'Glosario interactivo con tarjetas Active Recall en FoxMind.',
        priorityStudents: [
          { name: 'Lucía Fernández', issue: 'Entrega tardía de proyecto', risk: 'MEDIO' }
        ]
      }
    ],
    alerts: [
      {
        id: 1,
        student: 'Marcos Pérez',
        course: 'Biología 4° A',
        subject: 'Biología',
        issue: '3 trabajos prácticos sin entregar',
        severity: 'high',
        time: 'Hace 2h',
        status: 'active',
        duaTag: 'Seguimiento Familiar',
        suggestedAction: 'Enviar comunicación con fechas de reentrega.'
      },
      {
        id: 2,
        student: 'Julieta Silva',
        course: 'Física 5° B',
        subject: 'Física',
        issue: 'Bajo rendimiento en última evaluación (4.0)',
        severity: 'medium',
        time: 'Ayer',
        status: 'active',
        duaTag: 'Refuerzo Conceptual',
        suggestedAction: 'Agendar micro-tutoría de 10 min.'
      },
      {
        id: 3,
        student: 'Tomás Gómez',
        course: 'Química 4° B',
        subject: 'Química',
        issue: 'Ausencias reiteradas (últimas 3 clases)',
        severity: 'high',
        time: 'Hace 3 días',
        status: 'active',
        duaTag: 'Asistencia y Retención',
        suggestedAction: 'Notificar al equipo de orientación escolar.'
      },
    ],
    scheduledInterventions: [
      {
        id: 'int-1',
        subject: 'Física',
        course: '5° B',
        studentOrGroup: 'Julieta Silva',
        type: 'tutoria',
        date: 'Mañana',
        time: '11:30',
        urgency: 'alta',
        estimatedImpact: '+1.5 pts en Cinemática'
      },
      {
        id: 'int-2',
        subject: 'Biología',
        course: '4° A',
        studentOrGroup: 'Marcos Pérez',
        type: 'comunicacion_familia',
        date: 'Jueves',
        time: '14:00',
        urgency: 'alta',
        estimatedImpact: 'Recuperación de 3 tareas'
      },
    ],
    foxySummary: 'Resumen consolidado del mes: Tu promedio global se consolidó en 7.8 (+0.4 pts vs mes anterior). Se destaca Química 4° B con 8.2 y una tasa de entrega récord. En Física 5° B aún existen 2 estudiantes en riesgo crítico de desaprobación que requieren adaptaciones DUA y seguimiento cercano.'
  },

  trimestre: {
    stats: {
      promedio: 7.5,
      tendenciaPromedio: '+1.2',
      tasaEntrega: '82%',
      tendenciaEntrega: '+8%',
      alumnosRiesgo: 8,
      totalAlumnos: 145,
      consultasFoxy: 1120,
      adaptacionesDua: 154,
      promedioHistory: [6.0, 6.2, 6.5, 6.9, 7.2, 7.5],
      entregaHistory: [60, 65, 70, 75, 80, 82],
      evolutionData: [
        { period: 'Mes 1', promedio: 6.5, entrega: 68, consultas: 280 },
        { period: 'Mes 2', promedio: 7.0, entrega: 75, consultas: 390 },
        { period: 'Mes 3', promedio: 7.5, entrega: 82, consultas: 450 },
      ]
    },
    aulas: [
      {
        id: 1,
        subject: 'Biología',
        course: '4° A',
        studentsCount: 32,
        avgGrade: 7.5,
        progress: 85,
        status: 'optimal',
        trend: 'up',
        trendValue: '+1.1 pts en el trimestre',
        color: 'bg-fox-primary',
        bgLight: 'bg-fox-primary/10',
        textColor: 'text-fox-primary',
        activeTasks: 4,
        pendingSubmissions: 7,
        keyCompetencies: [
          { name: 'Comprensión conceptual celular', score: 82 },
          { name: 'Interpretación de experimentos', score: 75 },
          { name: 'Comunicación científica escrita', score: 71 },
          { name: 'Pensamiento crítico y bioética', score: 79 },
        ],
        strengths: ['85% del currículo completado con éxito'],
        weaknesses: ['Cierre de trimestre con entregas acumuladas'],
        foxyRecommendation: 'Jornada integradora de repaso con ruleta de preguntas Foxy.',
        priorityStudents: [
          { name: 'Marcos Pérez', issue: 'Riesgo de reprobar por entregas', risk: 'ALTO' }
        ]
      },
      {
        id: 2,
        subject: 'Física',
        course: '5° B',
        studentsCount: 28,
        avgGrade: 6.5,
        progress: 75,
        status: 'critical',
        trend: 'up',
        trendValue: '+0.8 pts en el trimestre',
        color: 'bg-fox-orange',
        bgLight: 'bg-fox-orange/10',
        textColor: 'text-fox-orange',
        activeTasks: 3,
        pendingSubmissions: 14,
        keyCompetencies: [
          { name: 'Resolución analítica de problemas', score: 58 },
          { name: 'Modelado y vectores', score: 52 },
          { name: 'Aplicación en situaciones reales', score: 70 },
          { name: 'Uso de unidades y conversiones', score: 75 },
        ],
        strengths: ['Evolución sostenida en comprensión conceptual'],
        weaknesses: ['Dificultades en exámenes integradores'],
        foxyRecommendation: 'Diseñar examen DUA con opciones múltiples y problemas guiados.',
        priorityStudents: [
          { name: 'Julieta Silva', issue: 'Evaluación formativa pendiente', risk: 'ALTO' }
        ]
      },
      {
        id: 3,
        subject: 'Química',
        course: '4° B',
        studentsCount: 30,
        avgGrade: 8.0,
        progress: 90,
        status: 'optimal',
        trend: 'up',
        trendValue: '+1.4 pts en el trimestre',
        color: 'bg-fox-green',
        bgLight: 'bg-fox-green/10',
        textColor: 'text-fox-green',
        activeTasks: 5,
        pendingSubmissions: 4,
        keyCompetencies: [
          { name: 'Estequiometría y balanceo', score: 85 },
          { name: 'Tabla periódica y enlaces', score: 89 },
          { name: 'Laboratorio y seguridad', score: 82 },
          { name: 'Resolución de problemas molares', score: 75 },
        ],
        strengths: ['90% de currícula completada con alta excelencia'],
        weaknesses: ['Revisión de temas de inicio de año'],
        foxyRecommendation: 'Programar sesión de Active Recall espaciado de las Unidades 1 y 2.',
        priorityStudents: [
          { name: 'Tomás Gómez', issue: 'Ausencias reiteradas (20%)', risk: 'ALTO' }
        ]
      },
      {
        id: 4,
        subject: 'Ciencias de la Tierra',
        course: '6° A',
        studentsCount: 26,
        avgGrade: 7.2,
        progress: 80,
        status: 'needs_review',
        trend: 'up',
        trendValue: '+0.9 pts en el trimestre',
        color: 'bg-fox-purple',
        bgLight: 'bg-fox-purple/10',
        textColor: 'text-fox-purple',
        activeTasks: 3,
        pendingSubmissions: 8,
        keyCompetencies: [
          { name: 'Tectónica y dinámica geológica', score: 76 },
          { name: 'Lectura de mapas y capas', score: 68 },
          { name: 'Sostenibilidad y cambio climático', score: 82 },
          { name: 'Análisis de datos geoespaciales', score: 64 },
        ],
        strengths: ['Grandes proyectos de impacto ambiental finalizados'],
        weaknesses: ['Precisión en informes técnicos individuales'],
        foxyRecommendation: 'Rúbrica de autoevaluación guiada previa a la entrega final.',
        priorityStudents: [
          { name: 'Lucía Fernández', issue: 'Puntualidad en entregas', risk: 'MEDIO' }
        ]
      }
    ],
    alerts: [
      {
        id: 1,
        student: 'Marcos Pérez',
        course: 'Biología 4° A',
        subject: 'Biología',
        issue: 'Riesgo de reprobar el trimestre por entregas',
        severity: 'high',
        time: 'Hace 1 semana',
        status: 'active',
        duaTag: 'Seguimiento Familiar',
        suggestedAction: 'Plan de recuperación intensivo.'
      },
      {
        id: 3,
        student: 'Tomás Gómez',
        course: 'Química 4° B',
        subject: 'Química',
        issue: 'Ausencias reiteradas (20% del trimestre)',
        severity: 'high',
        time: 'Hace 2 semanas',
        status: 'active',
        duaTag: 'Asistencia y Retención',
        suggestedAction: 'Reunión con directivos y familia.'
      }
    ],
    scheduledInterventions: [
      {
        id: 'int-1',
        subject: 'Biología',
        course: '4° A',
        studentOrGroup: 'Marcos Pérez',
        type: 'comunicacion_familia',
        date: 'Viernes',
        time: '15:00',
        urgency: 'alta',
        estimatedImpact: 'Acreditación trimestral'
      }
    ],
    foxySummary: 'Cierre de trimestre a la vista: Lograste un avance sobresaliente de +1.2 pts en el promedio general y un aumento del 8% en la tasa de entrega. El 82% de las metas curriculares fueron alcanzadas. Te sugerimos focalizar la última semana en los 8 alumnos con riesgo de recuperación para garantizar una acreditación inclusiva.'
  }
};
