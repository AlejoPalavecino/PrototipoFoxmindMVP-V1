import { useState } from 'react';
import type { FoxySelection } from '../../../../../../src/core/domain/foxy/foxy-ai';
import type { FoxySourceKind } from '../../../../../../src/core/domain/foxy/source-query';
import { FoxyDialog } from '../../../../../shared-ui/FoxyChatLayout';
import type { FoxyCurriculum } from '../api/foxy-client';
import type { FoxyChatState, FoxyChatActions } from '../conversations/foxy-chat-view-types';

const sections = [
  { value: 'PLAN', label: 'Planes' },
  { value: 'MATERIAL', label: 'Materiales' },
  { value: 'ACTIVITY', label: 'Actividades' },
] as const;

export function FoxyScopeDialog({ curriculum, selection, sources, error, onFull, onTopic, onSource, onLoad, onClose }: {
  curriculum: FoxyCurriculum; selection: FoxySelection; sources: FoxyChatState['sources']; error: string | null;
  onFull: FoxyChatActions['setFullClassroom']; onTopic: FoxyChatActions['selectTopic']; onSource: FoxyChatActions['selectSource'];
  onLoad: FoxyChatActions['loadSources']; onClose: () => void;
}) {
  const [kind, setKind] = useState<FoxySourceKind>('PLAN');
  const [loading, setLoading] = useState<FoxySourceKind | null>(null);
  const full = selection.mode === 'ALL_CLASSROOM';
  const page = sources[kind];
  const sourceCount = selection.sourceIds.length;
  const selectedSources = sourceCount === 1 ? '1 fuente seleccionada' : sourceCount + ' fuentes seleccionadas';
  const sourceError = error === 'No pudimos cargar las fuentes del aula.';
  const selectedDocuments = Object.values(sources).flatMap(section => section.items)
    .filter(source => selection.sourceIds.includes(source.sourceId)).reduce((count, item) => count + item.documentCount, 0);
  async function load(value: FoxySourceKind) {
    setLoading(value);
    try { await onLoad(value); } finally { setLoading(current => current === value ? null : current); }
  }
  function changeMode(value: boolean) {
    if (value === full) return;
    onFull(value);
    if (!value && !page.items.length) void load(kind);
  }
  return <FoxyDialog title="Temas y fuentes" description="Elegí el contexto para los próximos pedidos de este chat."
    className="parity-ai-tray" onClose={onClose} footer={<button type="button" onClick={onClose}>Volver a Biblioteca</button>}>
    <div className="parity-foxy-toolForm">
      <fieldset className="parity-foxy-choiceGroup"><legend>Contexto del aula</legend><div>
        <label><input type="radio" name="foxy-scope-mode" checked={full} onChange={() => changeMode(true)}/>Aula completa</label>
        <label><input type="radio" name="foxy-scope-mode" checked={!full} onChange={() => changeMode(false)}/>Elegir temas y fuentes</label>
      </div></fieldset>
      {!full && <>
        <fieldset className="parity-foxy-choiceGroup"><legend>Temas del plan</legend><div>
          {curriculum.units.flatMap(unit => unit.topics.map(topic => <label key={topic.id}>
            <input type="checkbox" checked={selection.topicIds.includes(topic.id)}
              disabled={!selection.topicIds.includes(topic.id) && selection.topicIds.length >= 100} onChange={() => onTopic(topic.id)}/>{topic.name}
          </label>))}
        </div></fieldset>
        <section aria-label="Fuentes del aula">
          <div className="parity-foxy-filterRow" role="group" aria-label="Tipo de fuente">{sections.map(section =>
            <button key={section.value} type="button" aria-pressed={kind === section.value}
              onClick={() => { setKind(section.value); if (!sources[section.value].items.length) void load(section.value); }}>{section.label}</button>)}
          </div>
          <p>{selectedSources}. Los archivos privados del chat también se incluyen.</p>
          <fieldset className="parity-foxy-choiceGroup"><legend>{sections.find(section => section.value === kind)?.label}</legend><div>
            {page.items.map(source => {
              const selected = selection.sourceIds.includes(source.sourceId);
              const atLimit = sourceCount >= 20 || selectedDocuments + source.documentCount > 6;
              return <label key={source.sourceId}><input type="checkbox" checked={selected}
                disabled={!source.available || (!selected && atLimit)} onChange={() => onSource(source.sourceId)}/>
                {source.title}{!source.available && ' · No disponible'}</label>;
            })}
            {loading === kind && <p role="status">Consultando fuentes…</p>}
            {!page.items.length && loading !== kind && !sourceError && <p>No hay fuentes de este tipo en el aula.</p>}
          </div></fieldset>
          {sourceError && <p role="alert">{error} <button type="button" onClick={() => void load(kind)}>Reintentar</button></p>}
          {page.next && <button type="button" disabled={loading === kind} onClick={() => void load(kind)}>Ver más fuentes</button>}
        </section>
      </>}
    </div>
  </FoxyDialog>;
}
