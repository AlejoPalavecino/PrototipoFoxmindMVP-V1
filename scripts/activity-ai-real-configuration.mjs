import { readFile, stat } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { resolve } from 'node:path';

// Exact source referenced by the authorized canonical preview; never search other files.
export const source = 'C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/FoxMind-Recovery-2026-10-24-cleanup/worktrees/classroom-gemini/ProtipoFoxMind';
export const keyFile = resolve(source, '.env.gemini.key.local');
export const runtimeFile = resolve(source, '.env.gemini.runtime.local');
const fields = ['AI_ENABLED', 'AI_BACKEND', 'AI_MODEL', 'AI_DAILY_ACTOR_REQUESTS', 'AI_DAILY_GLOBAL_REQUESTS',
  'AI_DAILY_BUDGET_USD', 'AI_MAX_INPUT_TOKENS', 'AI_MAX_OUTPUT_TOKENS', 'AI_INPUT_USD_PER_MILLION',
  'AI_OUTPUT_USD_PER_MILLION', 'AI_DEADLINE_MS', 'AI_MAX_CONCURRENCY', 'AI_MAX_DISPATCHES', 'AI_MAX_JOB_AGE_MS'];

export function systemEnvironment() {
  return Object.fromEntries(['PATH', 'SystemRoot', 'ComSpec', 'TEMP', 'TMP', 'USERPROFILE']
    .filter(key => process.env[key] !== undefined).map(key => [key, process.env[key]]));
}

export async function loadRealAi() {
  const before = await stat(keyFile);
  const runtime = parseEnv(await readFile(runtimeFile, 'utf8'));
  const key = parseEnv(await readFile(keyFile, 'utf8')).AI_API_KEY;
  if (!key?.trim()) throw new Error('real-key-missing');
  const environment = { ...Object.fromEntries(fields.map(name => [name, runtime[name]])), AI_API_KEY: key };
  const { readAiConfiguration } = await import('../.build/api/apps/api/src/ai/index.js');
  const settings = readAiConfiguration(environment);
  if (!settings || settings.backend !== 'gemini-developer') throw new Error('real-settings-invalid');
  const after = await stat(keyFile);
  if (before.size !== after.size || before.mtimeMs !== after.mtimeMs) throw new Error('real-key-file-changed');
  return environment;
}
