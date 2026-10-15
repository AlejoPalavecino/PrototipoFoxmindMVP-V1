import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// Offline structural/example checks, not a complete OpenAPI validator or authentication tests.
const contract = JSON.parse(readFileSync(new URL("../docs/api/accounts-sessions.openapi.json", import.meta.url), "utf8"));
function resolve(pointer) {
  assert.ok(pointer.startsWith("#/"), "only local references are used");
  let node = contract;
  for (const part of pointer.slice(2).split("/")) node = node?.[part.replace(/~1/g, "/").replace(/~0/g, "~")];
  assert.notEqual(node, undefined, `unresolved reference ${pointer}`);
  return node;
}
function accepts(value, schema) {
  if (schema.$ref) return accepts(value, resolve(schema.$ref));
  if (schema.allOf && !schema.allOf.every(s => accepts(value, s))) return false;
  if (schema.oneOf && schema.oneOf.filter(s => accepts(value, s)).length !== 1) return false;
  if (Object.hasOwn(schema, "const") && !Object.is(value, schema.const)) return false;
  if (schema.enum && !schema.enum.includes(value)) return false;
  if (schema.type === "string") {
    if (typeof value !== "string" || /[\uD800-\uDFFF]/u.test(value)) return false;
    const length = [...value].length;
    if (length < (schema.minLength ?? 0) || length > (schema.maxLength ?? Infinity)) return false;
    if (schema.pattern && !new RegExp(schema.pattern, "u").test(value)) return false;
  }
  if (schema.type === "boolean" && typeof value !== "boolean") return false;
  if (schema.type === "integer" && (!Number.isInteger(value) || value < (schema.minimum ?? -Infinity))) return false;
  if (schema.type === "array") {
    if (!Array.isArray(value) || value.length < (schema.minItems ?? 0) || !value.every(v => accepts(v, schema.items))) return false;
  }
  if (schema.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    if (Object.keys(value).length < (schema.minProperties ?? 0)) return false;
    if (!(schema.required ?? []).every(k => Object.hasOwn(value, k))) return false;
    if (schema.additionalProperties === false && Object.keys(value).some(k => !Object.hasOwn(schema.properties ?? {}, k))) return false;
    for (const [key, item] of Object.entries(schema.properties ?? {})) if (Object.hasOwn(value, key) && !accepts(value[key], item)) return false;
  }
  // Format assertions and semantic token/auth/rate-limit behavior require later implementation tests.
  return true;
}
const operations = Object.entries(contract.paths).flatMap(([path, item]) => Object.entries(item).map(([method, op]) => ({ path, method, op })));
const schema = name => contract.components.schemas[name];

test("planned OpenAPI has exactly the twelve account/session operations and local resolvable refs", () => {
  assert.equal(contract.openapi, "3.1.0");
  assert.equal(contract["x-status"], "contract-only-not-implemented");
  assert.equal(contract.servers[0].url, "/api/v1");
  assert.equal(operations.length, 12);
  assert.equal(new Set(operations.map(x => x.op.operationId)).size, 12);
  for (const { op } of operations) assert.equal(op["x-implementation-status"], "planned-not-implemented");
  function walk(value) {
    if (!value || typeof value !== "object") return;
    if (value.$ref) resolve(value.$ref);
    Object.values(value).forEach(walk);
  }
  walk(contract);
});
test("confirmed user policies and fixed verification/recovery boundaries are retained", () => {
  const p = contract["x-confirmed-policy"];
  assert.deepEqual([p.passwordMin,p.passwordMax,p.nameMax,p.sessionIdleSeconds,p.sessionAbsoluteSeconds,p.verificationTtlSeconds,p.recoveryTtlSeconds,p.resendMinimumSeconds], [16,128,80,1800,43200,3600,900,60]);
  assert.equal(p.passwordChange, "revoke-others-rotate-current-preserve-absolute");
  assert.equal(p.passwordRecovery, "revoke-all-no-auto-login");
  assert.equal(p.duplicateRegistration, "generic-202");
  assert.equal(p.globalClassroomRole, false);
  assert.equal(p.emailReadOnly, true);
});
test("mutation transport requires Origin and documents conditional or required CSRF", () => {
  for (const { method, op } of operations) {
    if (method === "get") continue;
    assert.ok(op.parameters.some(p => p.name === "Origin" && p.required));
    assert.ok(op.requestBody.content["application/json"]);
    assert.ok(["required", "required-when-valid-session-present"].includes(op["x-csrf-policy"]));
    if (op["x-csrf-policy"] === "required") assert.ok(op.security.some(s => Object.hasOwn(s, "SessionCookie") && Object.hasOwn(s, "CsrfHeader")));
    else assert.ok(op.parameters.some(p => p.name === "X-CSRF-Token" && p.description.includes("valid session")));
  }
  for (const path of ["/auth/session", "/auth/csrf"]) assert.equal(contract.paths[path].get["x-touches-session-idle"], false);
});
test("operation error codes are explicit and stay within declared response codes", () => {
  const allowed = schema("ErrorEnvelope").properties.error.properties.code.enum;
  for (const { op } of operations) for (const [status, codes] of Object.entries(op["x-error-codes"])) {
    assert.ok(op.responses[status]);
    assert.ok(codes.length && codes.every(code => allowed.includes(code)));
  }
  assert.deepEqual(contract.paths["/auth/login"].post["x-error-codes"]["401"], ["AUTHENTICATION_FAILED"]);
  assert.deepEqual(contract.paths["/account"].get["x-error-codes"]["403"], ["EMAIL_VERIFICATION_REQUIRED"]);
});
test("minimal request fixtures fit schemas and reject role/email/profile scope expansion", () => {
  const fixtures = contract["x-example-inputs"];
  for (const [key, name] of Object.entries({register:"RegisterInput",login:"LoginInput",verify:"VerifyInput",reset:"RecoveryConfirmInput",change:"PasswordChangeInput",profile:"ProfilePatch"})) assert.ok(accepts(fixtures[key], schema(name)), name);
  assert.ok(!accepts({...fixtures.register,role:"teacher"}, schema("RegisterInput")));
  assert.ok(!accepts({}, schema("ProfilePatch")));
  for (const key of ["email", "role", "avatar", "password"]) assert.ok(!accepts({firstName:"Example",[key]:"unexpected"}, schema("ProfilePatch")));
  assert.equal(schema("UserIdentity").properties.email.readOnly, true);
});
test("email domains reject uppercase without rewriting local-part case, dots or plus", () => {
  for (const value of ["User.Name+tag@example.test", "o'hara+group@example.test"]) {
    assert.ok(accepts(value, schema("Email")));
  }
  for (const value of ["User@EXAMPLE.test", "User@example.Test"]) {
    assert.ok(!accepts(value, schema("Email")));
  }
});
test("raw Unicode password/name boundaries and opaque token shape are explicit", () => {
  for (const length of [16,128]) assert.ok(accepts("x".repeat(length), schema("Password")));
  for (const length of [15,129]) assert.ok(!accepts("x".repeat(length), schema("Password")));
  assert.ok(accepts("😀".repeat(16), schema("Password")));
  assert.ok(!accepts("\ud800".repeat(16), schema("Password")));
  assert.ok(accepts(` ${"x".repeat(78)} `, schema("Name")));
  for (const value of [" ".repeat(80), ` ${"x".repeat(80)} `, "x".repeat(81)]) assert.ok(!accepts(value, schema("Name")));
  assert.ok(!accepts("x".repeat(42), schema("AccountToken")));
});
test("generic registration/recovery examples match without credentials or enrollment", () => {
  for (const [path, names] of [["/auth/register",["newEmail","existingEmail"]],["/auth/password-recovery/request",["knownEmail","unknownEmail"]]]) {
    const r = contract.paths[path].post.responses["202"];
    const examples = r.content["application/json"].examples;
    assert.deepEqual(examples[names[0]].value, examples[names[1]].value);
    assert.deepEqual(examples[names[0]].value, {status:"accepted"});
  }
});
test("response examples fit their shapes; errors are uncached and 204 has no body", () => {
  for (const { op } of operations) for (const [status, entry] of Object.entries(op.responses)) {
    const response = entry.$ref ? resolve(entry.$ref) : entry;
    assert.equal(response.headers["Cache-Control"].schema.const, "no-store");
    assert.equal(response.headers["X-Content-Type-Options"].schema.const, "nosniff");
    if (status === "204") assert.equal(response.content, undefined);
    for (const media of Object.values(response.content ?? {})) for (const example of Object.values(media.examples ?? {})) assert.ok(accepts(example.value, media.schema));
  }
  const retry = contract.components.responses.RateLimited.headers["Retry-After"];
  assert.equal(retry.required, true); assert.equal(retry.schema.minimum, 1);
});
