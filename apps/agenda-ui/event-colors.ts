import { EVENT_COLORS, type EventColor, type EventPayload } from '../../src/core/domain/index.ts';

export type EventColorChoice = EventColor | 'AUTO';
export interface EventColorOption {
  value: EventColorChoice; label: string; className: string;
}
const palette: Record<EventColor, { label: string; className: string }> = {
  BLUE: { label: 'Azul', className: 'agenda-color-blue' },
  GREEN: { label: 'Verde', className: 'agenda-color-green' },
  YELLOW: { label: 'Amarillo', className: 'agenda-color-yellow' },
  ORANGE: { label: 'Naranja', className: 'agenda-color-orange' },
  PINK: { label: 'Rosa', className: 'agenda-color-pink' },
  PURPLE: { label: 'Violeta', className: 'agenda-color-purple' },
};
export const eventColorOptions: readonly EventColorOption[] = [
  { value: 'AUTO', label: 'Automático', className: 'agenda-color-auto' },
  ...EVENT_COLORS.map(value => ({ value, ...palette[value] })),
];
export function eventColorClass(event: Pick<EventPayload, 'category' | 'color'>): string {
  return event.color === undefined ? event.category.toLowerCase() : palette[event.color].className;
}
export function eventColorLabel(color: EventColor | undefined): string {
  return color === undefined ? 'Automático' : palette[color].label;
}
