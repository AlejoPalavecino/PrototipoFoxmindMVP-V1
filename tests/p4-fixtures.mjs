import { crc32 } from 'node:zlib';
export function zip(entries) {
  const local = [], central = []; let offset = 0;
  for (const { name, bytes = Buffer.from('content'), encrypted = false, declaredSize = bytes.length } of entries) {
    const filename = Buffer.from(name); const header = Buffer.alloc(30); const index = Buffer.alloc(46);
    header.writeUInt32LE(0x04034b50); header.writeUInt16LE(20, 4); header.writeUInt16LE(encrypted ? 1 : 0, 6);
    header.writeUInt32LE(crc32(bytes), 14); header.writeUInt32LE(bytes.length, 18); header.writeUInt32LE(declaredSize, 22);
    header.writeUInt16LE(filename.length, 26);
    index.writeUInt32LE(0x02014b50); index.writeUInt16LE(20, 4); index.writeUInt16LE(20, 6);
    index.writeUInt16LE(encrypted ? 1 : 0, 8); index.writeUInt32LE(crc32(bytes), 16);
    index.writeUInt32LE(bytes.length, 20); index.writeUInt32LE(declaredSize, 24);
    index.writeUInt16LE(filename.length, 28); index.writeUInt32LE(offset, 42);
    local.push(header, filename, bytes); central.push(index, filename);
    offset += header.length + filename.length + bytes.length;
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, directory, end]);
}
export function office(ext, extra = [], transform = entries => entries) {
  const names = { docx: ['word/document.xml', 'wordprocessingml.document', '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body/></w:document>'],
    pptx: ['ppt/presentation.xml', 'presentationml.presentation', '<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>'],
    xlsx: ['xl/workbook.xml', 'spreadsheetml.sheet', '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"/>'] };
  const [part, type, xml] = names[ext];
  return zip(transform([
    { name: '[Content_Types].xml', bytes: Buffer.from(`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/${part}" ContentType="application/vnd.openxmlformats-officedocument.${type}.main+xml"/></Types>`) },
    { name: '_rels/.rels', bytes: Buffer.from(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="${part}"/></Relationships>`) },
    { name: part, bytes: Buffer.from(xml) }, ...extra,
  ]));
}
