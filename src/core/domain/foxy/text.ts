import type { FoxyPurpose } from './foxy-ai.ts';
import type { PlanDocument } from '../curriculum/ai.ts';

export interface FoxyTextHistoryPair { user: string; assistant: { title: string; markdown: string } }
export interface FoxyTextInput {
  mode: 'GENERAL' | 'CLASSROOM'; purpose: FoxyPurpose; message: string;
  curriculum: { units: { name: string; topics: { name: string; status: 'PENDING' | 'NEXT' | 'TAUGHT'; selected: boolean }[] }[] } | null;
  sources: { sourceKey: string; title: string; kind: 'PLAN' | 'MATERIAL' | 'ACTIVITY' | 'ATTACHMENT'; text: string; documentKeys: string[] }[];
  documents: { documentKey: string; sourceKeys: string[]; document: PlanDocument; pageCount: number | null; warnings: string[] }[];
  warnings: string[]; history?: FoxyTextHistoryPair[]; signal: AbortSignal;
}
export interface FoxyTextResponse {
  schemaVersion: 'foxy-text-response-v1'; status: 'READY' | 'INSUFFICIENT_CONTENT'; title: string; markdown: string;
  references: { sourceKey: string; documentKey: string | null; page: number | null }[];
  warnings: string[]; missingInformation: string[];
}
