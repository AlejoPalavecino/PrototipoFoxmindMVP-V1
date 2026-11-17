import type { AcademicRoute } from '../../../../../../../src/core/contracts/academic-http.ts';
import type { WallHttpOperations } from '../application/http-operations.ts';
import { fail } from '../../../../../../../src/core/domain/classrooms/policy.ts';
import { parseWallQuery, parseWallMutation } from '../../../../../../../src/core/domain/communication/wall.ts';
/** Ordered segments retain the original global route precedence during migration. */
export function createWallRoutes(operations: WallHttpOperations): AcademicRoute[] {
    return [{
            order: 37,
            async handle({ request: req, method, path, body, search }) {
                let value: unknown;
                if (path.length === 2 && path[1] === 'wall' && method === 'GET')
                    value = await operations.listWall(req, path[0], wallQuery(search, 'feed'));
                else if (path.length === 3 && path[1] === 'wall' && method === 'GET')
                    value = await operations.wallThread(req, path[0], path[2], wallQuery(search, 'thread').replyId);
                else if (path.length === 4 && path[1] === 'wall' && path[3] === 'replies' && method === 'GET')
                    value = await operations.listWallReplies(req, path[0], path[2], wallQuery(search, 'replies'));
                else if (path.length === 2 && path[1] === 'wall' && method === 'POST') {
                    let data: ReturnType<typeof parseWallMutation>;
                    try {
                        data = parseWallMutation(body);
                    }
                    catch {
                        return fail('INVALID_INPUT');
                    }
                    value = await operations.changeWall(req, path[0], data);
                }
                else
                    return { handled: false };
                return { handled: true, value };
            }
        }];
}
function wallQuery(search: URLSearchParams, kind: 'feed' | 'replies' | 'thread') {
    try {
        return parseWallQuery(search, kind);
    }
    catch {
        return fail('INVALID_INPUT');
    }
}
