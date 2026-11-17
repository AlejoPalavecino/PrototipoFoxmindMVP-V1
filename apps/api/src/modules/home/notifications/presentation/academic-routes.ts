import type { AcademicRoute } from '../../../../../../../src/core/contracts/academic-http.ts';
import type { NotificationsHttpOperations } from '../application/http-operations.ts';
import { fail } from '../../../../../../../src/core/domain/classrooms/policy.ts';
import { parseNotificationQuery } from '../../../../../../../src/core/domain/home/notifications.ts';
/** Ordered segments retain the original global route precedence during migration. */
export function createNotificationsRoutes(operations: NotificationsHttpOperations): AcademicRoute[] {
    return [{
            order: 12,
            async handle({ request: req, method, path, search, exact }) {
                let value: unknown;
                if (path.join('/') === 'notifications' && method === 'GET')
                    value = await operations.listNotifications(req);
                else if (path.join('/') === 'notifications/page' && method === 'GET')
                    value = await operations.listNotificationPage(req, notificationQuery(search));
                else if (path.join('/') === 'notifications/read-all' && method === 'POST') {
                    exact([]);
                    value = await operations.readAllNotifications(req);
                }
                else if (path.length === 3 && path[0] === 'notifications' && ['read', 'unread', 'open'].includes(path[2]) && method === 'POST') {
                    exact([]);
                    value = path[2] === 'open' ? await operations.openNotification(req, path[1]) : await operations.readNotification(req, path[1], path[2] === 'read');
                }
                else
                    return { handled: false };
                return { handled: true, value };
            }
        }];
}
function notificationQuery(search: URLSearchParams) {
    try {
        return parseNotificationQuery(search);
    }
    catch {
        return fail('INVALID_INPUT');
    }
}
