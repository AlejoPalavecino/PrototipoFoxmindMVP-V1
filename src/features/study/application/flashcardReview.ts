import type { StudyFlashcard, StudyFlashcardDeck } from '../model/Flashcard';

export function markCardMastery(cards: StudyFlashcard[], index: number, mastered: boolean): StudyFlashcard[] {
  const updated = [...cards];
  updated[index] = {
    ...updated[index],
    mastered,
    timesReviewed: (updated[index].timesReviewed || 0) + 1
  };
  return updated;
}

export function selectWeakCards(cards: StudyFlashcard[]): StudyFlashcard[] {
  return cards.filter(c => !c.mastered);
}

export function completeFlashcardDeck(deck: StudyFlashcardDeck, cards: StudyFlashcard[], totalCards: number): StudyFlashcardDeck {
  return {
    ...deck,
    cards,
    masteryPercentage: Math.round((cards.filter(c => c.mastered).length / totalCards) * 100),
    lastReviewed: 'Hoy'
  };
}
