import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import type { FileDatabase, FileTransaction } from '../../files/public.ts';
import { decryptDelivery } from './delivery-envelope.ts';
import { fail } from './policy.ts';

export interface InvitationMessage {
  to: string;
  text: string;
  messageId: string;
}
type Send = (message: InvitationMessage, signal: AbortSignal) => Promise<void>;
interface Job {
  id: string;
  payload: { invitationId: string; generation: string; envelope: string };
  attempt_count: number;
  claim_token: string;
}
export interface DeliveryOptions {
  database: FileDatabase;
  key: Buffer;
  send: Send;
}
export class InvitationDeliveryWorker {
  private busy: Promise<void> | undefined;
  private timer: ReturnType<typeof setInterval> | undefined;
  private stopped = false;
  private readonly options: DeliveryOptions;
  constructor(options: DeliveryOptions, private readonly validateMailbox: (input: unknown) => string) {
    if (
      !options?.database ||
      typeof options.send !== 'function' ||
      !Buffer.isBuffer(options.key) ||
      options.key.length !== 32
    )
      fail('SERVICE_UNAVAILABLE');
    this.options = { ...options, key: Buffer.from(options.key) };
  }
  private tx<T>(operation: (tx: FileTransaction) => Promise<T>) {
    return this.options.database.$transaction(
      (raw) =>
        operation({ query: (sql, ...v) => raw.$queryRawUnsafe(sql, ...v) }),
      { maxWait: 2000, timeout: 4000 },
    );
  }
  sweep(): Promise<void> {
    if (this.busy) return this.busy;
    this.busy = this.drain().finally(() => {
      this.busy = undefined;
    });
    return this.busy;
  }
  private async claim(): Promise<Job | undefined> {
    return this.tx(async (tx) => {
      const [snapshot] =
        await tx.query<Job>(`SELECT * FROM background_jobs WHERE type='p5.invitation'
        AND attempt_count<8 AND available_at<=clock_timestamp()
        AND (status='PENDING' OR (status='RUNNING' AND claimed_until<clock_timestamp())) ORDER BY available_at,id LIMIT 1`);
      if (!snapshot) return;
      // Match domain lock order. Never hold a SQL transaction across SMTP.
      const [invitation] = await tx.query<{ classroom_id: string }>(
        'SELECT classroom_id FROM invitations WHERE id=$1::uuid',
        snapshot.payload.invitationId,
      );
      if (invitation)
        await tx.query(
          'SELECT id FROM classrooms WHERE id=$1::uuid FOR SHARE',
          invitation.classroom_id,
        );
      const [job] = await tx.query<Job>(
        `SELECT * FROM background_jobs WHERE id=$1::uuid AND available_at<=clock_timestamp() AND attempt_count<8
        AND (status='PENDING' OR (status='RUNNING' AND claimed_until<clock_timestamp())) FOR UPDATE SKIP LOCKED`,
        snapshot.id,
      );
      if (!job) return;
      const [live] = await tx.query(
        `SELECT i.id FROM invitations i JOIN classrooms c ON c.id=i.classroom_id WHERE i.id=$1::uuid
        AND i.generation=$2::bigint AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at>clock_timestamp() AND c.archived_at IS NULL`,
        job.payload.invitationId,
        job.payload.generation,
      );
      if (!live) {
        await tx.query(
          `UPDATE background_jobs SET status='COMPLETED',completed_at=clock_timestamp(),claimed_until=NULL,claim_token=NULL,
          updated_at=clock_timestamp(),last_error_code='P5_INVITATION_STALE' WHERE id=$1::uuid RETURNING id`,
          job.id,
        );
        return { ...job, claim_token: '' };
      }
      const token = randomUUID();
      await tx.query(
        `UPDATE background_jobs SET status='RUNNING',attempt_count=attempt_count+1,claim_token=$2::uuid,
        claimed_until=clock_timestamp()+interval '60 seconds',updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING id`,
        job.id,
        token,
      );
      return { ...job, claim_token: token };
    });
  }
  private async drain() {
    const deadline = Date.now() + 30000;
    for (let count = 0; count < 20 && Date.now() < deadline; count++) {
      const job = await this.claim();
      if (!job) break;
      if (!job.claim_token) continue;
      let accepted = false;
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const message = decryptDelivery(
          this.options.key,
          job.payload.envelope,
          `p5:${job.payload.invitationId}:${job.payload.generation}`,
        );
        const to = this.validateMailbox(message.to);
        const text = `${message.teacher} te invitó al aula «${message.classroom}» en FoxMind.\n\nRegistrate con este correo y verificá tu cuenta. Después, aceptá explícitamente la invitación desde Mis Aulas.\n\n${message.url}\n\nLa invitación vence a los siete días. Crear o verificar la cuenta no te inscribe automáticamente.`;
        await Promise.race([
          this.options.send(
            { to, text, messageId: `<p5-${job.id}@foxmind.local>` },
            controller.signal,
          ),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
              controller.abort();
              reject(new Error('SMTP timeout'));
            }, 10000);
          }),
        ]);
        accepted = true;
      } catch {
        /* Never log recipients, SMTP diagnostics, decrypted payload or transport credentials. */
      } finally {
        if (timer) clearTimeout(timer);
        controller.abort();
      }
      await this.tx(async (tx) => {
        await tx.query(
          `UPDATE background_jobs SET status=$3::"JobStatus",completed_at=CASE WHEN $4 THEN clock_timestamp() ELSE NULL END,
          available_at=clock_timestamp()+interval '1 minute',claimed_until=NULL,claim_token=NULL,updated_at=clock_timestamp(),
          last_error_code=CASE WHEN $4 THEN NULL ELSE 'P5_MAIL_UNAVAILABLE' END WHERE id=$1::uuid AND claim_token=$2::uuid RETURNING id`,
          job.id,
          job.claim_token,
          accepted
            ? 'COMPLETED'
            : job.attempt_count >= 7
              ? 'FAILED'
              : 'PENDING',
          accepted,
        );
      });
    }
  }
  onModuleInit() {
    if (this.stopped || this.timer) return;
    this.timer = setInterval(() => {
      void this.sweep().catch(() => {});
    }, 5000);
    this.timer.unref();
    void this.sweep().catch(() => {});
  }
  async onModuleDestroy() {
    this.stopped = true;
    if (this.timer) { clearInterval(this.timer); this.timer = undefined; }
    await this.busy;
  }
}

/** Production may inject an approved provider. This helper is intentionally restricted to a captured local inbox. */
export function localInvitationSender(
  port: number,
  from: string,
  validateMailbox: (input: unknown) => string,
): { send: Send; close: () => void } {
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    fail('SERVICE_UNAVAILABLE');
  validateMailbox(from);
  const nodemailer = createRequire(import.meta.url)('nodemailer');
  const active = new Set<any>();
  return {
    send: async (message, signal) => {
      const transport = nodemailer.createTransport({
        host: '127.0.0.1',
        port,
        secure: false,
        ignoreTLS: true,
        connectionTimeout: 3000,
        greetingTimeout: 3000,
        socketTimeout: 5000,
        disableFileAccess: true,
        disableUrlAccess: true,
      });
      active.add(transport);
      const abort = () => transport.close();
      signal.addEventListener('abort', abort, { once: true });
      try {
        if (signal.aborted) throw new Error('aborted');
        const result = await transport.sendMail({
          from,
          to: validateMailbox(message.to),
          subject: 'Te invitaron a un aula en FoxMind',
          text: message.text,
          messageId: message.messageId,
          disableFileAccess: true,
          disableUrlAccess: true,
        });
        if (result.rejected?.length || !result.accepted?.length)
          throw new Error('unaccepted');
      } finally {
        signal.removeEventListener('abort', abort);
        active.delete(transport);
        transport.close();
      }
    },
    close: () => {
      for (const transport of active) transport.close();
    },
  };
}
