import * as application from '../application/activity-eligibility.ts';
import { repository } from './activity-eligibility-repository.ts';
export type { ActivityEligibilityRepository } from '../application/activity-eligibility.ts';
export const recordActivityEligibility = application.recordActivityEligibility.bind(null,repository);
