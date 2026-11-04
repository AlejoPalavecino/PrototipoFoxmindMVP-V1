import type { AgendaItem, HomeModuleName, HomeModules, HomeResponse, Participation } from '../../src/core/domain/index.ts';

export function shouldShowHomeModule(participation: Participation, name: HomeModuleName, page: HomeModules[HomeModuleName]): boolean {
  if (page.status === 'not-applicable') return false;
  if (page.status === 'error' || page.items.length > 0) return true;
  return participation !== 'none' || name === 'agenda';
}

export function homeGreetingDate(generatedAt: string, timeZone: string): string {
  return new Intl.DateTimeFormat('es-AR', { timeZone, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(generatedAt));
}

export function homeAgendaDate(item: AgendaItem, timeZone: string): { weekday: string; day: string; month: string; dateTime: string } {
  const dateTime = item.allDay ? item.date : item.startAt!;
  const instant = new Date(item.allDay ? `${dateTime}T12:00:00.000Z` : dateTime);
  const zone = item.allDay ? 'UTC' : timeZone;
  return {
    weekday: new Intl.DateTimeFormat('es-AR', { timeZone: zone, weekday: 'short' }).format(instant).replace('.', ''),
    day: new Intl.DateTimeFormat('es-AR', { timeZone: zone, day: 'numeric' }).format(instant),
    month: new Intl.DateTimeFormat('es-AR', { timeZone: zone, month: 'short' }).format(instant).replace('.', ''),
    dateTime,
  };
}

export function homeAgendaTime(item: AgendaItem, timeZone: string): string {
  if (item.allDay) return 'Todo el día';
  return new Intl.DateTimeFormat('es-AR', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(item.startAt!));
}

export function homeSetupSummary({ drafts, invitations }: { drafts: number; invitations: number }): string {
  return [
    drafts > 0 ? `${drafts} ${drafts === 1 ? 'borrador privado' : 'borradores privados'}` : '',
    invitations > 0 ? `${invitations} ${invitations === 1 ? 'invitación pendiente' : 'invitaciones pendientes'}` : '',
  ].filter(Boolean).join(' · ');
}

export function homeReviewCount(count: number): string {
  return `${count} ${count === 1 ? 'actividad' : 'actividades'}`;
}

export function homeReviewSummary({ attempts, needsReview, readyToPublish }: { attempts: number; needsReview: number; readyToPublish: number }): string {
  return `${attempts} ${attempts === 1 ? 'entrega' : 'entregas'} · ${needsReview} por revisar · ${readyToPublish} ${readyToPublish === 1 ? 'lista' : 'listas'} para publicar`;
}

export interface HomeActivityStat {
  key: 'study' | 'teach' | 'pending' | 'feedback' | 'review';
  label: string;
  value: number;
}

/** Counts are independent facts from the aggregate, never a completion metric. */
export function homeActivityStats(data: HomeResponse): HomeActivityStat[] {
  const stats: HomeActivityStat[] = [];
  if (data.memberships.study > 0) stats.push({ key: 'study', label: 'Aulas donde estudias', value: data.memberships.study });
  if (data.memberships.teach > 0) stats.push({ key: 'teach', label: 'Aulas donde enseñas', value: data.memberships.teach });
  const { pending, feedback, review } = data.modules;
  if (pending.status === 'ready' && pending.totalItems !== null) {
    stats.push({ key: 'pending', label: 'Actividades por entregar', value: pending.totalItems });
  }
  if (feedback.status === 'ready' && feedback.totalItems !== null) {
    stats.push({ key: 'feedback', label: 'Devoluciones disponibles', value: feedback.totalItems });
  }
  if (review.status === 'ready' && review.totals) {
    stats.push({ key: 'review', label: 'Entregas por revisar', value: review.totals.needsReview });
  }
  return stats;
}
export function homeFoxySuggestion(role: 'teacher' | 'student', modules: HomeModules) {
  if (role === 'teacher') {
    const review = modules.review?.status === 'ready' && modules.review.items.find(item => item.needsReview > 0);
    if (review) return { title: 'Revisá una tanda', detail: `Podés empezar por las entregas de «${review.title}».` };
    const query = modules.queries?.status === 'ready' && modules.queries.items[0];
    if (query) return { title: 'Pasá por el Muro', detail: `Hay una consulta por responder en ${query.classroom.name}.` };
    return { title: 'Prepará el próximo paso', detail: 'Elegí un tema para trabajar en tu próxima clase.' };
  }
  const pending = modules.pending?.status === 'ready' && modules.pending.items.find(item => item.reception === 'open');
  if (pending) return { title: 'Empezá por una entrega', detail: `Reservá unos minutos para avanzar con «${pending.title}».` };
  return { title: 'Cada paso cuenta.', detail: 'Los grandes aprendizajes empiezan con pequeños avances.' };
}
