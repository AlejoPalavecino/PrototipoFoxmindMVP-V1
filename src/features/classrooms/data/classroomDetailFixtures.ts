// Factories retain the original render-local objects; these are not shared roster state.
export function createStudentDetailFixtures() {
  const studentProfile = {
    id: 2,
    name: 'Sofía Herrera',
    duaProfile: ['Dislexia']
  };

  const studentCurriculum = [
    {
      id: 1,
      unit: 'Unidad 1: Modernismo',
      status: 'completed' as const,
      topics: ['Rubén Darío', 'Características principales', 'Poesía modernista'],
      completedTopics: ['Rubén Darío', 'Características principales', 'Poesía modernista']
    },
    {
      id: 2,
      unit: 'Unidad 2: Vanguardias',
      status: 'current' as const,
      topics: ['Creacionismo', 'Ultraísmo', 'Manifiestos'],
      completedTopics: ['Creacionismo']
    },
    {
      id: 3,
      unit: 'Unidad 3: Boom Latinoamericano',
      status: 'pending' as const,
      topics: ['Realismo Mágico', 'García Márquez', 'Cortázar'],
      completedTopics: []
    },
  ];

  const students = [
    { id: 1, name: 'Ana Martínez', lastSeen: 'hace 5 min' },
    { id: 2, name: 'Sofía Herrera (Tú)', lastSeen: 'En línea' },
    { id: 3, name: 'Carlos Gómez', lastSeen: 'ayer' },
    { id: 4, name: 'Elena Silva', lastSeen: 'hace 2 horas' },
    { id: 5, name: 'Facundo Quiroga', lastSeen: 'hace 10 min' },
    { id: 6, name: 'Lucía Fernández', lastSeen: 'ayer' },
    { id: 7, name: 'Martín Castro', lastSeen: 'hace 1 día' },
    { id: 8, name: 'Tomás Ruiz', lastSeen: 'hace 3 horas' },
  ];

  return { studentProfile, studentCurriculum, students };
}
