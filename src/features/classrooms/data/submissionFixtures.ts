import type { Submission } from '../model/Submission';

export const createSubmissionFixtures = (): Submission[] => [
  { studentId: 1, name: 'Marcos Pérez', status: 'missing', grade: null, date: null, dua: [], content: null },
  { studentId: 2, name: 'Sofía Herrera', status: 'submitted', grade: null, date: 'Hoy 09:15', dua: ['Dislexia'], content: 'El modernismo literario fue un movimiento que buscaba la belleza absoluta y la perfección formal. Rubén Darío fue su principal exponente con su obra "Azul...". Se caracterizó por el uso de un lenguaje refinado, musicalidad y temas exóticos. A diferencia de movimientos anteriores, se alejó de la realidad cotidiana para crear mundos ideales.' },
  { studentId: 3, name: 'Lucas Díaz', status: 'graded', grade: 8.5, date: 'Ayer 14:20', dua: [], content: 'El modernismo surgió a finales del siglo XIX. Sus características son la rebeldía creativa y el refinamiento. Rubén Darío es el autor más importante. Escribió Azul y Prosas profanas.' },
  { studentId: 4, name: 'Ana Torres', status: 'graded', grade: 9.0, date: 'Ayer 16:45', dua: ['TDAH'], content: 'Movimiento literario de fines del s. XIX. Buscaba la renovación estética. Principales características: preciosismo, exotismo, musicalidad. Autor clave: Rubén Darío (Nicaragua).' },
  { studentId: 5, name: 'Valentina Gómez', status: 'submitted', grade: null, date: 'Hoy 11:30', dua: [], content: 'El modernismo es un movimiento literario que se dio en América Latina. Se destaca por su rechazo a la realidad cotidiana y su búsqueda de la belleza. Utiliza muchos símbolos como el cisne y el color azul. Rubén Darío fue muy importante para este movimiento.' },
];
