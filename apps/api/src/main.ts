import type { INestApplication } from "@nestjs/common";
import { ConfigurationError, readBaseConfiguration } from './platform/configuration.ts';

let app: INestApplication | undefined;
try {
  readBaseConfiguration();
  const { readConfiguration } = await import("./bootstrap/configuration.ts");
  const configuration = readConfiguration();
  const { createApplication } = await import("./bootstrap/application.ts");
  app = await createApplication(configuration);
  await app.listen(configuration.port, "127.0.0.1");
  const address = app.getHttpServer().address();
  process.stdout.write(JSON.stringify({ event: "api.listening", host: "127.0.0.1", port: address.port }) + "\n");
} catch (error) {
  if (app) { try { await app.close(); } catch { /* Keep startup failure output sanitized. */ } }
  process.stderr.write((error instanceof ConfigurationError ? error.message : "Backend startup failed.") + "\n");
  process.exitCode = 1;
}
