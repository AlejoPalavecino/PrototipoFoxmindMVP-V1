import { registerHooks } from 'node:module';
import { isMainThread, workerData } from 'node:worker_threads';

// This fixture is inert when discovered by node:test; only its worker installs the hook.
if (!isMainThread && workerData?.entryUrl) {
  const forbidden = workerData.extension === 'docx'
    ? ['pdf-lib']
    : ['docx-archive.ts', 'docx-archive.js', 'docx-xml.ts', 'docx-xml.js', 'yauzl', 'fast-xml-parser'];
  registerHooks({
    resolve(specifier, context, nextResolve) {
      const filename = specifier.split('/').at(-1);
      if (forbidden.includes(filename) || forbidden.some(name => specifier === name || specifier.startsWith(`${name}/`))) {
        throw Object.assign(new Error(`Unexpected ${workerData.extension} parser dependency: ${specifier}`), {
          code: 'UNRELATED_FORMAT_IMPORT',
        });
      }
      return nextResolve(specifier, context);
    },
  });
  await import(workerData.entryUrl);
}
