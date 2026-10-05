import type { Activity, ActivityRepository } from '../model/Activity';
import { createActivityFixtures } from './activityFixtures';

// Sole session owner. Exported only for the mockData live-binding bridge.
export let activities = createActivityFixtures();

export const replaceActivities = (replacement: Activity[]): void => {
  activities = replacement;
};

export const activityRepository: ActivityRepository = {
  read: () => activities,
  replace: replaceActivities,
};
