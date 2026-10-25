import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import ts from 'typescript';

// Test-only dependency seam: execute the real component, replace its external ports.
export function componentWithPorts(filename, ports) {
  const path = resolve(filename), native = createRequire(path), module = { exports: {} };
  const code = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const require = specifier => {
    if (ports[specifier]) return ports[specifier];
    if (specifier.startsWith('.')) {
      const base = resolve(dirname(path), specifier);
      const source = [`${base}.ts`, `${base}.tsx`, base].find(candidate => /\.tsx?$/.test(candidate) && existsSync(candidate));
      if (source) return componentWithPorts(source, ports);
    }
    return native(specifier);
  };
  new Function('require', 'module', 'exports', code)(require, module, module.exports);
  return module.exports;
}
