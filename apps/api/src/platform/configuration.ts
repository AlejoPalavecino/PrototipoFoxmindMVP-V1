export interface ApiBaseConfiguration {
  readonly databaseUrl: string;
  readonly port: number;
}

export class ConfigurationError extends Error {}

export function readBaseConfiguration(environment: NodeJS.ProcessEnv = process.env): ApiBaseConfiguration {
  const databaseUrl = environment.DATABASE_URL;
  try {
    if (!databaseUrl) throw new Error();
    const url = new URL(databaseUrl);
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || url.pathname.length < 2) throw new Error();
  } catch {
    throw new ConfigurationError('Invalid configuration: DATABASE_URL must be a PostgreSQL connection URL.');
  }
  const rawPort = environment.API_PORT ?? '3001';
  if (!/^(0|[1-9][0-9]{0,4})$/.test(rawPort) || Number(rawPort) > 65535) {
    throw new ConfigurationError('Invalid configuration: API_PORT must be an integer from 0 to 65535.');
  }
  return { databaseUrl, port: Number(rawPort) };
}
