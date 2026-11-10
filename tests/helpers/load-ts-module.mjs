import { existsSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

// Test-only in-memory loading of real source modules, including extensionless TS helpers.
export function loadTsModule(path, { stubs = {} } = {}) {
  const cache = new Map();
  function load(filename) {
    filename = resolve(filename);
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} }, nativeRequire = createRequire(filename);
    cache.set(filename, module);
    const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
      fileName: filename,
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2023 },
      transformers: { before: [context => source => {
        const visit = node => {
          if (ts.isPropertyAccessExpression(node) && node.name.text === 'url'
            && ts.isMetaProperty(node.expression) && node.expression.keywordToken === ts.SyntaxKind.ImportKeyword
            && node.expression.name.text === 'meta') return context.factory.createStringLiteral(pathToFileURL(filename).href);
          return ts.visitEachChild(node, visit, context);
        };
        return ts.visitNode(source, visit);
      }] },
    }).outputText;
    const require = specifier => {
      if (Object.hasOwn(stubs, specifier)) return stubs[specifier];
      if (specifier.endsWith('.module.css')) return { default: { scope: 'test-surface' } };
      if (specifier.startsWith('.')) {
        const base = resolve(dirname(filename), specifier);
        const source = [base, `${base}.tsx`, `${base}.ts`, resolve(base, 'index.tsx'), resolve(base, 'index.ts')]
          .find(candidate => /\.tsx?$/.test(candidate) && existsSync(candidate) && statSync(candidate).isFile());
        if (source) return load(source);
      }
      return nativeRequire(specifier);
    };
    new Function('require', 'module', 'exports', code)(require, module, module.exports);
    return module.exports;
  }
  return load(path);
}
