// Synthetic real-component fixture: no production page loaders or API proxy.
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd(), dest = path.join(root, '.test-artifacts/classrooms-reference');
const pages = path.join(dest, 'apps/web/pages'), fixtures = path.join(dest, 'apps/web/fixtures');
fs.mkdirSync(pages, { recursive: true }); fs.mkdirSync(fixtures, { recursive: true });
for (const rel of ['node_modules', 'src', 'apps/classrooms-ui', 'apps/shared-ui', 'apps/agenda-ui', 'apps/web/public', 'apps/web/styles', 'apps/web/src']) {
  const target = path.join(dest, rel); fs.mkdirSync(path.dirname(target), { recursive: true });
  if (!fs.existsSync(target)) fs.symlinkSync(path.join(root, rel), target, 'junction');
}
const helpers = path.join(root, 'tests/helpers/classrooms-reference');
fs.copyFileSync(path.join(helpers, 'fixture.tsx'), path.join(pages, 'mis-aulas.tsx'));
fs.copyFileSync(path.join(helpers, 'data.ts'), path.join(fixtures, 'collection-data.ts'));
fs.copyFileSync(path.join(root, 'apps/web/pages/_app.tsx'), path.join(pages, '_app.tsx'));
fs.copyFileSync(path.join(root, 'apps/web/postcss.config.mjs'), path.join(dest, 'apps/web/postcss.config.mjs'));
fs.copyFileSync(path.join(root, 'apps/web/tsconfig.json'), path.join(dest, 'apps/web/tsconfig.json'));
fs.writeFileSync(path.join(dest, 'apps/web/package.json'), JSON.stringify({ private: true, type: 'module' }));
fs.writeFileSync(path.join(dest, 'apps/web/next.config.mjs'), 'export default {experimental:{externalDir:true},devIndicators:false};');
console.log(JSON.stringify({ fixture: true, dest, port: 53194 }));
