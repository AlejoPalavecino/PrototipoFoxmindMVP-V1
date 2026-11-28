import type { AcademicRoute } from '../../../../../../../src/core/contracts/academic-http.ts';
import type { ReviewHttpOperations } from '../application/http-operations.ts';
import { fail, uuid } from '../../../../../../../src/core/domain/classrooms/policy.ts';
import { privateGradingInput } from '../../domain/grading-policy.ts';
import { publicationInput } from '../../publication/public.ts';
import { gradeCorrectionInput } from '../../corrections/public.ts';
/** Ordered segments retain the original global route precedence during migration. */
export function createReviewRoutes(operations: ReviewHttpOperations): AcademicRoute[] {
    return [{
            order: 26,
            async handle({ request: req, method, path, body, headers }) {
                let value: unknown;
                if (path.length === 4 && path[1] === 'attempts' && ['publish-grade', 'result'].includes(path[3])) {
                    if (!uuid(path[0]) || !uuid(path[2]) || headers['x-attempt-editor'] !== undefined || headers['x-attempt-epoch'] !== undefined)
                        return fail('INVALID_INPUT');
                    if (path[3] === 'result' && method === 'GET')
                        value = await operations.getAttemptResult(req, path[0], path[2]);
                    else if (path[3] === 'publish-grade' && method === 'POST')
                        value = await operations.publishAttemptGrade(req, path[0], path[2], publicationInput(body));
                    else
                        return fail('INVALID_INPUT');
                }
                else if (path.length === 4 && path[1] === 'attempts' && path[3] === 'grade-corrections') {
                    if (!uuid(path[0]) || !uuid(path[2]) || headers['x-attempt-editor'] !== undefined || headers['x-attempt-epoch'] !== undefined)
                        return fail('INVALID_INPUT');
                    if (method === 'GET')
                        value = await operations.getGradeCorrections(req, path[0], path[2]);
                    else if (method === 'POST')
                        value = await operations.correctPublishedGrade(req, path[0], path[2], gradeCorrectionInput(body));
                    else
                        return fail('INVALID_INPUT');
                }
                else if (path[1] === 'attempts' && path[3] === 'grading-ai' && (path.length === 4 || path.length === 6)) {
                    if (!uuid(path[0]) || !uuid(path[2]) || headers['x-attempt-editor'] !== undefined || headers['x-attempt-epoch'] !== undefined)
                        return fail('INVALID_INPUT');
                    if (path.length === 4 && method === 'GET')
                        value = await operations.getGradingAi(req, path[0], path[2]);
                    else if (path.length === 6 && method === 'POST' && path[5] === 'apply')
                        value = await operations.applyGradingAi(req, path[0], path[2], path[4], body);
                    else if (path.length === 6 && method === 'POST' && path[5] === 'discard')
                        value = await operations.discardGradingAi(req, path[0], path[2], path[4], body);
                    else
                        return fail('INVALID_INPUT');
                }
                else if (path.length === 4 && path[1] === 'attempts' && path[3] === 'grading') {
                    if (!uuid(path[0]) || !uuid(path[2]) || headers['x-attempt-editor'] !== undefined || headers['x-attempt-epoch'] !== undefined)
                        return fail('INVALID_INPUT');
                    if (method === 'GET')
                        value = await operations.getAttemptGrading(req, path[0], path[2]);
                    else if (method === 'POST')
                        value = await operations.saveAttemptGrading(req, path[0], path[2], privateGradingInput(body));
                    else
                        return fail('INVALID_INPUT');
                }
                else
                    return { handled: false };
                return { handled: true, value };
            }
        },
        {
            order: 45,
            async handle({ request: req, method, path, headers }) {
                let value: unknown;
                if (path.length === 4 && path[1] === 'members' && path[3] === 'ai-summary') {
                    if (method !== 'GET' || !uuid(path[0]) || !uuid(path[2])
                        || headers['x-attempt-editor'] !== undefined || headers['x-attempt-epoch'] !== undefined)
                        return fail('INVALID_INPUT');
                    value = await operations.getStudentAiReport(req, path[0], path[2]);
                }
                else if ((path.length === 2 && path[1] === 'progress')
                    || (path.length === 4 && path[1] === 'members' && path[3] === 'progress')) {
                    if (method !== 'GET' || !uuid(path[0]) || (path.length === 4 && !uuid(path[2]))
                        || headers['x-attempt-editor'] !== undefined || headers['x-attempt-epoch'] !== undefined)
                        return fail('INVALID_INPUT');
                    value = path.length === 2 ? await operations.getProgress(req, path[0]) : await operations.getStudentProgress(req, path[0], path[2]);
                }
                else
                    return { handled: false };
                return { handled: true, value };
            }
        }];
}
