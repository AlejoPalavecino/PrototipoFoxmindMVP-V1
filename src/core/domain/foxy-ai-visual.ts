import type { FoxySelection } from './foxy-ai.ts';

export type FoxyVisualKind = 'DIAGRAM' | 'IMAGE';
export type FoxyAspectRatio = '1:1' | '4:3' | '3:4' | '16:9';
export interface StartFoxyVisual {
  requestId: string;
  revision: string;
  kind: FoxyVisualKind;
  prompt: string;
  selection: FoxySelection;
  aspectRatio: FoxyAspectRatio;
}
export interface FoxyDiagramNode { id: string; label: string }
export interface FoxyDiagramEdge { from: string; to: string; label: string }
export interface FoxyDiagram {
  schemaVersion: 'foxy-diagram-v1';
  title: string;
  nodes: FoxyDiagramNode[];
  edges: FoxyDiagramEdge[];
  direction: 'TOP_DOWN' | 'LEFT_RIGHT';
  description: string;
}
