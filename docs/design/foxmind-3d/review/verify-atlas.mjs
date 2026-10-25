import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const fake={addEventListener(){},querySelector(){return null;},querySelectorAll(){return [];},classList:{toggle(){},contains(){return false;},add(){}},setAttribute(){}};
const context=vm.createContext({window:{addEventListener(){}},document:{getElementById(){return fake;}},location:{hash:''},console});
const jsFiles=['review-data.js','screen-components.js','screen-views.js','classroom-views.js','academic-views.js','agenda-views.js','atlas.js'];
for(const file of jsFiles){let source=fs.readFileSync(path.join(root,file),'utf8');if(file==='atlas.js')source=source.replace(/\nrender\(\);\n\}\)\(\);\s*$/,'\n})();');vm.runInContext(source,context,{filename:file});}
const screens=context.window.FOX_REVIEW.screens;
const errors=[];let renders=0,stateRenders=0;const assets=new Set(),hashes=new Set();
const actualIDs=[];
for(const name of fs.readdirSync(path.join(root,'../flows')).filter(n=>n.endsWith('.md'))){const source=fs.readFileSync(path.join(root,'../flows',name),'utf8');for(const match of source.matchAll(/^## ([A-Z]+-\d+) — /gm))actualIDs.push(match[1]);}
if(actualIDs.length!==screens.length||actualIDs.some(id=>!screens.find(s=>s.id===id)))errors.push('Flow ID index mismatch');
for(const s of screens){
  const [sourceDoc,anchor]=s.sourceDoc.split('#');
  const source=fs.readFileSync(path.resolve(root,sourceDoc),'utf8');
  const actualAnchor=source.split('\n').filter(line=>line.startsWith('## '+s.id+' — ')).map(line=>line.slice(3).toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu,'').replace(/\s/g,'-'))[0];
  if(anchor!==actualAnchor)errors.push(s.id+': source anchor mismatch');
  for(const variant of s.variants){
    const html=context.window.FoxRender(s,variant,'normal');renders++;
    if(typeof html!=='string'||html.length<500)errors.push(s.id+'/'+variant+': empty renderer');
    const h1s=[...html.matchAll(/<h1(?:>| )/g)].length;if(h1s!==1)errors.push(s.id+'/'+variant+': '+h1s+' h1 elements');
    if(/\b(?:undefined|null)\b/.test(html))errors.push(s.id+'/'+variant+': unexpected undefined/null');
    for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)){
      const ref=match[1];if(ref.startsWith('#')){hashes.add(ref.slice(1));continue;}
      if(/^https?:/.test(ref)){errors.push('Remote resource: '+ref);continue;}
      assets.add(ref);if(!fs.existsSync(path.resolve(root,ref.split('#')[0])))errors.push('Missing path: '+ref);
    }
    for(const state of s.states){const stateHTML=context.window.FoxRender(s,variant,state);stateRenders++;if(typeof stateHTML!=='string'||stateHTML.length<500)errors.push(s.id+'/'+variant+'/'+state+': empty state constructor');}
    for(const match of html.matchAll(/data-go="([^"]+)"/g)){hashes.add(match[1]);}
  }
}
for(const hash of hashes){const id=hash.split('/')[0];if(!screens.some(s=>s.id===id))errors.push('Missing hash target: '+hash);}
for(const name of ['index.html','screens.html']){const html=fs.readFileSync(path.join(root,name),'utf8');for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)){const ref=match[1].split('#')[0];if(ref&&!fs.existsSync(path.resolve(root,ref)))errors.push(name+': '+ref);}}
const catalogNodes=new Map();
const catalogContext=vm.createContext({window:{},document:{getElementById(id){if(!catalogNodes.has(id))catalogNodes.set(id,{innerHTML:'',textContent:'',addEventListener(){}});return catalogNodes.get(id);}},console});
for(const file of ['review-data.js','catalog.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),catalogContext,{filename:file});
const iconHTML=catalogNodes.get('icon-grid').innerHTML;
const iconPreviews=[...iconHTML.matchAll(/class="icon-item"/g)].length;
const vectorManifest=JSON.parse(fs.readFileSync(path.join(root,'../vector-manifest.json'),'utf8'));
if(iconPreviews!==vectorManifest.icons)errors.push('Catalogue icon count mismatch');
for(const [id,node] of catalogNodes){for(const match of node.innerHTML.matchAll(/(?:src|href)="([^"]+)"/g)){const ref=match[1].split('#')[0];if(ref&&!fs.existsSync(path.resolve(root,ref)))errors.push('Catalogue '+id+': missing '+ref);}}
if(catalogNodes.get('asset-count').textContent!==16)errors.push('Illustration count is not the original-illustration count');
const css=fs.readFileSync(path.join(root,'review.css'),'utf8');
for(const expected of ['--control:var(--fm-control-border)','--focus:var(--fm-focus)','--radius:var(--fm-radius-card)','--ground:var(--fm-canvas)','font:16px/1.5 var(--body)'])if(!css.includes(expected))errors.push('Canonical styling missing: '+expected);
const report={date:'2026-10-25',scope:'Static string constructors and local paths only; generic DOM state decoration, browser layout and product behavior are not certified by this check',flowIDs:screens.length,compositionFamilies:new Set(screens.map(s=>s.family)).size,baseVariantRenders:renders,stateConstructorInvocations:stateRenders,selectableStateCombinations:screens.reduce((n,s)=>n+s.variants.length*s.states.length,0),uniqueRenderedAssets:assets.size,uniqueNavigationTargets:hashes.size,catalogueOriginalIllustrations:catalogNodes.get('asset-count').textContent,catalogueIconSVGs:iconPreviews,canonicalTokenAliases:true,errors:[...new Set(errors)]};
fs.writeFileSync(path.join(root,'validation.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(errors.length)process.exitCode=1;
