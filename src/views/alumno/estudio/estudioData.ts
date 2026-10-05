import { 
  StudyGeneratedResource, 
  StudyPlan, 
  StudentFoxyReminder, 
  StudentStudySession 
} from './estudioTypes';

export const INITIAL_STUDENT_RESOURCES: StudyGeneratedResource[] = [
  {
    id: 'res-fc-1',
    title: 'Mazo de Flashcards: Vanguardias e Hitos Literarios',
    type: 'flashcards',
    folderId: '1',
    folderName: 'Literatura 3°A',
    topic: 'Vanguardias Literarias',
    description: '12 tarjetas interactivas de Active Recall sobre Creacionismo, Ultraísmo y autores del siglo XX.',
    createdAt: 'Hace 2 horas',
    fileSize: '12 tarjetas',
    fileFormat: 'FLASHCARDS',
    data: {
      flashcardDeck: {
        id: 'deck-1',
        title: 'Mazo de Flashcards: Vanguardias e Hitos Literarios',
        folderId: '1',
        folderName: 'Literatura 3°A',
        topic: 'Vanguardias Literarias',
        masteryPercentage: 75,
        createdAt: 'Hoy',
        cards: [
          {
            id: 'fc-1',
            front: '¿Cuál es la premisa fundacional del Creacionismo según Vicente Huidobro?',
            back: 'El poeta debe crear realidades autónomas y no imitar la naturaleza: "Hacer un poema como la naturaleza hace un árbol".',
            hint: 'Aparece en el manifiesto "Non Serviam" de 1914.',
            mastered: true
          },
          {
            id: 'fc-2',
            front: '¿Qué rasgo distingue al Ultraísmo español e hispanoamericano?',
            back: 'La primacía absoluta de la metáfora nueva, eliminación de nexos sintácticos inútiles y rechazo del sentimentalismo rubeniano.',
            hint: 'Jorge Luis Borges fue uno de sus introductores en el Río de la Plata.',
            mastered: true
          },
          {
            id: 'fc-3',
            front: '¿En qué año se publica "Azul..." de Rubén Darío y qué inaugura?',
            back: 'En 1888 en Valparaíso, Chile. Marca el nacimiento oficial del Modernismo hispanoamericano.',
            hint: 'Libro de cuentos en prosa y poemas líricos.',
            mastered: false
          },
          {
            id: 'fc-4',
            front: '¿Qué es el Caligrama y qué vanguardia lo popularizó?',
            back: 'Poema visual donde las palabras dibujan la forma del objeto del que hablan. Popularizado por Guillaume Apollinaire en el Cubismo.',
            hint: 'Fusión de arte plástico y poesía.',
            mastered: true
          }
        ]
      }
    }
  },
  {
    id: 'res-quiz-1',
    title: 'Quiz de Evaluación: Revolución Francesa & Estados Generales',
    type: 'quiz',
    folderId: '2',
    folderName: 'Historia 3°A',
    topic: 'Revolución Francesa',
    description: 'Cuestionario de 5 preguntas formativas con feedback socrático instantáneo y justificación histórica.',
    createdAt: 'Ayer',
    fileSize: '5 preguntas',
    fileFormat: 'QUIZ',
    data: {
      quiz: {
        id: 'quiz-1',
        title: 'Quiz: Revolución Francesa & Estados Generales',
        folderId: '2',
        folderName: 'Historia 3°A',
        topic: 'Revolución Francesa',
        difficulty: 'intermedio',
        bestScore: 4,
        totalAttempts: 2,
        createdAt: 'Ayer',
        questions: [
          {
            id: 'q-1',
            question: '¿Cuál fue la principal demanda del Tercer Estado al convocarse los Estados Generales en mayo de 1789?',
            options: [
              'Votación por cabeza (individual) en lugar de votación por estamento',
              'La disolución inmediata de la monarquía y la instauración del Consulado',
              'El cierre de los puertos comerciales ingleses',
              'La anexión de los territorios de Alsacia y Lorena'
            ],
            correctIndex: 0,
            explanation: 'El Tercer Estado representaba a más del 95% de la población, por lo que el voto por estamento los dejaba siempre en minoría 2 contra 1 ante la nobleza y el clero.',
            topic: 'Causas de la Revolución'
          },
          {
            id: 'q-2',
            question: '¿Qué acontecimiento simbólico del 14 de julio de 1789 consolidó el estallido popular en París?',
            options: [
              'El Juramento del Juego de Pelota',
              'La Toma de la Bastilla',
              'La Noche de los Cristales',
              'La huida frustrada de Varennes'
            ],
            correctIndex: 1,
            explanation: 'La fortaleza de la Bastilla era el símbolo de la opresión del absolutismo real y un almacén clave de pólvora y municiones.',
            topic: 'Hitos Revolucionarios'
          },
          {
            id: 'q-3',
            question: '¿Qué documento fundacional proclamó que "los hombres nacen y permanecen libres e iguales en derechos"?',
            options: [
              'El Código Napoleónico',
              'La Declaración de los Derechos del Hombre y del Ciudadano (1789)',
              'El Tratado de Versalles',
              'La Carta Magna de 1215'
            ],
            correctIndex: 1,
            explanation: 'Aprobada por la Asamblea Nacional Constituyente en agosto de 1789, sentó las bases de los derechos universales de la modernidad.',
            topic: 'Marco Institucional'
          },
          {
            id: 'q-4',
            question: '¿Quién lideró el periodo conocido como "El Terror" bajo el Comité de Salvación Pública?',
            options: [
              'Maximilien Robespierre',
              'Georges Danton',
              'Jean-Paul Marat',
              'Napoleón Bonaparte'
            ],
            correctIndex: 0,
            explanation: 'Robespierre y los jacobinos radicales impusieron medidas de excepción y tribunales revolucionarios para sofocar la contrarrevolución.',
            topic: 'Etapa de la Convención'
          }
        ]
      }
    }
  },
  {
    id: 'res-map-1',
    title: 'Mapa Conceptual Interactivo: Estructura y Metabolismo Celular',
    type: 'mapa',
    folderId: '4',
    folderName: 'Biología Celular',
    topic: 'Célula Eucariota y Organelos',
    description: 'Grafo visual jerárquico de organelos celulares, membrana y producción de ATP con nodos explicativos.',
    createdAt: 'Hace 3 días',
    fileSize: '8 nodos interactivos',
    fileFormat: 'CONCEPT_MAP',
    data: {
      conceptMap: {
        id: 'map-1',
        title: 'Mapa Conceptual: Célula Eucariota & Metabolismo',
        folderId: '4',
        folderName: 'Biología Celular',
        centralTopic: 'Célula Eucariota',
        createdAt: 'Hace 3 días',
        summary: 'Esquema completo que interconecta la membrana plasmática, el núcleo celular, el retículo endoplasmático, el aparato de Golgi y las mitocondrias.',
        nodes: [
          {
            id: 'n-core',
            label: 'Célula Eucariota',
            description: 'Unidad anatómica y funcional con núcleo delimitado por membrana y organelos especializados.',
            category: 'core',
            connectedTo: ['n-nucleo', 'n-membrana', 'n-mitocondria']
          },
          {
            id: 'n-nucleo',
            label: 'Núcleo Celular',
            description: 'Alberga el material genético (ADN) y coordina la transcripción y división celular.',
            category: 'branch',
            connectedTo: ['n-adn', 'n-nucleolo']
          },
          {
            id: 'n-mitocondria',
            label: 'Mitocondria & ATP',
            description: 'Central energética que realiza la respiración celular y sintetiza trifosfato de adenosina (ATP).',
            category: 'branch',
            connectedTo: ['n-krebs']
          },
          {
            id: 'n-membrana',
            label: 'Membrana Plasmática',
            description: 'Bicapa lipídica semipermeable con proteínas integrales que regula el transporte celular.',
            category: 'branch',
            connectedTo: ['n-osmosis']
          },
          {
            id: 'n-adn',
            label: 'Cromatina / ADN',
            description: 'Molécula helicoidal portadora de la información hereditaria para la síntesis de proteínas.',
            category: 'subbranch'
          },
          {
            id: 'n-krebs',
            label: 'Ciclo de Krebs & Fosforilación',
            description: 'Ruta metabólica oxidativa en la matriz mitocondrial que genera poder reductor (NADH/FADH2).',
            category: 'subbranch'
          },
          {
            id: 'n-osmosis',
            label: 'Transporte Activo y Pasivo',
            description: 'Mecanismos de paso de solutos a favor o en contra del gradiente electroquímico.',
            category: 'subbranch'
          }
        ]
      }
    }
  },
  {
    id: 'res-sum-1',
    title: 'Resumen Ejecutivo Foxy: Números Racionales y Álgebra',
    type: 'resumen',
    folderId: '3',
    folderName: 'Matemática',
    topic: 'Fracciones y Operaciones Combinadas',
    description: 'Síntesis didáctica paso a paso con fórmulas de simplificación, propiedades y ejemplos resueltos.',
    createdAt: 'Hace 5 días',
    fileSize: '4 págs (Markdown)',
    fileFormat: 'MARKDOWN',
    data: {
      summary: {
        id: 'sum-1',
        title: 'Guía de Síntesis: Números Racionales y Álgebra Básica',
        folderId: '3',
        folderName: 'Matemática',
        topic: 'Fracciones y Álgebra',
        readTimeMinutes: 6,
        createdAt: 'Hace 5 días',
        keyPoints: [
          'Para sumar fracciones con distinto denominador se debe calcular el mínimo común múltiplo (mcm).',
          'La división de fracciones equivale a la multiplicación de la primera por el recíproco de la segunda: (a/b) ÷ (c/d) = (a/b) × (d/c).',
          'La jerarquía de operaciones siempre prioriza: Paréntesis > Potencias/Raíces > Multiplicaciones/Divisiones > Sumas/Restas.',
          'Propiedad distributiva de la multiplicación respecto a la suma: a(b + c) = ab + ac.'
        ],
        contentMarkdown: `## 📌 Guía de Síntesis de Números Racionales

### 1. Definición Formal
Un número racional es todo número que puede expresarse como el cociente de dos números enteros:
$$\\mathbb{Q} = \\left\\{ \\frac{a}{b} \\;\\middle|\\; a, b \\in \\mathbb{Z}, b \\neq 0 \\right\\}$$

### 2. Operaciones Fundamentales

#### Suma y Resta
* **Mismo denominador:** Se mantiene el denominador y se suman/restan los numeradores:
  $$\\frac{a}{c} + \\frac{b}{c} = \\frac{a + b}{c}$$
* **Distinto denominador:** Se busca el mínimo común múltiplo de los denominadores.

#### Multiplicación y División
* **Multiplicación directa:** $\\frac{a}{b} \\times \\frac{c}{d} = \\frac{a \\cdot c}{b \\cdot d}$
* **División:** Invertir la fracción divisora y multiplicar.

### 3. Reglas de Oro para Resolver Exámenes
1. Simplificar siempre que sea posible **antes** de multiplicar para evitar números gigantes.
2. Cuidado con los signos negativos delante de un paréntesis fraccionario.
3. Comprobar el resultado sustituyendo en la ecuación original.`,
        glossary: [
          { term: 'MCM', definition: 'Mínimo Común Múltiplo entre dos o más números.' },
          { term: 'Fracción Irreducible', definition: 'Aquella cuyo numerador y denominador son primos entre sí (no se puede simplificar más).' },
          { term: 'Recíproco', definition: 'El inverso multiplicativo de una fracción no nula (a/b -> b/a).' }
        ]
      }
    }
  }
];

export const INITIAL_STUDENT_PLANS: StudyPlan[] = [
  {
    id: 'plan-1',
    title: 'Plan Intensivo: Parcial de Historia de 3°A',
    folderId: '2',
    folderName: 'Historia 3°A',
    targetGoal: 'Aprobar el Parcial de Revolución Francesa y Guerras Napoleónicas con nota superior a 8/10.',
    examDate: 'En 6 días (15 Nov)',
    intensity: 'intensivo',
    createdAt: 'Hace 2 días',
    progressPercentage: 60,
    tips: [
      'Practicá el Active Recall dedicando 15 minutos diarios a los Quizzes de Foxy.',
      'Elaborá una línea de tiempo cronológica con los 5 hitos principales.',
      'Explicále en voz alta a Foxy los motivos económicos del déficit fiscal francés.'
    ],
    milestones: [
      {
        id: 'm-1',
        title: 'Lectura comprensiva de Unidad 1 y Apuntes de clase',
        description: 'Repasar causas económicas de 1789 y los Estados Generales.',
        dueDate: 'Completado',
        completed: true,
        estimatedMinutes: 45,
        activityType: 'lectura'
      },
      {
        id: 'm-2',
        title: 'Completar Mazo de Flashcards de Figuras Históricas',
        description: 'Dominar al 100% las tarjetas de Robespierre, Danton, Necker y Luis XVI.',
        dueDate: 'Completado',
        completed: true,
        estimatedMinutes: 20,
        activityType: 'flashcards'
      },
      {
        id: 'm-3',
        title: 'Quiz de Evaluación Rápida (4 de 5 aciertos)',
        description: 'Comprobar dominio de la etapa de la Convención y El Terror.',
        dueDate: 'Completado',
        completed: true,
        estimatedMinutes: 15,
        activityType: 'quiz'
      },
      {
        id: 'm-4',
        title: 'Mapa Conceptual de la Constitución de 1791',
        description: 'Vincular la monarquía constitucional y la división de poderes con Foxy.',
        dueDate: 'Hoy',
        completed: false,
        estimatedMinutes: 30,
        activityType: 'mapa'
      },
      {
        id: 'm-5',
        title: 'Simulacro de Examen con Foxy en Modo Riguroso',
        description: 'Responder 3 preguntas de desarrollo con límite de tiempo.',
        dueDate: 'En 3 días',
        completed: false,
        estimatedMinutes: 40,
        activityType: 'simulacro'
      }
    ]
  },
  {
    id: 'plan-2',
    title: 'Objetivo de Regularización: Literatura Vanguardista',
    folderId: '1',
    folderName: 'Literatura 3°A',
    targetGoal: 'Preparar la entrega de monografía y análisis lírico de Vicente Huidobro.',
    examDate: 'En 12 días (21 Nov)',
    intensity: 'moderado',
    createdAt: 'Hace 4 días',
    progressPercentage: 35,
    tips: [
      'Leé los poemas de Non Serviam subrayando las metáforas creacionistas.',
      'Preguntale a Foxy dudas sobre la diferencia entre Modernismo y Ultraísmo.'
    ],
    milestones: [
      {
        id: 'm-201',
        title: 'Lectura de poemas de Rubén Darío (Azul...)',
        description: 'Extraer 3 rasgos de musicalidad y métrica.',
        dueDate: 'Completado',
        completed: true,
        estimatedMinutes: 30,
        activityType: 'lectura'
      },
      {
        id: 'm-202',
        title: 'Flashcards de Manifiestos de Vanguardia',
        description: 'Repasar conceptos de Creacionismo, Dadaísmo y Surrealismo.',
        dueDate: 'Hoy',
        completed: false,
        estimatedMinutes: 25,
        activityType: 'flashcards'
      },
      {
        id: 'm-203',
        title: 'Redacción de Borrador con Tutoría Socrática',
        description: 'Usar el chat de Foxy para validar la hipótesis del ensayo.',
        dueDate: 'En 5 días',
        completed: false,
        estimatedMinutes: 50,
        activityType: 'repaso'
      }
    ]
  }
];

export const INITIAL_STUDENT_REMINDERS: StudentFoxyReminder[] = [
  {
    id: 'rem-1',
    title: '🔥 Momento de Repaso Espaciado: Historia',
    description: 'Hace 3 días repasaste la "Toma de la Bastilla". Según la curva del olvido, un quiz de 3 min hoy asegurará un 85% de retención a largo plazo.',
    folderId: '2',
    folderName: 'Historia 3°A',
    priority: 'urgent',
    actionPrompt: 'Comencemos un quiz rápido de 5 preguntas sobre la Toma de la Bastilla para afianzar el tema.',
    actionType: 'start_quiz',
    iconType: 'clock'
  },
  {
    id: 'rem-2',
    title: '🎯 Hito Pendiente en tu Plan de Estudio',
    description: 'Tenés pendiente completar el "Mapa Conceptual de la Constitución de 1791" para tu parcial de Historia del 15 de Noviembre.',
    folderId: '2',
    folderName: 'Historia 3°A',
    priority: 'exam_target',
    actionPrompt: 'Generá un mapa conceptual interactivo sobre la Constitución de 1791 y la división de poderes.',
    actionType: 'open_plan',
    iconType: 'target'
  },
  {
    id: 'rem-3',
    title: '💡 Sugerencia de Foxy: Refuerzo en Matemáticas',
    description: 'Detecté dudas frecuentes en el cálculo de fracciones con signos negativos. ¿Querés que hagamos 3 ejercicios guiados paso a paso?',
    folderId: '3',
    folderName: 'Matemática',
    priority: 'tip',
    actionPrompt: 'Explicame con el método socrático cómo resolver una operación combinada de fracciones con signos negativos.',
    actionType: 'ask_foxy',
    iconType: 'brain'
  },
  {
    id: 'rem-4',
    title: '🃏 Repasar Flashcards de Literatura',
    description: 'Tenés 4 tarjetas del mazo de Vanguardias con nivel de dominio medio. Dale una pasada rápida.',
    folderId: '1',
    folderName: 'Literatura 3°A',
    priority: 'spaced_review',
    actionPrompt: 'Quiero repasar el mazo de flashcards de Vanguardias Literarias.',
    actionType: 'start_flashcards',
    iconType: 'sparkles'
  }
];

export const INITIAL_STUDENT_SESSIONS: StudentStudySession[] = [
  {
    id: 'sess-lit-1',
    folderId: '1',
    folderName: 'Literatura 3°A',
    title: 'Análisis de Vanguardias y Creacionismo',
    createdAt: 'Hoy, 10:30',
    updatedAt: 'Hoy, 10:45',
    mode: 'socratico',
    isPinned: true,
    messages: [
      {
        id: 'msg-1',
        sender: 'ai',
        text: '¡Hola! 🦊 Estoy listo para ayudarte a estudiar **Literatura 3°A**.\n\nTengo cargados tus apuntes de **Vanguardias Literarias** (Rubén Darío, Vicente Huidobro y caligramas). ¿Qué te gustaría practicar hoy?',
        timestamp: '10:30',
        suggestedActions: [
          { label: '🃏 Practicar Flashcards', actionPrompt: 'Quiero repasar con flashcards las Vanguardias', iconType: 'flashcards' },
          { label: '⚡ Quiz Rápido de 5 preguntas', actionPrompt: 'Hagamos un quiz rápido de evaluación formativa', iconType: 'quiz' },
          { label: '🧠 Mapa Conceptual Interactivo', actionPrompt: 'Diseña un mapa conceptual de los movimientos vanguardistas', iconType: 'mapa' },
          { label: '📝 Resumen con Puntos Clave', actionPrompt: 'Hazme un resumen conciso de los puntos esenciales', iconType: 'resumen' }
        ]
      }
    ]
  },
  {
    id: 'sess-hist-1',
    folderId: '2',
    folderName: 'Historia 3°A',
    title: 'Repaso Parcial: Revolución Francesa',
    createdAt: 'Ayer, 16:20',
    updatedAt: 'Ayer, 17:10',
    mode: 'socratico',
    isPinned: false,
    messages: [
      {
        id: 'msg-h1',
        sender: 'ai',
        text: '¡Hola! 🦊 Veo que estás preparando el **Parcial de Historia**. He organizado tu cronograma de Active Recall y 5 preguntas clave.\n\n¿Por cuál tema de la Revolución Francesa empezamos?',
        timestamp: 'Ayer, 16:20',
        suggestedActions: [
          { label: '🎯 Ver Plan de Estudio', actionPrompt: 'Mostrame mi plan de estudio y próximos hitos', iconType: 'plan' },
          { label: '⚡ Quiz de Autoevaluación', actionPrompt: 'Iniciar quiz sobre la Asamblea y los Estados Generales', iconType: 'quiz' }
        ]
      }
    ]
  }
];
