import assert from "node:assert/strict";
import { createRequire } from "node:module";
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
