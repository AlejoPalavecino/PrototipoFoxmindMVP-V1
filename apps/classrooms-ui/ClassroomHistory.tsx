import { Cover } from './components.tsx';

export function ClassroomHistory() {
  return <aside className="classroom-history-explainer">
    <div className="classroom-history-art"><Cover kind="general" /></div>
    <h3>Sobre el historial</h3>
    <p>Los registros de quienes salieron del aula se conservan para que puedas mantener un seguimiento completo.</p>
    <p className="classroom-history-note">Sus actividades, entregas y participaciones siguen disponibles en tus reportes y progreso.</p>
  </aside>;
}
