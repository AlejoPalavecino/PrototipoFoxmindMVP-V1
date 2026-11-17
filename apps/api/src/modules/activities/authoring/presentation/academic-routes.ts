import type { AcademicRoute } from '../../../../../../../src/core/contracts/academic-http.ts';
import type { AuthoringHttpOperations } from '../application/http-operations.ts';
import { activityOperation } from '../../domain/activity-policy.ts';
/** Ordered segments retain the original global route precedence during migration. */
export function createAuthoringRoutes(operations: AuthoringHttpOperations): AcademicRoute[] {
    return [{
            order: 20,
            async handle({ request: req, method, path, exact }) {
                let value: unknown;
                if (path.length === 2 && path[1] === 'activities' && method === 'GET')
                    value = await operations.listActivities(req, path[0]);
                else if (path.length === 2 && path[1] === 'activities' && method === 'POST') {
                    const data = exact(['revision', 'operation']);
                    activityOperation(data.operation);
                    value = await operations.changeActivities(req, path[0], data);
                }
                else if (path.length === 3 && path[1] === 'activities' && path[2] === 'deadline' && method === 'POST')
                    value = await operations.activityDeadlineChoices(req, path[0], exact(['local']));
                else if (path.length === 3 && path[1] === 'activities' && method === 'GET')
                    value = await operations.activityDetail(req, path[0], path[2]);
                else
                    return { handled: false };
                return { handled: true, value };
            }
        },
        {
            order: 36,
            async handle({ request: req, method, path }) {
                let value: unknown;
                if (path.length === 4 && path[1] === 'activities' && path[3] === 'preview' && method === 'GET')
                    value = await operations.activityDetail(req, path[0], path[2], true);
                else
                    return { handled: false };
                return { handled: true, value };
            }
        }];
}
