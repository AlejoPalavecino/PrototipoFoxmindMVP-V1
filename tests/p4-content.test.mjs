import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import { inspectContent } from '../apps/api/src/modules/files/custody/infrastructure/content.ts';
import { zip, office } from './p4-fixtures.mjs';

test('valid PDF, OOXML, PNG, JPEG and ordinary ZIP are inspected without execution', async () => {
  const pdf = await PDFDocument.create(); pdf.addPage();
  assert.equal(await inspectContent(Buffer.from(await pdf.save()), 'pdf'), 'application/pdf');
  for (const ext of ['docx', 'pptx', 'xlsx']) assert.match(await inspectContent(office(ext), ext), /openxmlformats/);
  const strict = office('docx', [], entries => entries.map(entry => ({ ...entry, bytes: Buffer.from(entry.bytes.toString()
    .replace('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'http://purl.oclc.org/ooxml/wordprocessingml/main')
    .replace('http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument', 'http://purl.oclc.org/ooxml/officeDocument/relationships/officeDocument')) })));
  assert.match(await inspectContent(strict, 'docx'), /openxmlformats/);
  const prefixed = office('docx', [], entries => entries.map(entry => ({ ...entry, bytes: Buffer.from(entry.bytes.toString()
    .replace('<Types xmlns=', '<ct:Types xmlns:ct=').replace('</Types>', '</ct:Types>').replace('<Override ', '<ct:Override ')
    .replace('<Relationships xmlns=', '<r:Relationships xmlns:r=').replace('</Relationships>', '</r:Relationships>').replace('<Relationship ', '<r:Relationship ')) })));
  assert.match(await inspectContent(prefixed, 'docx'), /openxmlformats/);
  const image = sharp({ create: { width: 2, height: 2, channels: 3, background: 'white' } });
  assert.equal(await inspectContent(await image.clone().png().toBuffer(), 'png'), 'image/png');
  assert.equal(await inspectContent(await image.clone().jpeg().toBuffer(), 'jpg'), 'image/jpeg');
  assert.equal(await inspectContent(zip([{ name: 'notes.txt' }]), 'zip'), 'application/zip');
});
test('renaming content and malformed PDF/image/Office do not satisfy validation', async () => {
  for (const [bytes, ext] of [[Buffer.from('plain text'), 'pdf'], [office('xlsx'), 'docx'],
    [Buffer.from('%PDF-1.7\n%%EOF'), 'pdf'], [Buffer.from('89504e470d0a1a0a', 'hex'), 'png'],
    [zip([{ name: 'a.txt' }]), 'docx']]) {
    await assert.rejects(inspectContent(bytes, ext), { code: 'FILE_REJECTED' });
  }
});
test('encrypted archives, traversal paths, duplicate entries and dishonest sizes are rejected', async () => {
  for (const entries of [[{ name: 'private.txt', encrypted: true }], [{ name: '../escape' }],
    [{ name: 'same' }, { name: 'same' }], [{ name: 'bad', declaredSize: 200_000_001 }]]) {
    await assert.rejects(inspectContent(zip(entries), 'zip'), { code: 'FILE_REJECTED' });
  }
});
test('macro payloads and XML entities cannot hide inside an OOXML document', async () => {
  for (const extra of [[{ name: 'word/vbaProject.bin' }],
    [{ name: 'word/extra.xml', bytes: Buffer.from('<!DOCTYPE a [<!ENTITY x "secret">]><a>&x;</a>') }]]) {
    await assert.rejects(inspectContent(office('docx', extra), 'docx'), { code: 'FILE_REJECTED' });
  }
});
test('nested encrypted or excessive archive depth never passes outer ZIP validation', async () => {
  await assert.rejects(inspectContent(zip([{ name: 'inner.zip', bytes: zip([{ name: 'hidden', encrypted: true }]) }]), 'zip'), { code: 'FILE_REJECTED' });
  let bytes = zip([{ name: 'file.txt' }]);
  for (let n = 0; n < 6; n++) bytes = zip([{ name: 'nested.zip', bytes }]);
  await assert.rejects(inspectContent(bytes, 'zip'), { code: 'FILE_REJECTED' });
});
test('Office structural parts require real XML namespaces and exact document relationship types', async () => {
  for (const [part, from, to] of [
    ['word/document.xml', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'urn:forged:word'],
    ['[Content_Types].xml', 'http://schemas.openxmlformats.org/package/2006/content-types', 'urn:forged:types'],
    ['_rels/.rels', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument', 'urn:forged/officeDocument'],
    ['[Content_Types].xml', '<Override ', '<Override xmlns="urn:forged" '],
    ['_rels/.rels', '<Relationship ', '<Relationship xmlns="urn:forged" '],
    ['_rels/.rels', '<Relationship ', '<foreign:Relationship xmlns:foreign="urn:forged" '],
  ]) {
    const bytes = office('docx', [], entries => entries.map(entry => entry.name === part
      ? { ...entry, bytes: Buffer.from(entry.bytes.toString().replace(from, to)) } : entry));
    await assert.rejects(inspectContent(bytes, 'docx'), { code: 'FILE_REJECTED' });
  }
});
test('macro-related prose is allowed while actual package macro metadata remains rejected', async () => {
  const prose = office('docx', [], entries => entries.map(entry => entry.name === 'word/document.xml'
    ? { ...entry, bytes: Buffer.from(entry.bytes.toString().replace('<w:body/>', '<w:body><w:p><w:r><w:t>macroEnabled and vbaProject are tutorial terms</w:t></w:r></w:p></w:body>')) } : entry));
  assert.match(await inspectContent(prose, 'docx'), /openxmlformats/);
  const typedMacro = office('docx', [{ name: 'word/payload.bin' }], entries => entries.map(entry => entry.name === '[Content_Types].xml'
    ? { ...entry, bytes: Buffer.from(entry.bytes.toString().replace('</Types>', '<Override PartName="/word/payload.bin" ContentType="application/vnd.ms-office.vbaProject"/></Types>')) } : entry));
  await assert.rejects(inspectContent(typedMacro, 'docx'), { code: 'FILE_REJECTED' });
  const relatedMacro = office('docx', [{ name: 'word/_rels/document.xml.rels', bytes: Buffer.from('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="m1" Type="http://schemas.microsoft.com/office/2006/relationships/vbaProject" Target="payload.bin"/></Relationships>') }]);
  await assert.rejects(inspectContent(relatedMacro, 'docx'), { code: 'FILE_REJECTED' });
});
