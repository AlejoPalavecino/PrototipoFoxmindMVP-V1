import { readdirSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { legacyEdges } from './boundary-legacy-edges.mjs';

const slash = path => path.split(sep).join('/');
function sourceFiles(dir) {
  try { return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(dir, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.[cm]?tsx?$/.test(entry.name) ? [path] : [];
  }); } catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}
function dependencyViolation(file, specifier, root) {
  const target = specifier.startsWith('.') ? slash(relative(root, resolve(dirname(resolve(root, file)), specifier))) : specifier;
  if (file.startsWith('src/core/domain/') && !target.startsWith('src/core/domain/')) return 'domain dependency';
  if ((file.startsWith('apps/classrooms-ui/') || file.startsWith('apps/agenda-ui/') || file.startsWith('apps/shared-ui/') || file.startsWith('apps/p5-preview/') || file.startsWith('apps/web/')) && target.startsWith('apps/api/')) return 'UI to backend';
  const match = file.match(/^apps\/api\/src\/([^/]+)\//);
  const destination = target.match(/^apps\/api\/src\/([^/]+)\/(.+)/);
  if (match && destination && match[1] !== destination[1] && !/^index(?:\.[cm]?tsx?)?$/.test(destination[2])
    && !(['files', 'mail', 'classrooms', 'foxy-ai'].includes(destination[1]) && destination[2] === 'public/index.ts')) return 'cross-module private API';
  return null;
}
export function checkBoundaries(root = process.cwd()) {
  const violations = [];
  for (const directory of ['src/core/domain', 'apps/api/src', 'apps/classrooms-ui', 'apps/agenda-ui', 'apps/shared-ui', 'apps/p5-preview', 'apps/web/src', 'apps/web/pages']) {
    for (const path of sourceFiles(resolve(root, directory))) {
      const file = slash(relative(root, path));
      const source = ts.createSourceFile(file, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
      const visit = node => {
        let specifier;
        if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) specifier = node.moduleSpecifier.text;
        if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || node.expression.getText(source) === 'require') && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) specifier = node.arguments[0].text;
        if (specifier) {
          const kind = dependencyViolation(file, specifier, root);
          const edge = `${file} -> ${specifier}`;
          if (kind && !legacyEdges.has(edge)) violations.push(`${kind}: ${edge}`);
        }
        if (file.startsWith('apps/api/src/classrooms/') && ts.isClassDeclaration(node) && node.heritageClauses?.some(clause => clause.token === ts.SyntaxKind.ExtendsKeyword && clause.types.some(type => type.expression.getText(source) !== 'Error'))) {
          const edge = `${file} -> ${node.name?.text || '<anonymous>'} extends ${node.heritageClauses.find(clause => clause.token === ts.SyntaxKind.ExtendsKeyword).types.map(type => type.expression.getText(source)).join(', ')}`;
          if (!legacyEdges.has(edge)) violations.push(`capability inheritance: ${edge}`);
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
  }
  return violations;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const violations = checkBoundaries();
  if (violations.length) { console.error(violations.join('\n')); process.exitCode = 1; }
  else console.log('Architecture AST boundaries passed');
}
