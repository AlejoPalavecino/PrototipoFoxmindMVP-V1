// Isolated, synthetic-only fixture: no production API routes or environment files.
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd(), dest = path.join(root, '.test-artifacts/classroom-interior-reference');
const web = path.join(dest, 'apps/web'), pages = path.join(web, 'pages'), fixtures = path.join(web, 'fixtures');
for (const folder of [pages, fixtures]) fs.mkdirSync(folder, { recursive: true });
for (const rel of ['node_modules', 'src', 'apps/shared-ui', 'apps/web/src', 'apps/web/styles', 'apps/web/public']) {
  const target = path.join(dest, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (!fs.existsSync(target)) fs.symlinkSync(path.join(root, rel), target, 'junction');
}
fs.copyFileSync(path.join(root, 'tests/helpers/classroom-interior-reference/classroom.tsx'), path.join(pages, 'classroom.tsx'));
for (const [source, target] of [
  ['classrooms-reference/fixture.tsx', 'mis-aulas.tsx'],
  ['wizard-reference/fixture.tsx', 'wizard.tsx'],
]) fs.copyFileSync(path.join(root, 'tests/helpers', source), path.join(pages, target));
for (const [source, target] of [
  ['classrooms-reference/data.ts', 'collection-data.ts'],
  ['wizard-reference/data.ts', 'wizard-data.ts'],
]) fs.copyFileSync(path.join(root, 'tests/helpers', source), path.join(fixtures, target));
fs.writeFileSync(path.join(pages, 'grading.tsx'), fs.readFileSync(path.join(root, 'tests/helpers/platform-polish/grading.tsx'), 'utf8').replace("from './classroom-data'", "from '../fixtures/classroom-data'"));
fs.copyFileSync(path.join(root, 'tests/helpers/platform-polish/classroom-data.ts'), path.join(fixtures, 'classroom-data.ts'));
fs.copyFileSync(path.join(root, 'tests/helpers/classroom-interior-reference/literature-data.ts'), path.join(fixtures, 'literature-data.ts'));
fs.writeFileSync(path.join(fixtures, 'redesign-client.ts'), fs.readFileSync(path.join(root, 'tests/helpers/classroom-interior-reference/redesign-client.ts'),'utf8')
  .replace('../platform-polish/classroom-data','./classroom-data'));
fs.copyFileSync(path.join(root, 'apps/web/pages/_app.tsx'), path.join(pages, '_app.tsx'));
for (const file of ['tsconfig.json', 'postcss.config.mjs']) fs.copyFileSync(path.join(root, 'apps/web', file), path.join(web, file));
fs.writeFileSync(path.join(web, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
fs.writeFileSync(path.join(web, 'next.config.mjs'), 'export default {experimental:{externalDir:true},devIndicators:false,distDir:".next-interior"};');
console.log(JSON.stringify({ fixture: true, dest, port: 53196, modes: ['literature','teacher','student','archived','empty','error','loading'] }));
