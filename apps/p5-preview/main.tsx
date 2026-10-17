import { createRoot } from 'react-dom/client';
import { ClassroomsApp } from '../classrooms-ui/ClassroomsApp.tsx';
import { createClassroomClient } from '../classrooms-ui/api.ts';

// This host is an isolated fixture, never part of the production application.
const context = await fetch('/__fixture/context').then((res) => res.json());
const api = createClassroomClient({ csrfToken: async () => context.csrf });
async function choose(name: string) {
  await fetch('/__fixture/choose', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-P5-Fixture': 'true' },
    body: JSON.stringify({ name }),
  });
  location.reload();
}
createRoot(document.getElementById('root')!).render(
  <>
    <aside
      aria-label="Entorno aislado de pruebas"
      style={{
        padding: '10px 24px',
        background: '#e7edf6',
        color: '#263c60',
        font: '14px Segoe UI,sans-serif',
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      <strong>Prueba local de P5 · Datos ficticios</strong>
      <span>Cambiar cuenta de prueba:</span>
      {['Docente', 'Estudiante', 'Otra persona'].map((name) => (
        <button
          key={name}
          style={{ minHeight: 36, padding: '5px 12px', cursor: 'pointer' }}
          onClick={() => void choose(name)}
        >
          {name}
        </button>
      ))}
    </aside>
    <ClassroomsApp api={api} displayName={context.name} />
  </>,
);
