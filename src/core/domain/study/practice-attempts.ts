type PracticeAttempt = { id: string; previousPracticeId?: string };

export function practiceAttemptFamily<T extends PracticeAttempt>(current: PracticeAttempt, attempts: T[]): T[] {
  const byId = new Map(attempts.map((attempt) => [attempt.id, attempt]));
  function firstAttempt(attempt: PracticeAttempt) {
    let id = attempt.id;
    let previous = attempt.previousPracticeId;
    const visited = new Set([id]);
    while (previous && !visited.has(previous)) {
      id = previous;
      visited.add(id);
      previous = byId.get(id)?.previousPracticeId;
    }
    return id;
  }
  const root = firstAttempt(current);
  return attempts.filter((attempt) => firstAttempt(attempt) === root);
}
