// Opt-in native QA fixture. Actual components/CSS; in-memory API only.
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd(), dest = path.join(root, '.test-artifacts/agenda-polish');
fs.mkdirSync(path.join(dest, 'apps/web/pages'), { recursive: true });
for (const rel of ['node_modules', 'src', 'apps/classrooms-ui', 'apps/shared-ui', 'apps/agenda-ui', 'apps/web/public', 'apps/web/styles']) {
  const target = path.join(dest, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (!fs.existsSync(target)) fs.symlinkSync(path.join(root, rel), target, 'junction');
}
fs.copyFileSync(path.join(root, 'apps/web/pages/_app.tsx'), path.join(dest, 'apps/web/pages/_app.tsx'));
fs.copyFileSync(path.join(root, 'tests/helpers/agenda-polish/fixture.tsx'), path.join(dest, 'apps/web/pages/index.tsx'));
fs.writeFileSync(path.join(dest, 'apps/web/package.json'), JSON.stringify({ private: true, type: 'module' }));
fs.writeFileSync(path.join(dest, 'apps/web/next.config.mjs'), 'export default {experimental:{externalDir:true},devIndicators:false};');
fs.writeFileSync(path.join(dest, 'apps/web/tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'ES2023', lib: ['dom', 'dom.iterable', 'esnext'], skipLibCheck: true, strict: true, noEmit: true, module: 'esnext', esModuleInterop: true, moduleResolution: 'bundler', allowImportingTsExtensions: true, jsx: 'react-jsx' }, include: ['pages/**/*.tsx'] }));
console.log(dest);
