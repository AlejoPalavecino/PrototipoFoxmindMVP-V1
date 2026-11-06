import { signPageCursor, readPageCursor } from './signed-page-cursor.ts';
import { fail } from './policy.ts';

export interface WallPosition { timestamp: string; id: string }
export interface WallCursor {
  v: 1; kind: 'feed' | 'replies'; room: string; post?: string; direction: 'after' | 'before';
  position: WallPosition; high?: WallPosition;
  filter?: 'NOTICE' | 'QUERY';
}
export function signWallCursor(key: Buffer, value: WallCursor): string {
  return signPageCursor(key, 'wall-cursor-v1:', value);
}
export function readWallCursor(key: Buffer, token: string, kind: WallCursor['kind'], room: string, post?: string): WallCursor {
  try {
    const value = readPageCursor(key, 'wall-cursor-v1:', token) as WallCursor;
    const valid = (p: WallPosition | undefined) => !!p && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z$/.test(p.timestamp) && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(p.id);
    if (value.v !== 1 || value.kind !== kind || value.room !== room || value.post !== post ||
      (value.filter !== undefined && !['NOTICE','QUERY'].includes(value.filter)) ||
      !['after', 'before'].includes(value.direction) || !valid(value.position) ||
      (kind === 'feed' && (value.direction !== 'after' || !valid(value.high)))) return fail('INVALID_INPUT');
    return value;
  } catch { return fail('INVALID_INPUT'); }
}
