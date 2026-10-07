export function upsertStudySession<T extends { id: string }>(prev: T[], updatedSession: T): T[] {
  const idx = prev.findIndex(s => s.id === updatedSession.id);
  if (idx >= 0) {
    const next = [...prev];
    next[idx] = updatedSession;
    return next;
  }
  return [updatedSession, ...prev];
}
