import sharp from 'sharp';
import type { FoxyAspectRatio } from '../../../../../../../src/core/domain/foxy/visual.ts';
import type { ExactOpeningImage } from '../../domain/exact-opening-image.ts';

const dimensions: Record<FoxyAspectRatio, readonly [number, number]> = {
  '1:1': [1600, 1600], '4:3': [1600, 1200], '3:4': [1200, 1600], '16:9': [1920, 1080],
};

export async function renderExactOpeningImage(layout: ExactOpeningImage, aspectRatio: FoxyAspectRatio, signal: AbortSignal) {
  signal.throwIfAborted();
  const [width, height] = dimensions[aspectRatio];
  const stacked = width <= height;
  const radius = Math.min(width * (stacked ? 0.155 : 0.103), height * 0.18);
  const cases = layout.map(({ opening, arrowCount }, index) => {
    const cx = width * (stacked ? 0.71 : 0.37 + 0.48 * index);
    const cy = height * (stacked ? 0.26 + 0.48 * index : 0.5);
    const tip = cx - radius * 1.12;
    const start = width * (stacked ? 0.13 : 0.06 + 0.48 * index);
    const gap = radius * 1.48 / Math.max(6, arrowCount - 1);
    const stroke = radius * 0.024;
    const holeRadius = radius * (opening === 'small' ? 0.27 : 0.62);
    const arrows = Array.from({ length: arrowCount }, (_, i) => {
      const y = cy + (i - (arrowCount - 1) / 2) * gap;
      const head = radius * 0.075;
      return `<path d="M ${start} ${y} H ${tip}
        M ${tip - head} ${y - head * 0.65} L ${tip} ${y} L ${tip - head} ${y + head * 0.65}"
        fill="none" stroke="#17445e" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/>`;
    });
    return `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="#243747"/>
      <circle cx="${cx}" cy="${cy}" r="${holeRadius}" fill="white"/>${arrows.join('')}`;
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="white"/>${cases.join('')}</svg>`;
  try {
    const bytes = await sharp(Buffer.from(svg), { limitInputPixels: 4_000_000 }).png().timeout({ seconds: 3 }).toBuffer();
    signal.throwIfAborted();
    return bytes;
  } catch (error) {
    signal.throwIfAborted();
    throw Object.assign(new Error('SERVICE_UNAVAILABLE', { cause: error }), { code: 'SERVICE_UNAVAILABLE' });
  }
}
