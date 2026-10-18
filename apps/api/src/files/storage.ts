export interface ObjectStorage {
  put(key: string, bytes: Buffer): Promise<void>;
  get(key: string, limit: number): Promise<Buffer>;
  remove(key: string): Promise<void>;
}
export class S3Storage implements ObjectStorage {
  readonly client: S3Client;
  readonly bucket: string;
  readonly timeoutMs: number;
  constructor(client: S3Client, bucket: string, timeoutMs = 10000) {
    if (!/^[a-z0-9][a-z0-9-]{2,62}$/.test(bucket) || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30000) {
      throw new FileError('SERVICE_UNAVAILABLE');
    }
    this.client = client; this.bucket = bucket; this.timeoutMs = timeoutMs;
  }
  private key(key: string): void {
    if (!/^p4\/[a-f0-9-]{36}\/[a-zA-Z0-9-]{1,80}$/.test(key)) throw new FileError('INVALID_UPLOAD');
  }
  private async bounded<T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([operation(controller.signal), new Promise<never>((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new FileError('SERVICE_UNAVAILABLE')); }, this.timeoutMs);
      })]);
    } catch (error) {
      if (error instanceof FileError) throw error;
      const name = (error as { name?: string })?.name;
      if (name === 'NoSuchKey' || name === 'NotFound') throw new FileError('NOT_FOUND');
      if (name === 'PreconditionFailed' || name === 'ConditionalRequestConflict') throw new FileError('UPLOAD_CONFLICT');
      throw new FileError('SERVICE_UNAVAILABLE');
    } finally { clearTimeout(timer); }
  }
  async put(key: string, bytes: Buffer): Promise<void> {
    this.key(key);
    if (!Buffer.isBuffer(bytes) || bytes.length < 1 || bytes.length > 50_000_000) throw new FileError('INVALID_UPLOAD');
    await this.bounded(signal => this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key,
      Body: bytes, ContentLength: bytes.length, ContentType: 'application/octet-stream', IfNoneMatch: '*' }), { abortSignal: signal }));
  }
  async get(key: string, limit: number): Promise<Buffer> {
    this.key(key);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50_000_000) throw new FileError('INVALID_UPLOAD');
    return this.bounded(async signal => {
      const response = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }), { abortSignal: signal });
      const body = response.Body as AsyncIterable<Uint8Array> & { destroy?: () => void };
      const destroy = () => body?.destroy?.();
      signal.addEventListener('abort', destroy, { once: true });
      try {
        if (!body || !Number.isSafeInteger(response.ContentLength) || response.ContentLength! > limit || response.ContentLength! < 1) {
          throw new FileError('SERVICE_UNAVAILABLE');
        }
        const chunks: Buffer[] = []; let total = 0;
        for await (const chunk of body) {
          total += chunk.length;
          if (signal.aborted || total > limit || total > response.ContentLength!) throw new FileError('SERVICE_UNAVAILABLE');
          chunks.push(Buffer.from(chunk));
        }
        if (total !== response.ContentLength) throw new FileError('SERVICE_UNAVAILABLE');
        return Buffer.concat(chunks, total);
      } finally { signal.removeEventListener('abort', destroy); destroy(); }
    });
  }
  async remove(key: string): Promise<void> {
    this.key(key);
    await this.bounded(signal => this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }), { abortSignal: signal }));
  }
}
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand, type S3Client } from '@aws-sdk/client-s3';
import { FileError } from './errors.ts';
