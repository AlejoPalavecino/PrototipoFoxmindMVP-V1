import { parseEditFoxyResource, parseFoxyAnswer } from '../../../../../../../src/core/domain/foxy/resource-validation.ts';
import { type EditFoxyResource } from '../../../../../../../src/core/domain/foxy/resource.ts';
import type { FoxyResourceRepositoryPort } from '../../application/ports.ts';

type Resource = NonNullable<Awaited<ReturnType<FoxyResourceRepositoryPort['get']>>>;
type PriorEdit = { input_hash: string; result: Resource };
const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/iu;
function fail(code: 'CONFLICT' | 'INVALID_INPUT'): never { throw Object.assign(new Error(code), { code }); }

export function assertResourceIdentifiers(...values: string[]): void {
  if (values.some(value => typeof value !== 'string' || !uuid.test(value))) fail('INVALID_INPUT');
}
function content(title: string, markdown: string): void {
  if ([...title].length > 200 || [...markdown].length > 50000 || !title.trim() || !markdown.trim()) fail('INVALID_INPUT');
}
export function resourceEditCommand(input: unknown): EditFoxyResource {
  const command = parseEditFoxyResource(input);
  content(command.title, command.markdown);
  return command;
}
export function assertResourceTurnReady(state: string): void {
  if (state !== 'READY') fail('CONFLICT');
}
/** Called only for a new resource; replay does not reparse a previously saved answer. */
export function resourceTurnContent(input: unknown) {
  const answer = parseFoxyAnswer(input);
  content(answer.title, answer.markdown);
  return answer;
}
/** Serialization and property order are part of the existing request fingerprint. */
export function resourceEditIdentity(id: string, command: EditFoxyResource): string {
  return JSON.stringify({ id: id.toLowerCase(), revision: command.revision, title: command.title, markdown: command.markdown });
}
/** Facts are obtained under the adapter's existing owner/resource locks. */
export function resourceEditReplay(currentRevision: bigint, prior: PriorEdit | undefined, hash: string, expectedRevision: string): { resource: Resource } | null {
  if (prior) {
    if (prior.input_hash !== hash) fail('CONFLICT');
    return { resource: prior.result };
  }
  if (String(currentRevision) !== expectedRevision) fail('CONFLICT');
  return null;
}
