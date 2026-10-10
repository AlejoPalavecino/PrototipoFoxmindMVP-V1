import { readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

export const BUNDLE_LIMITS = Object.freeze({ rawBytes: 391100, gzipBytes: 124000 });
const BASELINE = { rawBytes: 355534, gzipBytes: 112124 };
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function validatePath(file, label) {
  // Vite emits POSIX-relative filenames, even on Windows. Reject aliases/escapes
  // rather than normalizing them into deceptively smaller file sets.
  if (typeof file !== 'string' || !file) throw new Error(`${label}: missing/invalid file`);
  if (isAbsolute(file) || /[\\:\0]/.test(file) || file.split('/').some(part => !part || part === '.' || part === '..')) {
    throw new Error(`${label}: path escape or noncanonical emitted path: ${file}`);
  }
}

function containedFile(root, file) {
  let actual;
  try {
    actual = realpathSync(join(root, file));
  } catch {
    throw new Error(`Missing/unreadable emitted asset: ${file}`);
  }
  const local = relative(root, actual);
  if (isAbsolute(local) || local === '..' || local.startsWith(`..${sep}`)) {
    throw new Error(`Asset path escape (including symlinks): ${file}`);
  }
  return actual;
}

/** Measure only the union of Vite entry static JS graphs; never scan dist/server. */
export function measureInitialGraph({ distDir }) {
  let root;
  try {
    root = realpathSync(distDir);
  } catch {
    throw new Error(`Missing build directory/manifest: ${distDir}`);
  }
  const manifestFile = containedFile(root, '.vite/manifest.json');
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
  } catch {
    throw new Error('Manifest must contain readable, valid JSON');
  }
  if (!isObject(manifest)) throw new Error('Manifest must be an object');

  const entries = [];
  for (const [key, chunk] of Object.entries(manifest)) {
    if (!isObject(chunk)) throw new Error(`Manifest ${key}: chunk must be an object`);
    validatePath(chunk.file, `Manifest ${key}`);
    if ('isEntry' in chunk && typeof chunk.isEntry !== 'boolean') {
      throw new Error(`Manifest ${key}: isEntry must be a boolean`);
    }
    for (const field of ['imports', 'dynamicImports']) {
      if (field in chunk && (!Array.isArray(chunk[field]) || chunk[field].some(value => typeof value !== 'string' || !value))) {
        throw new Error(`Manifest ${key}: ${field} must be an array of nonempty reference strings`);
      }
    }
    if (chunk.isEntry === true) entries.push(key);
  }
  if (!entries.length) throw new Error('Manifest has no Vite isEntry entry');

  const visited = new Set();
  const emittedFiles = new Set();
  const pending = [...entries];
  while (pending.length) {
    const key = pending.pop();
    if (visited.has(key)) continue;
    if (!Object.hasOwn(manifest, key)) throw new Error(`Manifest ${key}: missing static reference`);
    visited.add(key);
    const chunk = manifest[key];
    // Explicitly support emitted ES-module JS only: silently skipping a CSS or
    // unsupported static import would undercount and fail open.
    if (!/\.(?:js|mjs)$/.test(chunk.file)) {
      throw new Error(`Manifest ${key}: unsupported emitted JavaScript file: ${chunk.file}`);
    }
    emittedFiles.add(chunk.file);
    pending.push(...(chunk.imports ?? []));
    // dynamicImports are intentionally not traversed or fetched.
  }

  const files = [...emittedFiles].sort();
  let rawBytes = 0;
  let gzipBytes = 0;
  for (const file of files) {
    const actual = containedFile(root, file);
    let bytes;
    try {
      bytes = readFileSync(actual);
    } catch {
      throw new Error(`Missing/unreadable emitted asset: ${file}`);
    }
    rawBytes += bytes.length;
    gzipBytes += gzipSync(bytes).length;
  }
  return { files, rawBytes, gzipBytes };
}

/** Inclusive ceilings; return the measurement unchanged for fixture callers. */
export function checkBundleBudget(measurement, limits = BUNDLE_LIMITS) {
  const violations = [];
  for (const [field, label] of [['rawBytes', 'raw'], ['gzipBytes', 'gzip']]) {
    if (!Number.isSafeInteger(measurement[field]) || measurement[field] < 0 ||
        !Number.isSafeInteger(limits[field]) || limits[field] < 0) {
      throw new Error(`Invalid ${label} byte measurement/ceiling`);
    }
    if (measurement[field] > limits[field]) {
      violations.push(`${label} ${measurement[field]} bytes exceeds ceiling ${limits[field]} bytes`);
    }
  }
  if (violations.length) throw new Error(`Frontend bundle budget exceeded: ${violations.join('; ')}`);
  return measurement;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.length > 3) throw new Error('Usage: node scripts/check-frontend-bundle.mjs [dist-directory]');
    const measured = measureInitialGraph({ distDir: process.argv[2] ?? 'dist' });
    console.log(`Initial static JavaScript: ${measured.rawBytes} raw bytes / ${measured.gzipBytes} gzip bytes / ${measured.files.length} file(s)`);
    for (const file of measured.files) console.log(`  ${file}`);
    console.log(`Pre-R5 baseline: ${BASELINE.rawBytes} raw / ${BASELINE.gzipBytes} gzip bytes`);
    console.log(`Ceilings: ${BUNDLE_LIMITS.rawBytes} raw / ${BUNDLE_LIMITS.gzipBytes} gzip bytes (~10% above baseline)`);
    console.log('Static entry graph only; excludes dynamic imports and server artifacts. Not latency or total-download evidence.');
    checkBundleBudget(measured);
    console.log(`Budget passed; headroom: ${BUNDLE_LIMITS.rawBytes - measured.rawBytes} raw / ${BUNDLE_LIMITS.gzipBytes - measured.gzipBytes} gzip bytes`);
  } catch (error) {
    console.error(`Frontend bundle check failed: ${error.message}`);
    process.exitCode = 1;
  }
}
