import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import type { ClassroomClient, Detail } from './api.ts';
import { Cover, Notice } from './components.tsx';
import { FoxmindIcon } from '../shared-ui/FoxmindIcon';

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
  return (
    <>
                <header className="p5-section-head"><div><h2>Configuración del aula</h2>
                <p>Administrá la identidad, el uso de IA y el estado de esta aula.</p></div></header>
                {settingsConflict ? <Notice error>La configuración cambió. Tu borrador se conserva. <button onClick={() => void reloadSettings()}>Recargar configuración</button></Notice> : null}
                <div className="brujula-settings-layout"><form className="classroom-settings-form"
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
                  <fieldset disabled={busy || room.archived}>
                    <section className="classroom-settings-data" aria-label="Datos del aula">
                    <h3>Datos del aula</h3>
                    <div className="p5-fields">
                      {(['name', 'subject', 'division'] as const).map((key) => (
                        <label key={key}>
                          {key === 'name'
                            ? 'Nombre del aula'
                            : key === 'subject'
                              ? 'Materia'
                              : 'División'}
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
                      <label>
                        Ciclo lectivo
                        <input
                          required
                          type="number"
                          min="1"
                          max="9999"
                          value={settings.academicYear}
                          onChange={(e) =>
                            setSettings((previous) => ({
                              ...previous,
                              academicYear: Number(e.target.value),
                            }))
                          }
                        />
                      </label>
                    </div>
                    </section>
                    <section className="brujula-settings-covers" aria-label="Portada"><h3>Portada</h3><div>{[{key:'biology',label:'Naturaleza'},{key:'math',label:'Geometría'},{key:'literature',label:'Literatura'},{key:'society',label:'Geografía'}].map(cover => <label key={cover.key}><input type="radio" name="classroom-cover" value={cover.key} checked={settings.coverKey === cover.key} onChange={() => setSettings(previous => ({...previous,coverKey:cover.key}))}/><Cover kind={cover.key}/><span>{cover.label}</span></label>)}</div></section>
                    <section className="classroom-settings-options" aria-label="Opciones de corrección">
                    <label className="p7-check"><input type="checkbox" checked={settings.aiGradingEnabled}
                      disabled={room.aiGradingAvailable === false}
                      onChange={(event) => setSettings(previous => ({ ...previous, aiGradingEnabled: event.target.checked }))} />
                      <span><strong>Corrección asistida por IA</strong><small>Permite preparar sugerencias que el docente revisa antes de publicar.</small></span></label>
                    {room.aiGradingAvailable === false ? <><p>Corrección con IA no disponible en este momento. Las entregas no generarán sugerencias.</p>
                      {settings.aiGradingEnabled ? <button type="button" onClick={() => setSettings(previous => ({ ...previous, aiGradingEnabled: false }))}>Desactivar para esta aula</button> : null}</> : null}
                    </section>
                    <footer className="classroom-settings-save"><p className={!dirty&&!saved?'sr-only':''} role="status">{dirty ? 'Tenés cambios sin guardar.' : saved ? 'Cambios guardados.' : 'No hay cambios pendientes.'}</p><button className="primary" type="submit">{busy ? 'Guardando cambios…' : 'Guardar cambios'}</button></footer>
                  </fieldset>
                </form>
                <section className="classroom-settings-archive">
                <h3>Estado del aula</h3>
                <p className="classroom-lifecycle-state">{room.archived ? 'Archivada · solo consulta' : 'Activa'}</p>
                <p>
                  {room.archived
                    ? 'Se habilitarán las acciones habituales. Los plazos existentes se conservan.'
                    : 'Al archivar el aula, sus contenidos e historial quedan disponibles para consulta.'}
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
                  <FoxmindIcon name="archive"/>{room.archived ? 'Reactivar aula' : 'Archivar aula'}
                </button>
                </section></div>
              </>
  );
}
