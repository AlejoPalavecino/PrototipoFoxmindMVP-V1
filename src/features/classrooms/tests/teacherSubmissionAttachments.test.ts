import assert from 'node:assert/strict';
import { test } from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TeacherActivityDetail } from '../../../components/aulas/TeacherActivityDetail';
import { TeacherGradingDrawer } from '../../../components/aulas/TeacherGradingDrawer';
import type { Submission } from '../model/Submission';
import { createSubmissionFixtures } from '../data/submissionFixtures';
import { selectSubmissionAttachments } from '../application/submissionAttachments';
import {
  getTeacherSubmissionAttachments, downloadTeacherSubmissionAttachment, type SubmissionDownloadPorts,
} from '../application/teacherSubmissionAttachments';

const submission = (): Submission => ({ ...createSubmissionFixtures()[1],
  attachments: selectSubmissionAttachments([], [
    new File([new Uint8Array([0, 255, 1])], 'Duplicado.txt'),
    new File(['otro contenido'], 'Duplicado.txt'),
    new File(['tercero'], 'Ultimo.PDF'),
  ]).attachments,
});
const screens = {
  table: (sub: Submission) => renderToStaticMarkup(React.createElement(TeacherActivityDetail, {
    activity: { title: 'Ensayo' }, submissions: [sub], setSubmissions: () => {}, onBack: () => {},
  })),
  drawer: (sub: Submission) => renderToStaticMarkup(React.createElement(TeacherGradingDrawer, {
    activity: { title: 'Ensayo' }, submission: sub, onClose: () => {}, onSave: () => {},
  })),
};

for (const [name, render] of Object.entries(screens)) {
  test(`${name}: every attachment is visible in order with independently named controls`, () => {
    const html = render(submission());
    const labels = [...html.matchAll(/aria-label="(Descargar archivo[^"]+)"/g)].map(match => match[1]);
    assert.equal(labels.length, 3);
    assert.match(labels[0], /1: Duplicado.txt/);
    assert.match(labels[1], /2: Duplicado.txt/);
    assert.match(labels[2], /3: Ultimo.PDF/);
    assert.equal(new Set(labels).size, 3);
    assert.doesNotMatch(html, /Verificado/);
  });

  test(`${name}: text-only submissions have no invented attachment or download`, () => {
    const html = render({ ...createSubmissionFixtures()[1], attachments: [], content: 'Solo texto' });
    assert.match(html, /Sin archivos adjuntos/);
    assert.doesNotMatch(html, /Descargar|Entrega_.*\.pdf|1\.4 MB|Verificado/);
    assert.match(html, /Solo texto|Corregir entrega/);
  });

  test(`${name}: legacy metadata is explicitly unavailable, without an original-download control`, () => {
    const html = render({ ...createSubmissionFixtures()[1], attachedFile: { name: 'Fixture.pdf', size: '1 MB', type: 'PDF' } });
    assert.match(html, /Fixture.pdf/);
    assert.match(html, /Archivo original no disponible.*simulados/);
    assert.doesNotMatch(html, /Descargar|Verificado/);
  });
}

function downloadHarness(throws = false) {
  const blobs: File[] = [], clicks: Array<{ url: string; name: string }> = [], revoked: string[] = [], cleanup: Array<() => void> = [];
  const ports: SubmissionDownloadPorts = {
    createObjectURL: file => { blobs.push(file); return `blob:session/${blobs.length}`; },
    triggerDownload: (url, name) => { if (throws) throw new Error('Click failed'); clicks.push({ url, name }); },
    revokeObjectURL: url => { revoked.push(url); },
    deferCleanup: callback => { cleanup.push(callback); },
  };
  return { ports, blobs, clicks, revoked, cleanup };
}

test('downloads use exact File identities, names and distinct bytes; cleanup follows dispatch', async () => {
  const sub = submission();
  const attachments = getTeacherSubmissionAttachments(sub);
  assert.deepEqual(attachments, sub.attachments);
  const host = downloadHarness();
  for (const attachment of attachments) assert.equal(downloadTeacherSubmissionAttachment(attachment, host.ports), true);
  assert.deepEqual(host.blobs, sub.attachments!.map(item => item.file));
  assert.deepEqual(host.clicks.map(item => item.name), ['Duplicado.txt', 'Duplicado.txt', 'Ultimo.PDF']);
  assert.deepEqual(await Promise.all(host.blobs.map(async file => [...new Uint8Array(await file.arrayBuffer())])),
    [[0, 255, 1], [...new TextEncoder().encode('otro contenido')], [...new TextEncoder().encode('tercero')]]);
  assert.deepEqual(host.revoked, [], 'Do not revoke before browser dispatch can consume the URL');
  host.cleanup.forEach(cleanup => cleanup());
  assert.deepEqual(host.revoked, host.clicks.map(item => item.url));
});

test('text-only and metadata-only inputs never create fake bytes, and failed dispatch releases its URL', () => {
  const metadata = { name: 'Fixture.pdf', size: '1 MB', type: 'PDF' };
  const base = createSubmissionFixtures()[1];
  assert.deepEqual(getTeacherSubmissionAttachments(base), []);
  assert.deepEqual(getTeacherSubmissionAttachments({ ...base, attachedFile: metadata }), [metadata]);
  assert.deepEqual(getTeacherSubmissionAttachments({ ...base, attachments: [], attachedFile: metadata }), [], 'Canonical empty list wins over stale compatibility projection');
  const host = downloadHarness();
  assert.equal(downloadTeacherSubmissionAttachment(metadata, host.ports), false);
  assert.deepEqual(host.blobs, []);
  assert.deepEqual(host.clicks, []);
  const failed = downloadHarness(true);
  assert.throws(() => downloadTeacherSubmissionAttachment(submission().attachments![0], failed.ports), /Click failed/);
  assert.deepEqual(failed.revoked, ['blob:session/1']);
  assert.deepEqual(failed.cleanup, []);
});
