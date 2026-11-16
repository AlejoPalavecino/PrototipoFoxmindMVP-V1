import { XMLParser } from 'fast-xml-parser';
import { extractDocumentText, validatedOfficeXml } from './docx-xml.ts';
import { readOfficeParts } from './docx-archive.ts';
import { PlanDocumentError } from '../domain/plan-document-error.ts';

const relations = ['http://schemas.openxmlformats.org/officeDocument/2006/relationships',
  'http://purl.oclc.org/ooxml/officeDocument/relationships'];
const presentation = 'ppt/presentation.xml', slideRelations = 'ppt/_rels/presentation.xml.rels';
const slidePath = /^ppt\/slides\/[A-Za-z0-9_.-]+\.xml$/u;

function part(bytes: Buffer | undefined) {
  if (!bytes?.length) throw new PlanDocumentError();
  const text = validatedOfficeXml(bytes);
  return new XMLParser({ removeNSPrefix: false, ignoreAttributes: false, parseAttributeValue: false,
    processEntities: false }).parse(text) as Record<string, unknown>;
}

type Xml = Record<string, unknown>;
function children(parent: Xml, name: string): Xml[] {
  const values = Object.entries(parent).filter(([tag]) => !tag.startsWith('@_') && tag.split(':').at(-1) === name).map(([, value]) => value);
  return values.flat().filter((value): value is Xml => Boolean(value && typeof value === 'object' && !Array.isArray(value)));
}

export async function presentationText(bytes: Buffer) {
  const parts = await readOfficeParts(bytes, path => path === presentation || path === slideRelations || slidePath.test(path));
  const [root] = children(part(parts.get(presentation)), 'presentation');
  if (!root) throw new PlanDocumentError();
  const [list] = children(root, 'sldIdLst');
  if (!list) return '';
  const ids = children(list, 'sldId').map(slide => {
    const reference = Object.entries(slide).find(([key]) => key.startsWith('@_') && key.endsWith(':id'))?.[1];
    if (typeof reference !== 'string' || !reference) throw new PlanDocumentError();
    return reference;
  });
  if (ids.length > 200) throw new PlanDocumentError('AI_INPUT_LIMIT');
  if (new Set(ids).size !== ids.length) throw new PlanDocumentError();
  const [relRoot] = children(part(parts.get(slideRelations)), 'Relationships');
  if (!relRoot) throw new PlanDocumentError();
  const slides = new Map<string, string>();
  for (const entry of children(relRoot, 'Relationship')) {
    if (!relations.some(base => entry['@_Type'] === `${base}/slide`)) continue;
    const id = entry['@_Id'], target = entry['@_Target'];
    const path = typeof target === 'string' && target.startsWith('/') ? target.slice(1) : `ppt/${target}`;
    if (typeof id !== 'string' || slides.has(id) || ![undefined, 'Internal'].includes(entry['@_TargetMode'] as string | undefined)
      || !slidePath.test(path)) throw new PlanDocumentError();
    slides.set(id, path);
  }
  let size = 0;
  const text = ids.map(id => {
    const slide = parts.get(slides.get(id) ?? '');
    if (!slide || !children(part(slide), 'sld').length) throw new PlanDocumentError();
    const content = extractDocumentText(slide);
    size += content.length + 2;
    if (size > 200_000) throw new PlanDocumentError('AI_INPUT_LIMIT');
    return content;
  }).filter(Boolean);
  return text.join('\n\n');
}
