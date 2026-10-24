import { readIdentityRuntimeConfiguration, type IdentityRuntimeConfiguration } from './identity/configuration.ts';
import { readFilesConfiguration, type FileRuntimeConfiguration } from './files/configuration.ts';
import { readClassroomsConfiguration, type ClassroomRuntimeConfiguration } from './classrooms/configuration.ts';
import { readAiConfiguration, type AiConfiguration } from './ai/index.ts';

export interface ApiConfiguration {
  readonly databaseUrl: string;
  readonly port: number;
  readonly identity: IdentityRuntimeConfiguration;
  readonly files?: FileRuntimeConfiguration;
  readonly classrooms?: ClassroomRuntimeConfiguration;
  readonly ai?: AiConfiguration;
}

export class ConfigurationError extends Error {}

export function readConfiguration(environment: NodeJS.ProcessEnv = process.env): ApiConfiguration {
  const databaseUrl = environment.DATABASE_URL;
  try {
    if (!databaseUrl) throw new Error();
    const url = new URL(databaseUrl);
    if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname || url.pathname.length < 2) throw new Error();
  } catch {
    throw new ConfigurationError("Invalid configuration: DATABASE_URL must be a PostgreSQL connection URL.");
  }
  const rawPort = environment.API_PORT ?? "3001";
  if (!/^(0|[1-9][0-9]{0,4})$/.test(rawPort) || Number(rawPort) > 65535) {
    throw new ConfigurationError("Invalid configuration: API_PORT must be an integer from 0 to 65535.");
  }
  const files = readFilesConfiguration(environment);
  const configuration = { databaseUrl, port: Number(rawPort), identity: readIdentityRuntimeConfiguration(environment) };
  const classrooms = readClassroomsConfiguration(environment, configuration.identity.security.origin);
  if (classrooms && !files) throw new ConfigurationError('Invalid configuration: classrooms require private files.');
  let ai: AiConfiguration | null;
  try { ai = readAiConfiguration(environment); }
  catch { throw new ConfigurationError('Invalid configuration: AI extraction configuration is unavailable.'); }
  if (ai && !classrooms) throw new ConfigurationError('Invalid configuration: AI extraction requires classrooms.');
  return { ...configuration, ...(files ? { files } : {}), ...(classrooms ? { classrooms } : {}), ...(ai ? { ai } : {}) };
}
