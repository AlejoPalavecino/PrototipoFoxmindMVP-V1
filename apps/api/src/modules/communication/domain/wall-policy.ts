import { fail, object, uuid } from '../../../../../../src/core/domain/classrooms/policy.ts';

/** Preserve legitimate multiline plain text; never trim, truncate or interpret markup. */
export function wallText(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || [...value].length > 5000 ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\ud800-\udfff]/u.test(value)) return fail('INVALID_INPUT');
  return value;
}

export type WallOperation =
  | { action: 'publish'; body: string }
  | { action: 'reply'; postId: string; body: string }
  | { action: 'editPost' | 'editReply'; id: string; body: string }
  | { action: 'removePost' | 'removeReply'; id: string; confirm: true };

export function wallOperation(value: unknown): WallOperation {
  const op = object(value, ['action', 'id', 'postId', 'body', 'confirm']);
  const shapes: Record<string, string[]> = {
    publish: ['action', 'body'], reply: ['action', 'postId', 'body'],
    editPost: ['action', 'id', 'body'], editReply: ['action', 'id', 'body'],
    removePost: ['action', 'id', 'confirm'], removeReply: ['action', 'id', 'confirm'],
  };
  const keys = typeof op.action === 'string' && Object.hasOwn(shapes, op.action) ? shapes[op.action] : undefined;
  if (!keys) return fail('INVALID_INPUT');
  object(op, keys);
  if (keys.some(key => !Object.hasOwn(op, key)) ||
    ('id' in op && !uuid(op.id)) || ('postId' in op && !uuid(op.postId)) ||
    ('confirm' in op && op.confirm !== true)) return fail('INVALID_INPUT');
  if ('body' in op) wallText(op.body);
  return op as WallOperation;
}
