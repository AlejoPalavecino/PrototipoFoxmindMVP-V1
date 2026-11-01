import { parentPort } from 'node:worker_threads';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { createDiagramSvg } from './diagram-renderer-layout.ts';

parentPort?.once('message', async ({ diagram, width, height }) => {
  try {
    const svg = createDiagramSvg(diagram, width, height);
    const bytes = await sharp(Buffer.from(svg), { failOn: 'warning', limitInputPixels: 4_000_000,
      limitInputChannels: 4, unlimited: false }).png().timeout({ seconds: 3 }).toBuffer();
    parentPort?.postMessage({ ok: true, result: { bytes, width, height, mimeType: 'image/png',
      digest: createHash('sha256').update(bytes).digest('hex'), rendererVersion: 'foxy-diagram-png-v1' } });
  } catch (error) {
    parentPort?.postMessage({ ok: false, code: (error as { code?: string })?.code === 'AI_INPUT_LIMIT' ? 'AI_INPUT_LIMIT' : 'SERVICE_UNAVAILABLE' });
  }
});
