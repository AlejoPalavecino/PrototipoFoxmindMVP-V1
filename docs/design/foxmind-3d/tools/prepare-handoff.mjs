import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
await fs.mkdir(path.join(root,'checks'),{recursive:true});
await fs.mkdir(path.join(root,'references'),{recursive:true});
const refs=[
 ['a5470be4-00e0-4278-ae17-f0d6723e0278','01-home-previous','Superseded by reference 07'],
 ['c885ea57-0e9a-4e7e-89e3-c2489bff581d','02-classrooms-previous','Superseded by reference 08'],
 ['5629bfee-843c-42b2-ac8d-2631593a0ea8','03-classroom','Selected classroom composition'],
 ['b02932e3-6138-4292-8298-41f5b632e017','04-agenda','Selected agenda composition'],
 ['10f280b8-973f-4ad7-967b-f8ddb3152056','05-profile','Selected profile composition'],
 ['26d730e8-2994-4957-b552-314d9125c522','06-settings','Selected settings composition'],
 ['34ff7a29-9918-49c5-b838-67d3800605e9','07-home-mixed','Selected mixed participation home'],
 ['288cb2c9-9e1a-4317-8707-33909bef201e','08-classrooms','Selected classroom cards'],
 ['a9d025e7-a56b-4621-b547-4e17fbcea527','09-home-teacher','Selected teaching participation home'],
 ['caa4e0cb-2416-4263-931a-c08851c1ed66','10-home-learner','Selected learning participation home']
];
for(const [id,name]of refs){
 const dest=path.join(root,`references/${name}.webp`);
 try{await fs.access(dest)}catch{await sharp(`C:/Users/alejo/AppData/Local/Temp/codex-clipboard-${id}.png`).resize({width:1536,withoutEnlargement:true}).webp({quality:85,effort:6}).toFile(dest)}
}
await fs.writeFile(path.join(root,'references/index.json'),JSON.stringify(refs.map(([id,name,note])=>({source:`codex-clipboard-${id}.png`,path:`${name}.webp`,note})),null,2)+'\n');
const brand=await sharp(path.join(root,'assets/brand/logo-horizontal.svg')).resize({width:600}).png().toBuffer();
const mark=await sharp(path.join(root,'assets/brand/mark.svg')).resize(240,240).png().toBuffer();
await sharp({create:{width:1000,height:360,channels:3,background:'#fcfaf7'}}).composite([{input:brand,left:30,top:90},{input:mark,left:720,top:50}]).webp({quality:92}).toFile(path.join(root,'checks/brand-preview.webp'));
const manifest=JSON.parse(await fs.readFile(path.join(root,'asset-manifest.json'),'utf8'));
const layers=[];
for(const [i,a]of manifest.assets.entries()){
 const thumb=await sharp(path.join(root,a.default)).resize(300,205,{fit:'contain',background:'#fcfaf7'}).webp().toBuffer();
 layers.push({input:thumb,left:(i%4)*320+10,top:Math.floor(i/4)*240+10});
 const caption=Buffer.from(`<svg width="300" height="24"><text x="8" y="18" font-family="Arial" font-size="14" fill="#202522">${a.id}</text></svg>`);
 layers.push({input:caption,left:(i%4)*320+10,top:Math.floor(i/4)*240+215});
}
await sharp({create:{width:1280,height:960,channels:3,background:'#fcfaf7'}}).composite(layers).webp({quality:88}).toFile(path.join(root,'checks/asset-contact-sheet.webp'));
console.log(JSON.stringify({references:refs.length,previews:2}));
