import styles from './classroom-secondary.module.css';
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import type { ClassroomClient } from '../../../../../../src/core/contracts/academic-client.ts';
import type { Detail } from '../../../../../../src/core/contracts/classrooms.ts';
import { Cover, coverOptions } from '../../../../../shared-ui/academic-cover.tsx';
import { Notice } from '../../../../../shared-ui/feedback.tsx';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';

type Settings = { name: string; subject: string; division: string; academicYear: number; aiGradingEnabled: boolean; coverKey: string };
type Confirmation = { title: string; text: string; run: () => Promise<void>; scope?: string } | null;
type Props = {
  api: ClassroomClient; id: string; room: Detail; settings: Settings;
  setSettings: Dispatch<SetStateAction<Settings>>; settingsRevision: string;
  setSettingsRevision: Dispatch<SetStateAction<string>>; settingsConflict: boolean;
  setSettingsConflict: Dispatch<SetStateAction<boolean>>; reloadSettings: () => Promise<void>;
  isCurrentRoom: () => boolean; busy: boolean; load: () => Promise<void>;
  action: (task: () => Promise<void>, section?: string) => Promise<void>;
  setNotice: Dispatch<SetStateAction<string>>; setConfirm: Dispatch<SetStateAction<Confirmation>>;
};
export function ClassroomSettings({ api, id, room, settings, setSettings, settingsRevision,
  setSettingsRevision, settingsConflict, setSettingsConflict, reloadSettings, isCurrentRoom,
  busy, load, action, setNotice, setConfirm }: Props) {
  const persistedSettings = useMemo(() => ({ name: room.name, subject: room.subject, division: room.division,
    academicYear: room.academicYear, coverKey: room.coverKey, aiGradingEnabled: room.aiGradingEnabled ?? false }),
  [room.name, room.subject, room.division, room.academicYear, room.aiGradingEnabled, room.coverKey]);
  const [savedSettings, setSavedSettings] = useState(persistedSettings);
  const [saved, setSaved] = useState(false);
  useEffect(() => { setSavedSettings(persistedSettings); }, [id, persistedSettings]);
  const dirty = (Object.keys(settings) as (keyof Settings)[]).some(key => settings[key] !== savedSettings[key]);
  const referenceCovers = ['literature', 'biology', 'math'];
  const covers = referenceCovers.map(key => coverOptions().find(option => option.key === key)!)
    .concat(referenceCovers.includes(room.coverKey) ? [] : coverOptions(room.coverKey).filter(option => option.key === room.coverKey));
  return (
    <>
                {settingsConflict ? <Notice error>La configuración cambió. Tu borrador se conserva. <button onClick={() => void reloadSettings()}>Recargar configuración</button></Notice> : null}
                <div className={`brujula-settings-layout ${styles.settings}`}><form className={`classroom-settings-form ${styles.settingsForm}`}
                  onSubmit={(event) => {
                    event.preventDefault();
                    void action(async () => {
                      const { aiGradingEnabled, ...classroomSettings } = settings;
                      const saved = await api.call<{ revision: string }>(`/${id}/settings`, 'PATCH', {
                        ...classroomSettings,
                        ...(room.aiGradingAvailable === false && aiGradingEnabled ? {} : { aiGradingEnabled }),
                        revision: settingsRevision,
                      });
                      if (!isCurrentRoom()) return;
                      setNotice('Cambios guardados.');
                      setSettingsConflict(false);
                      setSavedSettings(settings);
                      setSaved(true);
                      setSettingsRevision(saved.revision);
                      await load();
                    });
                  }}
                >
                  <h2>Tu aula, a tu manera</h2>
                  <fieldset disabled={busy || room.archived}>
                    <section className="classroom-settings-data" aria-label="Datos del aula">
                    <div className={`p5-fields ${styles.settingsFields}`}>
                      {(['name', 'subject', 'division'] as const).map((key) => (
                        <label key={key}>
                          {key === 'name'
                            ? 'Nombre del aula'
                            : key === 'subject'
                              ? 'Materia'
                              : 'Grupo'}
                          <input
                            required
                            maxLength={key === 'division' ? 60 : 120}
                            value={settings[key]}
                            onChange={(e) =>
                              setSettings((previous) => ({
                                ...previous,
                                [key]: e.target.value,
                              }))
                            }
                          />
                        </label>
                      ))}
                    </div>
                    </section>
                    <section className="brujula-settings-covers" aria-label="Portada"><h3>Portada</h3><div>{covers.map(cover => <label key={cover.key}><input type="radio" name="classroom-cover" value={cover.key} checked={settings.coverKey === cover.key} onChange={() => setSettings(previous => ({...previous,coverKey:cover.key}))}/><Cover kind={cover.key}/><span>{cover.label}</span></label>)}</div></section>
                  </fieldset>
                  <footer className="classroom-settings-save"><p role="status">{dirty ? 'Tenés cambios sin guardar.' : saved ? 'Cambios guardados.' : 'Los cambios se aplican al guardar.'}</p><button className="primary" type="submit" disabled={busy || room.archived}>{busy ? 'Guardando cambios…' : 'Guardar cambios'}</button></footer>
                </form>
                <aside className={`classroom-settings-archive ${styles.lifecycle}`} data-archived={room.archived}>
                <h3>Estado del aula</h3>
                {room.archived ? <p className="classroom-lifecycle-state">Archivada · solo consulta</p> : null}
                <p>
                  {room.archived
                    ? 'Se habilitarán las acciones habituales. Los plazos existentes se conservan.'
                    : 'Archivar conserva las clases, las entregas y las devoluciones para consultarlas después.'}
                </p>
                <button
                  disabled={busy}
                  onClick={() =>
                    setConfirm({
                      title: room.archived ? 'Reactivar aula' : 'Archivar aula',
                      text: room.archived
                        ? 'La reactivación no modifica fechas límite ni historial.'
                        : 'Mientras esté archivada, no se podrán realizar cambios ni nuevas inscripciones.',
                      run: async () => {
                        await api.call(`/${id}/archive`, 'POST', {
                          archived: !room.archived,
                          revision: room.revision,
                        });
                        await load();
                      },
                    })
                  }
                >
                  <FoxmindIcon name="folder"/>{room.archived ? 'Reactivar aula' : 'Archivar aula'}
                </button>
                </aside></div>
              </>
  );
}
