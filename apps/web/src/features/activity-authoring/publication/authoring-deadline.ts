import type { DeadlineResolution } from '../../../../../../src/core/contracts/activities.ts';
import type { ActivityDeadline } from '../model/authoring-operations.ts';

export function selectAuthoringDeadline(resolution: DeadlineResolution, offset: number | null, local = resolution.local): ActivityDeadline {
  if (resolution.reason === 'NONEXISTENT')
    throw new Error('Esta hora no existe por el cambio de horario. Selecciona otra hora.');
  if (resolution.reason === 'AMBIGUOUS' && (offset === null || !resolution.choices.some(choice => choice.offsetMinutes === offset)))
    throw new Error('Esta hora ocurre dos veces. Selecciona explícitamente una de las dos ocurrencias.');
  return resolution.reason === 'AMBIGUOUS' ? { local, offsetMinutes: offset } : { local };
}
