import type { Dispatch, SetStateAction } from 'react';
import type { ClassroomClient, Detail } from './api.ts';
import { Cover, Notice } from './components.tsx';
import { EntryIcon } from '../shared-ui/EntryIcon';

type Settings = { name: string; subject: string; division: string; academicYear: number; aiGradingEnabled: boolean };
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
  return (
    <>
                <h2><EntryIcon name="grid" /> Configuración del aula</h2>
                <p className="classroom-settings-intro">Administrá la información general de tu aula, su portada y las opciones de archivado.</p>
                {settingsConflict ? <Notice error>La configuración cambió. Tu borrador se conserva. <button onClick={() => void reloadSettings()}>Recargar configuración</button></Notice> : null}
                <form
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
                      setSettingsRevision(saved.revision);
                      await load();
                    });
                  }}
                >
                  <fieldset disabled={busy || room.archived}>
                    <h3><EntryIcon name="book" /> Datos del aula</h3>
                    <p>Editá la información básica de tu aula. Estos datos se mostrarán a los alumnos.</p>
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
                    <p>Zona horaria fija: {room.timezone}</p>
                    <label className="p7-check"><input type="checkbox" checked={settings.aiGradingEnabled}
                      disabled={room.aiGradingAvailable === false}
                      onChange={(event) => setSettings(previous => ({ ...previous, aiGradingEnabled: event.target.checked }))} />
                      Corrección asistida por IA para esta aula</label>
                    {room.aiGradingAvailable === false ? <><p>Corrección con IA no disponible en este momento. Las entregas no generarán sugerencias.</p>
                      {settings.aiGradingEnabled ? <button type="button" onClick={() => setSettings(previous => ({ ...previous, aiGradingEnabled: false }))}>Desactivar para esta aula</button> : null}</> : null}
                    <p>Al activar esta opción, se generarán sugerencias para las nuevas entregas. El docente revisa y publica cada calificación.</p>
                    <button className="primary">Guardar cambios</button>
                  </fieldset>
                </form>
                <section className="classroom-settings-cover"><div><h3><EntryIcon name="grid" /> Portada del aula</h3><p>Esta portada se muestra en la parte superior y ayuda a identificar el aula.</p></div><Cover kind={room.coverKey} /></section>
                <section className="classroom-settings-archive">
                <hr />
                <h3>{room.archived ? 'Reactivar aula' : 'Archivar aula'}</h3>
                <p>
                  {room.archived
                    ? 'Se habilitarán las acciones habituales. Los plazos existentes se conservan.'
                    : 'Se conserva todo el contenido y el aula pasa a ser de solo lectura.'}
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
                  {room.archived ? 'Reactivar aula' : 'Archivar aula'}
                </button>
                </section>
              </>
  );
}
