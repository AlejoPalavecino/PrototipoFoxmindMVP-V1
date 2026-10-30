import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, writeFile, unlink } from 'node:fs/promises';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import { withP4IntegrationRuntime } from '../scripts/p4-integration-runtime.mjs';
import { account, api, password } from './p4-integration-helpers.mjs';

async function assertVerifiedHome(page, pending) {
  const response = await pending; assert.equal(response.status(), 200);
  const home = await response.json(), session = (await api(page, 'GET', '/auth/session')).body;
  assert.equal(session.user.emailVerified, true); assert.equal(home.subjectId, session.user.id);
  assert.equal(home.memberships.study, 0); assert.equal(home.memberships.teach, 0);
  await page.getByRole('region', { name: 'Inicio', exact: true }).waitFor();
  await page.getByRole('heading', { name: /Hola,/ }).waitFor();
}
const homeResponse = page => page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/home' && response.request().method() === 'GET');

async function signIn(page, origin, email, next) {
  await page.goto(`${origin}/sign-in${next === undefined ? '' : `?next=${encodeURIComponent(next)}`}`);
  await page.getByLabel('Correo electrónico', { exact: true }).fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
}

test('login defaults to Inicio and preserves bounded account continuations', { timeout: 180000 }, async t => {
  await withP4IntegrationRuntime(async runtime => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const email = `login-inicio-${Date.now()}@example.test`;
    try {
      await account(page, runtime.origin, runtime.inbox, email, async () => {
        await t.test('unverified existing session continues to verification', async () => {
          await page.goto(`${runtime.origin}/sign-in`);
          await page.getByRole('link', { name: 'Continuar con mi cuenta', exact: true }).click();
          await page.waitForURL('**/verify-email');
          assert.equal((await api(page, 'GET', '/auth/session')).body.user.emailVerified, false);
        });
      });
      await t.test('confirmed verification offers Inicio by default', async () => {
        const next = page.getByRole('link', { name: 'Ir a Inicio', exact: true });
        assert.equal(await next.getAttribute('href'), '/inicio');
        const pending = homeResponse(page); await next.click(); await page.waitForURL('**/inicio');
        await assertVerifiedHome(page, pending);
      });
      await t.test('ordinary verified login reaches real Inicio', async () => {
        assert.equal((await api(page, 'POST', '/auth/logout')).status, 204);
        const pending = homeResponse(page); await signIn(page, runtime.origin, email);
        await page.waitForURL('**/inicio');
        await assertVerifiedHome(page, pending);
        assert.equal((await api(page, 'GET', '/auth/session')).body.user.emailVerified, true);
      });
      await t.test('existing verified session continues to Inicio and retains explicit classroom next', async () => {
        for (const next of [undefined, '/mis-aulas']) {
          await page.goto(`${runtime.origin}/sign-in${next ? `?next=${encodeURIComponent(next)}` : ''}`);
          const link = page.getByRole('link', { name: 'Continuar con mi cuenta', exact: true });
          assert.equal(await link.getAttribute('href'), next ?? '/inicio');
          await link.click(); await page.waitForURL(url => url.pathname === (next ?? '/inicio'));
        }
        await page.goto(`${runtime.origin}/verify-email?next=%2Fmis-aulas`);
        assert.equal(await page.getByRole('link', { name: 'Ir a Mis Aulas', exact: true }).getAttribute('href'), '/mis-aulas');
      });
      await t.test('explicit safe next and invitation encoding survive login; unsafe next falls back to Inicio', async () => {
        const invitation = '/mis-aulas?invitacion=a1111111-1111-4111-8111-111111111111';
        for (const [next, target] of [['/mis-aulas', '/mis-aulas'], ['/inicio', '/inicio'], [invitation, invitation], ['https://example.test/profile', '/inicio']]) {
          assert.equal((await api(page, 'POST', '/auth/logout')).status, 204);
          await signIn(page, runtime.origin, email, next);
          await page.waitForURL(url => url.pathname + url.search === target);
          assert.equal(new URL(page.url()).origin, runtime.origin);
        }
      });
      if (process.env.FOXMIND_LOGIN_EGO === '1') await t.test('ego real form login renders Inicio without horizontal overflow', async () => {
        const scratch = await mkdtemp(join(tmpdir(), 'foxmind-login-ego-'));
        const script = join(scratch, 'round-01.test.mjs');
        const screenshot = join(scratch, 'inicio.png').replaceAll('\\', '/');
        const spaceName = process.env.FOXMIND_LOGIN_EGO_SPACE ?? 'qa-login-inicio';
        await writeFile(script, `const task = await taskSpace(${JSON.stringify(spaceName)});
const page = task.page('p1');
await page.goto(${JSON.stringify(`${runtime.origin}/sign-in`)});
console.log({ spaceId: task.spaceId, name: task.name });
console.log(await page.snapshot());
await page.fill('loc=role:textbox[name="Correo electrónico"]', ${JSON.stringify(email)});
await page.fill('input[name="password"]', ${JSON.stringify(password)});
await page.click('loc=role:button[name="Iniciar sesión"]', { label: 'Iniciar sesión en FoxMind' });
await page.waitForURL('**/inicio');
await page.waitForSelector('loc=role:region[name="Inicio"]');
const layout = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
if (layout.scrollWidth > layout.width) throw new Error('Inicio horizontal overflow');
console.log({ layout, screenshot: await page.screenshot({ path: ${JSON.stringify(screenshot)} }) });
console.log(await page.snapshot());
await task.finish({ keep: [] });
`, 'utf8');
        try {
          const executable = join(homedir(), '.local/share/ego/active_version_dir/ego-browser.exe');
          const result = await new Promise((resolve, reject) => {
            const child = execFile(executable, ['nodejs', '-e', `await import('${pathToFileURL(script).href}')`],
              { timeout: 45000, windowsHide: true, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
                if (error) reject(error); else resolve({ stdout, stderr });
              });
            // ego reads piped stdin before evaluating; explicitly deliver EOF.
            child.stdin.end();
          });
          console.log(result.stdout);
          if (result.stderr.trim()) console.log(result.stderr);
          console.log(`Login ego screenshot scratch: ${scratch}`);
        } finally { await unlink(script); }
      });
    } finally { await browser.close(); }
  }, { classrooms: true });
});
