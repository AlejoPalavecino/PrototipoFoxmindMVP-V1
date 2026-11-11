'use client';
import { WizardCurriculum } from './WizardPlan.tsx';
import { useState } from 'react';
import { parseExtractedCurriculum, type CurriculumUnit, type ExtractedCurriculum } from '../../../../../../src/core/domain/index.ts';

function validUnits(units: CurriculumUnit[]) {
  try { parseExtractedCurriculum({ units, warnings: [] }); return true; } catch { return false; }
}
interface EditorProps { proposal: ExtractedCurriculum; hasUnits: boolean; busy: boolean;
  apply: (units: CurriculumUnit[], confirmed: boolean) => Promise<void> }
export function ExtractionEditor({ proposal, hasUnits, busy, apply }: EditorProps) {
  const [units, setUnits] = useState(() => structuredClone(proposal.units));
  const [confirmed, setConfirmed] = useState(false), valid = validUnits(units);
  const [removed, setRemoved] = useState<CurriculumUnit[]>();
  const change = (next: CurriculumUnit[]) => { setConfirmed(false); setRemoved(undefined); setUnits(next); };
  return <div className="p5-extraction-editor">
    {proposal.warnings.includes('PARTIAL_STRUCTURE') && <p role="status">Encontramos una estructura parcial. Compará la propuesta con tu plan.</p>}
    {proposal.warnings.includes('DOCX_IMAGES_OMITTED') && <p role="status">No se leen las imágenes dentro de documentos Word. Revisá si falta contenido.</p>}
    <fieldset disabled={busy}>
      <WizardCurriculum units={units} onUnits={change} onRemove={next => { change(next); setRemoved(units); }}
        onUndo={removed ? () => change(removed) : undefined} />
      {hasUnits && <label className="p5-extraction-confirm"><input type="checkbox" checked={confirmed}
        onChange={event => setConfirmed(event.target.checked)} />Confirmo reemplazar las unidades y temas actuales por esta propuesta revisada.</label>}
      {!valid && <p>Completá al menos una unidad con sus temas. Se admiten hasta 100 unidades y 500 temas en total.</p>}
      <button type="button" className="primary" disabled={!valid || (hasUnits && !confirmed)}
        onClick={() => void apply(units, confirmed)}>{busy ? 'Guardando unidades…' : 'Usar unidades revisadas'}</button>
    </fieldset>
  </div>;
}
