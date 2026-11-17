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
  for(const name of ['database','storage','scanner','smtp','inbox'])if(!Number.isInteger(value.ports?.[name])||value.ports[name]<1024||value.ports[name]>65535)throw Error('Invalid local port');
  return value;
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
