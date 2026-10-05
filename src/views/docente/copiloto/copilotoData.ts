import { 
  CopilotoSession, 
  CopilotoResource, 
  AulaContextKnowledge, 
  CopilotoRecommendation 
} from './copilotoTypes';

export const INITIAL_AULA_CONTEXTS: Record<string, AulaContextKnowledge> = {
  c1: {
    aulaId: 'c1',
    subject: 'Literatura',
    course: '3°A',
    color: 'bg-fox-purple',
    files: [
      { id: 'f-lit-1', name: 'Manifiestos_de_Vanguardia_Huidobro_Torre.pdf', type: 'PDF', size: '3.4 MB', category: 'Lecturas Obligatorias', uploadDate: '12 Ago', activeInContext: true },
      { id: 'f-lit-2', name: 'Guia_Metodologica_Redaccion_Ensayos.pdf', type: 'PDF', size: '1.8 MB', category: 'Guías de Trabajo', uploadDate: '08 Ago', activeInContext: true },
      { id: 'f-lit-3', name: 'Antologia_Poetica_Ruben_Dario.pdf', type: 'PDF', size: '5.1 MB', category: 'Lecturas Obligatorias', uploadDate: '28 Jul', activeInContext: true },
      { id: 'f-lit-4', name: 'Rubrica_Formativa_Ensayos_APA7.docx', type: 'DOCX', size: '420 KB', category: 'Evaluaciones', uploadDate: '20 Jul', activeInContext: true },
      { id: 'f-lit-5', name: 'Presentacion_Modernismo_Experimentacion.pptx', type: 'PPTX', size: '14.2 MB', category: 'Clases', uploadDate: '03 Ago', activeInContext: false },
    ],
    curriculumUnits: [
      { unit: 'Unidad 1: Modernismo y Simbolismo', status: 'completed', topics: ['Rubén Darío', 'Características formales', 'Poesía modernista'] },
      { unit: 'Unidad 2: Vanguardias Latinoamericanas', status: 'current', topics: ['Creacionismo (Huidobro)', 'Ultraísmo (Borges/Torre)', 'Manifiestos estéticos'] },
      { unit: 'Unidad 3: El Boom Latinoamericano', status: 'pending', topics: ['Realismo Mágico', 'García Márquez', 'Julio Cortázar'] },
      { unit: 'Unidad 4: Narrativa Contemporánea', status: 'pending', topics: ['Ficción especulativa', 'Microficción', 'Poesía actual'] },
    ],
    duaStudents: [
      { name: 'Sofía Herrera', dua: ['Dislexia'], recommendationNote: 'Priorizar oraciones cortas, tamaño de fuente legible y soporte auditivo.' },
      { name: 'Ana Torres', dua: ['TDAH'], recommendationNote: 'Dividir consignas en pasos breves de 15 minutos con pausas activas.' },
    ],
  },
  c3: {
    aulaId: 'c3',
    subject: 'Matemáticas',
    course: '3°B',
    color: 'bg-fox-orange',
    files: [
      { id: 'f-mat-1', name: 'Guia_Fracciones_y_Expresiones_Algebraicas.pdf', type: 'PDF', size: '2.9 MB', category: 'Guías de Trabajo', uploadDate: '15 Ago', activeInContext: true },
      { id: 'f-mat-2', name: 'Ejercicios_Ecuaciones_Cuadraticas_Resueltas.pdf', type: 'PDF', size: '3.1 MB', category: 'Material Teórico', uploadDate: '10 Ago', activeInContext: true },
      { id: 'f-mat-3', name: 'Tabla_Formulas_Trigonometria_Basica.pdf', type: 'PDF', size: '920 KB', category: 'Formularios', uploadDate: '02 Ago', activeInContext: true },
    ],
    curriculumUnits: [
      { unit: 'Unidad 1: Números Racionales y Reales', status: 'completed', topics: ['Operaciones combinadas', 'Notación científica'] },
      { unit: 'Unidad 2: Álgebra y Ecuaciones de 2do Grado', status: 'current', topics: ['Fórmula resolvente', 'Discriminante', 'Problemas aplicados'] },
      { unit: 'Unidad 3: Funciones Lineales y Cuadráticas', status: 'pending', topics: ['Parábola', 'Vértice y raíces', 'Interpretación gráfica'] },
    ],
    duaStudents: [
      { name: 'Lucas Díaz', dua: ['Discalculia'], recommendationNote: 'Utilizar apoyos visuales con cuadrículas de colores y calculadoras guiadas.' },
    ],
  },
  c4: {
    aulaId: 'c4',
    subject: 'Ciencias Naturales',
    course: '2°A',
    color: 'bg-fox-green',
    files: [
      { id: 'f-cie-1', name: 'Manual_Biologia_Celular_y_Ecosistemas.pdf', type: 'PDF', size: '6.8 MB', category: 'Libro de Texto', uploadDate: '18 Ago', activeInContext: true },
      { id: 'f-cie-2', name: 'Guia_Laboratorio_Mitosis_y_Meiosis.docx', type: 'DOCX', size: '1.4 MB', category: 'Prácticas de Laboratorio', uploadDate: '11 Ago', activeInContext: true },
      { id: 'f-cie-3', name: 'Esquema_Cadenas_Troficas_y_Energia.pdf', type: 'PDF', size: '2.1 MB', category: 'Infografías', uploadDate: '05 Ago', activeInContext: true },
    ],
    curriculumUnits: [
      { unit: 'Unidad 1: La Célula como Unidad de Vida', status: 'completed', topics: ['Célula procariota y eucariota', 'Organelos celulares'] },
      { unit: 'Unidad 2: División Celular y Genética', status: 'current', topics: ['Mitosis', 'Meiosis', 'Herencia mendeliana'] },
      { unit: 'Unidad 3: Dinámica de Ecosistemas', status: 'pending', topics: ['Redes tróficas', 'Ciclos biogeoquímicos', 'Impacto ambiental'] },
    ],
    duaStudents: [
      { name: 'Tomás Gómez', dua: ['TDAH'], recommendationNote: 'Incorporar dinámicas de gamificación y experimentos manipulativos.' },
    ],
  },
};

export const INITIAL_COPILOTO_SESSIONS: CopilotoSession[] = [
  {
    id: 'session-1',
    title: 'Evaluación y Rúbrica: Vanguardias',
    createdAt: 'Hoy, 10:00',
    updatedAt: 'Hoy, 10:05',
    aulaId: 'c1',
    aulaName: 'Literatura 3°A',
    agentType: 'evaluador',
    tone: 'academico',
    messagesCount: 3,
    isPinned: true,
    messages: [
      {
        id: 'm1-1',
        sender: 'user',
        text: 'Necesito una evaluación comprensiva para el tema Vanguardias Literarias, con rúbrica analítica de 4 niveles adaptada a los textos de Huidobro y Guillermo de Torre.',
        timestamp: '10:00',
      },
      {
        id: 'm1-2',
        sender: 'ai',
        agentType: 'evaluador',
        text: '¡Excelente! He analizado los archivos cargados en el contexto de **Literatura 3°A** (`Manifiestos_de_Vanguardia_Huidobro_Torre.pdf` y la currícula de la Unidad 2).\n\nHe diseñado una propuesta estructurada con:\n\n1. **Consigna de Ensayo Comparativo:** Enfoque en la imagen poética en *Non Serviam* y *Hélices*.\n2. **Rúbrica Analítica de 4 Niveles:** Dominio conceptual, Análisis crítico, Organización discursiva y Citación APA7.\n3. **Recomendación DUA:** Adaptación con preguntas guía para **Sofía Herrera** (Dislexia).',
        timestamp: '10:01',
        generatedArtifact: {
          id: 'res-rubrica-vanguardias',
          title: 'Rúbrica Analítica: Vanguardias Literarias',
          type: 'rubric',
          previewSummary: 'Rúbrica de 4 niveles con ponderación porcentual y pautas DUA.'
        },
        suggestedActions: [
          { label: 'Asignar como Actividad al Aula', actionPrompt: 'Asignar esta rúbrica a la actividad de Literatura 3°A', iconType: 'activity' },
          { label: 'Generar versión DUA de lectura fácil', actionPrompt: 'Genera la adaptación DUA específica para Sofía con consignas paso a paso', iconType: 'dua' },
          { label: 'Crear presentación de 5 slides para la clase', actionPrompt: 'Crea una presentación de diapositivas resumiendo los puntos clave de la rúbrica', iconType: 'refine' }
        ]
      }
    ]
  },
  {
    id: 'session-2',
    title: 'Secuencia Didáctica: Ecosistemas y Redes Tróficas',
    createdAt: 'Ayer, 16:30',
    updatedAt: 'Ayer, 16:45',
    aulaId: 'c4',
    aulaName: 'Ciencias Naturales 2°A',
    agentType: 'planificador',
    tone: 'empatico',
    messagesCount: 2,
    messages: [
      {
        id: 'm2-1',
        sender: 'user',
        text: 'Planifiquemos una secuencia de 3 clases para la Unidad 3 sobre Redes Tróficas y Flujo de Energía con una dinámica interactiva de laboratorio.',
        timestamp: '16:30',
      },
      {
        id: 'm2-2',
        sender: 'ai',
        agentType: 'planificador',
        text: 'He generado la **Secuencia Didáctica Completa (3 clases de 80 min)** integrando el material de biblioteca `Manual_Biologia_Celular_y_Ecosistemas.pdf`.\n\n- **Clase 1:** Productores y Consumidores (Simulación en pizarra interactiva).\n- **Clase 2:** Dinámica grupal con tarjetas de organismos e impacto trófico.\n- **Clase 3:** Cierre ABP: "El colapso de un ecosistema local".\n\nTambién generé el **Mapa Conceptual Interactivo** de apoyo visual para proyectar en el aula.',
        timestamp: '16:32',
        generatedArtifact: {
          id: 'res-mapa-ecosistemas',
          title: 'Mapa Conceptual: Dinámica de Ecosistemas',
          type: 'concept_map',
          previewSummary: 'Estructura jerárquica con 12 nodos interconectados.'
        },
        suggestedActions: [
          { label: 'Ver Mapa Conceptual', actionPrompt: 'Abrir mapa conceptual de ecosistemas', iconType: 'refine' },
          { label: 'Crear Trabajo Práctico evaluable', actionPrompt: 'Convierte la secuencia en una consigna de trabajo práctico grupal para Ciencias 2°A', iconType: 'activity' }
        ]
      }
    ]
  },
  {
    id: 'session-3',
    title: 'Adaptación DUA: Ecuaciones de 2do Grado',
    createdAt: 'Hace 3 días',
    updatedAt: 'Hace 3 días',
    aulaId: 'c3',
    aulaName: 'Matemáticas 3°B',
    agentType: 'adaptador',
    tone: 'socratico',
    messagesCount: 2,
    messages: [
      {
        id: 'm3-1',
        sender: 'user',
        text: '¿Cómo puedo adaptar la explicación de la fórmula resolvente de ecuaciones cuadráticas para alumnos con dificultades de cálculo visual?',
        timestamp: '11:15',
      },
      {
        id: 'm3-2',
        sender: 'ai',
        agentType: 'adaptador',
        text: 'Aquí tienes la propuesta basada en el enfoque **DUA (Pauta 1: Múltiples formas de representación)**:\n\n1. **Código cromático para coeficientes:** $a$ (rojo), $b$ (azul), $c$ (verde).\n2. **Plantilla de cálculo guiado paso a paso** con casillas en blanco para evitar saltos cognitivos.\n3. **Verificación geométrica:** Gráfico de la parábola para vincular las raíces algebraicas con los cortes en el eje X.',
        timestamp: '11:17',
        generatedArtifact: {
          id: 'res-doc-dua-mat',
          title: 'Guía DUA: Álgebra Visual Paso a Paso',
          type: 'document',
          previewSummary: 'Plantilla descargable en Word/PDF con tarjetas de colores.'
        }
      }
    ]
  }
];

export const INITIAL_RESOURCES: CopilotoResource[] = [
  {
    id: 'res-rubrica-vanguardias',
    title: 'Rúbrica Analítica: Ensayo de Vanguardias Literarias',
    type: 'rubric',
    categoryLabel: 'Rúbricas y Criterios',
    aulaId: 'c1',
    aulaName: 'Literatura 3°A',
    createdAt: '28 Ago 2026',
    description: 'Matriz de evaluación formativa con 4 niveles de desempeño (Excelente, Muy Bueno, En Desarrollo, Inicial) y pautas de accesibilidad DUA.',
    tags: ['Rúbrica', 'Vanguardias', 'Ensayo', 'DUA'],
    fileFormat: 'PDF',
    fileSize: '480 KB',
    contentMarkdown: `# Rúbrica Analítica de Evaluación: Ensayo Crítico de Vanguardias

**Materia:** Literatura 3° Año  
**Eje Temático:** Creacionismo y Ultraísmo (Vicente Huidobro & Guillermo de Torre)  
**Ponderación Total:** 10 Puntos  

---

### Tabla de Desempeño

| Criterio | Nivel 4 - Excelente (10-9 pts) | Nivel 3 - Muy Bueno (8-7 pts) | Nivel 2 - En Desarrollo (6-5 pts) | Nivel 1 - Inicial (<5 pts) |
| :--- | :--- | :--- | :--- | :--- |
| **Dominio Teórico** (30%) | Comprende con profundidad la ruptura vanguardista y distingue con precisión Creacionismo y Ultraísmo. | Distingue los movimientos con claridad conceptual, con mínimas omisiones conceptuales. | Comprensión básica; confunde aspectos secundarios de los manifiestos. | Confusión generalizada entre los movimientos poéticos. |
| **Análisis Crítico & Citas** (35%) | Articula mínimo 2 citas textuales justificadas y contextualizadas de forma original. | Incluye 2 citas textuales pertinentes pero con análisis predominantemente descriptivo. | Solo incluye 1 cita o las citas carecen de relación con el texto. | No incluye citas de los manifiestos trabajados. |
| **Estructura y Coherencia** (20%) | Introducción motivadora, desarrollo fluido con conectores lógicos y conclusión sintética. | Estructura comprensible, aunque con transiciones algo abruptas entre párrafos. | Párrafos inconexos o falta de una conclusión fundamentada. | Texto desorganizado y sin progresión temática. |
| **Normas APA & Estilo** (15%) | Citación impecable, vocabulario preciso y ortografía sin errores. | 1 o 2 deslices de puntuación o citación que no impiden la lectura. | Múltiples faltas de ortografía y citación incompleta. | Formato descuidado con errores gramaticales graves. |

---

### Adaptaciones DUA Integradas:
- **Lectura Asistida:** Permitir entrega en formato de podcast o exposición oral de 3 minutos.
- **Dislexia:** No penalizar la ortografía mecánica en borradores iniciales; evaluar la solidez del argumento.`
  },
  {
    id: 'res-pres-vanguardias',
    title: 'Presentación: Movimientos de Vanguardia y Ruptura Estética',
    type: 'presentation',
    categoryLabel: 'Presentaciones',
    aulaId: 'c1',
    aulaName: 'Literatura 3°A',
    createdAt: '27 Ago 2026',
    description: 'Diapositivas didácticas con esquemas conceptuales, citas emblemáticas y preguntas disparadoras para debatir en clase.',
    tags: ['Diapositivas', 'Literatura', 'PPTX', 'Clase Interactiva'],
    fileFormat: 'PPTX',
    fileSize: '8.4 MB',
    slidesData: [
      {
        id: 1,
        title: 'Las Vanguardias Literarias del Siglo XX',
        subtitle: 'La ruptura con el pasado y la invención del poema moderno',
        bullets: [
          'Contexto de posguerra y crisis del racionalismo europeo.',
          'Rechazo del arte imitativo: el arte como creación autónoma.',
          'Nacimiento de los "Ismos": Futurismo, Dadaísmo, Creacionismo y Ultraísmo.'
        ],
        notes: 'Iniciar la clase preguntando a los alumnos qué entienden por "vanguardia" en la música o la moda actual.',
        visualTag: 'Diapositiva Introductoria'
      },
      {
        id: 2,
        title: 'Vicente Huidobro y el Creacionismo',
        subtitle: '"¿Por qué cantáis la rosa, ¡oh poetas!? Hacedla florecer en el poema"',
        bullets: [
          'El poeta como un "pequeño Dios" que crea realidades nuevas.',
          'Manifiesto "Non Serviam" (1914): Desobediencia a la naturaleza.',
          'Eliminación de lo anecdótico y primacía de la metáfora pura.'
        ],
        notes: 'Proyectar el poema visual y pedir a un estudiante que lea la estrofa central en voz alta.',
        visualTag: 'Creacionismo'
      },
      {
        id: 3,
        title: 'El Ultraísmo en España y el Río de la Plata',
        subtitle: 'La síntesis de dos o más imágenes en una',
        bullets: [
          'Guillermo de Torre y Jorge Luis Borges en Buenos Aires.',
          'Supresión de la rima tradicional y el adorno sentimental.',
          'Uso de caligramas, espacios en blanco y tipografía expresiva.'
        ],
        notes: 'Comparar un caligrama de De Torre con un poema tradicional modernista de Rubén Darío.',
        visualTag: 'Ultraísmo'
      },
      {
        id: 4,
        title: 'Cuadro Comparativo: Creacionismo vs. Ultraísmo',
        subtitle: 'Puntos de encuentro y divergencias clave',
        bullets: [
          'Creacionismo: Crea mundos enteros independientes de lo real.',
          'Ultraísmo: Condensa múltiples percepciones dinámicas en una imagen.',
          'Ambos: Abolición de la anécdota y exaltación de la novedad.'
        ],
        notes: 'Pausa activa de 5 minutos para que los alumnos completen la tabla en sus cuadernos.',
        visualTag: 'Síntesis Didáctica'
      },
      {
        id: 5,
        title: 'Actividad de Producción: Manifiesto Expres',
        subtitle: 'Tu turno de fundar una vanguardia escolar',
        bullets: [
          'En parejas, redactar 3 reglas innegociables para su propio movimiento.',
          'Crear un poema de 4 versos aplicando las 3 reglas.',
          'Subir el borrador al Aula Virtual de Foxy para coevaluación.'
        ],
        notes: 'Monitorear los grupos y brindar asistencia DUA a quienes elijan formato visual/audio.',
        visualTag: 'Taller en Aula'
      }
    ]
  },
  {
    id: 'res-mapa-ecosistemas',
    title: 'Mapa Conceptual: Dinámica de Ecosistemas y Flujos Tróficos',
    type: 'concept_map',
    categoryLabel: 'Mapas Conceptuales',
    aulaId: 'c4',
    aulaName: 'Ciencias Naturales 2°A',
    createdAt: '26 Ago 2026',
    description: 'Red conceptual interactiva con relaciones jerárquicas entre niveles tróficos, ciclos biogeoquímicos y equilibrio ecológico.',
    tags: ['Mapa Conceptual', 'Biología', 'Ecología', 'Interactiva'],
    fileFormat: 'JSON',
    fileSize: '320 KB',
    conceptMapData: {
      centralTopic: 'Ecosistema y Redes Tróficas',
      nodes: [
        { id: 'n1', label: 'Ecosistema', category: 'core', description: 'Sistema biológico constituido por una comunidad de seres vivos y el medio natural.', color: '#3b82f6' },
        { id: 'n2', label: 'Biotopo (Factores Abióticos)', category: 'branch', parentId: 'n1', description: 'Luz solar, agua, suelo, temperatura y minerales.', color: '#06b6d4' },
        { id: 'n3', label: 'Biocenosis (Factores Bióticos)', category: 'branch', parentId: 'n1', description: 'Conjunto de organismos vivos que interactúan.', color: '#10b981' },
        { id: 'n4', label: 'Productores (Autótrofos)', category: 'subbranch', parentId: 'n3', description: 'Plantas, algas y fitoplancton que realizan fotosíntesis.', color: '#22c55e' },
        { id: 'n5', label: 'Consumidores Primarios (Herbívoros)', category: 'subbranch', parentId: 'n3', description: 'Se alimentan directamente de los productores.', color: '#f59e0b' },
        { id: 'n6', label: 'Consumidores Secundarios (Carnívoros)', category: 'subbranch', parentId: 'n3', description: 'Depredan sobre consumidores primarios.', color: '#f97316' },
        { id: 'n7', label: 'Descomponedores (Hongos y Bacterias)', category: 'subbranch', parentId: 'n3', description: 'Reciclan la materia orgánica devolviéndola al suelo.', color: '#8b5cf6' },
        { id: 'n8', label: 'Flujo de Energía (Unidireccional)', category: 'detail', parentId: 'n1', description: 'Regla del 10%: solo el 10% de energía pasa al siguiente nivel.', color: '#ef4444' },
        { id: 'n9', label: 'Ciclos Biogeoquímicos (Cíclicos)', category: 'detail', parentId: 'n2', description: 'Ciclo del Carbono, Nitrógeno y Agua en el planeta.', color: '#6366f1' },
      ]
    }
  },
  {
    id: 'res-img-celula',
    title: 'Infografía Ilustrada: Estructura de la Célula Eucariota',
    type: 'image',
    categoryLabel: 'Imágenes y Diagramas',
    aulaId: 'c4',
    aulaName: 'Ciencias Naturales 2°A',
    createdAt: '25 Ago 2026',
    description: 'Gráfico didáctico de alta resolución con rotulado de organelos (Núcleo, Mitocondria, Retículo, Ribosomas) y esquema explicativo.',
    tags: ['Infografía', 'Célula', 'Gráfico Didáctico', 'Visual'],
    fileFormat: 'PNG',
    fileSize: '3.2 MB',
    thumbnail: 'https://images.unsplash.com/photo-1530210124550-912dc1381cb8?auto=format&fit=crop&w=800&q=80',
    contentMarkdown: `### Infografía Pedagógica: Anatomía Celular Eucariota
- **Núcleo Celular:** Almacena el ADN y dirige la síntesis proteica.
- **Mitocondrias:** Centrales energéticas que producen ATP mediante respiración celular.
- **Retículo Endoplasmático:** Transporte y síntesis de lípidos y proteínas.
- **Aparato de Golgi:** Empaquetamiento y secreción de sustancias celulares.`
  },
  {
    id: 'res-quiz-newton',
    title: 'Cuestionario Diagnóstico: Leyes del Movimiento de Newton',
    type: 'quiz',
    categoryLabel: 'Quizzes y Evaluaciones',
    aulaId: 'c3',
    aulaName: 'Matemáticas 3°B',
    createdAt: '24 Ago 2026',
    description: 'Quiz interactivo de 5 preguntas formativas con retroalimentación inmediata, justificaciones pedagógicas y puntaje automático.',
    tags: ['Quiz', 'Física', 'Fuerza y Movimiento', 'Autocorrección'],
    fileFormat: 'JSON',
    fileSize: '240 KB',
    quizQuestions: [
      {
        question: '¿Qué establece la Primera Ley de Newton (Ley de Inercia)?',
        options: [
          'La aceleración es proporcional a la fuerza aplicada.',
          'Todo cuerpo persevera en su estado de reposo o movimiento rectilíneo uniforme si no actúa una fuerza sobre él.',
          'A toda acción corresponde una reacción opuesta de igual magnitud.',
          'La energía no se crea ni se destruye, solo se transforma.'
        ],
        correctIndex: 1,
        explanation: 'La 1° Ley de Newton define la inercia como la resistencia de los cuerpos a cambiar su estado dinámico sin una fuerza externa neta.'
      },
      {
        question: 'Si duplicamos la fuerza neta aplicada sobre un carrito de masa constante, ¿qué sucede con su aceleración?',
        options: [
          'Se reduce a la mitad.',
          'Permanece exactamente igual.',
          'Se duplica.',
          'Se cuadruplica.'
        ],
        correctIndex: 2,
        explanation: 'Según F = m * a, con masa constante, la fuerza y la aceleración son directamente proporcionales.'
      },
      {
        question: 'Una persona empuja una pared con 50 N. ¿Con qué fuerza reacciona la pared sobre la persona?',
        options: [
          '0 N, porque la pared no se mueve.',
          '50 N en sentido contrario.',
          '25 N amortiguados.',
          '100 N combinados.'
        ],
        correctIndex: 1,
        explanation: 'Por el principio de Acción y Reacción (3° Ley), las fuerzas de interacción son siempre de igual magnitud y sentido opuesto.'
      }
    ]
  },
  {
    id: 'res-doc-secuencia-eco',
    title: 'Secuencia Didáctica: Ecosistemas y Biodiversidad',
    type: 'document',
    categoryLabel: 'Documentos e Informes',
    aulaId: 'c4',
    aulaName: 'Ciencias Naturales 2°A',
    createdAt: '22 Ago 2026',
    description: 'Planificación docente completa con fundamentación curricular, cronograma de 4 semanas, objetivos de aprendizaje y rúbrica formativa.',
    tags: ['Secuencia Didáctica', 'Planificación', 'Ciencias', 'ABP'],
    fileFormat: 'DOCX',
    fileSize: '1.2 MB',
    contentMarkdown: `# Secuencia Didáctica: Ecosistemas y Conservación Ambiental

**Institución:** Escuela Secundaria FoxMind  
**Materia:** Ciencias Naturales  
**Curso:** 2° Año A  
**Duración:** 4 Semanas (8 Encuentros de 80 min)  
**Docente:** Profa. Laura Martínez  

---

## 1. Fundamentación Pedagógica
La presente secuencia aborda la comprensión sistémica del medio ambiente, incentivando a los estudiantes a reconocer las interdependencias tróficas y el impacto antropogénico en los biomas locales mediante metodologías activas y el Aprendizaje Basado en Proyectos (ABP).

## 2. Objetivos de Aprendizaje
- Explicar el flujo unidireccional de energía y el reciclaje de materia en redes alimentarias.
- Diseñar un modelo a escala de ecosistema cerrado en botella (Terrario).
- Argumentar posturas sobre la conservación de la flora y fauna autóctona.

## 3. Cronograma de Clases
- **Semana 1:** Niveles de organización ecológica y factores bióticos/abióticos.
- **Semana 2:** Laboratorio: Armado de micro-ecosistemas controlados.
- **Semana 3:** Cadenas tróficas, pirámides de biomasa y perturbaciones.
- **Semana 4:** Presentación del informe de investigación y debate grupal.`
  }
];

export const INITIAL_RECOMMENDATIONS: CopilotoRecommendation[] = [
  {
    id: 'rec-1',
    title: 'Generar consigna adaptada para alumnos con Dislexia en Literatura',
    description: 'Sofía Herrera (3°A) presenta dificultad en la lectura prolongada de manifiestos. Se sugiere crear una versión con párrafos breves y preguntas estructuradas.',
    badge: 'Atención a la Diversidad (DUA)',
    category: 'dua',
    aulaId: 'c1',
    aulaName: 'Literatura 3°A',
    promptText: 'Genera una adaptación DUA de la actividad de Vanguardias para Sofía Herrera con formato de lectura fácil, oraciones cortas y guía de preguntas paso a paso.',
    actionLabel: 'Generar Adaptación DUA',
    impactLevel: 'Alto'
  },
  {
    id: 'rec-2',
    title: 'Crear rúbrica de cierre para Unidad 2 en Literatura 3°A',
    description: 'La Unidad 2 de Vanguardias finaliza en 5 días. Conviene publicar la rúbrica formativa antes de la entrega del ensayo para clarificar criterios.',
    badge: 'Cierre de Unidad',
    category: 'urgent',
    aulaId: 'c1',
    aulaName: 'Literatura 3°A',
    promptText: 'Elabora una rúbrica analítica para evaluar el ensayo comparativo sobre Creacionismo y Ultraísmo en Literatura 3°A.',
    actionLabel: 'Crear Rúbrica Analítica',
    impactLevel: 'Alto'
  },
  {
    id: 'rec-3',
    title: 'Diseñar actividad ABP de gamificación en Matemáticas 3°B',
    description: 'El rendimiento en ecuaciones cuadráticas cayó un 15%. Un Escape Room matemático en parejas fomentará la motivación y el trabajo colaborativo.',
    badge: 'Innovación Didáctica',
    category: 'didactic',
    aulaId: 'c3',
    aulaName: 'Matemáticas 3°B',
    promptText: 'Diseña una actividad gamificada tipo Escape Room de 45 minutos para repasar ecuaciones de segundo grado en Matemáticas 3°B.',
    actionLabel: 'Diseñar Escape Room',
    impactLevel: 'Recomendado'
  },
  {
    id: 'rec-4',
    title: 'Secuencia de laboratorio para la Unidad 3 de Ciencias Naturales',
    description: 'La próxima semana comienza Dinámica de Ecosistemas. Foxy propone una práctica de observación de microorganismos en agua estancada.',
    badge: 'Planificación Semanal',
    category: 'planning',
    aulaId: 'c4',
    aulaName: 'Ciencias Naturales 2°A',
    promptText: 'Planifica una guía de laboratorio escolar para observar descomponedores y microorganismos de agua dulce en Ciencias Naturales 2°A.',
    actionLabel: 'Planificar Práctica de Lab',
    impactLevel: 'Medio'
  },
  {
    id: 'rec-5',
    title: 'Cuestionario de autoevaluación rápida (Quiz 5 preguntas)',
    description: 'Permite a los alumnos de Literatura autoevaluar su comprensión antes del examen de la próxima semana.',
    badge: 'Evaluación Formativa',
    category: 'urgent',
    aulaId: 'c1',
    aulaName: 'Literatura 3°A',
    promptText: 'Crea un cuestionario de 5 preguntas de opción múltiple con retroalimentación para repasar Modernismo y Vanguardias.',
    actionLabel: 'Crear Quiz Rápido',
    impactLevel: 'Medio'
  }
];
