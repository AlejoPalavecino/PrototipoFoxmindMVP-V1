import type { EventReminder } from '../../../../../../src/core/domain/agenda/index.ts';

export const reminderLabels: readonly { value: EventReminder['minutes'] | undefined; label: string }[] = [
  { value: undefined, label: 'Sin aviso' },
  { value: 0, label: 'Al momento' },
  { value: 5, label: '5 minutos antes' },
  { value: 15, label: '15 minutos antes' },
  { value: 30, label: '30 minutos antes' },
  { value: 60, label: '1 hora antes' },
  { value: 1440, label: '1 día antes' },
];
