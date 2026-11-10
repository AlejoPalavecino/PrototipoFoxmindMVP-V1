import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { loadTsModule } from './helpers/load-ts-module.mjs';

test('study exposes a public browser API without loading presentation or server transport', () => {
 const api = loadTsModule('apps/web/src/features/study/api.ts');
 assert.equal(typeof api.createStudyClient, 'function');
 const source=readFileSync('apps/web/src/features/study/index.ts','utf8');
 assert.match(source,/export/);
 function inspect(directory) { for(const entry of readdirSync(directory,{withFileTypes:true})){const target=join(directory,entry.name); if(entry.isDirectory())inspect(target); else if(/\.tsx?$/.test(entry.name))assert.doesNotMatch(readFileSync(target,'utf8'),/(?:from|import)\s*['"][^'"]*(?:application\/|screens\/|lib\/|components\/|features\/(?!study))/); }}
 inspect('apps/web/src/features/study');
});

test('study public UI and model entry resolves without composition', () => {
 const feature=loadTsModule('apps/web/src/features/study/index.ts');
 for(const name of ['StudyWorkspace','StudyWizard','StudyPracticeView','StudyUpload','createStudyRevisionController'])assert.equal(typeof feature[name], 'function');
});
