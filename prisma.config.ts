import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Migrations run with the owning role when it is separate from the application login.
  datasource: { url: process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL },
});
