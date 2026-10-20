import assert from 'node:assert/strict';
import { zip } from './p4-fixtures.mjs';

export function binaryMaximumZip(index) {
  assert.ok(Number.isInteger(index) && index >= 0 && index < 5);
  const size = 50_000_000, rate = 48000, channels = 2, blockAlign = 4, baseHz = 220 + 55 * index;
  const names = ['lesson.txt', 'experiment.wav'];
  const zipBytes = 22 + names.reduce((sum, name) => sum + 76 + 2 * Buffer.byteLength(name), 0);
  const instructions = `Sound laboratory ${index + 1}: phase, timbre, pitch and loudness\n`
    + `Reference frequency: ${baseHz} Hz. Stereo PCM, 48000 samples per second, 16 bits per channel.\n`
    + 'Use headphones at a comfortable volume. The four sections divide the recording into quarters.\n'
    + 'Section 1: compare left and right quadrature sine waves; inspect their phase relationship.\n'
    + 'Section 2: compare a fundamental plus third harmonic on the left with the pure reference on the right.\n'
    + 'Section 3: follow the left linear chirp from the reference frequency to four times that frequency.\n'
    + 'Section 4: hear 2 Hz amplitude modulation on the left while the right reference stays steady.\n'
    + 'Plot sample windows, count zero crossings and compare the spectrum in each section.\n'
    + 'Explain which changes affect pitch, waveform shape and perceived loudness.\n';
  // A real closing instruction supplies text alignment; no unused WAV frame or ZIP padding exists.
  const closing = ['End.\n', 'Done.\n', 'Ready.\n', 'Finish.\n'].find(text =>
    (size - zipBytes - 44 - Buffer.byteLength(instructions + text)) % blockAlign === 0);
  assert.ok(closing);
  const lesson = Buffer.from(instructions + closing), audioBytes = size - zipBytes - lesson.length;
  const wav = Buffer.alloc(audioBytes), dataBytes = audioBytes - 44, frames = dataBytes / blockAlign;
  assert.ok(Number.isInteger(frames) && frames > 4 * rate);
  wav.write('RIFF', 0); wav.writeUInt32LE(audioBytes - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(channels, 22);
  wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * blockAlign, 28);
  wav.writeUInt16LE(blockAlign, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(dataBytes, 40);
  const quarter = Math.floor(frames / 4), tau = 2 * Math.PI, fadeFrames = rate / 100;
  for (let frame = 0; frame < frames; frame++) {
    const section = Math.min(3, Math.floor(frame / quarter)), localFrame = frame - section * quarter;
    const length = section === 3 ? frames - 3 * quarter : quarter, time = localFrame / rate;
    const angle = tau * baseHz * time, reference = Math.sin(angle);
    const fade = Math.max(0, Math.min(1, localFrame / fadeFrames, (length - 1 - localFrame) / fadeFrames));
    let left = reference, right = reference;
    if (section === 0) right = Math.sin(angle + Math.PI / 2);
    else if (section === 1) left = 0.8 * reference + 0.2 * Math.sin(3 * angle);
    else if (section === 2) left = Math.sin(tau * baseHz * (time + 1.5 * time * time / (length / rate)));
    else left *= 0.5 + 0.5 * Math.sin(tau * 2 * time);
    wav.writeInt16LE(Math.round(12000 * fade * left), 44 + frame * blockAlign);
    wav.writeInt16LE(Math.round(12000 * fade * right), 46 + frame * blockAlign);
  }
  return zip([{ name: names[0], bytes: lesson }, { name: names[1], bytes: wav }]);
}
