import type { AcademicRoute } from '../../../../../../../src/core/contracts/academic-http.ts';
import type { AttemptsHttpOperations } from '../application/http-operations.ts';
import { fail, uuid } from '../../../../../../../src/core/domain/classrooms/policy.ts';
import { editorCapability } from '../../domain/attempt-policy.ts';
/** Ordered segments retain the original global route precedence during migration. */
export function createAttemptsRoutes(operations: AttemptsHttpOperations): AcademicRoute[] {
    return [{
            order: 24,
            async handle({ request: req, method, path, headers, exact }) {
                let value: unknown;
                if (path.length === 4 && path[1] === 'activities' && ['history', 'history-submissions', 'reopen'].includes(path[3])) {
                    if (!uuid(path[0]) || !uuid(path[2]) || headers['x-attempt-editor'] !== undefined || headers['x-attempt-epoch'] !== undefined)
                        return fail('INVALID_INPUT');
                    if (path[3] === 'history' && method === 'GET')
                        value = await operations.activityHistory(req, path[0], path[2]);
                    else if (path[3] === 'history-submissions' && method === 'GET')
                        value = await operations.activitySubmissions(req, path[0], path[2]);
                    else if (path[3] === 'reopen' && method === 'POST')
                        value = await operations.reopenActivity(req, path[0], path[2], exact(['revision', 'studentId', 'deadline', 'confirm']));
                    else
                        return fail('INVALID_INPUT');
                }
                else if (path.length === 4 && path[1] === 'attempts' && path[3] === 'history' && method === 'GET') {
                    if (!uuid(path[0]) || !uuid(path[2]) || headers['x-attempt-editor'] !== undefined || headers['x-attempt-epoch'] !== undefined)
                        return fail('INVALID_INPUT');
                    value = await operations.activityAttempt(req, path[0], path[2]);
                }
                else
                    return { handled: false };
                return { handled: true, value };
            }
        },
        {
            order: 30,
            async handle({ request: req, method, path, headers, exact }) {
                let value: unknown;
                if (path.length === 4 && path[1] === 'activities' && ['session', 'start', 'eligibility', 'authorize-first'].includes(path[3])) {
                    if (!uuid(path[0]) || !uuid(path[2]))
                        return fail('INVALID_INPUT');
                    if (headers['x-attempt-editor'] !== undefined || headers['x-attempt-epoch'] !== undefined)
                        return fail('INVALID_INPUT');
                    if (path[3] === 'session' && method === 'GET')
                        value = await operations.activitySession(req, path[0], path[2]);
                    else if (path[3] === 'eligibility' && method === 'GET')
                        value = await operations.activityEligibility(req, path[0], path[2]);
                    else if (path[3] === 'start' && method === 'POST')
                        value = await operations.startActivity(req, path[0], path[2], exact([]));
                    else if (path[3] === 'authorize-first' && method === 'POST')
                        value = await operations.authorizeFirstSubmission(req, path[0], path[2], exact(['revision', 'studentId', 'deadline']));
                    else
                        return fail('INVALID_INPUT');
                }
                else if (path.length === 4 && path[1] === 'attempts' && path[3] === 'transfer' && method === 'POST') {
                    if (!uuid(path[0]) || !uuid(path[2]))
                        return fail('INVALID_INPUT');
                    if (headers['x-attempt-editor'] !== undefined || headers['x-attempt-epoch'] !== undefined)
                        editorCapability(headers['x-attempt-editor'], headers['x-attempt-epoch']);
                    value = await operations.transferAttemptEditor(req, path[0], path[2], exact(['revision']));
                }
                else if (path.length === 4 && path[1] === 'attempts' && ['answer', 'submit-answers'].includes(path[3]) && method === 'POST') {
                    if (!uuid(path[0]) || !uuid(path[2]))
                        return fail('INVALID_INPUT');
                    editorCapability(headers['x-attempt-editor'], headers['x-attempt-epoch']);
                    value = path[3] === 'answer'
                        ? await operations.saveAttemptAnswer(req, path[0], path[2], exact(['revision', 'questionId', 'text', 'optionIds']))
                        : await operations.submitQuestionnaireAttempt(req, path[0], path[2], exact(['revision', 'confirm', 'confirmIncomplete']));
                }
                else if (path.length === 4 && path[1] === 'attempts' && ['attachments-remove', 'submit-practical', 'practical-response'].includes(path[3]) && method === 'POST') {
                    if (!uuid(path[0]) || !uuid(path[2]))
                        return fail('INVALID_INPUT');
                    editorCapability(headers['x-attempt-editor'], headers['x-attempt-epoch']);
                    value = path[3] === 'practical-response' ? await operations.savePracticalResponse(req, path[0], path[2], exact(['revision', 'text'])) : path[3] === 'attachments-remove'
                        ? await operations.removeAttemptAttachment(req, path[0], path[2], exact(['revision', 'fileId']))
                        : await operations.submitPracticalAttempt(req, path[0], path[2], exact(['revision', 'confirm']));
                }
                else if (path.length === 4 && path[1] === 'activities' && path[3] === 'submissions' && method === 'GET') {
                    if (!uuid(path[0]) || !uuid(path[2]) || headers['x-attempt-editor'] !== undefined || headers['x-attempt-epoch'] !== undefined)
                        return fail('INVALID_INPUT');
                    value = await operations.assignmentSubmissions(req, path[0], path[2]);
                }
                else if (path.length === 4 && path[1] === 'attempts' && path[3] === 'receipt' && method === 'GET') {
                    if (!uuid(path[0]) || !uuid(path[2]) || headers['x-attempt-editor'] !== undefined || headers['x-attempt-epoch'] !== undefined)
                        return fail('INVALID_INPUT');
                    value = await operations.assignmentSubmission(req, path[0], path[2]);
                }
                else
                    return { handled: false };
                return { handled: true, value };
            }
        }];
}
