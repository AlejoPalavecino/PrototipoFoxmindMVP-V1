import { fail } from '../../classrooms/public.ts';
import { readPageCursor as read, type CursorNamespace } from '../../../platform/pagination/signed-page-cursor.ts';
export { signPageCursor } from '../../../platform/pagination/signed-page-cursor.ts';
export function readPageCursor(key: Buffer, namespace: CursorNamespace, token: string) { return read(key, namespace, token, fail); }
