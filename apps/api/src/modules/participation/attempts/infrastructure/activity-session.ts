import * as projection from '../application/activity-session.ts';
import { activity_sessionRepository } from './activity-session-repository.ts';
export const studentObligation = projection.studentObligation.bind(null, activity_sessionRepository);
export const studentActivityView = projection.studentActivityView.bind(null, activity_sessionRepository);
export const sessionView = projection.sessionView.bind(null, activity_sessionRepository);
