import sharp from 'file:///C:/Users/alejo/Documents/ProyectosAlejo/FoxMind/ProtipoFoxMind/node_modules/sharp/dist/index.cjs';
import {copyFile} from 'node:fs/promises';
const source='C:/Users/alejo/.codex/generated_images/01a1d6cc-c2d8-7e61-8b4f-9412445c26c2/exec-7843d72d-2299-4da8-a687-d8887e5c8964.png';
await copyFile(source,'design/foxmind-ui-lab/assets/classroom-world-original.png');
await sharp(source).resize({width:600}).webp({quality:85,alphaQuality:100}).toFile('design/foxmind-ui-lab/assets/classroom-world.webp');
console.log(await sharp('design/foxmind-ui-lab/assets/classroom-world.webp').metadata());
