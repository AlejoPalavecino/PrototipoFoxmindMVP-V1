import { randomBytes, webcrypto } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { office } from '../tests/p4-fixtures.mjs';
import { upload } from '../tests/p6-integration-helpers.mjs';

// Synthetic setup through real P3/P4/P5/P6 endpoints. Password only in ignored fixture.
export async function seedActivityLive({ origin, inbox, directory }) {
  const password = `Activity fixture ${randomBytes(12).toString('hex')}`;
  function actor() {
    const cookies = new Map();
    const request = async (path, options = {}) => {
      const headers = new Headers(options.headers); headers.set('origin', origin);
      headers.set('cookie', [...cookies].map(([key, value]) => `${key}=${value}`).join('; '));
      const response = await fetch(new URL(path, origin), { ...options, headers });
      for (const cookie of response.headers.getSetCookie()) { const pair = cookie.split(';')[0], split = pair.indexOf('='); cookies.set(pair.slice(0, split), pair.slice(split + 1)); }
      return response;
    };
    return { request, evaluate: (fn, argument) => new Function('fetch', 'crypto', 'argument', `return (${fn.toString()})(argument)`)(request, webcrypto, argument) };
  }
  async function call(person, method, path, body, retried = false) {
    const headers = { 'content-type': 'application/json' };
    if (method !== 'GET') headers['x-csrf-token'] = (await (await person.request('/api/v1/auth/csrf')).json()).csrfToken;
    const response = await person.request(`/api/v1${path}`, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) });
    if (response.status === 429 && !retried) {
      const seconds = Number(response.headers.get('retry-after'));
      if (!(seconds > 0 && seconds <= 60)) throw new Error('Invalid fixture retry deadline');
      await delay(seconds * 1000); return call(person, method, path, body, true);
    }
    if (!response.ok) throw new Error(`Synthetic setup ${method} ${path}: ${response.status}`);
    return response.status === 204 ? null : response.json();
  }
  async function register(firstName, email, accountRole) {
    const person = actor();
    await call(person, 'POST', '/auth/register', { firstName, lastName: 'Demo', email, password, accountRole });
    await call(person, 'POST', '/auth/login', { email, password });
    let token;
    for (let index = 0; index < 70 && !token; index++) {
      const messages = await (await fetch(`${inbox}/api/v1/messages`)).json();
      for (const item of messages.messages.filter(item => item.To.some(to => to.Address === email))) {
        const detail = await (await fetch(`${inbox}/api/v1/message/${item.ID}`)).json();
        token = /verify-email#token=([A-Za-z0-9_-]{43})/.exec(detail.Text)?.[1]; if (token) break;
      }
      if (!token) await delay(100);
    }
    if (!token) throw new Error('Synthetic verification capture unavailable');
    await call(person, 'POST', '/auth/email-verification/confirm', { token }); return person;
  }
  const teacherEmail = 'docente-actividades@example.test', studentEmail = 'estudiante-actividades@example.test';
  const teacher = await register('Lucía', teacherEmail, 'teacher'), student = await register('Marina', studentEmail, 'student');
  const pdf = await PDFDocument.create(), page = pdf.addPage(), font = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText('Unidad: La luz\nExposicion: luz acumulada durante un intervalo.\nUna mayor apertura deja entrar mas luz.\nEl contraste es la diferencia entre zonas claras y oscuras.', { x: 40, y: 740, font, size: 14, lineHeight: 24 });
  const pdfBytes = Buffer.from(await pdf.save());
  const xml = '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Exposición: luz acumulada durante un intervalo. Una mayor apertura deja entrar más luz. El contraste es la diferencia entre zonas claras y oscuras.</w:t></w:r></w:p></w:body></w:document>';
  const docxBytes = office('docx', [], entries => entries.map(entry => entry.name === 'word/document.xml' ? { ...entry, bytes: Buffer.from(xml) } : entry));
  const pdfPath = resolve(directory, 'luz.pdf'), docxPath = resolve(directory, 'luz.docx');
  await writeFile(pdfPath, pdfBytes); await writeFile(docxPath, docxBytes);
  const draft = await call(teacher, 'POST', '/classrooms/drafts', {});
  const plan = await upload(teacher, { kind: 'draft', id: draft.id }, pdfBytes, 'plan', 'luz.pdf');
  const saved = await call(teacher, 'PATCH', `/classrooms/drafts/${draft.id}`, { revision: draft.revision,
    payload: { name: 'Fotografía y luz', subject: 'Fotografía', division: 'A', academicYear: 2026, timezone: 'UTC', coverKey: 'explore',
      planFileId: plan.id, units: [{ name: 'La luz', topics: [{ name: 'Exposición' }, { name: 'Contraste' }] }] } });
  const room = await call(teacher, 'POST', `/classrooms/drafts/${draft.id}/publish`, { revision: saved.revision });
  const preview = await call(student, 'POST', '/classrooms/codes/preview', { code: room.code });
  await call(student, 'POST', '/classrooms/codes/confirm', { confirmation: preview.confirmation });
  const detail = () => call(teacher, 'GET', `/classrooms/${room.id}`), current = await detail();
  const material = await upload(teacher, { kind: 'classroom', id: room.id }, docxBytes, 'material', 'luz.docx');
  await call(teacher, 'POST', `/classrooms/${room.id}/library`, { revision: (await detail()).revision,
    operation: { action: 'publish', title: 'Apuntes de exposición', fileId: material.id, unitId: current.units[0].id, topicId: current.units[0].topics[0].id } });
  return { teacherEmail, studentEmail, password, roomId: room.id, pdfPath, docxPath };
}
