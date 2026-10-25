import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = JSON.parse(await fs.readFile(path.join(root, 'sources/generation-manifest.json'), 'utf8'));
const descriptions = {
  'hero/welcome-learn': 'Foxy junto a libros; saludo de aprendizaje, mixto o neutro.',
  'hero/welcome-teach': 'Foxy escribiendo; saludo de enseñanza.',
  'scenes/auth': 'Foxy da la bienvenida junto a un libro.',
  'scenes/profile': 'Foxy sentado junto a un cuaderno.',
  'scenes/security': 'Foxy y escudo; acompañamiento de seguridad.',
  'scenes/agenda': 'Foxy y calendario decorativo sin fechas.',
  'states/empty': 'Foxy y caja vacía; inicio o colección sin contenido.',
  'states/success': 'Foxy con confirmación; solo tras éxito confirmado.',
  'states/unavailable': 'Foxy con lupa; búsqueda o recuperación, según texto.',
  'covers/literature': 'Libro y castillo; literatura.',
  'covers/math': 'Cuerpos geométricos; matemática.',
  'covers/biology': 'Microscopio y planta; biología.',
  'covers/society': 'Globo y arquitectura; ciencias sociales.',
  'covers/science': 'Modelo, matraz y computadora; ciencias y tecnología.',
  'covers/creative': 'Paleta e instrumento; creación artística.',
  'covers/general': 'Libros y útiles; cualquier materia.'
};
const entries = [];
for (const item of source.assets) {
  const master = path.join(root, 'masters', `${item.id}.webp`);
  await fs.mkdir(path.dirname(master), { recursive: true });
  try { await fs.access(master); } catch {
    await sharp(item.source).rotate().webp({ lossless: true, effort: 6 }).toFile(master);
  }
  const metadata = await sharp(master).metadata();
  const group = item.id.split('/')[0];
  const widths = group === 'hero' ? [480, 960, 1600] : group === 'covers' ? [320, 640, 1200] : group === 'states' ? [160, 320, 640] : [320, 640, 960];
  const variants = [];
  for (const width of widths) {
    const isDefault = width === widths[widths.length - 1];
    const relative = `assets/${item.id}${isDefault ? '' : `-${width}`}.webp`;
    const target = path.join(root, relative);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await sharp(master).resize({ width, withoutEnlargement: true }).webp({ quality: group === 'states' ? 84 : 80, alphaQuality: 100, effort: 6 }).toFile(target);
    const m = await sharp(target).metadata();
    const bytes = await fs.readFile(target);
    variants.push({ path: relative, width: m.width, height: m.height, bytes: bytes.length, format: m.format, alpha: !!m.hasAlpha, sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
  }
  entries.push({ id: item.id, description: descriptions[item.id], default: variants.at(-1).path, master: `masters/${item.id}.webp`, sourceDimensions: { width: metadata.width, height: metadata.height }, decorative: true, alt: '', objectPosition: group === 'hero' ? 'right center' : 'center', textSafe: group === 'hero' ? 'left 0–54%; use HTML text, mobile separate image/text' : null, variants });
}
const all = entries.flatMap(e => e.variants);
await fs.writeFile(path.join(root, 'asset-manifest.json'), JSON.stringify({ version: 1, created: '2026-10-25', encoding: 'WebP quality80; cutouts84/alpha100; lossless WebP masters', legacyCoverMapping: { explore: 'covers/general', create: 'covers/creative', discover: 'covers/science' }, assets: entries, totals: { uniqueIllustrations: entries.length, responsiveFiles: all.length, bytes: all.reduce((n, a) => n + a.bytes, 0), largestBytes: Math.max(...all.map(a => a.bytes)) } }, null, 2) + '\n');
console.log(JSON.stringify({ assets: entries.length, variants: all.length, totalBytes: all.reduce((n,a)=>n+a.bytes,0), largestBytes: Math.max(...all.map(a=>a.bytes)), alphaAssets: entries.filter(e=>e.variants[0].alpha).length }));
