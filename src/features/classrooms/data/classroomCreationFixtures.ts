import type { ClassroomColor } from '../model/ClassroomCreation';

export const aulaColorPalette: readonly {
  id: ClassroomColor;
  label: string;
  hex: string;
  bgClass: string;
  pillBg: string;
  textClass: string;
  borderClass: string;
}[] = [
  { id: 'blue', label: 'Azul', hex: '#2563eb', bgClass: 'bg-blue-500', pillBg: 'bg-blue-500/10', textClass: 'text-blue-600', borderClass: 'border-blue-500' },
  { id: 'orange', label: 'Naranja', hex: '#f97316', bgClass: 'bg-fox-orange', pillBg: 'bg-fox-orange/10', textClass: 'text-fox-orange', borderClass: 'border-fox-orange' },
  { id: 'purple', label: 'Púrpura', hex: '#a855f7', bgClass: 'bg-fox-purple', pillBg: 'bg-fox-purple/10', textClass: 'text-fox-purple', borderClass: 'border-fox-purple' },
  { id: 'green', label: 'Verde', hex: '#22c55e', bgClass: 'bg-fox-green', pillBg: 'bg-fox-green/10', textClass: 'text-fox-green', borderClass: 'border-fox-green' },
  { id: 'red', label: 'Rojo', hex: '#ef4444', bgClass: 'bg-red-500', pillBg: 'bg-red-500/10', textClass: 'text-red-500', borderClass: 'border-red-500' },
  { id: 'pink', label: 'Rosa', hex: '#ec4899', bgClass: 'bg-pink-500', pillBg: 'bg-pink-500/10', textClass: 'text-pink-500', borderClass: 'border-pink-500' },
  { id: 'yellow', label: 'Amarillo', hex: '#eab308', bgClass: 'bg-yellow-500', pillBg: 'bg-yellow-500/10', textClass: 'text-yellow-600', borderClass: 'border-yellow-500' },
];

export const analysisDelayMs = 2200;
export const creationDelayMs = 1800;
