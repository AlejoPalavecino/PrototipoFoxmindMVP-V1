-- The application connects with a login that belongs to foxmind_app, never with the migrating role.
-- foxmind_app only reads and writes rows: no DDL, TRUNCATE, role management or migration history.
-- Logins and passwords are provisioned outside migrations (see docs/engineering/data-model.md).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'foxmind_app') THEN
    CREATE ROLE foxmind_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
END $$;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO foxmind_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO foxmind_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO foxmind_app;

-- Tables and sequences created later by the migrating role get the same grants.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO foxmind_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO foxmind_app;

-- Prisma creates its history table before applying migrations; the application never touches it.
DO $$
BEGIN
  IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
    REVOKE ALL ON TABLE public._prisma_migrations FROM foxmind_app;
  END IF;
END $$;
