import {Browser} from 'file:///C:/Users/alejo/.codex/skills/taste-skill/scripts/lib/cdp.mjs';
import {pathToFileURL} from 'node:url';
import {readFile,writeFile} from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';
const b=await Browser.launch(),checks=[];
const measure=()=>[...document.querySelectorAll('.home-welcome,.home-dashboard,.home-priorities,.day-planner,.class-grid,.class-card,.class-cover,.class-body')].map(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return {cls:el.className,x:r.x,y:r.y,w:r.width,h:r.height,...Object.fromEntries(['backgroundColor','fontSize','border','padding','gap','display'].map(k=>[k,s[k]]))};});
try{for(const width of [1440,390,320]){const p=await b.newPage({width,height:1000,reducedMotion:true});for(const role of ['docente','estudiante']){await p.goto(pathToFileURL(path.resolve('.test-artifacts/ui-lab/classrooms/before.html')).href+'?role='+role+'#'+role+'/inicio',{settleMs:50});await p.eval(()=>document.fonts.ready);const old=await p.eval(measure);await p.goto(pathToFileURL(path.resolve('design/foxmind-ui-lab/01-foxmind.html')).href+'?role='+role+'#'+role+'/inicio',{settleMs:50});await p.eval(()=>document.fonts.ready);checks.push({name:role+' Home and cards preserved '+width,pass:JSON.stringify(old)===JSON.stringify(await p.eval(measure))});}await p.close();}}finally{await b.close();}
const html=await readFile('design/foxmind-ui-lab/01-foxmind.html','utf8');const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];for(const s of scripts)new vm.Script(s[1]);checks.push({name:'Two valid embedded scripts; no external scripts/styles',pass:scripts.length===2&&!/<script[^>]+src=|<link[^>]+rel=["']stylesheet/.test(html)});
await writeFile('.test-artifacts/ui-lab/classrooms/preservation.json',JSON.stringify(checks,null,2));console.log(checks);process.exit(checks.some(c=>!c.pass)?1:0);
