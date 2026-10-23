import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { dirname } from 'node:path';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

function load(path) {
  const filename = resolve(path), module = { exports: {} };
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2023 },
  }).outputText;
  new Function('require', 'module', 'exports', code)(createRequire(filename), module, module.exports);
  return module.exports;
}

test('dialog closes and restores its connected trigger after removal, without stealing a new focus', async () => {
  const { openDialog } = load('apps/shared-ui/dialog-focus.ts');
  const doc = { body: {}, activeElement: null }; let focused = 0, closed = 0;
  const trigger = { isConnected: true, focus() { focused++; doc.activeElement = this; } };
  const dialog = { ownerDocument: doc, contains: () => false, showModal() { doc.activeElement = this; }, close() { closed++; doc.activeElement = doc.body; } };
  doc.activeElement = trigger;
  openDialog(dialog)(); await Promise.resolve();
  assert.equal(closed, 1); assert.equal(focused, 1);
  doc.activeElement = trigger;
  const cleanup = openDialog(dialog); cleanup(); doc.activeElement = { newDestination: true };
  await Promise.resolve(); assert.equal(focused, 1);
  doc.activeElement = trigger;
  const removed = openDialog(dialog); trigger.isConnected = false; removed();
  await Promise.resolve(); assert.equal(focused, 1);
});

test('anonymous verification success replaces obsolete proof instructions, pending state retains them', () => {
  const { VerificationGuidance } = load('apps/shared-ui/VerificationGuidance.tsx');
  const render = confirmed => renderToStaticMarkup(React.createElement(VerificationGuidance, { confirmed }));
  assert.doesNotMatch(render(true), /Abre el enlace original|reenvío/);
  assert.match(render(true), /Inicia sesión/);
  assert.match(render(false), /Abre el enlace original/);
});

test('navbar marker movement uses actual old/new rectangles and suppresses zero/reduced motion', () => {
  const { markerFrames } = load('apps/shared-ui/navbar-motion.ts');
  const from = { x: 100, y: 20, width: 120 }, to = { x: 240, y: 20, width: 160 };
  assert.deepEqual(markerFrames(from, to, false), [{ transform: 'translate(-140px, 0px) scaleX(0.75)' }, { transform: 'none' }]);
  assert.equal(markerFrames(from, to, true), null);
  assert.equal(markerFrames(to, to, false), null);
  assert.equal(markerFrames({ ...from, width: 0 }, to, false), null);
});

test('notification dialog inherits wrapping title safeguards without shrinking the close target', () => {
  function cascade(path) {
    const css = readFileSync(path, 'utf8');
    return css.replace(/@import\s+['"]([^'"]+)['"];?/g, (_, imported) => cascade(resolve(dirname(path), imported)));
  }
  const css = cascade('apps/shared-ui/folders.css');
  assert.match(css, /\.p5-dialog\s*\{[^}]*margin:\s*auto/);
  assert.match(css, /\.p5-dialog\s*>\s*header\s*h2\s*\{[^}]*min-width:\s*0;[^}]*overflow-wrap:\s*anywhere/);
  assert.match(css, /\.p5-dialog\s+\.p5-close\s*\{[^}]*flex:\s*0 0 44px/);
});
