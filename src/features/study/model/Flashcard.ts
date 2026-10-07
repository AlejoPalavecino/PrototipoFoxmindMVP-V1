export interface StudyFlashcard {
  id: string;
  front: string;
  back: string;
  hint?: string;
  mastered?: boolean;
  timesReviewed?: number;
}

export interface StudyFlashcardDeck {
  id: string;
  title: string;
  folderId: string;
  folderName: string;
  topic: string;
  cards: StudyFlashcard[];
  createdAt: string;
  lastReviewed?: string;
  masteryPercentage: number;
}
