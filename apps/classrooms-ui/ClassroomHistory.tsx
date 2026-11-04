import { Cover } from './components.tsx';

export function ClassroomHistory() {
  return <aside className="classroom-history-explainer" aria-label="Conservación del historial">
    <div className="classroom-history-art"><Cover kind="general" /></div>
    <h3>Sobre el historial</h3>
    <p>Los registros de quienes salieron del aula se conservan para que puedas mantener un seguimiento completo.</p>
    <p className="classroom-history-note">Podés consultar sus registros desde Ver resumen. Las salidas no se incluyen en los indicadores actuales del aula.</p>
  </aside>;
}
