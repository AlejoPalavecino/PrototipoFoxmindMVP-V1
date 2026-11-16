import {Browser,sleep} from 'file:///C:/Users/alejo/.codex/skills/taste-skill/scripts/lib/cdp.mjs';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const dir=path.resolve('.test-artifacts/ui-lab/learning');await mkdir(dir,{recursive:true});
const b=await Browser.launch(),checks=[];const url=pathToFileURL(path.resolve('design/foxmind-ui-lab/01-foxmind.html')).href;
try{const p=await b.newPage({width:1440,height:1000,reducedMotion:true});await p.goto(url+'#docente/aula/actividades',{settleMs:40});await p.eval(()=>document.querySelector('[data-action=open-activity]').click());await sleep(50);checks.push({name:'Activity opens dedicated teacher view',pass:await p.eval(()=>location.hash.includes('actividad-detalle')&&!!document.querySelector('.activity-overview'))});
const html=await readFile('design/foxmind-ui-lab/01-foxmind.html','utf8');checks.push({name:'No disclosure elements in generated design',pass:!/<details\b|<summary\b/.test(html)});
}finally{await b.close();}await writeFile(path.join(dir,'contract-'+(process.argv[2]||'green')+'.json'),JSON.stringify(checks,null,2));console.log(checks);process.exit(checks.every(c=>c.pass)?0:1);
