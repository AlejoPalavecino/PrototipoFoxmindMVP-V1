import type { IconKey } from '../../../../../shared-ui/index.ts';
import type { ToolMode } from './foxy-tool-options.ts';

/** A teacher tool as shown in the welcome and the Herramientas menu. Quiz opens the activity form in quiz mode. */
export type FoxyToolId = ToolMode | 'QUIZ';
export type FoxyToolItem = { value: FoxyToolId; label: string; hint: string; icon: IconKey; color: string };

/** Tools grouped by intent: what goes to the classroom, and what helps explain. Esquemas need the visual capability. */
export function foxyToolGroups(visuals: boolean): { id: 'class' | 'explain'; label: string; items: FoxyToolItem[] }[] {
  return [
    { id: 'class', label: 'Para tu clase', items: [
      { value: 'PLAN', label: 'Planificar una clase', hint: 'Inicio, desarrollo y cierre.', icon: 'calendar', color: 'rose' },
      { value: 'ACTIVITY', label: 'Crear una actividad', hint: 'Consignas para trabajar en el aula.', icon: 'pencil', color: 'peach' },
      { value: 'QUIZ', label: 'Crear un quiz', hint: 'Preguntas con distractores y devolución.', icon: 'clipboard', color: 'mint' },
      { value: 'RUBRIC', label: 'Pensar una rúbrica', hint: 'Criterios para acompañar.', icon: 'progress', color: 'sky' },
    ] },
    { id: 'explain', label: 'Para explicar', items: [
      { value: 'NOTE', label: 'Preparar un apunte', hint: 'Ideas claras para tu grupo.', icon: 'book', color: 'sky' },
      ...(visuals ? [{ value: 'DIAGRAM' as const, label: 'Imágenes y esquemas', hint: 'Una explicación que se pueda ver.', icon: 'layers' as const, color: 'mint' }] : []),
    ] },
  ];
}
