export interface WallContent {
  id: string; authorName: string; initials: string; body: string | null;
  createdAt: string; editedAt: string | null; removedAt: string | null;
  canEdit: boolean; canRemove: boolean;
}
export interface WallPost extends WallContent {
  title?: string | null; type: 'NOTICE' | 'QUERY'; replies: WallContent[]; replyCount: number;
  repliesNextCursor: string | null; repliesPreviousCursor: string | null;
}
export interface WallData { revision: string; posts: WallPost[]; nextCursor: string | null }
export interface WallRepliesPage {
  revision: string; postId: string; replies: WallContent[]; nextCursor: string | null; previousCursor: string | null;
}
export interface WallThreadData { revision: string; post: WallPost }
export interface WallPageQuery { cursor?: string; limit?: number; type?: 'NOTICE' | 'QUERY' }

/** Parse URL parameters identically at both HTTP boundaries. */
export function parseWallQuery(params: URLSearchParams, kind: 'feed' | 'replies' | 'thread'): WallPageQuery & { replyId?: string } {
  const allowed = kind === 'thread' ? ['replyId'] : kind === 'feed' ? ['cursor', 'limit', 'type'] : ['cursor', 'limit'];
  for (const key of params.keys()) if (!allowed.includes(key) || params.getAll(key).length !== 1) throw new Error('INVALID_INPUT');
  const cursor = params.get('cursor'), rawLimit = params.get('limit'), replyId = params.get('replyId');
  const type=params.get('type');if(type!==null && type!=='NOTICE' && type!=='QUERY')throw new Error('INVALID_INPUT');
  if (cursor !== null && (!cursor || cursor.length > 2048)) throw new Error('INVALID_INPUT');
  const maximum = kind === 'feed' ? 10 : 20;
  if (rawLimit !== null && (!/^[1-9][0-9]*$/.test(rawLimit) || Number(rawLimit) > maximum)) throw new Error('INVALID_INPUT');
  if (replyId !== null && !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(replyId)) throw new Error('INVALID_INPUT');
  return { ...(cursor !== null ? { cursor } : {}), ...(rawLimit !== null ? { limit: Number(rawLimit) } : {}),
    ...(replyId !== null ? { replyId } : {}),...(type!==null ? {type:type as 'NOTICE'|'QUERY'} : {}) };
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('INVALID_INPUT');
  return value as Record<string, unknown>;
}
function nullableString(value: unknown): boolean { return value === null || typeof value === 'string'; }
function content(value: unknown): WallContent {
  const item = record(value);
  if (typeof item.id !== 'string' || typeof item.authorName !== 'string' || typeof item.initials !== 'string' ||
    !nullableString(item.body) || typeof item.createdAt !== 'string' || !nullableString(item.editedAt) || !nullableString(item.removedAt) ||
    typeof item.canEdit !== 'boolean' || typeof item.canRemove !== 'boolean') throw new Error('INVALID_INPUT');
  return item as unknown as WallContent;
}
function post(value: unknown): WallPost {
  const item = record(value); content(item);
  if (!['NOTICE', 'QUERY'].includes(String(item.type)) || !Array.isArray(item.replies) || item.replies.length > 20 ||
    !Number.isSafeInteger(item.replyCount) || Number(item.replyCount) < item.replies.length ||
    !nullableString(item.repliesNextCursor) || !nullableString(item.repliesPreviousCursor)) throw new Error('INVALID_INPUT');
  if (item.title !== undefined && !nullableString(item.title)) throw new Error('INVALID_INPUT');
  item.replies.forEach(content); return item as unknown as WallPost;
}
export function parseWallData(value: unknown): WallData {
  const data = record(value);
  if (typeof data.revision !== 'string' || !Array.isArray(data.posts) || data.posts.length > 10 || !nullableString(data.nextCursor)) throw new Error('INVALID_INPUT');
  data.posts.forEach(post); return data as unknown as WallData;
}
export function parseWallThreadData(value: unknown): WallThreadData {
  const data = record(value);
  if (typeof data.revision !== 'string') throw new Error('INVALID_INPUT');
  post(data.post); return data as unknown as WallThreadData;
}
export function parseWallRepliesPage(value: unknown): WallRepliesPage {
  const data = record(value);
  if (typeof data.revision !== 'string' || typeof data.postId !== 'string' || !Array.isArray(data.replies) || data.replies.length > 20 ||
    !nullableString(data.nextCursor) || !nullableString(data.previousCursor)) throw new Error('INVALID_INPUT');
  data.replies.forEach(content); return data as unknown as WallRepliesPage;
}
import { contractObject, contractRevision, contractUuid } from './classroom-contract-values.ts';
export type WallOperation =
  | { action: 'publish'; title?: string | null; body: string } | { action: 'reply'; postId: string; body: string }
  | { action: 'editPost'; id: string; title?: string | null; body: string } | { action: 'editReply'; id: string; body: string }
  | { action: 'removePost' | 'removeReply'; id: string; confirm: true };
export function parseWallMutation(value: unknown): { revision: string; operation: WallOperation } {
  const input = contractObject(value, ['revision', 'operation']);
  if (Object.keys(input).length !== 2) throw new Error('INVALID_INPUT');
  const op = contractObject(input.operation), shapes: Record<string, string[]> = {
    publish: ['action', 'body'], reply: ['action', 'postId', 'body'], editPost: ['action', 'id', 'body'],
    editReply: ['action', 'id', 'body'], removePost: ['action', 'id', 'confirm'], removeReply: ['action', 'id', 'confirm'] };
  const keys = typeof op.action === 'string' && Object.hasOwn(shapes, op.action) ? shapes[op.action] : undefined;
  const optionalTitle = (op.action === 'publish' || op.action === 'editPost') && Object.hasOwn(op, 'title');
  if (optionalTitle && op.title !== null && (typeof op.title !== 'string' || !op.title.trim() || [...op.title].length > 120 || /[\u0000-\u001f\u007f-\u009f]/u.test(op.title))) throw new Error('INVALID_INPUT');
  if (!keys || Object.keys(op).length !== keys.length + (optionalTitle ? 1 : 0) || keys.some(key => !Object.hasOwn(op, key)) ||
    ('id' in op && !contractUuid(op.id)) || ('postId' in op && !contractUuid(op.postId)) || ('confirm' in op && op.confirm !== true)) throw new Error('INVALID_INPUT');
  if ('body' in op && (typeof op.body !== 'string' || !op.body.trim() || [...op.body].length > 5000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\ud800-\udfff]/u.test(op.body))) throw new Error('INVALID_INPUT');
  return { revision: contractRevision(input.revision), operation: op as WallOperation };
}
