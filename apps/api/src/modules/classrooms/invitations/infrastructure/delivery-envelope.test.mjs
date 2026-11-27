import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, createCipheriv } from 'node:crypto';
import { encryptDelivery, decryptDelivery, deliveryKeyId } from './delivery-envelope.ts';
import { readClassroomsConfiguration } from '../../access/infrastructure/configuration.ts';

const current = randomBytes(32), previous = randomBytes(32), other = randomBytes(32), aad = 'p5:invitation:1';
const value = { to: 'alumno@example.test', classroom: 'Aula sintética', teacher: 'Docente Sintético', url: 'http://127.0.0.1:3005/mis-aulas' };

/** The format sealed before S9: base64(iv || tag || ciphertext), no version and no key id. */
function legacySeal(key, plain, boundTo) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(boundTo));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(plain)), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64');
}

test('S9 new envelopes carry a version and the id of the sealing key', () => {
  const envelope = encryptDelivery(current, value, aad);
  assert.match(envelope, /^v2\.[A-Za-z0-9_-]{11}\.[A-Za-z0-9+/=]+$/u);
  assert.equal(envelope.split('.')[1], deliveryKeyId(current));
  assert.notEqual(deliveryKeyId(current), deliveryKeyId(previous));
  assert.deepEqual(decryptDelivery(current, envelope, aad), value);
});

test('S9 after rotation, envelopes sealed with a previous key are still readable', () => {
  const sealedBefore = encryptDelivery(previous, value, aad);
  assert.deepEqual(decryptDelivery(current, sealedBefore, aad, [previous]), value);
  assert.throws(() => decryptDelivery(current, sealedBefore, aad));
  assert.throws(() => decryptDelivery(current, sealedBefore, aad, [other]));
});

test('S9 legacy envelopes without version are read with the current or a previous key', () => {
  assert.deepEqual(decryptDelivery(current, legacySeal(current, value, aad), aad), value);
  assert.deepEqual(decryptDelivery(current, legacySeal(previous, value, aad), aad, [previous]), value);
  assert.throws(() => decryptDelivery(current, legacySeal(other, value, aad), aad, [previous]));
});

test('S9 envelopes stay bound to their record, version and key id', () => {
  const envelope = encryptDelivery(current, value, aad);
  assert.throws(() => decryptDelivery(current, envelope, 'p5:invitation:2'));
  const [, , body] = envelope.split('.');
  assert.throws(() => decryptDelivery(current, `v2.${deliveryKeyId(previous)}.${body}`, aad, [previous]));
  assert.throws(() => decryptDelivery(current, `v3.${deliveryKeyId(current)}.${body}`, aad));
  assert.throws(() => decryptDelivery(current, body, aad));
});

test('S9 CLASSROOMS_DELIVERY_PREVIOUS_KEYS is optional and only accepts distinct valid keys', () => {
  const key = () => randomBytes(32).toString('base64url');
  const env = { CLASSROOMS_ENABLED: '1', CLASSROOMS_QUOTA_BYTES: '1000', CLASSROOMS_SIGNING_KEY: key(), CLASSROOMS_DELIVERY_KEY: key() };
  const origin = 'http://127.0.0.1:3005';
  assert.deepEqual(readClassroomsConfiguration(env, origin).previousDeliveryKeys, []);
  const old1 = key(), old2 = key();
  const rotated = readClassroomsConfiguration({ ...env, CLASSROOMS_DELIVERY_PREVIOUS_KEYS: `${old1},${old2}` }, origin);
  assert.deepEqual(rotated.previousDeliveryKeys.map(value => value.toString('base64url')), [old1, old2]);
  for (const bad of ['', 'short', `${old1},${old1}`, env.CLASSROOMS_DELIVERY_KEY, env.CLASSROOMS_SIGNING_KEY,
    [key(), key(), key(), key()].join(',')]) {
    assert.throws(() => readClassroomsConfiguration({ ...env, CLASSROOMS_DELIVERY_PREVIOUS_KEYS: bad }, origin), { code: 'SERVICE_UNAVAILABLE' }, bad);
  }  // A previous delivery key must not reuse the classroom-code digest key (S7) either.
  const digest = key();
  assert.throws(() => readClassroomsConfiguration({ ...env, CLASSROOMS_CODE_DIGEST_KEY: digest, CLASSROOMS_DELIVERY_PREVIOUS_KEYS: digest }, origin), { code: 'SERVICE_UNAVAILABLE' });
  assert.equal(readClassroomsConfiguration({ ...env, CLASSROOMS_CODE_DIGEST_KEY: digest, CLASSROOMS_DELIVERY_PREVIOUS_KEYS: key() }, origin).previousDeliveryKeys.length, 1);
});
