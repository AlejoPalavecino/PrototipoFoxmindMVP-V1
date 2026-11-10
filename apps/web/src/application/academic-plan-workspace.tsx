import { PlanWorkspace as CurriculumPlanWorkspace } from '../features/curriculum/index.ts';
import { canPreviewMaterial } from '../features/materials/index.ts';
import { activityTypeLabels } from '../features/activity-authoring/index.ts';
import type { ComponentProps } from 'react';

export function PlanWorkspace(props: Omit<ComponentProps<typeof CurriculumPlanWorkspace>, 'canPreviewMaterial' | 'activityTypeLabels'>) {
  return CurriculumPlanWorkspace({ ...props, canPreviewMaterial, activityTypeLabels });
}
