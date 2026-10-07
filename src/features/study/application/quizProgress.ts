export function calculateQuizCompletionScore(score: number, selectedOpt: number | null, correctIndex: number): number {
  return score + (selectedOpt === correctIndex ? 1 : 0);
}

export function calculateFolderQuizProgress(priorProgress: number | undefined, score: number, total: number): number {
  return Math.min(100, (priorProgress || 0) + Math.round((score / total) * 15));
}
