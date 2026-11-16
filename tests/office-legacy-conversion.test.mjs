import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { inspectContent } from '../apps/api/src/modules/files/infrastructure/content.ts';
import { parseActivityDocument } from '../apps/api/src/modules/files/infrastructure/activity-document.ts';
import { parsePlanDocument } from '../apps/api/src/modules/files/infrastructure/docx-text.ts';

const enabled = process.env.FOX_TEST_LEGACY_OFFICE === '1';
const prose = 'Documento sintetico FoxMind';
const drawing = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
 xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" office:version="1.2"
 office:mimetype="application/vnd.oasis.opendocument.presentation">
 <office:body><office:presentation><draw:page draw:name="FoxMind">
  <draw:frame svg:x="1cm" svg:y="1cm" svg:width="20cm" svg:height="2cm"><draw:text-box><text:p>${prose}</text:p></draw:text-box></draw:frame>
 </draw:page></office:presentation></office:body>
</office:document>`;

function synthetic(extension) {
  const [input, filter, content] = extension === 'doc'
    ? ['txt', 'doc:MS Word 97', prose] : ['fodp', 'ppt:MS PowerPoint 97', drawing];
  const script = 'set -eu; cat > "fixture.$1"; soffice -env:UserInstallation=file:///scratch/fixture --headless --convert-to "$2" "fixture.$1" >/dev/null 2>&1; cat "fixture.$3"';
  return new Promise((resolve, reject) => {
    const child = execFile('docker', ['run', '--rm', '-i', '--pull=never', '--network=none', '--read-only',
      '--tmpfs', '/scratch:rw,size=96m,mode=1777', '--tmpfs', '/tmp:rw,size=16m,mode=1777', '--entrypoint', '/bin/sh',
      'foxmind-office-converter:local', '-c', script, 'fixture', input, filter, extension],
    { encoding: 'buffer', windowsHide: true, timeout: 15_000 }, (error, bytes) => error ? reject(error) : resolve(bytes));
    child.stdin.end(content);
  });
}

test('legacy Office validates and extracts DOC and PPT in a disposable converter', { skip: !enabled }, async () => {
  for (const [extension, mime] of [['doc', 'application/msword'], ['ppt', 'application/vnd.ms-powerpoint']]) {
    const bytes = await synthetic(extension);
    assert.equal(await inspectContent(bytes, extension), mime);
    assert.match((await parseActivityDocument(bytes, extension, AbortSignal.timeout(15_000))).document.text, new RegExp(prose));
    assert.match((await parsePlanDocument(bytes, extension)).text, new RegExp(prose));
    await assert.rejects(inspectContent(bytes, extension === 'doc' ? 'ppt' : 'doc'), { code: 'FILE_REJECTED' });
    await assert.rejects(inspectContent(bytes.subarray(0, 512), extension), { code: 'FILE_REJECTED' });
  }
});
