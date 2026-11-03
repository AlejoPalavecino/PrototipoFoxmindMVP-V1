import { readdirSync, readFileSync } from 'node:fs';
import { dirname, posix, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { cycleEdges } from './boundary-cycles.mjs';
import { legacyEdges } from './boundary-legacy-edges.mjs';

const roots = ['src/core/domain', 'apps/api/src', 'apps/classrooms-ui', 'apps/agenda-ui', 'apps/shared-ui', 'apps/p5-preview', 'apps/web'];
const slash = path => path.split(sep).join('/');
const publicBarrels = new Set(['files', 'mail', 'classrooms', 'foxy-ai'].map(name => 'apps/api/src/' + name + '/public/index.ts'));
const hostFiles = new Set(['application.ts', 'main.ts', 'configuration.ts', 'attachment-integration.ts', 'foxy-file-integration.ts'].map(name => 'apps/api/src/' + name));
const apiSlice = path => /^apps\/api\/src\/([^/]+)\//.exec(path)?.[1];
const isLiteral = node => node && ts.isStringLiteralLike(node);

function sourceFiles(dir) {
  try {
    return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
      const path = resolve(dir, entry.name);
      if (entry.name.startsWith('.') || entry.name === 'node_modules') return [];
      return entry.isDirectory() ? sourceFiles(path) : /\.[cm]?tsx?$/.test(entry.name) ? [path] : [];
    });
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

function canonicalTarget(file, specifier, files, caseFolded) {
  if (!specifier.startsWith('.')) return specifier;
  const path = posix.normalize(posix.join(posix.dirname(file), specifier.replaceAll('\\', '/'))).replace(/\/$/, '');
  let candidates;
  if (path.endsWith('.mjs')) candidates = [path.slice(0, -4) + '.mts', path];
  else if (path.endsWith('.cjs')) candidates = [path.slice(0, -4) + '.cts', path];
  else if (path.endsWith('.js') || path.endsWith('.jsx')) {
    const stem = path.slice(0, path.lastIndexOf('.'));
    candidates = [stem + '.ts', stem + '.tsx', path];
  } else candidates = [path, path + '.ts', path + '.tsx', path + '/index.ts', path + '/index.tsx'];
  return candidates.find(candidate => files.has(candidate)) ??
    candidates.map(candidate => caseFolded.get(candidate.toLowerCase())).find(Boolean) ?? path;
}

function importMode(clause) {
  const bindings = clause?.namedBindings;
  return clause?.isTypeOnly || (!clause?.name && bindings && ts.isNamedImports(bindings) &&
    bindings.elements.length && bindings.elements.every(item => item.isTypeOnly)) ? 'type' : 'eager';
}

function names(clause) {
  if (!clause) return '';
  if (!ts.isNamedImports(clause) && !ts.isNamedExports(clause)) return '* as ' + clause.name.text;
  return '{' + clause.elements.map(item => {
    const name = item.name.text;
    const alias = item.propertyName ? item.propertyName.text + ' as ' : '';
    return (item.isTypeOnly ? 'type ' : '') + alias + name;
  }).sort().join(', ') + '}';
}

function requireMode(node) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (ts.isFunctionLike(parent)) return 'deferred';
  }
  return 'eager';
}

function requireCalls(source) {
  const factories = new Set();
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !['node:module', 'module'].includes(statement.moduleSpecifier.text)) continue;
    const bindings = statement.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) {
      for (const item of bindings.elements) {
        if ((item.propertyName ?? item.name).text === 'createRequire') factories.add(item.name.text);
      }
    } else if (bindings) factories.add(bindings.name.text + '.createRequire');
    if (statement.importClause?.name) factories.add(statement.importClause.name.text + '.createRequire');
  }
  function reference(node) {
    if (ts.isIdentifier(node)) return node.text;
    if (ts.isParenthesizedExpression(node)) return reference(node.expression);
    if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression)) return node.expression.text + '.' + node.name.text;
    if (ts.isElementAccessExpression(node) && ts.isIdentifier(node.expression) && isLiteral(node.argumentExpression)) {
      return node.expression.text + '.' + node.argumentExpression.text;
    }
  }
  const fromFactory = node => node && ts.isCallExpression(node) && factories.has(reference(node.expression));
  const loaders = new Set(['require', 'module.require']);
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && fromFactory(node.initializer)) loaders.add(node.name.text);
    ts.forEachChild(node, visit);
  }
  if (factories.size) visit(source);
  return expression => loaders.has(reference(expression)) || fromFactory(expression);
}

function bindingPattern(pattern, source) {
  if (!ts.isObjectBindingPattern(pattern)) return pattern.getText(source);
  const entries = pattern.elements.map(item => {
    const property = item.propertyName ?? item.name;
    const key = ts.isIdentifier(property) || ts.isStringLiteral(property) ? property.text : property.getText(source);
    return (item.dotDotDotToken ? '...' : '') + key;
  });
  return '{' + entries.sort().join(', ') + '}';
}

function loadBinding(node, source) {
  let expression = node;
  while (ts.isAwaitExpression(expression.parent) || ts.isParenthesizedExpression(expression.parent)) expression = expression.parent;
  const context = expression.parent;
  if (ts.isVariableDeclaration(context)) {
    if (ts.isObjectBindingPattern(context.name)) {
      return bindingPattern(context.name, source);
    }
    if (ts.isIdentifier(context.name) && ts.isVariableStatement(context.parent.parent)) {
      const members = new Set();
      const name = context.name.text;
      function collect(use) {
        if (use !== context.name && ts.isIdentifier(use) && use.text === name) {
          const parent = use.parent;
          if (ts.isPropertyAccessExpression(parent) && parent.expression === use) members.add(parent.name.text);
          else if (ts.isElementAccessExpression(parent) && parent.expression === use && isLiteral(parent.argumentExpression)) members.add(parent.argumentExpression.text);
          else members.add('*');
        }
        ts.forEachChild(use, collect);
      }
      collect(context.parent.parent.parent);
      return 'binding ' + name + ': ' + [...members].sort().join(', ');
    }
    return 'binding ' + context.name.getText(source);
  }
  if (ts.isPropertyAccessExpression(context)) {
    if (context.name.text === 'then' && ts.isCallExpression(context.parent)) {
      const callback = context.parent.arguments[0];
      if (callback && ts.isFunctionLike(callback) && callback.parameters[0]) return 'then ' + bindingPattern(callback.parameters[0].name, source);
    }
    return 'member ' + context.name.text;
  }
  return '';
}

function qualifierName(node) {
  if (!node) return '';
  return ts.isQualifiedName(node) ? qualifierName(node.left) + '.' + node.right.text : node.text;
}

function dependency(node, source, isRequire) {
  if (ts.isImportDeclaration(node) && isLiteral(node.moduleSpecifier)) {
    const clause = node.importClause;
    const binding = [clause?.name?.text, names(clause?.namedBindings)].filter(Boolean).join(', ');
    return [node.moduleSpecifier.text, 'import', importMode(clause), binding];
  }
  if (ts.isExportDeclaration(node) && isLiteral(node.moduleSpecifier)) {
    const clause = node.exportClause;
    const typeOnly = node.isTypeOnly || (clause && ts.isNamedExports(clause) &&
      clause.elements.length && clause.elements.every(item => item.isTypeOnly));
    return [node.moduleSpecifier.text, 'reexport', typeOnly ? 'type' : 'eager', names(clause) || '*'];
  }
  if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && isLiteral(node.argument.literal)) {
    return [node.argument.literal.text, 'inline', 'type', (node.isTypeOf ? 'typeof ' : '') + qualifierName(node.qualifier)];
  }
  if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference) && isLiteral(node.moduleReference.expression)) {
    return [node.moduleReference.expression.text, 'import-equals', node.isTypeOnly ? 'type' : 'eager', ''];
  }
  if (ts.isCallExpression(node)) {
    const dynamic = node.expression.kind === ts.SyntaxKind.ImportKeyword;
    const require = !dynamic && isRequire(node.expression);
    if (dynamic || require) return [isLiteral(node.arguments[0]) ? node.arguments[0].text : null,
      dynamic ? 'dynamic' : 'require', dynamic ? 'deferred' : requireMode(node), loadBinding(node, source)];
  }
}

function boundary({ file, target, form, binding }) {
  if (!target) return 'nonliteral module load';
  if (/^(?:[\\/]|[a-z]:|file:)/i.test(target)) return 'absolute module path';
  if (file.startsWith('src/core/domain/') && !target.startsWith('src/core/domain/')) return 'domain dependency';
  if (roots.slice(2).some(root => file.startsWith(root + '/')) && target.startsWith('apps/api/')) return 'UI to backend';
  const from = apiSlice(file), to = apiSlice(target);
  if (publicBarrels.has(file) && target.startsWith('apps/api/src/')) return 'public surface dependency';
  if (from && hostFiles.has(target)) return 'host-only dependency';
  if (hostFiles.has(file) || !to || from === to) return null;
  if (publicBarrels.has(target)) {
    if ((form !== 'import' && form !== 'inline') || /\* as |\b(?:FileStore|FileService|ClassroomService)\b/.test(binding)) return 'public surface dependency';
    return null;
  }
  if (/^apps\/api\/src\/[^/]+\/index(?:\.[cm]?tsx?)?$/.test(target)) return 'broad barrel dependency';
  return 'cross-module private API';
}

const edgeKey = ({ file, target, form, mode, binding }) => [file, target, form, mode, binding].join(' | ');

export function inspectBoundaries(root) {
  const paths = roots.flatMap(directory => sourceFiles(resolve(root, directory)));
  const files = new Set(paths.map(path => slash(relative(root, path))));
  const caseFolded = new Map([...files].map(file => [file.toLowerCase(), file]));
  const edges = new Map();
  const findings = [];
  for (const path of paths) {
    const file = slash(relative(root, path));
    const source = ts.createSourceFile(file, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
    const isRequire = requireCalls(source);
    function visit(node) {
      const imported = dependency(node, source, isRequire);
      if (imported) {
        const [specifier, form, mode, binding] = imported;
        const target = specifier === null ? null : canonicalTarget(file, specifier, files, caseFolded);
        const edge = { file, target, form, mode, binding };
        edges.set(edgeKey(edge), edge);
      }
      if (file.startsWith('apps/api/src/classrooms/') && ts.isClassDeclaration(node)) {
        const heritage = node.heritageClauses?.find(clause => clause.token === ts.SyntaxKind.ExtendsKeyword);
        const base = heritage?.types.map(type => type.expression.getText(source)).join(', ');
        if (base && base !== 'Error') findings.push(['capability inheritance', file + ' -> ' + (node.name?.text ?? '<anonymous>') + ' extends ' + base]);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  for (const [key, edge] of edges) {
    const kind = boundary(edge);
    if (kind) findings.push([kind, key]);
  }
  for (const [edge, kind] of cycleEdges([...edges.values()].filter(edge => files.has(edge.target)))) {
    findings.push([kind, edgeKey(edge)]);
  }
  return findings.map(([kind, key]) => kind + ': ' + key).sort();
}

export function checkBoundaries(root = process.cwd(), { checkStale = false } = {}) {
  const findings = new Set(inspectBoundaries(root));
  const violations = [...findings].filter(finding => !legacyEdges.has(finding));
  if (checkStale) {
    for (const key of legacyEdges.keys()) {
      if (!findings.has(key)) violations.push('stale architecture exception: ' + key);
    }
  }
  return violations;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const violations = checkBoundaries(process.cwd(), { checkStale: true });
  if (violations.length) { console.error(violations.join('\n')); process.exitCode = 1; }
  else console.log('Architecture AST boundaries passed (' + legacyEdges.size + ' frozen exceptions)');
}
