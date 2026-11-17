import { MailError } from "./mail-error.ts";

export interface MailConfiguration {
  readonly appOrigin: string;
  readonly smtpPort: number;
}

export const MAIL_CONFIGURATION = Symbol("MAIL_CONFIGURATION");

export function validateMailConfiguration(configuration: MailConfiguration): MailConfiguration {
  try {
    const { appOrigin, smtpPort } = configuration;
    const origin = new URL(appOrigin);
    const loopback = ["127.0.0.1", "localhost", "[::1]"].includes(origin.hostname);
    if (typeof appOrigin !== "string" || /[\u0000-\u0020\u007f-\u009f*]/u.test(appOrigin) ||
        origin.origin !== appOrigin || origin.username || origin.password ||
        !(origin.protocol === "https:" || (origin.protocol === "http:" && loopback)) ||
        !Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
      throw new Error();
    }
    return Object.freeze({ appOrigin, smtpPort });
  } catch {
    throw new MailError("MAIL_CONFIGURATION_INVALID");
  }
}

export function readMailConfiguration(env: Readonly<Record<string, string | undefined>>): MailConfiguration {
  const port = env.MAIL_SMTP_PORT ?? "1025";
  if (!/^[1-9]\d{0,4}$/.test(port)) throw new MailError("MAIL_CONFIGURATION_INVALID");
  return validateMailConfiguration({ appOrigin: env.APP_ORIGIN ?? "http://127.0.0.1:3000", smtpPort: Number(port) });
}
