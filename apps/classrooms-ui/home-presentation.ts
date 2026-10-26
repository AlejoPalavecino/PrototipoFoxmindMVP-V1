import type { AgendaItem, HomeModuleName, HomeModules, Participation } from '../../src/core/domain/index.ts';

export function shouldShowHomeModule(participation: Participation, name: HomeModuleName, page: HomeModules[HomeModuleName]): boolean {
  if (page.status === 'not-applicable') return false;
  if (page.status === 'error' || page.items.length > 0) return true;
  return participation !== 'none' || name === 'agenda';
}

export function homeGreetingDate(generatedAt: string, timeZone: string): string {
  return new Intl.DateTimeFormat('es-AR', { timeZone, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(generatedAt));
}

export function homeAgendaDate(item: AgendaItem, timeZone: string): { weekday: string; day: string; dateTime: string } {
  const dateTime = item.allDay ? item.date : item.startAt!;
  const instant = new Date(item.allDay ? `${dateTime}T12:00:00.000Z` : dateTime);
  const zone = item.allDay ? 'UTC' : timeZone;
  return {
    weekday: new Intl.DateTimeFormat('es-AR', { timeZone: zone, weekday: 'short' }).format(instant).replace('.', ''),
    day: new Intl.DateTimeFormat('es-AR', { timeZone: zone, day: 'numeric' }).format(instant),
    dateTime,
  };
}
