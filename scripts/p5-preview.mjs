import { withP5Runtime } from './p5-runtime.mjs';
if (process.argv.slice(2).length) {
  console.error('Usage: node scripts/p5-preview.mjs');
  process.exitCode = 2;
} else
  try {
    await withP5Runtime(
      async ({ origin, mail }) => {
        console.log(`P5 isolated preview: ${origin}`);
        console.log(`P5 captured inbox: ${mail.inbox}`);
        console.log(
          'Synthetic verified accounts only. This host does not implement or integrate P3. Press Enter to stop and clean up its owned disposable services.',
        );
        await new Promise((resolve) => {
          process.once('SIGINT', resolve);
          process.once('SIGTERM', resolve);
          process.stdin.resume();
          process.stdin.once('data', resolve);
        });
        process.stdin.pause();
      },
      { port: 3005, preview: true },
    );
  } catch {
    console.error('P5 preview unavailable; inspect sanitized test evidence.');
    process.exitCode = 1;
  }
