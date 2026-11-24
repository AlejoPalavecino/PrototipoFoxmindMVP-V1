import type { HomeResponse, ReviewItem } from '../../../../../../src/core/domain/home/home.ts';
import { homeAgendaTime } from './home-presentation.ts';
import { homeTime } from './home-labels.ts';

/** Expedición presentation derived only from the Home contract: nothing here is fetched or invented. */
export interface HomeStop { id: string; time: string; title: string }

function localDate(instant: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(instant));
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)!.value).join('-');
}

/** What is still ahead today. modules.agenda only lists upcoming items, so past stops are not shown. */
export function homeRoute(data: HomeResponse): HomeStop[] {
  const agenda = data.modules.agenda;
  if (agenda.status !== 'ready') return [];
  const today = localDate(data.generatedAt, data.timeZone);
  return agenda.items
    .filter(item => (item.startAt ? localDate(item.startAt, data.timeZone) : item.date) === today)
    .slice(0, 3)
    .map(item => ({ id: item.id, time: homeAgendaTime(item, data.timeZone), title: item.title }));
}

/** The one thing worth saying in the guide's bubble; null when the source module is not ready. */
export function homeUrgent(data: HomeResponse, teacher: boolean): { label: string; text: string } | null {
  if (teacher) {
    const review = data.modules.review;
    if (review.status !== 'ready') return null;
    const first = review.items[0];
    return first ? { label: 'Para revisar primero', text: `${first.title} · ${first.classroom.name}` }
      : { label: 'Todo al día', text: '¿Preparamos la próxima clase?' };
  }
  const pending = data.modules.pending;
  if (pending.status !== 'ready') return null;
  const first = pending.items.find(item => item.reception === 'open');
  if (!first) return { label: 'Todo al día', text: '¿Repasamos algo en Mi estudio?' };
  return { label: 'Tu próxima parada', text: first.deadlineAt ? `${first.title} cierra ${homeTime(first.deadlineAt, data.timeZone)}` : first.title };
}

/** Corrected = feedback saved but not yet published; an individual row counts as one submission. */
export function reviewProgress(rows: ReviewItem[]): { corrected: number; total: number } {
  return rows.reduce((sum, row) => row.studentName
    ? { corrected: sum.corrected + (row.readyToPublish > 0 ? 1 : 0), total: sum.total + 1 }
    : { corrected: sum.corrected + row.readyToPublish, total: sum.total + row.needsReview + row.readyToPublish }, { corrected: 0, total: 0 });
}
