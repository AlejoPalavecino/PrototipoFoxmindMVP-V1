import { Plan as CurriculumPlan } from '../features/curriculum/index.ts';
import { canPreviewMaterial } from '../features/materials/index.ts';
import { activityTypeLabels } from '../features/activity-authoring/index.ts';
import type { ComponentProps } from 'react';

export function Plan(props: Omit<ComponentProps<typeof CurriculumPlan>, 'canPreviewMaterial' | 'activityTypeLabels'>) {
  return CurriculumPlan({ ...props, canPreviewMaterial, activityTypeLabels });
}
