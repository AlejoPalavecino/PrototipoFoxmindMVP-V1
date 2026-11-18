import { PDFName, PDFNumber, PDFOperator, PDFOperatorNames, PDFString, StandardFonts, endMarkedContent,
  beginMarkedContent, type PDFArray, type PDFDict, type PDFDocument, type PDFFont, type PDFPage, type PDFRef } from 'pdf-lib';
import { resourceBlocks, resourceInlineRuns } from '../../../../../../../src/core/domain/documents/resource-markdown.ts';

type Layout = {
  margin: number; pageWidth: number; pageHeight: number; maxPages: number;
  wrapLine: (text: string, font: PDFFont, fontSize: number, maxWidth: number) => string[];
};

type Element = { ref: PDFRef; kids: PDFArray; role: PDFName };
const pdfName = PDFName.of;

function pdfText(value: string): string {
  const alternatives: Record<string, string> = { '→': '->', '←': '<-', '−': '-', '≤': '<=', '≥': '>=', '≠': '!=' };
  return value.replace(/[→←−≤≥≠]/gu, character => alternatives[character]!);
}

export async function drawTaggedResource(document: PDFDocument, regular: PDFFont,
  resource: { title: string; markdown: string }, signal: AbortSignal, layout: Layout): Promise<void> {
  const { context } = document;
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const rootKids = context.obj([]) as PDFArray;
  const parentTree = context.obj([]) as PDFArray;
  const structure = context.obj({
    Type: 'StructTreeRoot', K: rootKids, RoleMap: { Title: 'H' }, ParentTree: { Nums: parentTree },
  }) as PDFDict;
  const structureRef = context.register(structure);
  document.catalog.set(pdfName('StructTreeRoot'), structureRef);
  document.catalog.set(pdfName('MarkInfo'), context.obj({ Marked: true }));
  document.catalog.set(pdfName('Lang'), PDFString.of('es'));
  document.catalog.getOrCreateViewerPreferences().setDisplayDocTitle(true);
  document.setTitle(resource.title);

  function element(role: string, parent: Pick<Element, 'ref'|'kids'>): Element {
    const kids = context.obj([]) as PDFArray;
    const ref = context.register(context.obj({ Type: 'StructElem', S: role, P: parent.ref, K: kids }));
    parent.kids.push(ref);
    return { ref, kids, role: pdfName(role) };
  }
  const root = element('Document', { ref: structureRef, kids: rootKids });
  const { margin, pageWidth, pageHeight, maxPages, wrapLine } = layout;
  let current: { page: PDFPage; parents: PDFArray } | undefined;
  let y = 0;
  function ensurePage(needed = 0) {
    if (!current || y - needed < margin) {
      const index = document.getPageCount();
      if (index >= maxPages) throw Object.assign(new Error('AI_INPUT_LIMIT'), { code: 'AI_INPUT_LIMIT' });
      const page = document.addPage([pageWidth, pageHeight]);
      const parents = context.obj([]) as PDFArray;
      page.node.set(pdfName('StructParents'), PDFNumber.of(index));
      page.node.set(pdfName('Tabs'), pdfName('S'));
      parentTree.push(PDFNumber.of(index));
      parentTree.push(parents);
      current = { page, parents };
      y = pageHeight - margin;
    }
    return current;
  }
  function draw(value: string, semantic: Element, pageState: ReturnType<typeof ensurePage>, x: number, size: number, font: PDFFont) {
    const { page, parents } = pageState;
    const mcid = parents.size();
    parents.push(semantic.ref);
    semantic.kids.push(context.obj({ Type: 'MCR', Pg: page.ref, MCID: mcid }));
    page.pushOperators(PDFOperator.of(PDFOperatorNames.BeginMarkedContentSequence, [semantic.role, context.obj({ MCID: mcid }).toString()]));
    page.drawText(value, { x, y, size, font });
    page.pushOperators(endMarkedContent());
  }
  function block(value: string, semantic: Element, { size = 11, lineHeight = 16, indent = 0, font = regular, keepNext = 0, marker }:
    { size?: number; lineHeight?: number; indent?: number; font?: PDFFont; keepNext?: number; marker?: { text: string; element: Element } } = {}) {
    const x = margin + indent;
    const lines = wrapLine(pdfText(value), font, size, pageWidth - margin - x);
    const blockHeight = (lines.length - 1) * lineHeight + keepNext;
    if (keepNext && blockHeight < pageHeight - margin * 2) ensurePage(blockHeight);
    for (const [index, line] of lines.entries()) {
      const pageState = ensurePage();
      if (marker && index === 0) draw(marker.text, marker.element, pageState, x - 24, size, font);
      if (line) draw(line, semantic, pageState, x, size, font);
      y -= lineHeight;
    }
  }

  for (const [index, line] of resource.title.split('\n').entries()) {
    block(line, element(index === 0 ? 'Title' : 'H', root), { size: 21, lineHeight: 26, font: bold, keepNext: 20 });
  }
  y -= 5;
  let list: Element | undefined;
  for (const item of resourceBlocks(resource.markdown)) {
    signal.throwIfAborted();
    if (item.kind !== 'list') list = undefined;
    const text = resourceInlineRuns(item.text).map(run => run.text).join('');
    if (item.kind === 'blank') {
      y -= 9;
    } else if (item.kind === 'divider') {
      if (y >= margin) {
        const { page } = ensurePage();
        page.pushOperators(beginMarkedContent('Artifact'));
        page.drawLine({start:{x:margin,y:y+3},end:{x:pageWidth-margin,y:y+3},thickness:0.5,opacity:0.5});
        page.pushOperators(endMarkedContent());
        y -= 10;
      }
    } else if (item.kind === 'heading') {
      block(text, element('H' + item.level, root), { size: item.level === 1 ? 15 : 13, lineHeight: 20, font: bold, keepNext: 27 });
    } else if (item.kind === 'list') {
      list ??= element('L', root);
      const listItem = element('LI', list);
      const marker = { text: /^\d/u.test(item.marker) ? item.marker : '•', element: element('Lbl', listItem) };
      block(text, element('LBody', listItem), { indent: 26 + Math.min(48, item.indent * 4), marker });
    } else {
      block(text, element('P', root));
    }
  }
  structure.set(pdfName('ParentTreeNextKey'), PDFNumber.of(document.getPageCount()));
}
