import assert from 'node:assert/strict';
import { zip } from './p4-fixtures.mjs';

export function representativeMaximumZip(index, size = 50_000_000) {
  assert.ok(Number.isInteger(index) && index >= 0 && index < 5);
  assert.ok(Number.isSafeInteger(size) && size >= 114);
  const payload = Buffer.alloc(size - 114);
  const notes = ['Review the classroom reading and record one useful observation.',
    'Compare the worked example with the explanation from the lesson.',
    'Describe the method clearly before checking the final result.',
    'Keep the original evidence together with the written reflection.',
    'Explain which idea helped resolve the practice exercise today.'];
  for (let offset = 0, record = 0; offset < payload.length; offset += 80, record++) {
    const length = Math.min(80, payload.length - offset);
    const text = `File ${index + 1} record ${String(record).padStart(7, '0')}: ${notes[(record + index) % notes.length]}`;
    payload.write(text.slice(0, length - 1).padEnd(length - 1, ' '), offset, length - 1, 'ascii');
    payload[offset + length - 1] = 10;
  }
  return zip([{ name: 'work.txt', bytes: payload }]);
}
