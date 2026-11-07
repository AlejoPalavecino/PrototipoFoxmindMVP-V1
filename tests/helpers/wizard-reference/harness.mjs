// Explicit fixture scaffolding. Production page loaders and APIs are never copied.
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd(), dest = path.join(root, '.test-artifacts/wizard-reference');
const pages = path.join(dest, 'apps/web/pages'), fixtures = path.join(dest, 'apps/web/fixtures'), publicDir = path.join(dest, 'apps/web/public');
for (const dir of [pages, fixtures, publicDir]) fs.mkdirSync(dir, { recursive: true });
for (const rel of ['node_modules', 'src', 'apps/classrooms-ui', 'apps/shared-ui', 'apps/agenda-ui', 'apps/web/styles', 'apps/web/src']) {
  const target = path.join(dest, rel); fs.mkdirSync(path.dirname(target), { recursive: true });
  if (!fs.existsSync(target)) fs.symlinkSync(path.join(root, rel), target, 'junction');
}
for (const entry of fs.readdirSync(path.join(root, 'apps/web/public'), { withFileTypes: true })) {
  const source = path.join(root, 'apps/web/public', entry.name), target = path.join(publicDir, entry.name);
  if (!fs.existsSync(target)) { if (entry.isDirectory()) fs.symlinkSync(source, target, 'junction'); else fs.copyFileSync(source, target); }
}
const helpers = path.join(root, 'tests/helpers/wizard-reference');
fs.copyFileSync(path.join(helpers, 'fixture.tsx'), path.join(pages, 'wizard.tsx'));
fs.copyFileSync(path.join(helpers, 'data.ts'), path.join(fixtures, 'wizard-data.ts'));
for (const file of ['tsconfig.json', 'postcss.config.mjs']) fs.copyFileSync(path.join(root, 'apps/web', file), path.join(dest, 'apps/web', file));
fs.copyFileSync(path.join(root, 'apps/web/pages/_app.tsx'), path.join(pages, '_app.tsx'));
fs.writeFileSync(path.join(dest, 'apps/web/package.json'), JSON.stringify({ private: true, type: 'module' }));
fs.writeFileSync(path.join(dest, 'apps/web/next.config.mjs'), 'export default {experimental:{externalDir:true},devIndicators:false};');
const sampleDir = path.join(publicDir, 'wizard-reference-fixtures'); fs.mkdirSync(sampleDir, { recursive: true });
const stream = 'BT /F1 14 Tf 50 750 Td (Synthetic Biology Study Plan) Tj 0 -30 Td (Unit 1: Living things. Topic: Cells.) Tj ET';
const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
let pdf = '%PDF-1.4\n'; const offsets = [0];
objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
const xref = Buffer.byteLength(pdf); pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => String(offset).padStart(10, '0') + ' 00000 n ').join('\n')}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
fs.writeFileSync(path.join(sampleDir, 'plan.pdf'), pdf);
fs.writeFileSync(path.join(sampleDir, 'invalid.txt'), 'Synthetic unsupported file for UI validation.');
console.log(JSON.stringify({ fixture: true, dest, port: 53195 }));
