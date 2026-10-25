import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../checks/browser-20261025');
let count=0;
for(const name of await fs.readdir(root)){
 if(!name.endsWith('.png'))continue;
 const source=path.resolve(root,name);
 if(path.dirname(source)!==root)throw new Error('Proof image outside owned directory');
 const target=source.slice(0,-4)+'.webp';
 await sharp(source).webp({lossless:true,effort:6}).toFile(target);
 const original=await sharp(source).raw().toBuffer();
 const result=await sharp(target).removeAlpha().raw().toBuffer();
 const normalized=await sharp(source).removeAlpha().raw().toBuffer();
 if(!normalized.equals(result))throw new Error('Lossless proof mismatch '+name);
 await fs.unlink(source);count++;
}
console.log(JSON.stringify({convertedProofImages:count,format:'lossless WebP; exact RGB pixels verified'}));
