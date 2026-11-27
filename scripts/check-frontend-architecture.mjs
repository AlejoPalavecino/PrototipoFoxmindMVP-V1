import { readdirSync, readFileSync } from 'node:fs';
import { resolve, posix } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

function sources(root, directory) {
  try {
    return readdirSync(resolve(root, directory), { withFileTypes: true }).flatMap(entry => {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') return [];
      const file = directory + '/' + entry.name;
      return entry.isDirectory() ? sources(root, file) : /\.(?:tsx?|css)$/.test(file) && !file.includes('.test.') ? [file] : [];
    });
  } catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}

export function checkFrontendArchitecture(root = process.cwd()) {
  const findings = [];
  for (const file of [...sources(root, 'apps/web/src'), ...sources(root, 'apps/shared-ui')]) {
    const text = readFileSync(resolve(root, file), 'utf8');
    const target = specifier => specifier.startsWith('.') ? posix.normalize(posix.join(posix.dirname(file), specifier)) : specifier;
    if (file.endsWith('.css')) {
      if (file.startsWith('apps/shared-ui/')) {
        for (const match of text.matchAll(/@import\s+['"]([^'"]+)['"]/g)) {
          const imported = target(match[1]);
          if (imported.startsWith('apps/') && !imported.startsWith('apps/shared-ui/')) findings.push('shared style dependency: ' + file + ' -> ' + imported);
        }
      }
      continue;
    }
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    const typedPresentation = /^apps\/web\/src\/features\/(?:materials|activity-authoring|grading)\/.+\.tsx$/.test(file);
    const transport = file.startsWith('apps/web/src/application/transport/');
    const navigation = file.startsWith('apps/web/src/application/navigation/');
    const inspectImport = specifier => {
      if (!specifier || !ts.isStringLiteralLike(specifier)) return;
      const imported = target(specifier.text);
      if (/^src\/core\/domain\/index(?:\.ts)?$/.test(imported)) findings.push('global domain aggregate: ' + file);
      // Composition (clients) builds on transport; the reverse edge is a cycle.
      if (transport && imported.startsWith('apps/web/src/application/clients/')) findings.push('transport depends on clients: ' + file);
    };
    const line = node => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
    function visit(node) {
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) inspectImport(node.moduleSpecifier);
      if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) inspectImport(node.argument.literal);
      if (ts.isCallExpression(node)) {
        if (node.expression.kind === ts.SyntaxKind.ImportKeyword) inspectImport(node.arguments[0]);
        const expression = node.expression.getText(sf);
        if (typedPresentation && (expression === 'fetch' || /^(?:api|client)\.call$/.test(expression))) findings.push('raw HTTP in feature presentation: ' + file + ':' + line(node));
        if (navigation && /(?:^|\.)fetch$/.test(expression)) findings.push('HTTP in navigation: ' + file + ':' + line(node));
      }
      if (navigation && ts.isNewExpression(node) && /(?:^|\.)EventSource$/.test(node.expression.getText(sf))) findings.push('HTTP in navigation: ' + file + ':' + line(node));
      ts.forEachChild(node, visit);
    }
    visit(sf);
  }
  return [...new Set(findings)].sort();
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const findings = checkFrontendArchitecture();
  if (findings.length) { console.error(findings.join('\n')); process.exitCode = 1; }
  else console.log('Frontend ownership boundaries passed');
}
