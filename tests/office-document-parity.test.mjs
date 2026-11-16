import test from 'node:test';
import assert from 'node:assert/strict';
import { office } from './p4-fixtures.mjs';
import { parseActivityDocument } from '../apps/api/src/modules/files/infrastructure/activity-document.ts';
import { parseChatAttachmentIntent } from '../apps/api/src/modules/files/infrastructure/chat-attachment-policy.ts';
import { validateUploadIntent } from '../apps/api/src/modules/files/domain/policy.ts';

const p = 'http://schemas.openxmlformats.org/presentationml/2006/main';
const a = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const relations = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const pkg = 'http://schemas.openxmlformats.org/package/2006/relationships';
const pptx = (target = 'slides/slide2.xml') => office('pptx', [
  { name: 'ppt/_rels/presentation.xml.rels', bytes: Buffer.from(`<Relationships xmlns="${pkg}"><Relationship Id="rId2" Type="${relations}/slide" Target="${target}"/><Relationship Id="rId1" Type="${relations}/slide" Target="slides/slide1.xml"/></Relationships>`) },
  ...['Segundo', 'Primero'].map((text,index) => ({ name: `ppt/slides/slide${index+1}.xml`, bytes: Buffer.from(
    `<p:sld xmlns:p="${p}" xmlns:a="${a}"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>${text} &amp; ejemplo</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>`) })),
], entries => entries.map(entry => entry.name === 'ppt/presentation.xml'
  ? { ...entry, bytes: Buffer.from(`<p:presentation xmlns:p="${p}" xmlns:r="${relations}"><p:sldIdLst><p:sldId id="256" r:id="rId2"/><p:sldId id="257" r:id="rId1"/></p:sldIdLst></p:presentation>`) } : entry));

test('approved documents use the same 20 MB boundary for plans, library and chat', () => {
  for (const ext of ['pdf', 'doc', 'docx', 'ppt', 'pptx']) {
    for (const purpose of ['plan', 'material']) {
      assert.equal(validateUploadIntent({ purpose, name: `Archivo.${ext}`, bytes: 20_000_000 }).extension, ext);
      assert.throws(() => validateUploadIntent({ purpose, name: `Archivo.${ext}`, bytes: 20_000_001 }), { code: 'FILE_TOO_LARGE' });
    }
    assert.equal(parseChatAttachmentIntent(`Archivo.${ext}`, undefined, false).extension, ext);
  }
});

test('PPTX extracts real visible text in presentation order and rejects an external slide target', async () => {
  const result = await parseActivityDocument(pptx(), 'pptx', AbortSignal.timeout(5000));
  assert.equal(result.document.kind, 'text');
  assert.match(result.document.text, /Primero & ejemplo[\s\S]+Segundo & ejemplo/);
  await assert.rejects(parseActivityDocument(pptx('https://example.test/slide.xml'), 'pptx', AbortSignal.timeout(5000)),
    { code: 'FILE_NOT_READY' });
});
