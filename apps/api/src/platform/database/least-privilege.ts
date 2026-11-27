import { ConfigurationError } from '../configuration.ts';

interface RawQuery { $queryRawUnsafe<T = unknown>(sql: string): Promise<T> }

/**
 * Production refuses a connection that could change the schema: a superuser, a role that can create
 * roles, databases or objects in `public`, one that bypasses RLS, or one that owns (directly or by
 * membership) any object in `public`. The application must use a login that belongs to foxmind_app.
 */
export async function assertLeastPrivilege(database: RawQuery): Promise<void> {
  const [role] = await database.$queryRawUnsafe<{ elevated: boolean; creates: boolean; owns: boolean }[]>(`SELECT
    (r.rolsuper OR r.rolcreaterole OR r.rolcreatedb OR r.rolbypassrls) AS elevated,
    has_schema_privilege(current_user, 'public', 'CREATE') AS creates,
    EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND pg_has_role(current_user, c.relowner, 'USAGE')) AS owns
    FROM pg_roles r WHERE r.rolname = current_user`);
  if (!role || role.elevated || role.creates || role.owns) {
    throw new ConfigurationError('Invalid configuration: DATABASE_URL must use the application role, not a superuser or the migration owner.');
  }
}
