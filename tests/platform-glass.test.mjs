import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import postcss from 'postcss';
import { dirname, resolve } from 'node:path';

const read = path => existsSync(path) ? readFileSync(path, 'utf8') : '';
const tokens = postcss.parse(read('apps/shared-ui/design-tokens.css'));
const platform = postcss.parse(read('apps/shared-ui/folders-controls.css'));
function cascade(path) {
  assert.ok(existsSync(path), `Missing selected stylesheet ${path}`);
  return read(path).replace(/@import\s+['"]([^'"]+)['"];?/g, (_, imported) => cascade(resolve(dirname(path), imported)));
}
const folders = () => cascade('apps/shared-ui/folders.css');
const academic = read("apps/web/src/application/styles/academic.css");
const declarations = new Map();
tokens.walkDecls(declaration => declarations.set(declaration.prop, declaration.value));
function color(name) {
  const value = declarations.get(name);
  assert.ok(value, `Missing shared token ${name}`);
  const alias = /^var\((--[\w-]+)\)$/.exec(value);
  if (alias) return color(alias[1]);
  assert.match(value, /^#[\da-f]{6}$/i, `${name} must have an opaque color for these measurements`);
  return [1, 3, 5].map(index => parseInt(value.slice(index, index + 2), 16) / 255);
}
function luminance(rgb) {
  const linear = rgb.map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
}
function contrast(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + .05) / (values[1] + .05);
}
function rule(selectorPart, property, value) {
  let found = false;
  platform.walkRules(node => {
    if (!node.selector.includes(selectorPart)) return;
    node.walkDecls(property, declaration => { if (declaration.value === value) found = true; });
  });
  assert.ok(found, `${selectorPart}: ${property}: ${value}`);
}

test('one shared palette retains the selected folder colors and legible semantic pairs', () => {
  for (const [name, expected] of Object.entries({ '--fm-ink': '#202522', '--fm-muted': '#56615c', '--fm-pearl': '#ffffff', '--fm-accent': '#ff782d', '--fm-link': '#9a3e00' })) {
    assert.equal(declarations.get(name), expected);
  }
  for (const [foreground, background] of [
    ['--fm-ink', '--fm-accent'], ['--fm-muted', '--fm-pearl'], ['--fm-muted', '--fm-lavender-soft'],
    ['--fm-link', '--fm-surface'], ['--fm-link', '--fm-pearl'],
    ['--fm-error', '--fm-error-soft'], ['--fm-success', '--fm-success-soft'],
  ]) assert.ok(contrast(color(foreground), color(background)) >= 4.5, `${foreground} on ${background} needs 4.5:1`);
  assert.ok(contrast(color('--fm-control-line'), color('--fm-surface')) >= 3);
  assert.ok(contrast(color('--fm-focus'), color('--fm-surface')) >= 3);
  for (const tone of ['--fm-mint', '--fm-coral', '--fm-yellow']) {
    assert.ok(contrast(color('--fm-ink'), color(tone)) >= 4.5, `Readable folder label on ${tone}`);
  }
});

test('tokens load before their consumers and selected folder composition wins last', () => {
  const app = read('apps/web/pages/_app.tsx');
  const paths = ['shared-ui/design-tokens.css', 'styles/globals.css', 'src/application/styles/academic.css', 'shared-ui/folders.css'];
  const indexes = paths.map(path => app.indexOf(path));
  assert.ok(indexes.every(index => index >= 0), 'Every stylesheet must be loaded');
  assert.deepEqual(indexes, [...indexes].sort((a, b) => a - b));
  assert.doesNotMatch(app, /import\s+['"][^'"]*glass\.css/);
  assert.ok(folders().includes(platform.toString()), 'Selected cascade retains native academic control safeguards');
  for (const source of [academic, read('apps/web/styles/globals.css'), folders()]) {
    assert.match(source, /var\(--fm-ink/);
    assert.match(source, /var\(--fm-muted/);
    assert.match(source, /var\(--fm-font-sans/);
  }
});

test('standalone renderer uses the same palette and stylesheet cascade', () => {
  const standalone = read('apps/p5-preview/main.tsx');
  const indexes = ['shared-ui/design-tokens.css', 'src/application/styles/academic.css', 'shared-ui/folders.css'].map(path => standalone.indexOf(path));
  assert.ok(indexes.every(index => index >= 0), 'Standalone styles must not diverge from Next');
  assert.deepEqual(indexes, [...indexes].sort((a, b) => a - b));
  assert.doesNotMatch(standalone, /import\s+['"][^'"]*glass\.css/);
});

test('checkboxes and radios never inherit full-width text input sizing', () => {
  assert.match(academic, /input:not\(\[type='radio'\]\):not\(\[type='checkbox'\]\)/);
  rule("input[type='checkbox']", 'width', '20px');
  rule("input[type='radio']", 'min-height', '20px');
  rule('.p7-choice', 'min-height', '44px');
  rule('.p7-check', 'flex-direction', 'row');
  rule('textarea', 'resize', 'vertical');
  rule('select', 'font', 'inherit');
  rule('::file-selector-button', 'color', 'var(--fm-ink)');
});

test('disabled native text controls retain their state after the shared base rule', () => {
  let baseIndex = -1, disabledIndex = -1;
  const selector = ":is(input:not([type='radio']):not([type='checkbox']), select, textarea)";
  platform.nodes.forEach((node, index) => {
    if (node.type !== 'rule') return;
    if (node.selector.includes(selector) && !node.selector.includes(':disabled')) baseIndex = index;
    if (node.selector.includes(`${selector}:disabled`)) {
      disabledIndex = index;
      assert.ok(node.nodes.some(declaration => declaration.prop === 'background' && declaration.value === 'var(--fm-lavender-soft)'));
      assert.ok(node.nodes.some(declaration => declaration.prop === 'color' && declaration.value === 'var(--fm-muted)'));
    }
  });
  assert.ok(baseIndex >= 0 && disabledIndex > baseIndex, 'Disabled rule must match base specificity and follow it');
});

test('dialogs remain native, centered, scrollable and keyboard-visible', () => {
  rule('.p5-dialog', 'margin', 'auto');
  rule('.p5-dialog', 'overflow-y', 'auto');
  rule('.p5-dialog', 'max-height', 'calc(100dvh - 32px)');
  rule(':focus-visible', 'outline', '3px solid var(--fm-focus)');
  assert.doesNotMatch(platform.toString(), /display:\s*(?:block|flex|grid)[^}]*\}[\s\S]*?\.p5-dialog\[open\]/);
  assert.match(read('apps/shared-ui/feedback.tsx'), /<dialog/);
});

test('academic framing covers dense surfaces without repainting Home or navbar', () => {
  for (const selector of ['.p5-card', '.p5-room-head', '.p5-tabs', '.p5-unit', '.p6-library-upload', '.p6-wall-threads', '.p7-authoring', '.p7-question', '.p7-history-detail', '.p8-grading', '.p8-progress-metrics']) {
    assert.ok(platform.toString().includes(selector), `Missing ${selector} presentation`);
  }
  assert.match(platform.toString(), /\.p5-app:not\(\.entry-home\)/);
  assert.doesNotMatch(platform.toString(), /\.fm-navbar|\.entry-home\s+[^{]*\{/);
  assert.doesNotMatch(platform.toString(), /url\(|overflow(?:-x)?:\s*(hidden|clip)/);
  assert.match(academic, /\.p5-tabs\s*\{[^}]*overflow-x:\s*auto/);
});

test('academic and dialog subheadings keep a compact hierarchy after the host heading reset', () => {
  for (const [heading, size, weight] of [['h3', '1.15rem', '750'], ['h4', '1rem', '700'], ['h5', '.9375rem', '700']]) {
    for (const scope of ['.p5-main', '.p5-dialog']) {
      rule(`${scope} ${heading}`, 'font-size', size);
      rule(`${scope} ${heading}`, 'font-weight', weight);
    }
  }
  const entry = postcss.parse(folders());
  let rowSize;
  entry.walkRules('.folder-row h3', node => node.walkDecls('font-size', declaration => { rowSize = declaration.value; }));
  assert.match(rowSize ?? '', /^\d+(?:\.\d+)?px$/);
  assert.ok(parseFloat(rowSize) >= 16 && parseFloat(rowSize) <= 24, 'Folder row titles retain a compact, legible hierarchy');
  // News inherits the shared h3 hierarchy above instead of the former Home-specific reset.
  rule('.p5-dialog > header h2', 'min-width', '0');
  rule('.p5-dialog > header h2', 'overflow-wrap', 'anywhere');
});

test('long content, mobile layouts and user accessibility preferences are retained', () => {
  rule('.p5-fields', 'min-width', '0');
  rule('.p5-actions', 'white-space', 'normal');
  rule('.p5-dialog > header', 'min-width', '0');
  assert.match(platform.toString(), /@media\s*\(max-width:\s*600px\)/);
  assert.match(platform.toString(), /prefers-reduced-transparency:\s*reduce/);
  assert.match(platform.toString(), /forced-colors:\s*active/);
  assert.match(platform.toString(), /prefers-reduced-motion:\s*reduce/);
  rule('[aria-invalid', 'border-color', 'var(--fm-error)');
  rule(':disabled', 'cursor', 'not-allowed');
});

test('files route opts into shared presentation without a new behavioral wrapper', () => {
  assert.match(read('apps/web/src/screens/files-screen.tsx'), /className="main profile-main platform-files"/);
  rule('.platform-files', 'min-width', '0');
});
