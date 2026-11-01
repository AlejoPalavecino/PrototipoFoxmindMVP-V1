export interface ObjectStorage {
  put(key: string, bytes: Buffer): Promise<void>;
  get(key: string, limit: number): Promise<Buffer>;
  remove(key: string): Promise<void>;
  drain?(): Promise<void>;
}
export class S3Storage implements ObjectStorage {
  readonly client: S3Client;
  readonly bucket: string;
  readonly timeoutMs: number;
  readonly drainTimeoutMs: number;
  private readonly owned = new Set<{ key: string; kind: 'read' | 'write'; controller: AbortController; pending: Promise<void>; timedOut: boolean }>();
  private closing = false;
  private destroyed = false;
  constructor(client: S3Client, bucket: string, timeoutMs = 10000, drainTimeoutMs = 30000) {
    if (!/^[a-z0-9][a-z0-9-]{2,62}$/.test(bucket) || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30000
      || !Number.isSafeInteger(drainTimeoutMs) || drainTimeoutMs < 1 || drainTimeoutMs > 30000) {
      throw new FileError('SERVICE_UNAVAILABLE');
    }
    this.client = client; this.bucket = bucket; this.timeoutMs = timeoutMs; this.drainTimeoutMs = drainTimeoutMs;
  }
  private key(key: string): void {
    if (!/^p4\/[a-f0-9-]{36}\/[a-zA-Z0-9-]{1,80}$/.test(key)
      && !/^foxy-assets\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(key)) throw new FileError('INVALID_UPLOAD');
  }
  private async bounded<T>(key: string, kind: 'read' | 'write', operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const scope = key.split('/').slice(0, 2).join('/');
    if (this.closing || (kind === 'write' && [...this.owned].some(entry => entry.kind === 'write' && entry.timedOut
      && entry.key.split('/').slice(0, 2).join('/') === scope))) throw new FileError('SERVICE_UNAVAILABLE');
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const work = Promise.resolve().then(() => { if (controller.signal.aborted) throw new FileError('SERVICE_UNAVAILABLE'); return operation(controller.signal); });
    const entry = { key, kind, controller, pending: work.then(() => undefined, () => undefined), timedOut: false };
    this.owned.add(entry);
    void entry.pending.then(() => { this.owned.delete(entry); });
    try {
      return await Promise.race([work, new Promise<never>((_, reject) => {
        timer = setTimeout(() => { entry.timedOut = true; controller.abort(); reject(new FileError('SERVICE_UNAVAILABLE')); }, this.timeoutMs);
      })]);
    } catch (error) {
      if (error instanceof FileError) throw error;
      const name = (error as { name?: string })?.name;
      if (name === 'NoSuchKey' || name === 'NotFound') throw new FileError('NOT_FOUND');
      if (name === 'PreconditionFailed' || name === 'ConditionalRequestConflict') throw new FileError('UPLOAD_CONFLICT');
      throw new FileError('SERVICE_UNAVAILABLE');
    } finally { clearTimeout(timer); }
  }
  async drain(): Promise<void> {
    const pending = [...this.owned].map(entry => entry.pending); if (!pending.length) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try { await Promise.race([Promise.all(pending), new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new FileError('SERVICE_UNAVAILABLE')), this.drainTimeoutMs);
    })]); } finally { clearTimeout(timer); }
  }
  async close(): Promise<void> {
    this.closing = true; for (const entry of this.owned) entry.controller.abort();
    try { await this.drain(); } finally { if (!this.destroyed) { this.destroyed = true; this.client.destroy(); } }
  }
  async put(key: string, bytes: Buffer): Promise<void> {
    this.key(key);
    if (!Buffer.isBuffer(bytes) || bytes.length < 1 || bytes.length > 50_000_000) throw new FileError('INVALID_UPLOAD');
    await this.bounded(key, 'write', signal => this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key,
      Body: bytes, ContentLength: bytes.length, ContentType: 'application/octet-stream', IfNoneMatch: '*' }), { abortSignal: signal }));
  }
  async get(key: string, limit: number): Promise<Buffer> {
    this.key(key);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50_000_000) throw new FileError('INVALID_UPLOAD');
    return this.bounded(key, 'read', async signal => {
      const response = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }), { abortSignal: signal });
      const body = response.Body as AsyncIterable<Uint8Array> & { destroy?: () => void };
      const destroy = () => body?.destroy?.();
      signal.addEventListener('abort', destroy, { once: true });
      try {
        if (signal.aborted) throw new FileError('SERVICE_UNAVAILABLE');
        if (!body || !Number.isSafeInteger(response.ContentLength) || response.ContentLength! > limit || response.ContentLength! < 1) {
          throw new FileError('SERVICE_UNAVAILABLE');
        }
        const chunks: Buffer[] = []; let total = 0;
        for await (const chunk of body) {
          total += chunk.length;
          if (signal.aborted || total > limit || total > response.ContentLength!) throw new FileError('SERVICE_UNAVAILABLE');
          chunks.push(Buffer.from(chunk));
        }
        if (signal.aborted || total !== response.ContentLength) throw new FileError('SERVICE_UNAVAILABLE');
        return Buffer.concat(chunks, total);
      } finally { signal.removeEventListener('abort', destroy); destroy(); }
    });
  }
  async remove(key: string): Promise<void> {
    this.key(key);
    await this.bounded(key, 'write', signal => this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }), { abortSignal: signal }));
  }
}
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand, type S3Client } from '@aws-sdk/client-s3';
import { FileError } from './errors.ts';
