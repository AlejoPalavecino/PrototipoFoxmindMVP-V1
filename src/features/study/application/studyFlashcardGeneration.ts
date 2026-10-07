import type { StudyGeneratedResource } from '../../../views/alumno/estudio/estudioTypes';

export function createStudyFlashcardResource(folder: {
  id: string;
  name: string;
  topics?: readonly { name: string }[];
}): StudyGeneratedResource {
  return {
    id: `res-fc-${Date.now()}`,
    title: `Flashcards de Active Recall: ${folder.name}`,
    type: 'flashcards',
    folderId: folder.id,
    folderName: folder.name,
    topic: folder.topics?.[0]?.name || folder.name,
    description: 'Mazo de tarjetas de memorización activa con preguntas y pistas.',
    createdAt: 'Justo ahora',
    fileSize: '4 tarjetas',
    fileFormat: 'FLASHCARDS',
    data: {
      flashcardDeck: {
        id: `deck-${Date.now()}`,
        title: `Flashcards: ${folder.name}`,
        folderId: folder.id,
        folderName: folder.name,
        topic: folder.topics?.[0]?.name || folder.name,
        masteryPercentage: 0,
        createdAt: 'Hoy',
        cards: [
          {
            id: 'fc-dyn-1',
            front: `¿Cuál es el concepto nuclear de ${folder.topics?.[0]?.name || folder.name}?`,
            back: 'La base conceptual radica en comprender las relaciones fundamentales y la aplicación práctica de sus principios.',
            hint: 'Pensá en la definición introductoria que vimos en clase.',
            mastered: false
          },
          {
            id: 'fc-dyn-2',
            front: '¿Cuáles son los 3 factores determinantes en este proceso?',
            back: '1. Estructura básica\n2. Dinámica funcional\n3. Impacto en el resultado final',
            hint: 'Recordá el desglose en 3 etapas.',
            mastered: false
          },
          {
            id: 'fc-dyn-3',
            front: '¿Qué error común se suele cometer al resolver este tipo de problemas?',
            back: 'Omitir la verificación paso a paso y no contrastar con la hipótesis inicial.',
            hint: 'Foco en la autoevaluación.',
            mastered: false
          }
        ]
      }
    }
  };
}
