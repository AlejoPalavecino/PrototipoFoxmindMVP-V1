import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

export const workspacePath = 'src/views/alumno/estudio/StudyChatWorkspace.tsx';
export const chatBaseline = execFileSync('git', [
  'show', 'df3778d771eb6333700daf34732c18dae2b9a42d:' + workspacePath
], { encoding: 'utf8' });
const startMarker = '      const lowerQuery = query.toLowerCase();';
const endMarker = '\n      const aiMsg: StudentStudyMessage = {';
export function responseBlock(source: string): string {
  const start = source.indexOf(startMarker), end = source.indexOf(endMarker, start);
  assert.ok(start > 0 && end > start);
  assert.equal(source.indexOf(startMarker, start + 1), -1);
  return source.slice(start, end);
}
export const chatBlock = responseBlock(chatBaseline);
const factoryImports = ['Flashcard', 'Quiz', 'ConceptMap', 'Summary'].map(name =>
  `import { createStudy${name}Resource } from '../../../features/study/application/study${name}Generation';\r\n`
).join('');
const addedImport = "import { decideStudyChatResponse } from '../../../features/study/application/studyChatResponse';\r\n";
const call = '      const { aiResponseText, generatedTool, suggestedActions } = decideStudyChatResponse(\r\n' +
  '        query, folder, agentMode, setCanvasDocument, onSaveResourceToLibrary\r\n      );\r\n';
export function restoreStudyChatResponse(source: string): string {
  assert.ok(chatBaseline.includes('\n') && !chatBaseline.includes('\r'));
  assert.ok(source.includes('\r\n') && !/(?<!\r)\n|\r(?!\n)/.test(source), 'uniform live CRLF required');
  const imports = source.split(addedImport).length - 1, calls = source.split(call).length - 1;
  const expected = chatBaseline.replace(/\n/g, '\r\n');
  if (imports === 0 && calls === 0) {
    assert.ok(!source.includes('decideStudyChatResponse'), 'reject partial/unexpected extraction');
    assert.equal(source, expected, 'truly absent operation must leave immutable workspace untouched');
    return source;
  }
  assert.equal(imports, 1);
  assert.equal(calls, 1);
  assert.equal(source.match(/decideStudyChatResponse/g)?.length, 2);
  const restored = source.replace(addedImport, factoryImports).replace(call, chatBlock.replace(/\n/g, '\r\n'));
  assert.equal(restored, expected, 'restore only approved operation import/call/block/factory imports');
  return restored;
}
