import { invalidInput, strictObject } from '../curriculum/plan.ts';
import { parseSendFoxyMessage } from './validation.ts';
import type { FoxyContext } from './foxy-ai.ts';
import type { FoxyDiagram, FoxyDiagramEdge, FoxyDiagramNode, StartFoxyVisual } from './visual.ts';

function text(value: unknown, max: number, allowEmpty = false): string {
  if (typeof value !== 'string' || (!allowEmpty && !value.trim()) || [...value].length > max
    || /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/u.test(value)) return invalidInput();
  return value;
}
function node(value: unknown, interactive: boolean): FoxyDiagramNode {
  const v = strictObject(value, interactive ? ['id', 'label', 'explanation'] : ['id', 'label']);
  return { id: text(v.id, 80), label: text(v.label, 200),
    ...(interactive ? { explanation: text(v.explanation, 1000) } : {}) };
}
function edge(value: unknown, interactive: boolean): FoxyDiagramEdge {
  const v = strictObject(value, interactive ? ['from', 'to', 'label', 'explanation'] : ['from', 'to', 'label']);
  return { from: text(v.from, 80), to: text(v.to, 80), label: text(v.label, 200, !interactive),
    ...(interactive ? { explanation: text(v.explanation, 1000) } : {}) };
}
function list<T>(value: unknown, max: number, parse: (item: unknown) => T): T[] {
  if (!Array.isArray(value) || value.length > max) return invalidInput();
  return value.map(parse);
}
export function parseStartFoxyVisual(value: unknown, fixedContext: FoxyContext): StartFoxyVisual {
  const v = strictObject(value, ['requestId', 'revision', 'kind', 'prompt', 'selection', 'aspectRatio']);
  if (v.kind !== 'DIAGRAM' && v.kind !== 'IMAGE') return invalidInput();
  if (v.aspectRatio !== '1:1' && v.aspectRatio !== '4:3' && v.aspectRatio !== '3:4' && v.aspectRatio !== '16:9') return invalidInput();
  const message = parseSendFoxyMessage({ requestId: v.requestId, revision: v.revision,
    purpose: 'CHAT', text: v.prompt, selection: v.selection }, fixedContext);
  return { requestId: message.requestId, revision: message.revision, kind: v.kind,
    prompt: message.text, selection: message.selection, aspectRatio: v.aspectRatio };
}
export function parseFoxyDiagram(value: unknown): FoxyDiagram {
  const interactive = !!value && typeof value === 'object' && 'schemaVersion' in value && value.schemaVersion === 'foxy-diagram-v2';
  const fields = ['schemaVersion', 'title', 'nodes', 'edges', 'direction', 'description'];
  if (interactive && Object.hasOwn(value, 'challenge')) fields.push('challenge');
  const v = strictObject(value, fields);
  if ((v.schemaVersion !== 'foxy-diagram-v1' && v.schemaVersion !== 'foxy-diagram-v2') ||
      (v.direction !== 'TOP_DOWN' && v.direction !== 'LEFT_RIGHT')) return invalidInput();
  const nodes = list(v.nodes, interactive ? 12 : 30, item => node(item, interactive));
  const edges = list(v.edges, interactive ? 24 : 60, item => edge(item, interactive));
  const ids = new Set(nodes.map(item => item.id));
  if (ids.size !== nodes.length || edges.some(item => !ids.has(item.from) || !ids.has(item.to))) return invalidInput();
  const coveredIds = new Set(edges.flatMap(item => [item.from, item.to]));
  if (interactive && (nodes.length < 2 || coveredIds.size !== ids.size
    || edges.some(item => item.from === item.to))) return invalidInput();
  const challenge = v.challenge === undefined ? undefined : strictObject(v.challenge, ['question', 'answer']);
  return { schemaVersion: v.schemaVersion, title: text(v.title, 200), nodes, edges,
    direction: v.direction, description: text(v.description, 5000),
    ...(challenge ? { challenge: { question: text(challenge.question, 600), answer: text(challenge.answer, 1000) } } : {}) };
}
