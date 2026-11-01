# M1/M3: advisory con Prisma

Estado: completado. Locks usan SELECT 1 FROM pg_advisory_xact_lock para evitar devolver void incompatible con Prisma. Se revisaron los patrones equivalentes en Foxy/files.

PrismaService real con PostgreSQL sintético: 3 PASS; API build y fronteras PASS. Handoff: auditoría host independiente.
