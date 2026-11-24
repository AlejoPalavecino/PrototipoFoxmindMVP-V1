import { readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomBytes } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import { withP4IntegrationRuntime } from '../scripts/p4-integration-runtime.mjs';
import { account, api, digest } from './p4-integration-helpers.mjs';
import { selectClassroomSection } from './p9-journey-helpers-current.mjs';
import { openClassroom } from './p6-integration-helpers.mjs';

async function domainSnapshot(db) {
  const data = [];
  for (const table of ['classroom_drafts', 'classrooms', 'enrollments', 'membership_periods', 'invitations', 'classroom_codes', 'units', 'topics', 'files', 'uploads']) {
    data.push((await db.query(`SELECT row_to_json(t)::text AS data FROM ${table} t ORDER BY id`)).rows);
  }
  data.push((await db.query('SELECT row_to_json(t)::text AS data FROM file_custodies t ORDER BY file_id')).rows);
  return digest(JSON.stringify(data));
}
async function invitationMessage(inbox, email, id) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const messages = await (await fetch(`${inbox}/api/v1/messages`)).json();
    for (const message of messages.messages.filter(item => item.To.some(to => to.Address === email))) {
      const detail = await (await fetch(`${inbox}/api/v1/message/${message.ID}`)).json();
      const link = /http:\/\/127\.0\.0\.1:\d+\/mis-aulas\?invitacion=[a-f0-9-]{36}/i.exec(detail.Text)?.[0];
      if (link && new URL(link).searchParams.get('invitacion') === id) return link;
    }
    await delay(100);
  }
  throw new Error('Actual captured invitation email unavailable');
}

test('P5 actual Next, P3 identity and P4 private services integrated journeys', { timeout: 330000 }, async t => {
  await withP4IntegrationRuntime(async runtime => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const studentContext = await browser.newContext();
    const recipientContext = await browser.newContext();
    const guestContext = await browser.newContext();
    const page = await context.newPage(), studentPage = await studentContext.newPage();
    const recipientPage = await recipientContext.newPage(), guest = await guestContext.newPage();
    const errors = []; for (const current of [page, studentPage, recipientPage]) current.on('pageerror', error => errors.push(error.message));
    const { origin, inbox } = runtime; let db = runtime.db;
    const suffix = Date.now(), recipientEmail = `p5-late-${suffix}@example.test`;
    let teacher, student, recipient, draft, room, file, code, invitation;
    const pdf = await PDFDocument.create(); pdf.addPage(); pdf.setSubject(randomBytes(17000).toString('hex'));
    const bytes = Buffer.from(await pdf.save()); assert.ok(bytes.length > 16384);
    let failed = false;
    const check = (name, operation) => t.test(name, { skip: failed ? 'Prior shared journey failed' : false }, async () => {
      try { await operation(); } catch (error) { failed = true; throw error; }
    });
    const rejectSame = async operation => {
      const before = await domainSnapshot(db), result = await operation();
      assert.ok(result.status >= 400, 'Rejected command must not report success');
      assert.equal(await domainSnapshot(db), before, 'Denied command leaves classroom/file data unchanged');
      return result;
    };
    try {
      await check('real registration, verification and session gates, no fixture actor', async () => {
        await guest.goto(`${origin}/mis-aulas`);
        await guest.waitForURL(url => url.pathname === '/sign-in' && url.searchParams.get('next') === '/mis-aulas');
        assert.equal((await api(guest, 'GET', '/classrooms')).status, 401);
        teacher = await account(page, origin, inbox, `p5-teacher-${suffix}@example.test`, async () => {
          assert.equal((await rejectSame(() => api(page, 'POST', '/classrooms/drafts', {}))).status, 403);
        }, "teacher");
        student = await account(studentPage, origin, inbox, `p5-student-${suffix}@example.test`, undefined, "student");
        assert.deepEqual(runtime.migrations, readdirSync('prisma/migrations').filter(name => /^\d+_/.test(name)).sort());
        assert.deepEqual(runtime.migrations.filter(name => ['202610230001_agenda_events', '202610230001_classroom_ai', '202610240001_agenda_event_color', '202610250001_activity_topics', '202610250002_activity_ai'].includes(name)), [
          '202610230001_agenda_events',
          '202610230001_classroom_ai',
          '202610240001_agenda_event_color',
          '202610250001_activity_topics',
          '202610250002_activity_ai',
        ]);
        assert.equal((await db.query('SELECT count(*)::int AS n FROM classrooms')).rows[0].n, 0);
      });

      await check('actual wizard draft reload, approved binary plan and atomic publication', async () => {
        await page.goto(`${origin}/mis-aulas`);
        const created = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/v1/classrooms/drafts');
        await page.getByRole('button', { name: 'Crear aula', exact: true }).click();
        const createdResponse = await created; assert.equal(createdResponse.status(), 200); draft = await createdResponse.json();
        const wizard = page.getByRole('dialog', { name: 'Crear un aula', exact: true });
        await wizard.getByLabel('Nombre del aula', { exact: true }).fill('Integrated photography');
        await wizard.getByLabel('Materia', { exact: true }).fill('Art');
        await wizard.getByLabel('Grupo o división', { exact: true }).fill('Group A');
        await wizard.getByLabel('Ciclo lectivo', { exact: true }).fill('2026');
        const timezone = wizard.getByRole('combobox', { name: 'Zona horaria', exact: true });
        await wizard.getByRole('button', { name: 'Cambiar', exact: true }).click();
        assert.equal(await timezone.count(), 1);
        const zones = await timezone.evaluate(select => {
          const canonical = value => new Intl.DateTimeFormat('es', { timeZone: value }).resolvedOptions().timeZone;
          const target = canonical('America/Argentina/Buenos_Aires');
          const options = [...select.options].map(option => ({ value: option.value, canonical: canonical(option.value) }));
          return { target, matches: options.filter(option => option.canonical === target) };
        });
        assert.equal(zones.matches.length, 1, 'Exactly one option represents Buenos Aires in this browser');
        const selectedZone = zones.matches[0].value;
        await timezone.selectOption(selectedZone);
        assert.equal(await timezone.inputValue(), selectedZone);
        assert.equal(await timezone.evaluate(select => new Intl.DateTimeFormat('es', { timeZone: select.value }).resolvedOptions().timeZone), zones.target);
        await wizard.getByRole('group', { name: 'Una portada para reconocerla', exact: true }).getByRole('radio').first().check();
        await wizard.getByRole('button', { name: 'Guardar y salir', exact: true }).click();
        await wizard.waitFor({ state: 'hidden' });
        await page.getByRole('heading', { name: 'Mis aulas', exact: true }).waitFor();
        await page.reload();
        await page.getByRole('button', { name: /^Borradores(?:\s|$)/ }).click();
        await page.getByRole('button', { name: 'Continuar creación', exact: true }).click();
        assert.equal(await wizard.getByLabel('Nombre del aula', { exact: true }).inputValue(), 'Integrated photography');
        await wizard.getByRole('button', { name: 'Cambiar', exact: true }).click();
        assert.equal(await timezone.count(), 1);
        assert.equal(await timezone.inputValue(), selectedZone);
        assert.equal(await timezone.evaluate(select => new Intl.DateTimeFormat('es', { timeZone: select.value }).resolvedOptions().timeZone), zones.target);
        await wizard.getByRole('button', { name: 'Continuar', exact: true }).click();
        const reserved = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/v1/files');
        await wizard.getByRole('region', { name: 'Archivo del plan de estudio', exact: true }).locator('input[type=file]')
          .setInputFiles({ name: 'plan.pdf', mimeType: 'application/pdf', buffer: bytes });
        const reservedResponse = await reserved; assert.equal(reservedResponse.status(), 201); file = (await reservedResponse.json()).id;
        await wizard.getByRole('heading', { name: 'Tu programa está listo', exact: true }).waitFor({ timeout: 30000 });
        await wizard.getByRole('radio', { name: /^Armarlo a mano/ }).check();
        await wizard.getByRole('button', { name: 'Armar mi recorrido', exact: true }).click();
        await wizard.getByLabel('Nombre de la unidad 1', { exact: true }).fill('Light');
        await wizard.getByLabel('Tema 1 de unidad 1', { exact: true }).fill('Exposure');
        await wizard.getByRole('button', { name: 'Continuar', exact: true }).click();
        await wizard.getByRole('heading', { name: 'Tu aula está a un paso', exact: true }).waitFor();
        const published = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname === `/api/v1/classrooms/drafts/${draft.id}/publish`);
        await wizard.getByRole('button', { name: 'Crear mi aula', exact: true }).click();
        const publishedResponse = await published; assert.equal(publishedResponse.status(), 200);
        const result = await publishedResponse.json(); room = result.id; code = result.code; assert.ok(room && code);
        const publishedRoom = await api(page, 'GET', `/classrooms/${room}`);
        assert.equal(publishedRoom.status, 200); assert.equal(publishedRoom.body.timezone, selectedZone);
        await wizard.waitFor({ state: 'hidden' });
        await page.getByRole('heading', { name: 'Integrated photography', exact: true }).waitFor();
        const stored = (await db.query('SELECT classroom_id,classroom_draft_id FROM files WHERE id=$1', [file])).rows[0];
        assert.equal(stored.classroom_id, room); assert.equal(stored.classroom_draft_id, null);
        assert.equal((await api(page, 'GET', `/files/${file}/content`)).digest, digest(bytes));
        await openClassroom(page, origin, 'Integrated photography');
        await selectClassroomSection(page, 'plan', 'Plan');
        await page.getByRole('region', { name: 'Plan de estudio', exact: true }).getByRole('navigation', { name: 'Unidades del plan', exact: true }).getByText('Light', { exact: true }).waitFor();
        await page.getByRole('region', { name: 'Plan de estudio', exact: true }).getByRole('heading', { name: 'Exposure', exact: true }).waitFor();
        const replay = await api(page, 'POST', `/classrooms/drafts/${draft.id}/publish`, { revision: draft.revision });
        assert.equal(replay.status, 200); assert.equal(replay.body.id, room);
        assert.equal((await db.query('SELECT count(*)::int AS n FROM classrooms')).rows[0].n, 1);
      });

      await check('PATCH CSRF, Origin, private ownership and quota denials preserve domain data', async () => {
        const settings = (await api(page, 'GET', `/classrooms/${room}`)).body;
        const payload = { revision: settings.revision, name: settings.name, subject: settings.subject, division: settings.division, academicYear: settings.academicYear };
        assert.equal((await rejectSame(() => api(page, 'PATCH', `/classrooms/${room}/settings`, payload, { 'x-csrf-token': 'invalid' }))).status, 403);
        const csrf = (await api(page, 'GET', '/auth/csrf')).body.csrfToken, before = await domainSnapshot(db);
        const wrong = await context.request.patch(`${origin}/api/v1/classrooms/${room}/settings`, { headers: { origin: 'http://wrong.invalid', 'x-csrf-token': csrf }, data: payload });
        assert.equal(wrong.status(), 403); assert.equal(await domainSnapshot(db), before);
        assert.equal((await rejectSame(() => api(studentPage, 'GET', `/classrooms/${room}`))).status, 403);
        assert.equal((await rejectSame(() => api(studentPage, 'GET', `/files/${file}/content`))).status, 403);
        assert.equal((await rejectSame(() => api(studentPage, 'PATCH', `/classrooms/${room}/settings`, payload))).status, 403);
        const otherDraft = await api(page, 'POST', '/classrooms/drafts', {}); assert.equal(otherDraft.status, 200);
        assert.equal((await rejectSame(() => api(page, 'POST', '/files', { scope: { kind: 'draft', id: otherDraft.body.id }, purpose: 'plan', name: 'oversized.pdf', bytes: 500001 }))).status, 409);
      });

      await check('real code preview and explicit browser confirmation create one current membership', async () => {
        await studentPage.goto(`${origin}/mis-aulas`);
        await studentPage.getByRole('button', { name: 'Unirme con código', exact: true }).click();
        await studentPage.getByLabel('Código del aula', { exact: true }).fill(code);
        const previewed = studentPage.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/classrooms/codes/preview');
        await studentPage.getByRole('button', { name: 'Ver aula', exact: true }).click();
        const preview = await (await previewed).json(); assert.ok(preview.confirmation);
        assert.equal((await db.query('SELECT count(*)::int AS n FROM enrollments')).rows[0].n, 0);
        await rejectSame(() => api(page, 'POST', '/classrooms/codes/confirm', { confirmation: preview.confirmation }));
        const confirmed = studentPage.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/classrooms/codes/confirm');
        await studentPage.getByRole('dialog', { name: 'Hay un lugar para vos', exact: true })
          .getByRole('button', { name: 'Aceptar y unirme', exact: true }).click();
        assert.equal((await confirmed).status(), 200);
        assert.equal((await api(studentPage, 'GET', `/classrooms/${room}`)).status, 200);
        assert.equal((await api(studentPage, 'GET', `/files/${file}/content`)).digest, digest(bytes));
        const repeated = await api(studentPage, 'POST', '/classrooms/codes/confirm', { confirmation: preview.confirmation });
        assert.ok([200, 409].includes(repeated.status));
        assert.equal((await db.query('SELECT count(*)::int AS n FROM enrollments')).rows[0].n, 1);
      });

      await check('leaving preserves history, blocks code reentry and requires a new captured invitation', async () => {
        assert.equal((await api(studentPage, 'POST', `/classrooms/${room}/leave`, {})).status, 200);
        assert.equal((await rejectSame(() => api(studentPage, 'GET', `/files/${file}/content`))).status, 403);
        assert.equal((await rejectSame(() => api(studentPage, 'POST', '/classrooms/codes/preview', { code }))).status, 409);
        const invited = await api(page, 'POST', `/classrooms/${room}/invitations`, { email: `p5-student-${suffix}@example.test` });
        assert.equal(invited.status, 200);
        const link = await invitationMessage(inbox, `p5-student-${suffix}@example.test`, invited.body.id);
        const wrongRecipient = await rejectSame(() => api(page, 'POST', `/classrooms/invitations/${invited.body.id}/accept`, {}));
        assert.equal(wrongRecipient.status, 409); assert.equal(wrongRecipient.body.error.code, 'ENROLLMENT_UNAVAILABLE');
        await studentPage.goto(link);
        const accepted = studentPage.waitForResponse(response => new URL(response.url()).pathname === `/api/v1/classrooms/invitations/${invited.body.id}/accept`);
        await studentPage.getByRole('dialog', { name: 'Hay un lugar para vos', exact: true })
          .getByRole('button', { name: 'Aceptar y unirme', exact: true }).click(); assert.equal((await accepted).status(), 200);
        assert.equal((await api(studentPage, 'GET', `/files/${file}/content`)).status, 200);
        const history = (await api(page, 'GET', `/classrooms/${room}/history`)).body;
        assert.ok(Array.isArray(history)); assert.equal((await db.query('SELECT count(*)::int AS n FROM membership_periods')).rows[0].n, 2);
      });

      await check('durable pending invitation survives real data/API restart, then a new verified recipient accepts explicitly', async () => {
        await runtime.stopInvitationDelivery();
        await selectClassroomSection(page, 'members', 'Estudiantes');
        await page.getByRole('region', { name: 'Integrantes del aula', exact: true })
          .getByRole('button', { name: 'Invitar estudiantes', exact: true }).click();
        const dialog = page.getByRole('dialog', { name: 'Invitar alumnos', exact: true });
        await dialog.getByLabel('Correos electrónicos', { exact: true }).fill(recipientEmail);
        const invited = page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).pathname.startsWith(`/api/v1/classrooms/${room}/invitations/batch/`) && new URL(response.url()).pathname.endsWith('/0'));
        await dialog.getByRole('button', { name: 'Invitar a 1 persona', exact: true }).click();
        const invitedResponse = await invited; assert.equal(invitedResponse.status(), 200); invitation = (await invitedResponse.json()).invitationId;
        assert.ok(invitation);
        await dialog.getByRole('button', { name: 'Cerrar', exact: true }).click();
        const jobs = await db.query("SELECT count(*)::int AS n FROM background_jobs WHERE type='p5.invitation' AND status='PENDING'");
        assert.ok(jobs.rows[0].n > 0);
        await runtime.restartData(); db = runtime.db;
        const link = await invitationMessage(inbox, recipientEmail, invitation);
        assert.equal((await api(page, 'GET', `/files/${file}/content`)).digest, digest(bytes));
        recipient = await account(recipientPage, origin, inbox, recipientEmail, undefined, "student");
        assert.equal((await db.query('SELECT count(*)::int AS n FROM enrollments WHERE student_id=$1', [recipient.id])).rows[0].n, 0);
        await recipientPage.goto(link);
        const recipientInvitation = recipientPage.getByRole('dialog', { name: 'Hay un lugar para vos', exact: true });
        await recipientInvitation.getByRole('heading', { name: 'Integrated photography', exact: true }).waitFor();
        const accepted = recipientPage.waitForResponse(response => new URL(response.url()).pathname === `/api/v1/classrooms/invitations/${invitation}/accept`);
        await recipientInvitation.getByRole('button', { name: 'Aceptar y unirme', exact: true }).click(); assert.equal((await accepted).status(), 200);
        assert.equal((await api(recipientPage, 'GET', `/files/${file}/content`)).digest, digest(bytes));
        assert.equal((await db.query('SELECT count(*)::int AS n FROM enrollments WHERE student_id=$1', [recipient.id])).rows[0].n, 1);
      });

      await check('archive and removal preserve history while enforcing current permissions and immutable timezone', async () => {
        let detail = (await api(page, 'GET', `/classrooms/${room}`)).body;
        const archived = await api(page, 'POST', `/classrooms/${room}/archive`, { archived: true, revision: detail.revision });
        assert.equal(archived.status, 200);
        assert.equal((await api(studentPage, 'GET', `/files/${file}/content`)).status, 200);
        await rejectSame(() => api(page, 'POST', `/classrooms/${room}/invitations`, { email: `unused-${suffix}@example.test` }));
        detail = (await api(page, 'GET', `/classrooms/${room}`)).body;
        assert.equal((await api(page, 'POST', `/classrooms/${room}/archive`, { archived: false, revision: detail.revision })).status, 200);
        await rejectSame(() => api(page, 'PATCH', `/classrooms/${room}/settings`, { revision: detail.revision, timezone: 'UTC' }));
        assert.equal((await api(page, 'POST', `/classrooms/${room}/members/${recipient.id}/remove`, {})).status, 200);
        assert.equal((await rejectSame(() => api(recipientPage, 'GET', `/files/${file}/content`))).status, 403);
        assert.equal((await db.query('SELECT count(*)::int AS n FROM enrollments')).rows[0].n, 2);
        assert.equal((await db.query('SELECT count(*)::int AS n FROM membership_periods WHERE ended_at IS NOT NULL')).rows[0].n, 2);
      });

      await check('actual responsive classroom views, profile navigation and logout keep P3 boundaries', async () => {
        // The scripted API calls above can fill the teacher session's general-identity budget (120 per minute) and nearly
        // fill the shared 127.0.0.1 one (240). Real limits stay unchanged: wait for the busy windows to reset before browsing.
        const [busiest] = (await db.query(`SELECT GREATEST(0, EXTRACT(EPOCH FROM window_started_at + interval '61 seconds' - clock_timestamp()))::float AS wait
          FROM account_action_controls WHERE action IN ('identity.v1:general-identity:session', 'identity.v1:general-identity:ip') AND request_count >= 60
          ORDER BY window_started_at DESC LIMIT 1`)).rows;
        if (busiest) await delay(Math.ceil(busiest.wait * 1000));
        await openClassroom(page, origin, 'Integrated photography');
        await selectClassroomSection(page, 'history', 'Historial');
        await page.locator('#classroom-section-title').filter({ hasText: 'Historial' }).waitFor();
        await mkdir('.test-artifacts/p5-integration', { recursive: true });
        await page.screenshot({ path: '.test-artifacts/p5-integration/history-1280.png', fullPage: true });
        for (const width of [375, 320]) {
          await page.setViewportSize({ width, height: 900 });
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
          const layout = await page.locator('.p5-roster li').first().evaluate(row => {
            const text = row.querySelector('div:not(.p5-actions)'), actions = row.querySelector('.p5-actions');
            const strong = text.querySelector('strong'), rect = text.getBoundingClientRect();
            return { textWidth: rect.width, textBottom: rect.bottom, actionTop: actions.getBoundingClientRect().top,
              nameHeight: strong.getBoundingClientRect().height, nameLineHeight: parseFloat(getComputedStyle(strong).lineHeight) };
          });
          assert.ok(layout.textWidth >= 160, `History text remains readable at${width}: ${layout.textWidth}px`);
          assert.ok(layout.actionTop >= layout.textBottom - 1, 'Narrow history actions wrap beneath the text');
          assert.ok(layout.nameHeight <= 2 * layout.nameLineHeight + 1, 'Fixture name is not squeezed into vertical fragments');
          await page.screenshot({ path: `.test-artifacts/p5-integration/history-${width}.png`, fullPage: true });
        }
        await page.getByRole('button', { name: 'Abrir menú de navegación', exact: true }).click();
        await page.getByRole('dialog', { name: 'Menú de navegación', exact: true })
          .getByRole('link', { name: /^Mi perfil de / }).click();
        await page.waitForURL('**/profile');
        await page.getByRole('button', { name: 'Abrir menú de navegación', exact: true }).click();
        await page.getByRole('dialog', { name: 'Menú de navegación', exact: true }).getByRole('navigation', { name: 'Navegación principal', exact: true })
          .getByRole('link', { name: 'Mis aulas', exact: true }).click(); await page.waitForURL('**/mis-aulas');
        assert.equal((await api(page, 'POST', '/auth/logout', {})).status, 204);
        assert.equal((await rejectSame(() => api(page, 'GET', `/classrooms/${room}`))).status, 401);
        assert.deepEqual(errors, []);
      });

      const browserCasesDeadline = Date.now() + 90000;
      const browserCaseOptions = () => ({ timeout: Math.max(1, browserCasesDeadline - Date.now()) });
      await t.test('actual account navigation releases registration cooldown before sign-in', browserCaseOptions(), async () => {
        const page = await browser.newPage();
        try {
          let registerCalls = 0;
          await page.route('**/api/v1/**', route => {
            const path = new URL(route.request().url()).pathname;
            if (path === '/api/v1/auth/register') { registerCalls++; return route.fulfill({ status: 202, json: { status: 'accepted' } }); }
            if (path === '/api/v1/auth/session') return route.fulfill({ json: { authenticated: false } });
            return route.fulfill({ status: 503, json: { error: { code: 'SERVICE_UNAVAILABLE' } } });
          });
          await page.goto(`${origin}/register`);
          await page.getByRole('radio', { name: 'Estudiante', exact: true }).check();
          await page.getByRole('button', { name: 'Continuar', exact: true }).click();
          await page.getByLabel('Nombre', { exact: true }).fill('Alumno');
          await page.getByLabel('Apellido', { exact: true }).fill('Prueba');
          await page.getByLabel('Correo electrónico', { exact: true }).fill('"Alumno prueba"@mañana.test');
          await page.getByLabel('Contraseña', { exact: true }).fill('Una contraseña de prueba');
          await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
          // The accepted stop replaces the form; its cooldown stays internal and must not reach sign-in.
          await page.getByRole('heading', { name: 'Revisá tu correo', exact: true }).waitFor();
          assert.equal(await page.getByText(/Vas a poder volver a intentar en/).count(), 0);
          assert.equal(registerCalls, 1);
          await page.locator('.after-form').getByRole('link', { name: 'Iniciar sesión', exact: true }).click();
          await page.waitForURL('**/sign-in');
          await page.getByLabel('Correo electrónico', { exact: true }).waitFor();
          await page.waitForFunction(() => !document.querySelector('fieldset')?.disabled);
          assert.equal(await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).isEnabled(), true);
          assert.equal(await page.getByText(/Vas a poder volver a intentar en/).count(), 0);
        } finally { await page.close(); }
      });

      await t.test('actual token document clears fragment before every generated resource tag', browserCaseOptions(), async () => {
        const response = await fetch(`${origin}/verify-email`);
        assert.equal(response.headers.get('cache-control'), 'no-store');
        assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
        const html = await response.text();
        const head = html.slice(html.indexOf('<head>'), html.indexOf('</head>'));
        assert.match(head, /<title[^>]*>Verificá tu correo · FoxMind<\/title>/);
        const capture = head.indexOf('window.__foxmindTakeToken');
        assert.ok(capture > 0);
        const scriptStart = head.lastIndexOf('<script', capture);
        const firstResource = head.search(/<(?:script|link)\b/);
        assert.equal(scriptStart, firstResource);
      });

      await t.test('actual production route gates sessions and selects an invitation without automatic enrollment', browserCaseOptions(), async () => {
        const id = 'a1111111-1111-4111-8111-111111111111';
        const target = `/mis-aulas?invitacion=${id}`;
        const page = await browser.newPage();
        try {
          let session = { authenticated: false };
          let accepts = 0;
          let tokens = 0;
          await page.route('**/api/v1/**', async route => {
            const path = new URL(route.request().url()).pathname;
            if (path === '/api/v1/auth/session') return route.fulfill({ json: session });
            if (path === '/api/v1/auth/csrf') { tokens++; return route.fulfill({ json: { csrfToken: 'actual-csrf' } }); }
            if (path === `/api/v1/classrooms/invitations/${id}/accept`) {
              assert.equal(route.request().headers()['x-csrf-token'], 'actual-csrf');
              accepts++;
              return route.fulfill({ json: { id } });
            }
            if (path === '/api/v1/classrooms/invitations') return route.fulfill({ json: accepts ? [] : [{ id, name: 'Aula invitada', teacher: 'Docente de prueba', expiresAt: '2026-12-31T00:00:00Z' }] });
            if (path === '/api/v1/classrooms/drafts') return route.fulfill({ json: [] });
            if (path === '/api/v1/classrooms') return route.fulfill({ json: { teach: [], study: [] } });
            return route.fulfill({ status: 503, json: { error: { code: 'SERVICE_UNAVAILABLE' } } });
          });
          await page.goto(`${origin}${target}`);
          await page.waitForURL(url => url.pathname === '/sign-in' && url.searchParams.get('next') === target);
          assert.equal(accepts, 0);
          session = { authenticated: true, user: { id: 'real-user', firstName: 'Persona', lastName: 'Actual', email: 'persona@example.test', emailVerified: false, accountRole: 'student' } };
          await page.goto(`${origin}${target}`);
          await page.waitForURL(url => url.pathname === '/verify-email' && url.searchParams.get('next') === target);
          session.user.emailVerified = true;
          await page.goto(`${origin}${target}`);
          const selected = page.getByRole('dialog', { name: 'Hay un lugar para vos', exact: true });
          await selected.getByRole('heading', { name: 'Aula invitada' }).waitFor();
          await selected.getByRole('button', { name: 'Ahora no', exact: true }).click();
          await selected.waitFor({ state: 'hidden' });
          await page.setViewportSize({ width: 320, height: 900 });
          await page.getByRole('button', { name: 'Abrir menú de navegación', exact: true }).click();
          const drawer = page.getByRole('dialog', { name: 'Menú de navegación', exact: true });
          await drawer.getByRole('link', { name: /^Mi perfil de / }).waitFor();
          await drawer.getByRole('button', { name: 'Cerrar menú de navegación', exact: true }).click();
          assert.equal(accepts, 0);
          assert.equal(tokens, 0);
          assert.equal(await page.getByText('Cambiar cuenta de prueba:').count(), 0);
          await page.getByRole('region', { name: 'Invitaciones pendientes', exact: true })
            .getByRole('button', { name: 'Revisar invitación', exact: true }).click();
          await selected.getByRole('button', { name: 'Aceptar y unirme', exact: true }).click();
          await page.getByRole('status').filter({ hasText: 'Ya sos parte' }).waitFor();
          assert.equal(accepts, 1);
          assert.equal(tokens, 1);
          for (const width of [320, 375, 1280]) {
            await page.setViewportSize({ width, height: 900 });
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `overflow at ${width}`);
          }
        } finally { await page.close(); }
      });

      await t.test('mobile classroom history reserves readable text width and places actions below it', browserCaseOptions(), async () => {
        const id = 'a1111111-1111-4111-8111-111111111111';
        const room = { id, name: 'Aula de lectura', subject: 'Materia', division: 'Grupo A', academicYear: 2026, timezone: 'America/Argentina/Buenos_Aires', coverKey: 'explore', archived: false, teacher: 'Docente de prueba', role: 'teacher', revision: '0' };
        const page = await browser.newPage({ viewport: { width: 320, height: 1000 } });
        try {
          await page.route('**/api/v1/**', route => {
            const path = new URL(route.request().url()).pathname;
            if (path === '/api/v1/auth/session') return route.fulfill({ json: { authenticated: true, user: { id: 'teacher', firstName: 'Docente', lastName: 'Actual', email: 'teacher@example.test', emailVerified: true, accountRole: 'teacher' } } });
            if (path === '/api/v1/classrooms') return route.fulfill({ json: { teach: [room], study: [] } });
            if (path === `/api/v1/classrooms/${id}`) return route.fulfill({ json: { ...room, units: [], plans: [] } });
            if (path === `/api/v1/classrooms/${id}/history`) return route.fulfill({ json: [{ studentId: 'student', enrollmentId: 'enrollment', firstName: 'Files', lastName: 'Fixture', periods: [{ joinedAt: '2026-10-17T12:00:00Z', endedAt: '2026-10-18T12:00:00Z', endReason: 'REMOVED' }] }] });
            if ([`/api/v1/classrooms/${id}/members`, `/api/v1/classrooms/${id}/invitations`, '/api/v1/classrooms/drafts', '/api/v1/classrooms/invitations'].includes(path)) return route.fulfill({ json: [] });
            return route.fulfill({ status: 503, json: { error: { code: 'SERVICE_UNAVAILABLE' } } });
          });
          await page.goto(`${origin}/mis-aulas`);
          await page.getByRole('link', { name: 'Entrar al aula Aula de lectura', exact: true }).click();
          await page.getByRole('navigation', { name: 'Ubicación', exact: true }).getByText('Aula de lectura', { exact: true }).waitFor();
          await selectClassroomSection(page, 'history', 'Historial');
          await page.locator('#classroom-section-title').filter({ hasText: 'Historial' }).waitFor();
          const row = page.locator('.p5-roster li').filter({ hasText: 'Files Fixture' });
          for (const width of [320, 375, 1280]) {
            await page.setViewportSize({ width, height: 1000 });
            await row.getByRole('button', { name: 'Ver registros', exact: true }).waitFor();
            const metrics = await row.evaluate(element => {
              const text = element.querySelector(':scope > div:not(.p5-actions)');
              const name = text.querySelector('strong');
              const actions = element.querySelector(':scope > .p5-actions');
              const textBox = text.getBoundingClientRect();
              const nameBox = name.getBoundingClientRect();
              const actionBox = actions.getBoundingClientRect();
              return { textWidth: textBox.width, textBottom: textBox.bottom, nameHeight: nameBox.height, lineHeight: parseFloat(getComputedStyle(name).lineHeight), actionTop: actionBox.top, actionLeft: actionBox.left, textRight: textBox.right, overflow: document.documentElement.scrollWidth > innerWidth };
            });
            assert.equal(metrics.overflow, false, `page overflow at ${width}px`);
            assert.ok(metrics.textWidth >= 160, `history text is only ${metrics.textWidth}px at ${width}px`);
            assert.ok(metrics.nameHeight <= metrics.lineHeight * 2, `student name wraps excessively at ${width}px`);
            if (width <= 375) assert.ok(metrics.actionTop >= metrics.textBottom - 1, `history actions squeeze the text line at ${width}px`);
            else assert.ok(metrics.actionLeft >= metrics.textRight - 1, 'desktop history actions should remain beside the text');
          }
        } finally { await page.close(); }
      });
    } finally { await browser.close(); }
  }, { classrooms: true });
});
