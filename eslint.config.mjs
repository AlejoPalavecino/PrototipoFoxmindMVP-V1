import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require = createRequire(process.env.FOXMIND_LINT_TOOLCHAIN
  ? resolve(process.env.FOXMIND_LINT_TOOLCHAIN, 'package.json') : import.meta.url);
const boundaries = require('eslint-plugin-boundaries');
const parser = require('@typescript-eslint/parser');

// Complementary precise edge and inheritance rules live in check-boundaries.mjs.
export default [{
  files: ['src/core/contracts/**/*.ts', 'src/core/domain/**/*.ts', 'apps/api/src/**/*.ts', 'apps/classrooms-ui/**/*.{ts,tsx}', 'apps/agenda-ui/**/*.{ts,tsx}', 'apps/shared-ui/**/*.{ts,tsx}', 'apps/p5-preview/**/*.{ts,tsx}', 'apps/web/{src,pages}/**/*.{ts,tsx}'],
  languageOptions: { parser, parserOptions: { sourceType: 'module', ecmaVersion: 'latest', ecmaFeatures: { jsx: true } } },
  plugins: { boundaries },
  settings: { 'boundaries/elements': [
    { type: 'domain', pattern: 'src/core/domain', mode: 'folder' },
    { type: 'domain', pattern: 'src/core/contracts', mode: 'folder' },
    { type: 'backend', pattern: 'apps/api/src', mode: 'folder' },
    { type: 'ui', pattern: 'apps/classrooms-ui', mode: 'folder' },
    { type: 'ui', pattern: 'apps/agenda-ui', mode: 'folder' },
    { type: 'ui', pattern: 'apps/shared-ui', mode: 'folder' },
    { type: 'ui', pattern: 'apps/p5-preview', mode: 'folder' },
    { type: 'ui', pattern: 'apps/web/src', mode: 'folder' },
    { type: 'ui', pattern: 'apps/web/pages', mode: 'folder' },
  ] },
  rules: { 'boundaries/element-types': [2, { default: 'allow', rules: [
    { from: 'domain', disallow: ['backend', 'ui'] },
    { from: 'ui', disallow: ['backend'] },
  ] }] },
}];
