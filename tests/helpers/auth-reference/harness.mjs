// Explicitly invoked auth component fixture; no production page loaders/API proxy.
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(),dest=path.join(root,'.test-artifacts/auth-reference');
const pages=path.join(dest,'apps/web/pages'),helpers=path.join(root,'tests/helpers/auth-reference');
fs.mkdirSync(path.join(pages,'api/v1'),{recursive:true});
for(const rel of ['node_modules', 'src', 'apps/shared-ui', 'apps/web/src', 'apps/web/public', 'apps/web/styles']){
  const target=path.join(dest,rel);fs.mkdirSync(path.dirname(target),{recursive:true});
  if(!fs.existsSync(target))fs.symlinkSync(path.join(root,rel),target,'junction');
}
fs.copyFileSync(path.join(helpers,'api-fixture.ts'),path.join(pages,'api/v1/[...path].ts'));
fs.copyFileSync(path.join(root,'apps/web/pages/_app.tsx'),path.join(pages,'_app.tsx'));
fs.copyFileSync(path.join(root,'apps/web/postcss.config.mjs'),path.join(dest,'apps/web/postcss.config.mjs'));
fs.copyFileSync(path.join(root,'apps/web/tsconfig.json'),path.join(dest,'apps/web/tsconfig.json'));
for(const view of ['sign-in','register','forgot-password']){
  fs.writeFileSync(path.join(pages,`${view}.tsx`),`import { AccountScreen } from '../src/screens/identity-screen.tsx';
export default function Fixture(){return <div data-qa-fixture="auth-reference"><AccountScreen view="${view}"/></div>}`);
}
fs.writeFileSync(path.join(dest,'apps/web/package.json'),JSON.stringify({private:true,type:'module'}));
fs.writeFileSync(path.join(dest,'apps/web/next.config.mjs'),'export default {experimental:{externalDir:true},devIndicators:false};');
console.log(JSON.stringify({fixture:true,dest,port:53193}));
