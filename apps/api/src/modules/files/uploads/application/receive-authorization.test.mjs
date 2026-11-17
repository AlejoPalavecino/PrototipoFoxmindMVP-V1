import test from 'node:test';
import assert from 'node:assert/strict';

test('HTTP receive contract accepts Buffer and rejects broader Uint8Array input', async () => {
  const ts = (await import('typescript')).default;
  const { resolve } = await import('node:path');
  const file = resolve('apps/api/src/modules/files/uploads/application/receive-contract-fixture.ts');
  const source = [
    "import type { FileHttpPort } from './ports.ts';",
    'declare const http: FileHttpPort;',
    "http.receive({}, 'file', Buffer.from([1]));",
    '// @ts-expect-error File custody accepts Buffer, not every Uint8Array.',
    "http.receive({}, 'file', new Uint8Array([1]));",
  ].join('\n');
  const options = { strict: true, noEmit: true, skipLibCheck: true, allowImportingTsExtensions: true,
    target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext };
  const host = ts.createCompilerHost(options);
  const readSource = host.getSourceFile.bind(host);
  host.getSourceFile = (name, ...args) => resolve(name) === file
    ? ts.createSourceFile(file, source, options.target, true) : readSource(name, ...args);
  const program = ts.createProgram([file], options, host);
  const diagnostics = ts.getPreEmitDiagnostics(program).filter(item => item.file && resolve(item.file.fileName) === file);
  assert.deepEqual(diagnostics.map(item => ts.flattenDiagnosticMessageText(item.messageText, '\n')), []);
});
import { FileUseCases } from './file-use-cases.ts';
import { FileError } from '../../domain/errors.ts';

test('receive authorization projects expected bytes inside the authorized transaction', async () => {
  const tx = {}, request = {}, calls = [];
  class UseCases extends FileUseCases {}
  const service = new UseCases({
    transaction: async run => { calls.push('transaction'); return run(tx); },
    loadAuthorized: async (...args) => { calls.push(args); return { size_bytes: 123n, storage_key: 'private' }; },
  });
  assert.deepEqual(await service.authorizeReceive(request, 'file-id'), { expectedBytes: 123 });
  assert.deepEqual(calls, ['transaction', [tx, request, 'file-id', 'upload']]);
});

test('receive authorization preserves custody rejection identity', async () => {
  const rejection = new FileError('FORBIDDEN');
  class UseCases extends FileUseCases {}
  const service = new UseCases({ transaction: run => run({}), loadAuthorized: async () => { throw rejection; } });
  await assert.rejects(service.authorizeReceive({}, 'file-id'), error => error === rejection);
});
