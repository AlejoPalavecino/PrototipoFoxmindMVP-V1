import { invalidInput, strictObject } from './study-plan.ts';
import { parseSendFoxyMessage } from './foxy-ai-validation.ts';
import type { FoxyContext } from './foxy-ai.ts';
import type { FoxyDiagram, FoxyDiagramEdge, FoxyDiagramNode, StartFoxyVisual } from './foxy-ai-visual.ts';

function text(value: unknown, max: number, allowEmpty = false): string {
  if (typeof value !== 'string' || (!allowEmpty && !value.trim()) || [...value].length > max
    || /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/u.test(value)) return invalidInput();
  return value;
}
function node(value: unknown): FoxyDiagramNode {
  const v = strictObject(value, ['id', 'label']);
  return { id: text(v.id, 80), label: text(v.label, 200) };
}
function edge(value: unknown): FoxyDiagramEdge {
  const v = strictObject(value, ['from', 'to', 'label']);
  return { from: text(v.from, 80), to: text(v.to, 80), label: text(v.label, 200, true) };
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
  const v = strictObject(value, ['schemaVersion', 'title', 'nodes', 'edges', 'direction', 'description']);
  if (v.schemaVersion !== 'foxy-diagram-v1' || (v.direction !== 'TOP_DOWN' && v.direction !== 'LEFT_RIGHT')) return invalidInput();
  const nodes = list(v.nodes, 30, node), edges = list(v.edges, 60, edge);
  const ids = new Set(nodes.map(item => item.id));
  if (ids.size !== nodes.length || edges.some(item => !ids.has(item.from) || !ids.has(item.to))) return invalidInput();
  return { schemaVersion: v.schemaVersion, title: text(v.title, 200), nodes, edges,
    direction: v.direction, description: text(v.description, 5000) };
}
