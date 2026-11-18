import { resourceBlocks, resourceInlineRuns, type InlineRun } from './resource-markdown.ts';

const relationshipNamespace = 'http://schemas.openxmlformats.org/package/2006/relationships';
const relationshipType = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const wordNamespace = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml';
const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
const escape = (value: string) => value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]!));

function validateDocument(title: string, content: string): void {
  if ([...title].length > 200 || [...content].length > 100000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(title + content))
    throw new Error('Revisá el título y el contenido del recurso.');
}

/** A minimal, standards-based DOCX. Stored ZIP entries need no browser compression
 * library; the same artifact goes through the normal upload and scanning pipeline. */
export function createTextDocument(title: string, content: string): Uint8Array {
  validateDocument(title, content);
  const paragraph = (value: string, heading = false) => `<w:p><w:r>${heading ? '<w:rPr><w:b/><w:sz w:val="30"/></w:rPr>' : ''}<w:t xml:space="preserve">${escape(value)}</w:t></w:r></w:p>`;
  const entries = [
    ['[Content_Types].xml','<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'],
    ['_rels/.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
    ['word/document.xml',`<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraph(title,true)}${content.split(/\r?\n/).map(line=>paragraph(line.replace(/^#{1,6}\s+/,''),/^#{1,6}\s/.test(line))).join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>`],
  ];
  return encodeStoredZip(entries);
}

/** Downloads use document styles and list numbering. The upload builder above
 * retains the historical bytes used by Biblioteca to identify a file. */
export function createResourceDocument(title: string, markdown: string): Uint8Array {
  validateDocument(title, markdown);
  const numbering: { id: number; ordered: boolean; start: number }[] = [];
  let list: (typeof numbering)[number] | undefined;
  const paragraphs = resourceBlocks(markdown).map(block => {
    if (block.kind !== 'list') list = undefined;
    if (block.kind === 'blank') return '';
    const runs = resourceInlineRuns(block.text);
    if (block.kind === 'heading') return resourceParagraph(runs, '<w:pStyle w:val="Heading' + block.level + '"/>');
    if (block.kind === 'divider') return resourceParagraph([], '<w:pBdr><w:bottom w:val="single" w:sz="4" w:space="1" w:color="A0A0A0"/></w:pBdr>');
    if (block.kind === 'list') {
      const ordered = /^\d/u.test(block.marker);
      if (list?.ordered !== ordered) {
        list = { id: numbering.length + 1, ordered, start: ordered ? Math.min(32767, Number.parseInt(block.marker, 10)) : 1 };
        numbering.push(list);
      }
      const extraIndent = Math.min(1440, block.indent * 120);
      return resourceParagraph(runs, '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="' + list.id + '"/></w:numPr>'
        + '<w:ind w:left="' + (480 + extraIndent) + '" w:hanging="240"/>');
    }
    return resourceParagraph(runs);
  }).join('');
  const styles = [1, 2, 3, 4, 5, 6].map(level => '<w:style w:type="paragraph" w:styleId="Heading' + level + '">'
    + '<w:name w:val="heading ' + level + '"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr>'
    + '<w:keepNext/><w:spacing w:before="220" w:after="110"/><w:outlineLvl w:val="' + (level - 1) + '"/></w:pPr>'
    + '<w:rPr><w:b/><w:sz w:val="' + (level === 1 ? 28 : 24) + '"/></w:rPr></w:style>').join('');
  const stylesXml = xmlHeader + '<w:styles xmlns:w="' + wordNamespace + '"><w:docDefaults><w:rPrDefault><w:rPr>'
    + '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/><w:lang w:val="es"/></w:rPr></w:rPrDefault>'
    + '<w:pPrDefault><w:pPr><w:spacing w:after="120"/></w:pPr></w:pPrDefault></w:docDefaults>'
    + '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>'
    + '<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/>'
    + '<w:pPr><w:keepNext/><w:spacing w:after="220"/></w:pPr><w:rPr><w:b/><w:sz w:val="36"/></w:rPr></w:style>'
    + styles + '</w:styles>';
  const numberingXml = xmlHeader + '<w:numbering xmlns:w="' + wordNamespace + '">'
    + [false, true].map((ordered, id) => '<w:abstractNum w:abstractNumId="' + id + '"><w:multiLevelType w:val="singleLevel"/>'
      + '<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="' + (ordered ? 'decimal' : 'bullet')
      + '"/><w:lvlText w:val="' + (ordered ? '%1.' : '•') + '"/><w:lvlJc w:val="left"/></w:lvl></w:abstractNum>').join('')
    + numbering.map(({id,ordered,start}) => '<w:num w:numId="' + id + '"><w:abstractNumId w:val="' + Number(ordered) + '"/>'
      + '<w:lvlOverride w:ilvl="0"><w:startOverride w:val="' + start + '"/></w:lvlOverride></w:num>').join('')
    + '</w:numbering>';
  const types = [['document','document.main'], ['styles','styles'], ['numbering','numbering']];
  const parts = types.map(([part, type]) => '<Override PartName="/word/' + part + '.xml" ContentType="' + contentType + '.' + type + '+xml"/>').join('');
  const relationships = ['styles','numbering'].map((part, index) => '<Relationship Id="rId' + (index + 1)
    + '" Type="' + relationshipType + '/' + part + '" Target="' + part + '.xml"/>').join('');
  return encodeStoredZip([
    ['[Content_Types].xml', xmlHeader + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' + parts + '</Types>'],
    ['_rels/.rels', xmlHeader + '<Relationships xmlns="' + relationshipNamespace + '"><Relationship Id="rId1" Type="'
      + relationshipType + '/officeDocument" Target="word/document.xml"/></Relationships>'],
    ['word/_rels/document.xml.rels', xmlHeader + '<Relationships xmlns="' + relationshipNamespace + '">' + relationships + '</Relationships>'],
    ['word/styles.xml', stylesXml],
    ['word/numbering.xml', numberingXml],
    ['word/document.xml', xmlHeader + '<w:document xmlns:w="' + wordNamespace + '"><w:body>'
      + resourceParagraph([{text:title,style:'plain'}], '<w:pStyle w:val="Title"/>') + paragraphs
      + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>'],
  ]);
}

function resourceParagraph(runs: InlineRun[], properties = ''): string {
  const formatting = {
    plain: '', bold: '<w:b/>', italic: '<w:i/>', code: '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>',
  };
  return '<w:p>' + (properties ? '<w:pPr>' + properties + '</w:pPr>' : '')
    + runs.map(({style,text}) => '<w:r>' + (formatting[style] ? '<w:rPr>' + formatting[style] + '</w:rPr>' : '')
      + '<w:t xml:space="preserve">' + escape(text) + '</w:t></w:r>').join('') + '</w:p>';
}

function encodeStoredZip(entries: string[][]): Uint8Array {
  const encoder = new TextEncoder(), parts: Uint8Array[] = [], central: Uint8Array[] = [];
  let offset = 0;
  for (const [path,text] of entries) {
    const name=encoder.encode(path), data=encoder.encode(text), crc=crc32(data), header=new Uint8Array(30+name.length), view=new DataView(header.buffer);
    view.setUint32(0,0x04034b50,true);view.setUint16(4,20,true);view.setUint16(6,0x800,true);view.setUint32(14,crc,true);view.setUint32(18,data.length,true);view.setUint32(22,data.length,true);view.setUint16(26,name.length,true);header.set(name,30);
    const record=new Uint8Array(46+name.length), v=new DataView(record.buffer);
    v.setUint32(0,0x02014b50,true);v.setUint16(4,20,true);v.setUint16(6,20,true);v.setUint16(8,0x800,true);v.setUint32(16,crc,true);v.setUint32(20,data.length,true);v.setUint32(24,data.length,true);v.setUint16(28,name.length,true);v.setUint32(42,offset,true);record.set(name,46);
    parts.push(header,data);central.push(record);offset+=header.length+data.length;
  }
  const end=new Uint8Array(22), v=new DataView(end.buffer), centralSize=central.reduce((sum,part)=>sum+part.length,0);
  v.setUint32(0,0x06054b50,true);v.setUint16(8,entries.length,true);v.setUint16(10,entries.length,true);v.setUint32(12,centralSize,true);v.setUint32(16,offset,true);
  const output=new Uint8Array(offset+centralSize+end.length);let at=0;for(const part of [...parts,...central,end]){output.set(part,at);at+=part.length;}return output;
}
function crc32(bytes: Uint8Array): number {
  let crc=0xffffffff;
  for(const byte of bytes){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  return (crc^0xffffffff)>>>0;
}
