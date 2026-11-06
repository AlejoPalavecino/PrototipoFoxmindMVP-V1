/** A minimal, standards-based DOCX. Stored ZIP entries need no browser compression
 * library; the same artifact goes through the normal upload and scanning pipeline. */
export function createTextDocument(title: string, content: string): Uint8Array {
  if ([...title].length > 200 || [...content].length > 100000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(title + content)) throw new Error('Revisá el título y el contenido del recurso.');
  const escape = (value: string) => value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]!));
  const paragraph = (value: string, heading = false) => `<w:p><w:r>${heading ? '<w:rPr><w:b/><w:sz w:val="30"/></w:rPr>' : ''}<w:t xml:space="preserve">${escape(value)}</w:t></w:r></w:p>`;
  const entries = [
    ['[Content_Types].xml','<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'],
    ['_rels/.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
    ['word/document.xml',`<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraph(title,true)}${content.split(/\r?\n/).map(line=>paragraph(line.replace(/^#{1,6}\s+/,''),/^#{1,6}\s/.test(line))).join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>`],
  ];
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
