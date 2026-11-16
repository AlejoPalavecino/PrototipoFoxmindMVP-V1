import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { setTimeout } from "node:timers/promises";
import pg from "pg";
import { createApplication } from "../.build/api/apps/api/src/application.js";
import { readConfiguration } from "../.build/api/apps/api/src/configuration.js";

if (process.send) { process.send({ type: 'foxmind-test-ready' }); process.disconnect(); }
if (process.env.FOXMIND_TEST_DATABASE !== "isolated-container" || !/^[a-f0-9]{64}$/.test(process.env.FOXMIND_API_TEST_CONTAINER ?? "")) {
  throw new Error("Use npm run test:api: an owned isolated database is required");
}
const main = ".build/api/apps/api/src/main.js";
const configuration = readConfiguration({ ...process.env, API_PORT: '0' });
let app;
let origin;
before(async () => {
  app = await createApplication(configuration);
  await app.listen(0, "127.0.0.1");
  origin = `http://127.0.0.1:${app.getHttpServer().address().port}`;
});
after(async () => { if (app) await app.close(); });
const get = (path, base = origin) => fetch(`${base}${path}`, { signal: AbortSignal.timeout(4000) });

test("liveness exposes only a fixed uncached process status", async () => {
  const response = await get("/api/v1/health/live");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("access-control-allow-origin"), null);
  assert.deepEqual(await response.json(), { status: "ok" });
});
test("readiness queries real PostgreSQL without exposing its identity", async () => {
  const response = await get("/api/v1/health/ready");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { status: "ready" });
});
test("readiness fails closed during database outage while liveness survives", async () => {
  const container = process.env.FOXMIND_API_TEST_CONTAINER;
  execFileSync("docker", ["pause", container], { stdio: "pipe", timeout: 5000 });
  try {
    const response = await get("/api/v1/health/ready");
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { status: "unavailable" });
    assert.equal((await get("/api/v1/health/live")).status, 200);
  } finally { execFileSync("docker", ["unpause", container], { stdio: "pipe", timeout: 5000 }); }
  const deadline = Date.now() + 5000;
  let ready = false;
  while (Date.now() < deadline) {
    if ((await get("/api/v1/health/ready")).status === 200) { ready = true; break; }
    await setTimeout(100);
  }
  assert.ok(ready, "readiness recovers after owned database is resumed");
});
test("invalid environment exits before listening with exact sanitized errors", () => {
  const urlError = "Invalid configuration: DATABASE_URL must be a PostgreSQL connection URL.\n";
  for (const value of [undefined, "not-a-url-PRIVATE_SECRET", "mysql://user:PRIVATE_SECRET@127.0.0.1/db", "postgresql://127.0.0.1/"]) {
    const env = { ...process.env, API_PORT: "0" };
    if (value === undefined) delete env.DATABASE_URL; else env.DATABASE_URL = value;
    const result = spawnSync(process.execPath, [main], { env, encoding: "utf8", timeout: 1500 });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, urlError);
    assert.ok(!result.stderr.includes("PRIVATE_SECRET"));
  }
  for (const value of ["", "-1", "65536", "12x"]) {
    const result = spawnSync(process.execPath, [main], { env: { ...process.env, API_PORT: value }, encoding: "utf8", timeout: 1500 });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, "Invalid configuration: API_PORT must be an integer from 0 to 65535.\n");
  }
});
test("compiled CLI starts on loopback and supports an ephemeral port", async () => {
  const child = spawn(process.execPath, [main], { env: { ...process.env, API_PORT: "0" }, stdio: ["ignore", "pipe", "pipe"] });
  let stderr = "";
  child.stderr.on("data", data => { stderr += data; });
  try {
    const event = await new Promise((resolve, reject) => {
      const timeout = globalThis.setTimeout(() => reject(new Error("CLI listening event timed out")), 4000);
      let output = "";
      child.stdout.on("data", data => {
        output += data;
        if (output.includes("\n")) {
          clearTimeout(timeout);
          try { resolve(JSON.parse(output.split("\n")[0])); } catch { reject(new Error("Invalid CLI listening event")); }
        }
      });
      child.once("exit", () => { clearTimeout(timeout); reject(new Error("CLI exited before listening")); });
    });
    assert.equal(event.event, "api.listening"); assert.equal(event.host, "127.0.0.1");
    assert.ok(Number.isInteger(event.port) && event.port > 0);
    assert.equal((await get("/api/v1/health/live", `http://127.0.0.1:${event.port}`)).status, 200);
    assert.equal((await get("/api/v1/health/ready", `http://127.0.0.1:${event.port}`)).status, 200);
    assert.equal(stderr, "");
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      const closed = once(child, "close"); child.kill(); await closed;
    }
  }
});
test("existing identity and candidate token flows replace only implemented planned-route 404s", async () => {
  assert.equal((await get('/api/v1/auth/session')).status, 200);
  assert.equal((await get('/api/v1/auth/csrf')).status, 401);
  const mutate = (path, method = 'POST', body = '{}') => fetch(`${origin}/api/v1${path}`, {
    method, headers: { Origin: process.env.APP_ORIGIN, 'Content-Type': 'application/json' }, body,
  });
  assert.equal((await mutate('/auth/login')).status, 422);
  assert.equal((await mutate('/auth/logout')).status, 204);
  assert.equal((await get('/api/v1/account')).status, 401);
  assert.equal((await mutate('/auth/register')).status, 422);
  assert.equal((await mutate('/account', 'PATCH')).status, 401);
  assert.equal((await mutate('/auth/email-verification/resend')).status, 401);
  assert.equal((await mutate('/auth/email-verification/confirm')).status, 422);
  assert.equal((await mutate('/auth/password-recovery/request')).status, 422);
  assert.equal((await mutate('/auth/password-recovery/confirm')).status, 422);
  assert.equal((await mutate('/account/password')).status, 401);
  assert.equal((await get('/api/v1/classrooms')).status, 404);
});
test('unrelated unknown-route JSON parsing behavior is preserved', async () => {
  const response = await fetch(`${origin}/api/v1/unknown`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
  assert.equal(response.status, 400);
  assert.equal(response.headers.get('x-request-id'), null);
});
test("application close releases the HTTP listener and owned Prisma pool", async () => {
  const monitor = new pg.Client({ connectionString: process.env.DATABASE_URL, application_name: "foxmind-api-lifecycle-monitor" });
  await monitor.connect();
  // Match the application identity required by the SQL guard for AI execution profiles.
  const connections = async () => Number((await monitor.query(
    "SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND application_name=$1",
    ["foxmind-api-ai-execution-v1"],
  )).rows[0].count);
  try {
    assert.equal((await get("/api/v1/health/ready")).status, 200);
    assert.ok(await connections() > 0, "readiness used a real named database connection");
    await app.close(); app = undefined;
    await assert.rejects(get("/api/v1/health/live"));
    const deadline = Date.now() + 2000;
    while (await connections() > 0 && Date.now() < deadline) await setTimeout(25);
    assert.equal(await connections(), 0, "Nest destruction closes Prisma-owned database connections");
  } finally { await monitor.end(); }
});
