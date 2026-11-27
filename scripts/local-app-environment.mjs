import {parseEnv} from 'node:util';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';

export async function verifyLocalWebDependency(root) {
  const lock = JSON.parse(await readFile(join(root, 'package-lock.json'), 'utf8'));
  const expected = lock.packages['node_modules/next'].version;
  let installed;
  try {
    const manifest = await readFile(join(root, 'node_modules', 'next', 'package.json'), 'utf8');
    installed = JSON.parse(manifest).version;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (installed !== expected) {
    throw Error(`Local Next.js installation: ${installed ?? 'missing'}. This checkout requires ${expected}. Run npm ci, then npm run local:up.`);
  }
}

/** Preserve untouched values (especially the API key) and reject ambiguous files. */
export function updateEnvironment(original, updates) {
  let candidate=original;const newline=original.includes('\r\n')?'\r\n':'\n';
  for(const [name,value]of Object.entries(updates)) {
    if(!/^[A-Z][A-Z0-9_]*$/.test(name)||typeof value!=='string'||/[\r\n]/.test(value))throw Error('Invalid local environment update');
    const expression=new RegExp('^[ \\t]*(?:export[ \\t]+)?'+name+'[ \\t]*=.*$','gm'),matches=[...candidate.matchAll(expression)];
    if(matches.length>1)throw Error('Duplicate local environment name');
    const quote=["'",'"','`'].find(character=>!value.includes(character));
    if(!quote)throw Error('Local environment value cannot be quoted safely');
    const encoded=quote+value+quote;
    candidate=matches.length?candidate.replace(expression,()=>name+'='+encoded+(matches[0][0].endsWith('\r')?'\r':''))
      :candidate+(candidate.endsWith('\n')?'':newline)+name+'='+encoded+newline;
  }
  const before=parseEnv(original),after=parseEnv(candidate);
  if(before.AI_API_KEY!==after.AI_API_KEY)throw Error('Local API key must be preserved');
  return candidate;
}

export function requireLocalOwner(value) {
  if(!value||!/^foxmind-local-[a-f0-9]{16}$/.test(value.project))throw Error('Invalid local owner');
  for(const name of ['database','storage','scanner','smtp','inbox'])if(!validPort(value.ports?.[name]))throw Error('Invalid local port');
  for(const name of ['web','api'])if(value.ports[name]!==undefined&&!validPort(value.ports[name]))throw Error('Invalid local port');
  return value;
}

const validPort=port=>Number.isInteger(port)&&port>=1024&&port<=65535;

/** Web/API ports of this checkout; owners created before ports were configurable keep 3000/3001. */
export function localAppPorts(owner) {
  const ports={web:owner.ports?.web??3000,api:owner.ports?.api??3001};
  if(!validPort(ports.web)||!validPort(ports.api)||ports.web===ports.api)throw Error('Invalid local port');
  return ports;
}

/** Ports for a new owner, from optional LOCAL_WEB_PORT/LOCAL_API_PORT. */
export function chooseLocalAppPorts(environment) {
  const read=(name,fallback)=>{const raw=environment[name];if(raw===undefined||raw==='')return fallback;if(!/^\d+$/.test(raw))throw Error('Invalid local port');return Number(raw);};
  return localAppPorts({ports:{web:read('LOCAL_WEB_PORT',3000),api:read('LOCAL_API_PORT',3001)}});
}

/** Stop only verified containers; Docker keeps their volumes and configuration. */
export async function stopLocalContainers(owner, command) {
  if (!owner) return;
  requireLocalOwner(owner);
  const ids = (await command('docker', [
    'ps', '-q', '--filter', 'label=com.docker.compose.project=' + owner.project
  ])).split(/\s+/).filter(Boolean);
  for (const id of ids) {
    const found = await command('docker', [
      'inspect', '--format', '{{index .Config.Labels "foxmind.local.owner"}}', id
    ]);
    if (found !== owner.project) throw Error('Foreign Docker resource');
  }
  if (ids.length) await command('docker', ['stop', ...ids]);
}

// The app connects as a login inside foxmind_app (created by migrations); migrations keep the superuser.
export const LOCAL_APP_DATABASE_USER = 'foxmind_app_local';
export function localDatabaseUrls({ superPassword, appPassword, port }) {
  const at = `@127.0.0.1:${port}/foxmind_local`;
  return { migration: `postgresql://postgres:${superPassword}${at}`, application: `postgresql://${LOCAL_APP_DATABASE_USER}:${appPassword}${at}` };
}
/** Accepts this environment's own URLs, including the former superuser one, and refuses any other database. */
export function acceptLocalDatabaseUrl(existing, urls) {
  if (existing && existing !== urls.application && existing !== urls.migration) throw Error('Root .env points to another database; refusing to replace it');
}
/** Idempotent: creates the login or refreshes its password and attributes, always as a plain member of foxmind_app. */
export function applicationLoginSql(password) {
  if (!/^[0-9a-f]{64}$/.test(password)) throw Error('Local application database password must be 64 hex characters');
  const user = LOCAL_APP_DATABASE_USER;
  return `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='${user}') THEN CREATE ROLE ${user} LOGIN PASSWORD '${password}'; END IF; END $$;
ALTER ROLE ${user} WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD '${password}';
GRANT foxmind_app TO ${user};`;
}
