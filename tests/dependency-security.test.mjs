import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";

// Exercise the actual merger resolved by Prisma, not an unrelated direct dependency.
const require = createRequire(import.meta.url);
const configRequire = createRequire(require.resolve("@prisma/config"));
const merge = await import(pathToFileURL(configRequire.resolve("deepmerge-ts")).href);
const factories = [
  ["deepmerge", () => merge.deepmerge],
  ["deepmergeCustom", () => merge.deepmergeCustom({})],
  ["deepmergeInto", () => merge.deepmergeInto],
  ["deepmergeIntoCustom", () => merge.deepmergeIntoCustom({})],
];

// Patched floors for advisories fixed through overrides or direct pins (2026-11-22 audit).
function installedVersion(resolver, name) {
  // Walk up from the resolved entry to the package's own manifest (exports may hide package.json).
  for (let directory = dirname(resolver.resolve(name)); directory !== dirname(directory); directory = dirname(directory)) {
    const manifest = join(directory, "package.json");
    if (!existsSync(manifest)) continue;
    const parsed = JSON.parse(readFileSync(manifest, "utf8"));
    if (parsed.name === name) return parsed.version;
  }
  throw new Error(`Manifest for ${name} not found`);
}
function atLeast(version, floor) {
  const [a, b] = [version, floor].map(value => value.split(/[.-]/).slice(0, 3).map(Number));
  for (let index = 0; index < 3; index++) if (a[index] !== b[index]) return a[index] > b[index];
  return true;
}
const floors = [
  ["effect", configRequire, "3.22.1", "GHSA-7589-6fvf-x4pw"],
  ["fast-xml-parser", require, "5.12.0", "GHSA-474x-hrwr-fgx4"],
  ["minimatch", createRequire(require.resolve("eslint")), "11.0.1", "GHSA-g3hv-75wg-m249"],
];
for (const [name, resolver, floor, advisory] of floors) {
  test(`${name} resolves to a version patched for ${advisory}`, () => {
    const version = installedVersion(resolver, name);
    assert.ok(atLeast(version, floor), `${name}@${version} is below the patched floor ${floor}`);
  });
}

for (const [name, factory] of factories) {
  test(`${name} preserves the plain configuration merge used by Prisma`, () => {
    const left = { migrations: { path: "prisma/migrations" }, flags: [1] };
    const right = { schema: "prisma/schema.prisma", flags: [2] };
    const result = factory()(left, right);
    const value = name.includes("Into") ? left : result;
    assert.deepEqual(value, { migrations: { path: "prisma/migrations" }, schema: "prisma/schema.prisma", flags: [1, 2] });
  });
  test(`${name} handles recursive input without stack exhaustion`, () => {
    const left = {}; left.self = left;
    const right = {}; right.self = right;
    try {
      factory()(left, right);
    } catch (error) {
      // A deliberate bounded rejection is safe; stack exhaustion is the disclosed flaw.
      assert.notEqual(error.name, "RangeError");
      assert.doesNotMatch(error.message, /Maximum call stack size exceeded/);
    }
  });
}
