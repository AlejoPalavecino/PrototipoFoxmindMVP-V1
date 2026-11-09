import { readIdentityRuntimeConfiguration, type IdentityRuntimeConfiguration } from './identity/configuration.ts';
import { readFilesConfiguration, type FileRuntimeConfiguration } from './files/configuration.ts';
import { readClassroomsConfiguration, type ClassroomRuntimeConfiguration } from './classrooms/configuration.ts';
import { readAiConfiguration, type AiConfiguration } from './ai/index.ts';
import { readFoxyVisualConfiguration, type FoxyVisualHostConfiguration } from './foxy-ai/index.ts';
import { ConfigurationError, readBaseConfiguration, type ApiBaseConfiguration } from './configuration-base.ts';
export { ConfigurationError } from './configuration-base.ts';

export interface ApiConfiguration extends ApiBaseConfiguration {
  readonly identity: IdentityRuntimeConfiguration;
  readonly files?: FileRuntimeConfiguration;
  readonly classrooms?: ClassroomRuntimeConfiguration;
  readonly ai?: AiConfiguration;
  readonly foxyVisual?: FoxyVisualHostConfiguration;
  readonly studyQuotaBytes?: bigint;
}

export function readConfiguration(environment: NodeJS.ProcessEnv = process.env): ApiConfiguration {
  const studyQuota=environment.STUDY_STORAGE_QUOTA_BYTES;
  if(studyQuota!==undefined&&(!/^\d{1,15}$/u.test(studyQuota)||BigInt(studyQuota)>BigInt(Number.MAX_SAFE_INTEGER)))throw new ConfigurationError('Invalid configuration: private study storage quota.');
  const base = readBaseConfiguration(environment);
  const files = readFilesConfiguration(environment);
  const configuration = { ...base, identity: readIdentityRuntimeConfiguration(environment) };
  const classrooms = readClassroomsConfiguration(environment, configuration.identity.security.origin);
  if (classrooms && !files) throw new ConfigurationError('Invalid configuration: classrooms require private files.');
  let ai: AiConfiguration | null;
  try { ai = readAiConfiguration(environment); }
  catch { throw new ConfigurationError('Invalid configuration: AI extraction configuration is unavailable.'); }
  if (ai && !classrooms) throw new ConfigurationError('Invalid configuration: AI extraction requires classrooms.');
  let foxyVisual: FoxyVisualHostConfiguration | null;
  try { foxyVisual = readFoxyVisualConfiguration(environment,ai); }
  catch { throw new ConfigurationError('Invalid configuration: Foxy visual configuration is unavailable.'); }
  return { ...configuration, ...(files ? { files } : {}), ...(classrooms ? { classrooms } : {}), ...(ai ? { ai } : {}), ...(foxyVisual ? { foxyVisual } : {}),...(studyQuota===undefined?{}:{studyQuotaBytes:BigInt(studyQuota)}) };
}
