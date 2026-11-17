import { parseFoxyDiagram } from '../../../../../../../../src/core/domain/foxy/visual-validation.ts';
import { type FoxyDiagram } from '../../../../../../../../src/core/domain/foxy/visual.ts';
import { imageUsage } from './foxy-image-response-usage.ts';
const string = (maxLength: number) => ({ type:'string', minLength:1, maxLength });
export const diagramSchema = { type:'object', additionalProperties:false, required:['schemaVersion','title','description','direction','nodes','edges'], properties: {
  schemaVersion:{type:'string',enum:['foxy-diagram-v1']},title:string(200),description:string(5000),direction:{type:'string',enum:['TOP_DOWN','LEFT_RIGHT']},
  nodes:{type:'array',minItems:1,maxItems:30,items:{type:'object',additionalProperties:false,required:['id','label'],properties:{id:string(80),label:string(200)}}},
  edges:{type:'array',maxItems:60,items:{type:'object',additionalProperties:false,required:['from','to','label'],properties:{from:string(80),to:string(80),label:{type:'string',maxLength:200}}}},
} };
function invalid(): never { throw Object.assign(new Error('INVALID_AI_OUTPUT'),{code:'INVALID_AI_OUTPUT'}); }
function record(value: unknown): value is Record<string,unknown> { return !!value && typeof value==='object' && !Array.isArray(value); }
export function parseDiagramResponse(value: unknown): {diagram:FoxyDiagram;usage:{inputTokens:number;outputTokens:number}|null} {
  if (!record(value) || (value.promptFeedback!==undefined && (!record(value.promptFeedback) || value.promptFeedback.blockReason!==undefined))
    || !Array.isArray(value.candidates) || value.candidates.length!==1) return invalid();
  const candidate=value.candidates[0];
  if (!record(candidate) || candidate.finishReason!=='STOP' || !record(candidate.content) || !Array.isArray(candidate.content.parts)
    || !candidate.content.parts.length || candidate.content.parts.length>64) return invalid();
  let json='', bytes=0;
  for (const part of candidate.content.parts) {
    if (!record(part) || Object.keys(part).some(key=>!['text','thought','thoughtSignature'].includes(key)) || typeof part.text!=='string'
      || (part.thought!==undefined && typeof part.thought!=='boolean') || (part.thoughtSignature!==undefined && (typeof part.thoughtSignature!=='string' || part.thoughtSignature.length>65536))) return invalid();
    bytes+=Buffer.byteLength(part.text); if (bytes>65536) return invalid(); if (part.thought!==true) json+=part.text;
  }
  let diagram: FoxyDiagram; try { diagram=parseFoxyDiagram(JSON.parse(json)); } catch { return invalid(); }
  if (!diagram.nodes.length) return invalid(); return {diagram,usage:imageUsage(value.usageMetadata)};
}
