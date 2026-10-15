import { Inject, Injectable, type OnModuleDestroy } from "@nestjs/common";
import { createTransport, type SMTPTransportOptions } from "nodemailer";
import { MAIL_CONFIGURATION, type MailConfiguration } from "./configuration.ts";
import { MailError } from "./mail-error.ts";
import { validateMailbox } from "./mailbox.ts";
import { accountMessage } from "./templates.ts";

export interface AccountMailInput { readonly to: string; readonly token: string }
export interface MailAcceptance { readonly status: "accepted" }
const SENDER = "no-reply@foxmind.test";

function validateInput(input: AccountMailInput): AccountMailInput {
  if (!input || typeof input.token !== "string") throw new MailError("MAIL_INPUT_INVALID");
  const to = validateMailbox(input.to);
  const { token } = input;
  if (!/^[A-Za-z0-9_-]{43}$/.test(token) || Buffer.from(token, "base64url").toString("base64url") !== token) {
    throw new MailError("MAIL_INPUT_INVALID");
  }
  return { to, token };
}

@Injectable()
export class AccountMailService implements OnModuleDestroy {
  private readonly transport;
  private readonly pending = new Set<Promise<MailAcceptance>>();
  private closed = false;

  constructor(@Inject(MAIL_CONFIGURATION) private readonly configuration: MailConfiguration) {
    const options: SMTPTransportOptions = {
      host: "127.0.0.1",
      port: configuration.smtpPort,
      secure: false,
      // Plain SMTP is intentional ONLY for the fixed local capture peer.
      ignoreTLS: true,
      name: "foxmind.test",
      connectionTimeout: 3000,
      greetingTimeout: 3000,
      socketTimeout: 5000,
      logger: false,
      debug: false,
      disableFileAccess: true,
      disableUrlAccess: true,
    };
    // SMTP transport, not SMTPPool: each send closes its own connection.
    this.transport = createTransport(options);
  }

  async sendVerification(input: AccountMailInput): Promise<MailAcceptance> {
    return this.send("verification", input);
  }

  async sendRecovery(input: AccountMailInput): Promise<MailAcceptance> {
    return this.send("recovery", input);
  }

  private async send(purpose: "verification" | "recovery", input: AccountMailInput): Promise<MailAcceptance> {
    // Copy validated primitives before any asynchronous boundary. Caller-supplied
    // headers, attachments, cc/bcc, envelope or transport fields are never spread.
    const { to, token } = validateInput(input);
    if (this.closed) throw new MailError("MAIL_DELIVERY_UNAVAILABLE");
    const operation = this.submit(purpose, to, token);
    this.pending.add(operation);
    try { return await operation; }
    finally { this.pending.delete(operation); }
  }

  private async submit(purpose: "verification" | "recovery", to: string, token: string): Promise<MailAcceptance> {
    try {
      const result = await this.transport.sendMail({
        from: { address: SENDER, name: "" },
        to: [{ address: to, name: "" }],
        envelope: { from: SENDER, to: [to] },
        ...accountMessage(purpose, this.configuration.appOrigin, token),
        disableFileAccess: true,
        disableUrlAccess: true,
      });
      if (result.accepted.length !== 1 || result.rejected.length !== 0) throw new Error();
      return { status: "accepted" };
    } catch {
      // Do not attach a cause, SMTP response, envelope, recipient or link.
      throw new MailError("MAIL_DELIVERY_UNAVAILABLE");
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.closed = true;
    await Promise.allSettled([...this.pending]);
    this.transport.close();
  }
}
