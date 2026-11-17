import type { AcademicRoute } from '../../../../../../../src/core/contracts/academic-http.ts';
import type { LibraryHttpOperations } from '../application/http-operations.ts';
/** Ordered segments retain the original global route precedence during migration. */
export function createLibraryRoutes(operations: LibraryHttpOperations): AcademicRoute[] {
    return [{
            order: 18,
            async handle({ request: req, method, path, exact }) {
                let value: unknown;
                if (path.length === 2 && path[1] === 'library' && method === 'GET')
                    value = await operations.listMaterials(req, path[0]);
                else if (path.length === 2 && path[1] === 'library' && method === 'POST')
                    value = await operations.changeLibrary(req, path[0], exact(['revision', 'operation']));
                else
                    return { handled: false };
                return { handled: true, value };
            }
        }];
}
