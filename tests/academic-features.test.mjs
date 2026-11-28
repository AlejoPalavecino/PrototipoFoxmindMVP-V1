import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
const root = 'apps/web/src';
const capabilities = ['classrooms','curriculum','materials','communication','activity-authoring','participation','grading','home','notifications'];
test('academic capabilities expose explicit public entries and implementations', () => {
  for (const capability of capabilities) {
    const directory = `${root}/features/${capability}`;
    assert.ok(existsSync(`${directory}/index.ts`), `${capability} public entry`);
    assert.doesNotMatch(readFileSync(`${directory}/index.ts`, 'utf8'), /export\s+\*/);
    assert.ok(readdirSync(directory, {recursive:true}).filter(name => /\.(ts|tsx)$/.test(name)).length > 1, `${capability} implementation`);
  }
});
test('academic features depend on ports and shared infrastructure, without composition or legacy UI', () => {
  for (const capability of capabilities) {
    const directory = `${root}/features/${capability}`;
    assert.ok(existsSync(directory), `${capability} feature`);
    for (const name of readdirSync(directory, {recursive:true}).filter(name => /\.(ts|tsx)$/.test(name))) {
      const file = path.join(directory,name), source = readFileSync(file,'utf8');
      for (const match of source.matchAll(/(?:from\s*|import\s*\()\s*['"]([^'"]+)['"]/g)) {
        if (!match[1].startsWith('.')) continue;
        const target = path.resolve(path.dirname(file),match[1]).replaceAll('\\','/');
        assert.doesNotMatch(target, /\/(application|screens|classrooms-ui|components)\//, file);
        const feature = /\/features\/([^/]+)\//.exec(target);
        if (feature) assert.equal(feature[1],capability, `${file} imports another feature`);
      }
    }
  }
});
test('academic routes use screen and server composition entries', () => {
  for (const name of ['classrooms','home','notifications']) assert.ok(existsSync(`${root}/screens/${name}-screen.tsx`), name);
  // activity-generation-proxy.ts was retired with F2 (TASK-008): its body check now lives only in the API.
  for (const name of ['classroom','home']) assert.ok(existsSync(`${root}/application/server/${name}-proxy.ts`), name);
});
