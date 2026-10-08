import { deepStrictEqual, equal, notStrictEqual } from 'node:assert/strict';
import { test } from 'node:test';
import { createDefaultAppSettings } from '../settings';

test('defaults have exactly seven ordered keys on an ordinary plain object', () => {
  const settings = createDefaultAppSettings();

  deepStrictEqual(settings, {
    theme: 'light',
    density: 'comoda',
    fontSize: 'normal',
    dyslexic: false,
    contrast: false,
    easyRead: false,
    textSize: 'M',
  });
  deepStrictEqual(Reflect.ownKeys(settings), [
    'theme',
    'density',
    'fontSize',
    'dyslexic',
    'contrast',
    'easyRead',
    'textSize',
  ]);
  equal(Object.getPrototypeOf(settings), Object.prototype);
});

test('each call allocates independent settings with isolated mutations', () => {
  const first = createDefaultAppSettings();
  const second = createDefaultAppSettings();

  notStrictEqual(first, second);
  first.theme = 'custom-theme';
  second.easyRead = true;
  equal(second.theme, 'light');
  equal(first.easyRead, false);
  deepStrictEqual(createDefaultAppSettings(), {
    theme: 'light',
    density: 'comoda',
    fontSize: 'normal',
    dyslexic: false,
    contrast: false,
    easyRead: false,
    textSize: 'M',
  });
});

test('settings remain mutable with broad string fields and boolean flags', () => {
  const settings = createDefaultAppSettings();

  settings.theme = 'custom-theme';
  settings.density = 'custom-density';
  settings.fontSize = 'custom-font-size';
  settings.textSize = 'custom-text-size';
  settings.dyslexic = true;
  settings.contrast = true;
  settings.easyRead = true;

  deepStrictEqual(settings, {
    theme: 'custom-theme',
    density: 'custom-density',
    fontSize: 'custom-font-size',
    dyslexic: true,
    contrast: true,
    easyRead: true,
    textSize: 'custom-text-size',
  });
  equal(Object.isFrozen(settings), false);
  equal(Object.isExtensible(settings), true);
});
