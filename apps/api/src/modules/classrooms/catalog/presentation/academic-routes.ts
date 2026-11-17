import type { AcademicRoute } from '../../../../../../../src/core/contracts/academic-http.ts';
import type { CatalogHttpOperations } from '../application/http-operations.ts';
import { fail } from '../../../../../../../src/core/domain/classrooms/policy.ts';
/** Ordered segments retain the original global route precedence during migration. */
export function createCatalogRoutes(operations: CatalogHttpOperations): AcademicRoute[] {
    return [{
            order: 0,
            async handle({ request: req, method, path, search, exact }) {
                let value: unknown;
                if (!path.length && method === 'GET')
                    value = await operations.mine(req);
                else if (path.join('/') === 'search' && method === 'GET')
                    value = await operations.search(req, search);
                else if (path.join('/') === 'drafts' && method === 'GET')
                    value = await operations.listDrafts(req);
                else if (path.join('/') === 'drafts' && method === 'POST') {
                    exact([]);
                    value = await operations.createDraft(req);
                }
                else if (path[0] === 'drafts' && path.length === 2 && method === 'GET')
                    value = await operations.getDraft(req, path[1]);
                else if (path[0] === 'drafts' && path.length === 2 && method === 'PATCH')
                    value = await operations.saveDraft(req, path[1], exact(['revision', 'payload']));
                else if (path[0] === 'drafts' && path.length === 2 && method === 'DELETE')
                    value = await operations.deleteDraft(req, path[1], exact(['revision', 'confirm']));
                else if (path[0] === 'drafts' &&
                    path[2] === 'publish' &&
                    path.length === 3 &&
                    method === 'POST')
                    value = await operations.publishDraft(req, path[1], exact(['revision']));
                else if (path.join('/') === 'codes/preview' && method === 'POST')
                    value = await operations.previewCode(req, exact(['code']).code);
                else if (path.join('/') === 'codes/confirm' && method === 'POST')
                    value = await operations.confirmCode(req, exact(['confirmation']).confirmation);
                else if (path.join('/') === 'invitations' && method === 'GET')
                    value = await operations.pendingInvitations(req);
                else if (path[0] === 'invitations' &&
                    (path[2] === 'accept' || path[2] === 'decline') &&
                    path.length === 3 &&
                    method === 'POST') {
                    exact([]);
                    value = path[2] === 'decline' ? await operations.declineInvitation(req, path[1]) : await operations.acceptInvitation(req, path[1]);
                }
                else
                    return { handled: false };
                return { handled: true, value };
            }
        },
        {
            order: 16,
            async handle({ request: req, method, path }) {
                let value: unknown;
                if (path.length === 1 && method === 'GET')
                    value = await operations.detail(req, path[0]);
                else
                    return { handled: false };
                return { handled: true, value };
            }
        },
        {
            order: 41,
            async handle({ request: req, method, path, exact }) {
                let value: unknown;
                if (path.length === 2 &&
                    path[1] === 'settings' &&
                    method === 'PATCH')
                    value = await operations.updateSettings(req, path[0], exact(['revision', 'name', 'subject', 'division', 'academicYear'], ['aiGradingEnabled', 'coverKey']));
                else if (path.length === 2 && path[1] === 'archive' && method === 'POST')
                    value = await operations.setArchive(req, path[0], exact(['archived', 'revision']));
                else if (path.length === 2 && path[1] === 'code' && method === 'POST') {
                    exact([]);
                    value = await operations.rotateCode(req, path[0]);
                }
                else if (path.length === 2 &&
                    ['members', 'history'].includes(path[1]) &&
                    method === 'GET')
                    value = await operations.members(req, path[0], path[1] === 'history');
                else
                    return { handled: false };
                return { handled: true, value };
            }
        },
        {
            order: 47,
            async handle({ request: req, method, path, exact }) {
                let value: unknown;
                if (path.length === 3 && path[1] === 'members' && method === 'GET')
                    value = await operations.studentSummary(req, path[0], path[2]);
                else if (path.length === 2 &&
                    path[1] === 'invitations' &&
                    method === 'GET')
                    value = await operations.listInvitations(req, path[0]);
                else if (path.length === 2 &&
                    path[1] === 'invitations' &&
                    method === 'POST')
                    value = await operations.invite(req, path[0], exact(['email']).email);
                else if (path[1] === 'invitations' && path[2] === 'batch') {
                    if (path.length === 3 && method === 'POST')
                        value = await operations.reserveInvitationBatch(req, path[0], exact(['requestId', 'emails']));
                    else if (path.length === 4 && method === 'GET')
                        value = await operations.readInvitationBatch(req, path[0], path[3]);
                    else if (path.length === 5 && method === 'POST' && /^(?:[0-9]|[1-4][0-9])$/.test(path[4])) {
                        exact([]);
                        value = await operations.emitInvitationBatchRecipient(req, path[0], path[3], Number(path[4]));
                    }
                    else
                        return fail('INVALID_INPUT');
                }
                else if (path.length === 4 &&
                    path[1] === 'invitations' &&
                    path[3] === 'revoke' &&
                    method === 'POST') {
                    exact([]);
                    value = await operations.revokeInvitation(req, path[0], path[2]);
                }
                else if (path.length === 2 &&
                    path[1] === 'leave' &&
                    method === 'POST') {
                    exact([]);
                    value = await operations.leave(req, path[0]);
                }
                else if (path.length === 4 &&
                    path[1] === 'members' &&
                    path[3] === 'remove' &&
                    method === 'POST') {
                    exact([]);
                    value = await operations.remove(req, path[0], path[2]);
                }
                else
                    return { handled: false };
                return { handled: true, value };
            }
        }];
}
