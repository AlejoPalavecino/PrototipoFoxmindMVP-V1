import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

export const password = 'Integration private files password 😀';
export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
export async function account(page, origin, inbox, email, beforeVerification, role) {
  await page.goto(`${origin}/register`);
  // Registration is three stops: role, then data, then the sent notice.
  if (role) await page.getByRole('radio', { name: role === 'teacher' ? 'Docente' : 'Estudiante', exact: true }).check();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  for (const [label, value] of Object.entries({ Nombre: 'Files', Apellido: 'Fixture', 'Correo electrónico': email, 'Contraseña': password })) {
    await page.getByLabel(label, { exact: true }).fill(value);
  }
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await page.getByText('recibir un correo de verificación', { exact: false }).waitFor();
  await page.goto(`${origin}/sign-in`);
  await page.getByLabel('Correo electrónico', { exact: true }).fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await page.waitForURL('**/verify-email');
  await beforeVerification?.();
  const deadline = Date.now() + 10000; let link;
  while (!link && Date.now() < deadline) {
    const messages = await (await fetch(`${inbox}/api/v1/messages`)).json();
    for (const message of messages.messages.filter(message => message.To.some(to => to.Address === email))) {
      const detail = await (await fetch(`${inbox}/api/v1/message/${message.ID}`)).json();
      const candidate = /http:\/\/127\.0\.0\.1:\d+\/verify-email#token=[A-Za-z0-9_-]{43}/.exec(detail.Text)?.[0];
      if (candidate) { link = candidate; break; }
    }
    if (!link) await delay(100);
  }
  assert.ok(link, 'Actual captured verification email is required');
  await page.goto(link);
  await page.getByRole('button', { name: 'Confirmar verificación', exact: true }).click();
  await page.getByRole('heading', { name: 'Tu correo está verificado', exact: true }).waitFor();
  return (await api(page, 'GET', '/auth/session')).body.user;
}
export async function api(page, method, path, body, headers = {}, options = {}) {
  return page.evaluate(async ({ method, path, body, headers, options }) => {
    const requestHeaders = { ...headers };
    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      const result = await fetch('/api/v1/auth/csrf');
      if (!result.ok && options.stopOnCsrfFailure) {
        const responseHeaders = Object.fromEntries(result.headers);
        const responseBody = result.headers.get('content-type')?.includes('application/json') ? await result.json() : await result.text();
        return { status: result.status, headers: responseHeaders, body: responseBody };
      }
      if (result.ok && !requestHeaders['x-csrf-token']) requestHeaders['x-csrf-token'] = (await result.json()).csrfToken;
    }
    let content;
    if (body?.base64 !== undefined) {
      content = Uint8Array.from(atob(body.base64), value => value.charCodeAt(0));
      requestHeaders['content-type'] = 'application/octet-stream';
    } else if (body !== undefined) { content = JSON.stringify(body); requestHeaders['content-type'] = 'application/json'; }
    const result = await fetch(`/api/v1${path}`, { method, headers: requestHeaders, body: content });
    return serialize(result);
    async function serialize(result) {
      const responseHeaders = Object.fromEntries(result.headers);
      if (result.status === 204) return { status: result.status, headers: responseHeaders };
      if (result.headers.get('content-type')?.includes('application/json')) return { status: result.status, headers: responseHeaders, body: await result.json() };
      const bytes = await result.arrayBuffer();
      const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), x => x.toString(16).padStart(2, '0')).join('');
      return { status: result.status, headers: responseHeaders, length: bytes.byteLength, digest: hash };
    }
  }, { method, path, body, headers, options });
}
export async function fileSnapshot(db) {
  const rows = [];
  for (const [table, key] of [['files', 'id'], ['uploads', 'id'], ['file_custodies', 'file_id']]) {
    rows.push((await db.query(`SELECT row_to_json(t)::text AS data FROM ${table} t ORDER BY ${key}`)).rows);
  }
  return digest(JSON.stringify(rows));
}
