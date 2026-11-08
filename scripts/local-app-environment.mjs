import {parseEnv} from 'node:util';

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
