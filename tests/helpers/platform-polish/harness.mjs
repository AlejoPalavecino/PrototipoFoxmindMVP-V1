// Explicit test-only server scaffolding: production APIs/server loaders are excluded.
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const source = path.resolve(process.argv[2] ?? root);
const dest = path.join(root, '.test-artifacts', process.argv[3] ?? 'platform-polish');
const pages = path.join(dest, 'apps/web/pages');
fs.mkdirSync(path.join(pages, 'api/v1'), { recursive: true });
for (const rel of ['node_modules', 'src', 'apps/shared-ui', 'apps/web/src', 'apps/web/public', 'apps/web/styles']) {
  const target = path.join(dest, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (!fs.existsSync(target)) fs.symlinkSync(path.join(source, rel), target, 'junction');
}
const helpers = path.join(root, 'tests/helpers/platform-polish');
const fixtureDir = path.join(dest, 'apps/web/fixtures');
fs.mkdirSync(fixtureDir, { recursive: true });
for (const filename of fs.readdirSync(helpers).filter(name => /\.tsx?$/.test(name))) {
  const target = filename.endsWith('.tsx') ? pages : fixtureDir;
  const content = fs.readFileSync(path.join(helpers, filename), 'utf8').replace("'./classroom-data'", "'../fixtures/classroom-data'");
  fs.writeFileSync(path.join(target, filename), content);
  // Remove only obsolete generated helper routes from an earlier harness run.
  if (target === fixtureDir && fs.existsSync(path.join(pages, filename))) fs.unlinkSync(path.join(pages, filename));
}
const app = fs.readFileSync(path.join(source, 'apps/web/pages/_app.tsx'), 'utf8');
if (app.includes('../src/application/application-shell.tsx')) {
  const shell = fs.readFileSync(path.join(source, 'apps/web/src/application/application-shell.tsx'), 'utf8');
  fs.writeFileSync(path.join(fixtureDir, 'application-shell.tsx'), shell.replace('<div className="fm3d-theme">', '<div className="fm3d-theme" data-qa-fixture="true">'));
  fs.writeFileSync(path.join(pages, '_app.tsx'), app.replace('../src/application/application-shell.tsx', '../fixtures/application-shell'));
} else {
  fs.writeFileSync(path.join(pages, '_app.tsx'), app.replace('<div className="fm3d-theme">', '<div className="fm3d-theme" data-qa-fixture="true">'));
}
const homeHarness = fs.readFileSync(path.join(root, 'tests/helpers/home-polish/harness.mjs'), 'utf8');
const home = homeHarness.split("'apps/web/pages/index.tsx'), `")[1].split('\n`);')[0];
fs.writeFileSync(path.join(pages, 'inicio.tsx'), home.replace("read:async()=>fixture(mode)", "read:async()=>{if(mode==='loading')await new Promise(()=>{});return fixture(mode)}"));
fs.copyFileSync(path.join(root, 'tests/helpers/agenda-polish/fixture.tsx'), path.join(pages, 'agenda.tsx'));
fs.copyFileSync(path.join(helpers, 'api-fixture.ts'), path.join(pages, 'api/v1/[...path].ts'));
for (const view of ['sign-in','register','verify-email','forgot-password','recover-password','profile','settings']) {
  fs.writeFileSync(path.join(pages, `${view}.tsx`), `import {useEffect,useState} from 'react'; import { AccountScreen } from '../src/screens/identity-screen.tsx';
    export default function Fixture(){const [ready,setReady]=useState(false);useEffect(()=>{if(location.search.includes('mode=token'))window.__foxmindTakeToken=()=> 'synthetic-fixture-proof';setReady(true)},[]);return ready?<AccountScreen view="${view}"/>:null}`);
}
const files = fs.readFileSync(path.join(source, 'apps/web/pages/files.tsx'), 'utf8');
const filesFixtureProps = `export async function getServerSideProps({res}: {res: import('http').ServerResponse}) {
  res.setHeader('Set-Cookie', 'foxmind_qa_fixture_view=files; Path=/api/v1; Max-Age=300; HttpOnly; SameSite=Strict');
  res.setHeader('X-Foxmind-Fixture', 'true');
  return {props:{}};
}`;
fs.writeFileSync(path.join(pages, 'files.tsx'), files.replace(/^export \{ accountPageProps.*$/m, filesFixtureProps));
fs.writeFileSync(path.join(dest, 'apps/web/package.json'), JSON.stringify({private:true,type:'module'}));
fs.writeFileSync(path.join(dest, 'apps/web/next.config.mjs'), 'export default {experimental:{externalDir:true},devIndicators:false,distDir:".next-platform"};');
fs.copyFileSync(path.join(source, 'apps/web/tsconfig.json'), path.join(dest, 'apps/web/tsconfig.json'));
console.log(JSON.stringify({fixture:true,source,dest,start:`node node_modules/next/dist/bin/next dev "${path.join(dest, 'apps/web')}" --webpack --hostname 127.0.0.1 --port 53181`}));
