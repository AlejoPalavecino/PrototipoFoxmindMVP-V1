import type { Activity, StudentActivity } from '../model/Activity';

export const createActivityFixtures = (): Activity[] => [
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
      { title: 'Citas y Referencias', content: 'Al menos debes incorporar dos citas textuales de cada autor para respaldar tus argumentos.' },
    ],
    attachment: { name: 'Instrucciones_Ensayo.pdf', size: '2.4 MB', url: '#' },
  },
  { id: 2, title: 'Foro: El Boom Latinoamericano', type: 'Participación', status: 'Activa', due: 'En 3 días', submissions: '15/28', description: 'Participa en el foro debatiendo sobre el impacto del Realismo Mágico en la literatura europea. Debes comentar al menos a dos compañeros.', longInstructions: [] },
  { id: 3, title: 'Cuestionario: Modernismo', type: 'Práctica', status: 'Cerrada', due: 'Semana pasada', submissions: '28/28', description: 'Cuestionario de opción múltiple sobre las características principales del Modernismo y la obra de Rubén Darío.', longInstructions: [] },
];

// Student presentation has always been a separate mount-local fixture, not a
// projection of the teacher/copilot shared session list.
export const createStudentActivityFixtures = (): StudentActivity[] => [
  {
    id: 1,
    title: 'Ensayo: Vanguardias Literarias',
    type: 'Evaluación',
    status: 'Pendiente',
    due: 'Mañana',
    description: 'Lee los manifiestos adjuntos de Vicente Huidobro y Guillermo de Torre. Luego, redacta un breve ensayo comparando cómo cada movimiento aborda la creación de imágenes poéticas.',
    attachment: { name: 'Manifiestos_Vanguardias.pdf', size: '2.4 MB', url: '#' },
  },
  {
    id: 2,
    title: 'Foro: El Boom Latinoamericano',
    type: 'Participación',
    status: 'Pendiente',
    due: 'En 3 días',
    description: 'Participa en el foro debatiendo sobre el impacto del Realismo Mágico en la literatura contemporánea. Debes comentar al menos a dos compañeros.',
    attachment: { name: 'Guia_Realismo_Magico.pdf', size: '1.8 MB', url: '#' },
  },
  {
    id: 3,
    title: 'Cuestionario: Modernismo y Simbolismo',
    type: 'Práctica',
    status: 'Completada',
    due: 'Semana pasada',
    grade: '9.0',
    feedback: '¡Excelente trabajo! Has demostrado una comprensión sistemática de las características del Modernismo y la obra de Rubén Darío.',
    description: 'Cuestionario de opción múltiple y preguntas conceptuales sobre el movimiento modernista.',
    attachment: { name: 'Resumen_Modernismo.pdf', size: '1.1 MB', url: '#' },
  },
];
