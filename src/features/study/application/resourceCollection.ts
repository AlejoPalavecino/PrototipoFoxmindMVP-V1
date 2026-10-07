import type { StudyGeneratedResource } from '../../../views/alumno/estudio/estudioTypes';
import type { StudyFlashcardDeck } from '../model/Flashcard';

export function prependStudyResource(prev: readonly StudyGeneratedResource[], newResource: StudyGeneratedResource): StudyGeneratedResource[] {
  return [newResource, ...prev];
}

export function replaceResourceFlashcardDeck(prev: readonly StudyGeneratedResource[], updatedDeck: StudyFlashcardDeck): StudyGeneratedResource[] {
  return prev.map(r => {
    if (r.data?.flashcardDeck?.id === updatedDeck.id) {
      return {
        ...r,
        data: {
          ...r.data,
          flashcardDeck: updatedDeck
        }
      };
    }
    return r;
  });
}
