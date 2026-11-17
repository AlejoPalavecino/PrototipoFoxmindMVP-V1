import { Socket } from "node:net";
import { createTransport, type SMTPTransportOptions } from "nodemailer";
import { type MailConfiguration } from "./configuration.ts";
import { MailError } from "./mail-error.ts";
import { validateMailbox } from "./mailbox.ts";
import { accountMessage } from "./templates.ts";

import type { AccountMailInput, MailAcceptance } from '../../application/ports.ts';
export type { AccountMailInput, MailAcceptance } from '../../application/ports.ts';
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

export class AccountMailService {
  private readonly transport;
  private readonly pending = new Set<Promise<MailAcceptance>>();
  private readonly sockets = new Set<Socket>();
  private closed = false;
  private cancelled = false;

  constructor(private readonly configuration: MailConfiguration) {
    const options: SMTPTransportOptions = {
      host: "127.0.0.1",
      port: configuration.smtpPort,
      getSocket: (_options, callback) => this.openSocket(callback),
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

  private openSocket(callback: Parameters<NonNullable<SMTPTransportOptions["getSocket"]>>[1]): void {
    // Ordinary close drains already-submitted sends, even if getSocket runs later.
    if (this.cancelled) { callback(new MailError("MAIL_DELIVERY_UNAVAILABLE")); return; }
    const socket = new Socket();
    this.sockets.add(socket); // Own it BEFORE connect, including cancellation during setup.
    let settled = false;
    const finish = (failed: boolean): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.removeListener("connect", connected);
      if (failed) {
        socket.destroy();
        callback(new MailError("MAIL_DELIVERY_UNAVAILABLE"));
      } else callback(null, { connection: socket });
    };
    const connected = (): void => finish(this.cancelled || socket.destroyed);
    const timer = setTimeout(() => finish(true), 3000);
    socket.once("connect", connected);
    // Retain a harmless error listener through teardown; SMTP owns its own handlers
    // after handoff. The one-shot finish also covers close-before-connect without error.
    socket.on("error", () => finish(true));
    socket.once("close", () => { this.sockets.delete(socket); finish(true); });
    try { socket.connect({ host: "127.0.0.1", port: this.configuration.smtpPort }); }
    catch { finish(true); }
  }

  /** Terminal emergency cancellation; ordinary module close remains graceful. */
  cancelPending(): void {
    this.closed = true;
    this.cancelled = true;
    for (const socket of this.sockets) socket.destroy();
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

  async close(): Promise<void> {
    this.closed = true;
    await Promise.allSettled([...this.pending]);
    this.transport.close();
  }
}
