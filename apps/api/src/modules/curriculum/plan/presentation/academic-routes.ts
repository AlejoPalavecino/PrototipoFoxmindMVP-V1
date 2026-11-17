import type { AcademicRoute } from '../../../../../../../src/core/contracts/academic-http.ts';
import type { PlanHttpOperations } from '../application/http-operations.ts';
/** Ordered segments retain the original global route precedence during migration. */
export function createPlanRoutes(operations: PlanHttpOperations): AcademicRoute[] {
    return [{
            order: 17,
            async handle({ request: req, method, path, exact }) {
                let value: unknown;
                if (path.length === 2 && path[1] === 'plan' && method === 'POST')
                    value = await operations.changePlan(req, path[0], exact(['revision', 'operation']));
                else
                    return { handled: false };
                return { handled: true, value };
            }
        }];
}
