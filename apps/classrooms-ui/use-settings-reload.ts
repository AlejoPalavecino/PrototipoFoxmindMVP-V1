import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { Detail } from './api.ts';

type ActionState = { busy: boolean; error: string };
type Settings = { name: string; subject: string; division: string; academicYear: number; aiGradingEnabled: boolean; coverKey: string };
type Props = {
  actionStates: Record<string, ActionState>; settingsOperation: MutableRefObject<number>;
  reload: () => Promise<Detail | null>; isCurrentRoom: () => boolean;
  setSettings: Dispatch<SetStateAction<Settings>>; setSettingsRevision: Dispatch<SetStateAction<string>>;
  setSettingsConflict: Dispatch<SetStateAction<boolean>>; setActionStates: Dispatch<SetStateAction<Record<string, ActionState>>>;
};
export function useSettingsReload({ actionStates, settingsOperation, reload, isCurrentRoom, setSettings,
  setSettingsRevision, setSettingsConflict, setActionStates }: Props) {
  return async function reloadSettings() {
    const conflictState = actionStates.settings;
    const operation = ++settingsOperation.current;
    const refreshed = await reload();
    if (!refreshed || !isCurrentRoom() || settingsOperation.current !== operation) return;
    setSettings({ name: refreshed.name, subject: refreshed.subject, division: refreshed.division,
      academicYear: refreshed.academicYear, coverKey: refreshed.coverKey, aiGradingEnabled: refreshed.aiGradingEnabled ?? false });
    setSettingsRevision(refreshed.revision);
    setSettingsConflict(false);
    setActionStates(previous => {
      if (previous.settings !== conflictState) return previous;
      return { ...previous, settings: { busy: false, error: '' } };
    });
  }
}
