// S13 and S16 of the 2026-11-26 audit: browser hardening headers and public assets.
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = new URL('..', import.meta.url);
const rel = path => new URL(path, root);

async function headerRules() {
  const { default: nextConfig } = await import('../apps/web/next.config.mjs');
  return nextConfig.headers();
}
const valueOf = (rule, key) => rule.headers.find(header => header.key.toLowerCase() === key.toLowerCase())?.value;

test('every route opts out of powerful features and isolates its browsing context', async () => {
  const rules = await headerRules();
  const global = rules.find(rule => rule.source === '/:path*' && !rule.has && !rule.missing);
  assert.ok(global, 'unconditional rule for every path');
  assert.equal(valueOf(global, 'Cross-Origin-Opener-Policy'), 'same-origin');
  const policy = Object.fromEntries(valueOf(global, 'Permissions-Policy').split(',').map(part => part.trim().split('=')));
  for (const feature of ['camera', 'microphone', 'geolocation', 'payment', 'usb', 'browsing-topics']) assert.equal(policy[feature], '()', feature);
  // The PDF viewer inside the preview iframe may present full screen; clipboard copies invitation codes.
  for (const feature of ['fullscreen', 'clipboard-write']) assert.equal(policy[feature], undefined, feature);
});

test('HSTS is sent only when the request reached the edge over HTTPS', async () => {
  const rules = await headerRules();
  const hsts = rules.filter(rule => valueOf(rule, 'Strict-Transport-Security'));
  assert.equal(hsts.length, 1);
  const [rule] = hsts;
  assert.equal(rule.source, '/:path*');
  assert.deepEqual(rule.has, [{ type: 'header', key: 'x-forwarded-proto', value: 'https' }]);
  assert.match(valueOf(rule, 'Strict-Transport-Security'), /^max-age=\d{8,}; includeSubDomains$/);
});

test('generation prompts stay in design docs, not in the public web root', () => {
  const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]);
  assert.deepEqual(walk(fileURLToPath(rel('apps/web/public/'))).filter(file => /\.prompt\.txt$/i.test(file)), []);
  const readme = readFileSync(rel('design/foxmind-ui-lab/README.md'), 'utf8');
  for (const name of ['classroom-world', 'profile-docente', 'profile-estudiante']) {
    assert.ok(readme.includes(`(assets/${name}.prompt.txt)`), name);
    assert.ok(existsSync(rel(`design/foxmind-ui-lab/assets/${name}.prompt.txt`)), name);
  }
});
