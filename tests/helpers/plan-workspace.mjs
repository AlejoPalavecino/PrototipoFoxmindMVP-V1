import { loadTsModule } from './load-ts-module.mjs';

// Loads the real curriculum PlanWorkspace with the presentation props that Plan.tsx passes in production.
export function loadPlanWorkspace(options) {
  const { PlanWorkspace } = loadTsModule('apps/web/src/features/curriculum/plan/PlanWorkspace.tsx', options);
  const { canPreviewMaterial } = loadTsModule('apps/web/src/features/materials/index.ts');
  const { activityTypeLabels } = loadTsModule('apps/web/src/features/activity-authoring/index.ts');
  return { PlanWorkspace: props => PlanWorkspace({ ...props, canPreviewMaterial, activityTypeLabels }) };
}
