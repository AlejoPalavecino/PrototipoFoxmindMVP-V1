import { randomBytes } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { setTimeout } from "node:timers/promises";

// Never uses the caller's database or persistent volumes.
const password = randomBytes(24).toString("hex");
const name = `foxmind-api-test-${randomBytes(8).toString("hex")}`;
let container;
let result = 1;
function docker(...args) {
  try {
    return execFileSync("docker", args, {
      encoding: "utf8", timeout: 15000, env: { ...process.env, POSTGRES_PASSWORD: password },
    }).trim();
  } catch (error) { throw new Error(`Docker ${args[0]} failed (${error.status ?? error.code ?? "unknown"})`); }
}
function command(args, env, label) {
  const run = spawnSync(process.execPath, args, { env, stdio: "inherit", timeout: 60000 });
  if (run.error || run.status !== 0) throw new Error(`${label} failed (exit ${run.status ?? "unavailable"})`);
}
try {
  container = docker("run", "--detach", "--rm", "--name", name,
    "--label", "foxmind.test-owned=true", "--publish", "127.0.0.1::5432",
    "--tmpfs", "/var/lib/postgresql/data", "--env", "POSTGRES_PASSWORD", "--env", "POSTGRES_DB=foxmind_api_test",
    "--health-cmd", "pg_isready -U postgres -d foxmind_api_test", "--health-interval", "1s", "--health-retries", "60",
    "postgres:17.10-bookworm");
  const deadline = Date.now() + 65000;
  let ready = false;
  while (Date.now() < deadline) {
    const status = docker("inspect", "--format", "{{.State.Health.Status}}", container);
    if (status === "healthy") { ready = true; break; }
    if (status === "unhealthy") throw new Error("Isolated API PostgreSQL failed healthcheck");
    await setTimeout(300);
  }
  if (!ready) throw new Error("Isolated API PostgreSQL readiness timed out");
  const port = docker("inspect", "--format", '{{(index (index .NetworkSettings.Ports "5432/tcp") 0).HostPort}}', container);
  const env = { ...process.env, DATABASE_URL: `postgresql://postgres:${password}@127.0.0.1:${port}/foxmind_api_test`,
    FOXMIND_TEST_DATABASE: "isolated-container", FOXMIND_API_TEST_CONTAINER: container };
  const cli = "node_modules/prisma/build/index.js";
  command([cli, "migrate", "deploy"], env, "API isolated migrations");
  command([cli, "generate"], env, "Prisma generation");
  command(["node_modules/typescript/bin/tsc", "-p", "apps/api/tsconfig.json"], env, "API TypeScript build");
  const run = spawnSync(process.execPath, ["--test", "--test-concurrency=1", "tests/backend.test.mjs"], { env, stdio: "inherit", timeout: 60000 });
  if (run.error) throw new Error("API contract runner failed or timed out");
  result = run.status ?? 1;
} catch (error) {
  console.error(`Backend test runner failed: ${error.message}`);
} finally {
  if (container) {
    // A paused database must be resumed before cleanup, even if an assertion failed.
    try {
      const paused = docker("inspect", "--format", "{{.State.Paused}}", container);
      if (paused === "true") docker("unpause", container);
      docker("rm", "--force", container);
    } catch { console.error("Could not remove the owned API test container"); result = 1; }
  }
}
process.exitCode = result;
