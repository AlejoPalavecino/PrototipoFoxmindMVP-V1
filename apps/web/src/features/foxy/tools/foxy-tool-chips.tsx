import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
import type { IconKey } from '../../../../../shared-ui/index.ts';

export type FoxyChipId = 'NOTE' | 'ACTIVITY' | 'QUIZ' | 'PLAN' | 'RUBRIC' | 'DIAGRAM';
const chips: { id: FoxyChipId; label: string; icon: IconKey }[] = [
  { id: 'NOTE', label: 'Apunte', icon: 'book' },
  { id: 'ACTIVITY', label: 'Actividad', icon: 'pencil' },
  { id: 'QUIZ', label: 'Quiz', icon: 'clipboard' },
  { id: 'PLAN', label: 'Plan de clase', icon: 'calendar' },
  { id: 'RUBRIC', label: 'Rúbrica', icon: 'list-checks' },
  { id: 'DIAGRAM', label: 'Esquema', icon: 'shapes' },
];

/** One-tap shortcuts above the composer. They open the same tool forms as the Herramientas tray. */
export function FoxyToolChips({ visuals, disabled, active, onPick }: {
  /** Esquema only appears when the visual capabilities are enabled. */
  visuals: boolean; disabled?: boolean; active?: FoxyChipId | null; onPick: (id: FoxyChipId) => void;
}) {
  return <div className="parity-foxy-chips" role="group" aria-label="Crear con Foxy">
    {chips.filter(chip => chip.id !== 'DIAGRAM' || visuals).map(chip =>
      <button key={chip.id} type="button" className="parity-foxy-chip" data-chip={chip.id} aria-pressed={active === chip.id} disabled={disabled} onClick={() => onPick(chip.id)}>
        <FoxmindIcon name={chip.icon}/>{chip.label}
      </button>)}
  </div>;
}
