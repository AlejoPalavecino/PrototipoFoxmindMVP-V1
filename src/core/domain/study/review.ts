export const studyReviewActivityLimit = 500;

type ReviewSession = {
  id: string;
  startAt: string;
  topicIds: string[];
  activity?: string;
};

/** Guide each encounter using the previous dates for those topics in this plan. */
export function studyReviewActivities(sessions: readonly ReviewSession[], timeZone: string): Map<string, string> {
  const calendar = new Intl.DateTimeFormat('es-AR', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const daysByTopic = new Map<string, Set<string>>();
  const activities = new Map<string, string>();
  const ordered = [...sessions].sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
  for (const session of ordered) {
    const day = calendar.format(new Date(session.startAt));
    const visits = session.topicIds.map(id => daysByTopic.get(id) ?? new Set<string>());
    let suggestion: string;
    if (!visits.length || visits.some(days => !days.size)) {
      suggestion = 'Explicá la idea con tus palabras sin mirar el material. Después compará tu explicación con el apunte y marcá una duda.';
    } else if (visits.some(days => days.has(day))) {
      suggestion = 'Revisá la duda que quedó y anotá qué recordar. Si podés, mové este repaso a otro día para volver al tema con distancia.';
    } else {
      suggestion = 'Recordá la idea antes de abrir el apunte. Aplicala a un caso distinto y anotá qué tuviste que ajustar.';
    }
    activities.set(session.id, session.activity || suggestion);
    session.topicIds.forEach((id, index) => daysByTopic.set(id, visits[index]!.add(day)));
  }
  return activities;
}
