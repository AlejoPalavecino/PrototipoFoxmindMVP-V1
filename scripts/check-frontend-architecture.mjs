import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
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

// Size and complexity limits for production frontend code. Files that already exceed them are listed in
// scripts/frontend-size-baseline.json; an entry may only shrink. application/server is left out until the
// proxy rewrite (F1 of the 2026-11-26 audit) lands.
export const sizeLimits = { lineLength: 200, fileLines: 500, useState: 10 };
const baselinePath = 'scripts/frontend-size-baseline.json';

function sizeOf(file, text) {
  const lines = text.split(/\r?\n/);
  if (lines.at(-1) === '') lines.pop();
  const metrics = { lineLength: Math.max(0, ...lines.map(line => line.length)), fileLines: lines.length, useState: 0 };
  if (/\.tsx?$/.test(file)) {
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    const visit = node => {
      if (ts.isCallExpression(node) && /^(?:React\.)?useState$/.test(node.expression.getText(sf))) metrics.useState++;
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return metrics;
}

/** Production frontend files over any size limit, with every metric that exceeds it. */
export function measureFrontendSize(root = process.cwd()) {
  const over = {};
  for (const file of [...sources(root, 'apps/web/src'), ...sources(root, 'apps/shared-ui')]) {
    if (!/\.tsx?$/.test(file) || file.startsWith('apps/web/src/application/server/')) continue;
    const metrics = sizeOf(file, readFileSync(resolve(root, file), 'utf8'));
    const exceeded = Object.fromEntries(Object.entries(metrics).filter(([key, value]) => value > sizeLimits[key]));
    if (Object.keys(exceeded).length) over[file] = exceeded;
  }
  return over;
}

function readBaseline(root) {
  const path = resolve(root, baselinePath);
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')).exceptions : {};
}

function checkFrontendSize(root) {
  const findings = [], over = measureFrontendSize(root), baseline = readBaseline(root);
  for (const [file, metrics] of Object.entries(over)) {
    for (const [key, value] of Object.entries(metrics)) {
      const allowed = baseline[file]?.[key] ?? sizeLimits[key];
      if (value > allowed) findings.push(`size limit: ${file} ${key} ${value} > ${allowed}`);
    }
  }
  for (const [file, metrics] of Object.entries(baseline)) {
    if (!existsSync(resolve(root, file))) { findings.push(`size baseline can shrink: ${file} removed`); continue; }
    for (const [key, allowed] of Object.entries(metrics)) {
      const value = over[file]?.[key] ?? sizeLimits[key];
      if (value < allowed) findings.push(`size baseline can shrink: ${file} ${key} ${allowed} -> ${value}`);
    }
  }
  return findings;
}

/** Lowers the baseline to the current sizes. It never raises an entry or adds a new file. */
export function shrinkFrontendSizeBaseline(root = process.cwd()) {
  const over = measureFrontendSize(root), baseline = readBaseline(root), next = {};
  for (const [file, metrics] of Object.entries(baseline)) {
    const kept = Object.fromEntries(Object.entries(metrics).flatMap(([key, allowed]) => {
      const value = over[file]?.[key];
      return value === undefined ? [] : [[key, Math.min(value, allowed)]];
    }));
    if (Object.keys(kept).length) next[file] = kept;
  }
  writeFileSync(resolve(root, baselinePath), JSON.stringify({ limits: sizeLimits, exceptions: next }, null, 2) + '\n');
}

export function checkFrontendArchitecture(root = process.cwd()) {
  const findings = checkFrontendSize(root);
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
  if (process.argv.includes('--shrink-size-baseline')) shrinkFrontendSizeBaseline();
  const findings = checkFrontendArchitecture();
  if (findings.length) { console.error(findings.join('\n')); process.exitCode = 1; }
  else console.log('Frontend ownership boundaries passed');
}
