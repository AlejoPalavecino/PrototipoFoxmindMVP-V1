import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const output=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(output,'../../../..');
const inputs=[
 ['foxmind-3d-legacy-final.test.tap','legacy-api.tap'],
 ['foxmind-3d-group5-final-new-affected.test.tap','new-and-affected.tap'],
 ['foxmind-3d-group5-regressions-green.test.tap','regressions-postgres.tap'],
 ['foxmind-3d-group5-api-build.test.log','api-build.log'],
 ['foxmind-3d-final-css-next-build.test.log','web-build.log'],
 ['foxmind-3d-final-css-ast.test.log','motion-css.log'],
 ['foxmind-3d-final-space-finish.test.log','space-finish.log'],
];
await fs.mkdir(path.join(output,'checks'),{recursive:true});
const files=[];
for(const [name,destination] of inputs){
 const bytes=await fs.readFile(path.join(repo,'.test-artifacts',name));
 const source=bytes.toString('utf8');
 const forbidden=[/postgres(?:ql)?:\/\/[^/\s]+:[^@\s]+@/i,
  /(?:authorization|set-cookie)\s*:/i,
  /(?:sessionToken|csrfToken|verificationToken|__Host-[^=\s]+)["']?\s*[:=]\s*["']?[A-Za-z0-9_-]{24,}/];
 if(forbidden.some(pattern=>pattern.test(source)))throw new Error(`Credential-like content: ${name}; inspect before preserving`);
 const summary=destination.endsWith('.tap')?Object.fromEntries(['tests','pass','fail','skipped'].map(key=>{
  const match=source.match(new RegExp(`^# ${key} (\\d+)\\s*$`,'m'));
  if(!match)throw new Error(`Missing TAP summary ${key}: ${name}`);
  return[key,Number(match[1])];
 })):null;
 if(summary&&summary.fail!==0)throw new Error(`Final stream is not passing: ${name}`);
 const preserved=Buffer.from(source.replace(/\r\n/g,'\n').split('\n').map(line=>line.trimEnd()).join('\n').trimEnd()+'\n');
 await fs.writeFile(path.join(output,'checks',destination),preserved);
 files.push({source:name,path:`checks/${destination}`,bytes:preserved.length,
  sourceSha256:crypto.createHash('sha256').update(bytes).digest('hex'),
  sha256:crypto.createHash('sha256').update(preserved).digest('hex'),...(summary?{summary}:{})});
}
const report={date:'2026-10-25',reviewedProductTree:'9ad34da620d1336700a88dccf5fabeb78f3689d9',
 motionLeaf:{file:'apps/shared-ui/foxmind-3d-controls.css',blob:'b0630c998f3494633954e1da4149aff018d002f0',addedLines:12,method:'L1 CSS syntax/AST and final Next build; no new live pixel claim'},
 files,notes:['Suites may overlap; their counts are not a sum of unique tests.',
  'Four skipped cases are historical optional browser conditions, not hidden new failures.',
  'Initial failed runs remain described in the coordinator ledger; only final safe green streams are copied here.',
  'Preserved text normalizes CRLF, trailing spaces and terminal blank lines; source and preserved hashes are separate.',
  'No screenshot, native zoom200 or comprehensive performance conformity is claimed.']};
await fs.writeFile(path.join(output,'checks.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(files.filter(f=>f.summary).map(f=>({path:f.path,...f.summary}))));
