import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getClassroomColorTheme } from '../index';

const expectedTheme = (color: string, fill: string) => ({
  bar: `bg-fox-${color}`,
  badgeBg: `bg-fox-${color}/10`,
  badgeText: `text-fox-${color}`,
  bullet: `bg-fox-${color}`,
  border: `border-fox-${color}/20`,
  textAccent: `text-fox-${color}`,
  fill,
});

test('theme defaults for missing and unsupported colors/subjects remain primary', () => {
  for (const args of [[], ['red', 'Arte'], ['', '']] as [string?, string?][]) {
    assert.deepEqual(getClassroomColorTheme(...args), expectedTheme('primary', '#489980'));
  }
});

for (const [color, subject, fill] of [
  ['purple', 'Literatura', '#827397'],
  ['blue', 'Historia', '#2563eb'],
  ['orange', 'Matemática', '#f68d2c'],
  ['green', 'Ciencias', '#52a874'],
]) {
  test(`theme retains complete ${color} mapping and case-insensitive substring matching`, () => {
    const expected = expectedTheme(color, fill);
    assert.deepEqual(getClassroomColorTheme(`bg-${color.toUpperCase()}-500`), expected);
    assert.deepEqual(getClassroomColorTheme(undefined, subject.toUpperCase()), expected);
  });
}

test('theme recognizes unaccented mathematics and biology subject prefixes', () => {
  assert.deepEqual(getClassroomColorTheme(undefined, 'Matematica'), expectedTheme('orange', '#f68d2c'));
  assert.deepEqual(getClassroomColorTheme(undefined, 'Biología'), expectedTheme('green', '#52a874'));
});

test('theme retains branch priority when color and subject disagree', () => {
  assert.deepEqual(getClassroomColorTheme('blue', 'Literatura'), expectedTheme('purple', '#827397'));
  assert.deepEqual(getClassroomColorTheme('orange', 'Historia'), expectedTheme('blue', '#2563eb'));
  assert.deepEqual(getClassroomColorTheme('green', 'Matemática'), expectedTheme('orange', '#f68d2c'));
});
