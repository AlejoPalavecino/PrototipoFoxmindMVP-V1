import { parentPort } from 'node:worker_threads';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { verifyStillImage } from './foxy-private-image-inspector-format.ts';
sharp.concurrency(1); sharp.cache(false);
parentPort?.once('message', async ({ bytes }: { bytes: Uint8Array }) => {
  try {
    const buffer = Buffer.from(bytes), format = verifyStillImage(buffer);
    const options = { failOn: 'warning' as const, limitInputPixels: 4_000_000, limitInputChannels: 4, unlimited: false };
    const metadata = await sharp(buffer, options).metadata();
    if (metadata.format !== format || !metadata.width || !metadata.height || metadata.width > 4096 || metadata.height > 4096
      || metadata.width * metadata.height > 4_000_000 || (metadata.pages ?? 1) !== 1) throw new Error('FILE_REJECTED');
    const { info } = await sharp(buffer, options).raw().timeout({ seconds: 8 }).toBuffer({ resolveWithObject: true });
    if (info.width !== metadata.width || info.height !== metadata.height || info.channels > 4) throw new Error('FILE_REJECTED');
    parentPort?.postMessage({ ok: true, result: { mimeType: `image/${format}`, width: info.width, height: info.height,
      sizeBytes: buffer.length, digest: createHash('sha256').update(buffer).digest('hex') } });
  } catch { parentPort?.postMessage({ ok: false, code: 'FILE_REJECTED' }); }
});
