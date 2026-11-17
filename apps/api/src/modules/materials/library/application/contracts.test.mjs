import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import ts from 'typescript';

test('library repository requires scoped commands and concrete results; files do not own revisions', () => {
  const path = resolve('apps/api/src/modules/materials/library/application/type-fixture.ts');
  const source = [
    "import type { LibraryRepository } from './library-repository.ts';",
    "import type { Transaction, RevisionPort } from '../../../classrooms/public.ts';",
    "import type { ClassroomFileOperations, MaterialPublicationDependencies } from '../../publication/public.ts';",
    'declare const repository: LibraryRepository;',
    'declare const tx: Transaction;',
    'declare const files: ClassroomFileOperations;',
    'declare const advanceRevision: RevisionPort;',
    "repository.lockMaterial(tx, { materialId: 'material', classroomId: 'room' });",
    'const publication: MaterialPublicationDependencies = { ...files, advanceRevision };',
    '// @ts-expect-error Required classroom scope is not optional.',
    "repository.lockMaterial(tx, { materialId: 'material' });",
    '// @ts-expect-error The caller cannot choose the returned SQL shape.',
    "repository.listMaterials<{ arbitrary: true }>(tx, { classroomId: 'room', includeDeleted: true });",
    '// @ts-expect-error SQL parameters cannot be supplied positionally.',
    "repository.updateOrganization(tx, 'material', 'title', null, null);",
    '// @ts-expect-error The file operation contract does not own classroom revision.',
    'files.advanceRevision;',
    "repository.listMaterials(tx, { classroomId: 'room', includeDeleted: true }).then(rows => {",
    '  const ready: boolean = rows[0].ready;',
    '  // @ts-expect-error Material readiness is a boolean.',
    '  const invalid: string = rows[0].ready;',
    '});',
  ].join('\n');
  const options = { strict: true, noEmit: true, skipLibCheck: true, allowImportingTsExtensions: true,
    target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext };
  const host = ts.createCompilerHost(options);
  const getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (file, ...args) => resolve(file) === path
    ? ts.createSourceFile(path, source, options.target, true) : getSourceFile(file, ...args);
  const program = ts.createProgram([path], options, host);
  const diagnostics = ts.getPreEmitDiagnostics(program).filter(item => item.file && resolve(item.file.fileName) === path);
  assert.deepEqual(diagnostics.map(item => ts.flattenDiagnosticMessageText(item.messageText, '\n')), []);
});
