import type { StudyGeneratedResource } from '../../../views/alumno/estudio/estudioTypes';

export function createStudyQuizResource(folder: {
  id: string;
  name: string;
  topics?: readonly { name: string }[];
}): StudyGeneratedResource {
  return {
    id: `res-quiz-${Date.now()}`,
    title: `Quiz Formativo: ${folder.name}`,
    type: 'quiz',
    folderId: folder.id,
    folderName: folder.name,
    topic: folder.topics?.[0]?.name || folder.name,
    description: 'Cuestionario de 3 preguntas con retroalimentación socrática.',
    createdAt: 'Justo ahora',
    fileSize: '3 preguntas',
    fileFormat: 'QUIZ',
    data: {
      quiz: {
        id: `quiz-${Date.now()}`,
        title: `Quiz: ${folder.name}`,
        folderId: folder.id,
        folderName: folder.name,
        topic: folder.topics?.[0]?.name || folder.name,
        difficulty: 'intermedio',
        createdAt: 'Hoy',
        questions: [
          {
            id: 'q-d-1',
            question: `¿Cuál de las siguientes afirmaciones describe mejor a ${folder.name}?`,
            options: [
              'Es un proceso estructurado con fases interdependientes.',
              'Ocurre de forma aislada sin relación con el contexto.',
              'No requiere comprobación de variables.',
              'Se limita exclusivamente a definiciones teóricas.'
            ],
            correctIndex: 0,
            explanation: 'Excelente deducción. Todo el modelo se sostiene en la articulación de etapas concatenadas.',
            topic: 'Conceptos Clave'
          },
          {
            id: 'q-d-2',
            question: 'Al aplicar este método en un examen, ¿cuál es el paso prioritario?',
            options: [
              'Comenzar a escribir sin leer las consignas completas',
              'Identificar las premisas principales y estructurar un esquema previo',
              'Memorizar datos sin comprender la lógica interna',
              'Ignorar las preguntas de desarrollo largo'
            ],
            correctIndex: 1,
            explanation: '¡Exacto! El esquema previo asegura coherencia argumental y evita lagunas conceptuales.',
            topic: 'Metodología'
          }
        ]
      }
    }
  };
}
