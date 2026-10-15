import { randomBytes } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { setTimeout } from "node:timers/promises";

// This runner never accepts DATABASE_URL: it owns a fresh disposable container.
const image = "postgres:17.10-bookworm";
const password = randomBytes(24).toString("hex");
const name = `foxmind-test-${randomBytes(8).toString("hex")}`;
const empty = process.argv.includes("--empty");
let container;
let result = 1;
const docker = (...args) => {
  try {
    return execFileSync("docker", args, {
      encoding: "utf8", timeout: 15000, env: { ...process.env, POSTGRES_PASSWORD: password },
    }).trim();
  } catch (error) {
    throw new Error(`Docker ${args[0]} failed (${error.status ?? error.code ?? "unknown"})`);
  }
};
function command(args, env, label) {
  const run = spawnSync(process.execPath, args, { env, stdio: "inherit", timeout: 60000 });
  if (run.error || run.status !== 0) throw new Error(`${label} failed (exit ${run.status ?? "unavailable"})`);
}
try {
  container = docker("run", "--detach", "--rm", "--name", name,
    "--label", "foxmind.test-owned=true", "--publish", "127.0.0.1::5432",
    "--tmpfs", "/var/lib/postgresql/data", "--env", "POSTGRES_PASSWORD",
    "--env", "POSTGRES_DB=foxmind_test", "--health-cmd", "pg_isready -U postgres -d foxmind_test",
    "--health-interval", "1s", "--health-timeout", "2s", "--health-retries", "60", image);
  const deadline = Date.now() + 65000;
  let ready = false;
  while (Date.now() < deadline) {
    const state = docker("inspect", "--format", "{{.State.Health.Status}}", container);
    if (state === "healthy") { ready = true; break; }
    if (state === "unhealthy") throw new Error("Isolated PostgreSQL failed its healthcheck");
    await setTimeout(300);
  }
  if (!ready) throw new Error("Isolated PostgreSQL readiness timed out");
  const port = docker("inspect", "--format", '{{(index (index .NetworkSettings.Ports "5432/tcp") 0).HostPort}}', container);
  const env = { ...process.env, FOXMIND_TEST_DATABASE: "isolated-container", DATABASE_URL: `postgresql://postgres:${password}@127.0.0.1:${port}/foxmind_test` };
  if (!empty) {
    const cli = "node_modules/prisma/build/index.js";
    command([cli, "migrate", "deploy"], env, "Initial migration deployment");
    command([cli, "migrate", "deploy"], env, "Idempotent migration replay");
    command([cli, "migrate", "status"], env, "Migration status");
    command([cli, "migrate", "diff", "--from-config-datasource", "--to-schema", "prisma/schema.prisma", "--exit-code"], env, "Schema drift check");
    command([cli, "generate"], env, "Prisma client generation");
  }
  const run = spawnSync(process.execPath, ["--test", "--test-concurrency=1", "tests/database.test.mjs"], { env, stdio: "inherit", timeout: 60000 });
  if (run.error) throw run.error;
  result = run.status ?? 1;
  if (!empty && result === 0) command(["scripts/prisma-smoke.mjs"], env, "Prisma runtime smoke");
} catch (error) {
  result = 1;
  // Avoid printing connection strings or process arguments containing credentials.
  console.error(`Database test runner failed: ${error.message}`);
} finally {
  if (container) {
    try { docker("rm", "--force", container); }
    catch { console.error("Could not remove the owned test container"); result = 1; }
  }
}
process.exitCode = result;
