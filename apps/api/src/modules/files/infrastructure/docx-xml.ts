import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { PlanDocumentError } from '../domain/plan-document-error.ts';

type XmlNode = Record<string, unknown>;
function collect(nodes: unknown, output: string[], depth = 0): void {
  if (depth > 100) throw new PlanDocumentError('AI_INPUT_LIMIT');
  if (!Array.isArray(nodes)) return;
  for (const node of nodes as XmlNode[]) {
    for (const [key, value] of Object.entries(node)) {
      const local = key.split(':').at(-1);
      if (local === 't' && Array.isArray(value)) {
        for (const part of value as XmlNode[]) if (typeof part['#text'] === 'string') output.push(part['#text']);
      } else if (local === 'tab') output.push('\t');
      else if (local === 'br' || local === 'cr') output.push('\n');
      else if (key !== ':@') collect(value, output, depth + 1);
      if (local === 'p' || local === 'tr') output.push('\n');
      else if (local === 'tc') output.push('\t');
    }
  }
}
export function validatedOfficeXml(bytes: Buffer): string {
  const encoding = (bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes[0] === 0x3c && bytes[1] === 0)
    ? 'utf-16le' : (bytes[0] === 0xfe && bytes[1] === 0xff) || (bytes[0] === 0 && bytes[1] === 0x3c) ? 'utf-16be' : 'utf-8';
  const xml = new TextDecoder(encoding, { fatal: true }).decode(bytes);
  if (/<!DOCTYPE|<!ENTITY/iu.test(xml) || XMLValidator.validate(xml) !== true) throw new PlanDocumentError();
  return xml;
}
export function extractDocumentText(bytes: Buffer): string {
  const xml = validatedOfficeXml(bytes);
  const parsed: unknown = new XMLParser({ preserveOrder: true, ignoreAttributes: false,
    parseTagValue: false, trimValues: false, processEntities: true }).parse(xml);
  const parts: string[] = []; collect(parsed, parts);
  const text = parts.join('').trim();
  if ([...text].length > 200_000) throw new PlanDocumentError('AI_INPUT_LIMIT');
  return text;
}
