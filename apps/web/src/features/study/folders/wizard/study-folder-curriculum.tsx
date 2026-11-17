import { WizardCurriculum, type EditorUnit } from '../../../../../../shared-ui/academic-plan';
export function renderStudyFolderCurriculum({ method, analysisFailed, editUnits, onRetry, onManual, onUnits }: {
  method: 'manual' | 'ai' | 'classroom' | null;
  analysisFailed: boolean;
  editUnits: EditorUnit[];
  onRetry: () => void;
  onManual: () => void;
  onUnits: (units: EditorUnit[]) => void;
}) {
  return (method === 'ai' && analysisFailed ? (<>
    <button type="button" onClick={onRetry}>
      Reintentar análisis
    </button>{' '}
    <button type="button" onClick={onManual}>
      Continuar manualmente
    </button>
  </>) : (<WizardCurriculum
    units={editUnits}
    orderHint="El orden de las unidades será tu recorrido de estudio."
    maxTopicsPerUnit={200}
    maxTopics={Infinity}
    onUnits={onUnits} />));

}
