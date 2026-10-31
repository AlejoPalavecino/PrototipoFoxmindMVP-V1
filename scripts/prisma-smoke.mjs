import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../.generated/prisma/client.ts";

if (process.env.FOXMIND_TEST_DATABASE !== "isolated-container") throw new Error("Prisma smoke requires the isolated test runner");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const rollback = new Error("intentional isolated transaction rollback");
try {
  assert.equal(await prisma.user.count(), 0);
  await assert.rejects(prisma.$transaction(async tx => {
    const user = await tx.user.create({ data: {
      email: `${randomUUID()}@example.test`, email_normalized: `${randomUUID()}@example.test`,
      first_name: "Prisma", last_name: "Smoke", password_hash: "fixture-not-a-real-hash", account_role: "teacher",
    } });
    const classroom = await tx.classroom.create({ data: {
      teacher_id: user.id, name: "Smoke", subject: "Light", division: "A", academic_year: 2026,
      timezone: "America/Argentina/Buenos_Aires", cover_key: "fox", storage_quota_bytes: 1000000n,
    } });
    const result = await tx.classroom.findUnique({ where: { id: classroom.id }, include: { teacher: true } });
    assert.equal(result.teacher.id, user.id);
    assert.equal(result.storage_quota_bytes, 1000000n);
    throw rollback;
  }), error => error === rollback);
  assert.equal(await prisma.user.count(), 0);
  console.log("Prisma client smoke: PASS (create, typed relation, bigint, rollback)");
} finally {
  await prisma.$disconnect();
}
