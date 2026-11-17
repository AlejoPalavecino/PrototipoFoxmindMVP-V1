import { readIdentityRuntimeConfiguration } from './identity-configuration.ts';
import type { IdentityRuntimeConfiguration } from './identity-configuration.ts';
import { readFilesConfiguration } from '../modules/files/custody/infrastructure/configuration.ts';
import type { FileRuntimeConfiguration } from '../modules/files/custody/infrastructure/configuration.ts';
import { readClassroomsConfiguration } from '../modules/classrooms/access/infrastructure/configuration.ts';
import type { ClassroomRuntimeConfiguration } from '../modules/classrooms/access/infrastructure/configuration.ts';
import { readAiConfiguration } from '../platform/ai/configuration.ts';
import type { AiConfiguration } from '../platform/ai/configuration.ts';
import { readFoxyVisualConfiguration } from '../modules/foxy/visuals/infrastructure/visual-configuration.ts';
import type { FoxyVisualHostConfiguration } from '../modules/foxy/visuals/infrastructure/visual-configuration.ts';
import { ConfigurationError, readBaseConfiguration } from '../platform/configuration.ts';
import type { ApiBaseConfiguration } from '../platform/configuration.ts';
export { ConfigurationError } from '../platform/configuration.ts';

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
