import { createHash } from 'node:crypto';
import { parseCreateFoxyConversation, strictObject } from '../../../../src/core/domain/index.ts';
import type { FoxyConversation } from './conversation-repository.ts';
import type { createFoxyConversationRepository } from './conversation-repository.ts';
import type { createFoxyUnitOfWork } from './unit-of-work.ts';

type Repository = ReturnType<typeof createFoxyConversationRepository>;
type UnitOfWork = ReturnType<typeof createFoxyUnitOfWork>;
function fail(code: 'INVALID_INPUT' | 'NOT_FOUND' | 'FORBIDDEN'): never { throw Object.assign(new Error(code), { code }); }
function revision(value: unknown): string {
  if (typeof value !== 'string' || !/^(?:0|[1-9][0-9]*)$/u.test(value) || value.length > 19 || BigInt(value) > 9223372036854775807n) return fail('INVALID_INPUT');
  return value;
}
function cursor(value: unknown): { updatedAt: string; id: string } | null {
  if (value === null) return null;
  const v = strictObject(value, ['updatedAt', 'id']);
  if (typeof v.updatedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(v.updatedAt)
    || !Number.isFinite(Date.parse(v.updatedAt)) || new Date(v.updatedAt).toISOString() !== v.updatedAt
    || typeof v.id !== 'string' || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/iu.test(v.id)) return fail('INVALID_INPUT');
  return { updatedAt: v.updatedAt, id: v.id };
}
function title(value: unknown): string {
  return parseCreateFoxyConversation({ requestId: '00000000-0000-0000-0000-000000000000', title: value, context: { kind: 'GENERAL' } }).title;
}
function view(value: FoxyConversation | null): FoxyConversation {
  if (!value) return fail('NOT_FOUND');
  return { id: value.id, title: value.title, context: value.context.kind === 'GENERAL' ? { kind: 'GENERAL' }
    : { kind: 'CLASSROOM', classroomId: value.context.classroomId }, revision: value.revision };
}
export function createFoxyConversationService(options: { uow: UnitOfWork; conversations: Repository }) {
  return {
    async create(request: unknown, input: unknown) {
      const payload = parseCreateFoxyConversation(input);
      const context = payload.context.kind === 'CLASSROOM' ? { kind: 'CLASSROOM' as const, classroomId: payload.context.classroomId.toLowerCase() }
        : { kind: 'GENERAL' as const };
      const hash = createHash('sha256').update(JSON.stringify({ title: payload.title, context })).digest('hex');
      return options.uow.run(request, true, async (tx, actor) => {
        const result = await options.conversations.create(tx, actor.id, { ...payload, context }, hash);
        return { created: result.created, conversation: view(result.conversation) };
      });
    },
    async get(request: unknown, id: string) {
      return options.uow.run(request, false, async (tx, actor) => view(await options.conversations.get(tx, actor.id, id)));
    },
    async list(request: unknown, input: unknown) {
      if (!input || typeof input !== 'object' || Array.isArray(input)) return fail('INVALID_INPUT');
      const params = strictObject(input, Object.hasOwn(input, 'after') ? ['limit', 'after'] : ['limit']);
      if (!Number.isSafeInteger(params.limit) || (params.limit as number) < 1 || (params.limit as number) > 100) return fail('INVALID_INPUT');
      const after = Object.hasOwn(params, 'after') ? cursor(params.after) : null;
      return options.uow.run(request, false, async (tx, actor) => {
        const page = await options.conversations.listPage(tx, actor.id, { limit: params.limit as number, after });
        return { items: page.items.map(view), next: page.next };
      });
    },
    async rename(request: unknown, id: string, input: unknown) {
      const body = strictObject(input, ['revision', 'title']), expected = revision(body.revision), name = title(body.title);
      return options.uow.run(request, true, async (tx, actor) => {
        await options.conversations.rename(tx, actor.id, id, expected, name);
        return view(await options.conversations.get(tx, actor.id, id));
      });
    },
    async remove(request: unknown, id: string, input: unknown) {
      const body = strictObject(input, ['revision', 'confirm']), expected = revision(body.revision);
      if (body.confirm !== true) return fail('INVALID_INPUT');
      return options.uow.run(request, true, async (tx, actor) => options.conversations.remove(tx, actor.id, id, expected));
    },
  };
}
