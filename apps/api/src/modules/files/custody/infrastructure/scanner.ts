export interface FileScanner { scan(bytes: Buffer): Promise<void> }
export class ClamdScanner implements FileScanner {
  readonly host: string;
  readonly port: number;
  readonly timeoutMs: number;
  constructor(host: string, port: number, timeoutMs = 30000) {
    if (!host || !Number.isInteger(port) || port < 1 || port > 65535
      || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30000) throw new FileError('SERVICE_UNAVAILABLE');
    this.host = host; this.port = port; this.timeoutMs = timeoutMs;
  }
  async scan(bytes: Buffer): Promise<void> {
    if (!Buffer.isBuffer(bytes) || bytes.length < 1 || bytes.length > 50_000_000) throw new FileError('INVALID_UPLOAD');
    await new Promise<void>((resolve, reject) => {
      const socket = createConnection({ host: this.host, port: this.port });
      let response = Buffer.alloc(0); let settled = false; let sent = false;
      const timer = setTimeout(() => finish(new FileError('SERVICE_UNAVAILABLE')), this.timeoutMs);
      const finish = (error?: FileError) => {
        if (settled) return;
        settled = true; clearTimeout(timer); socket.destroy();
        if (error) reject(error); else resolve();
      };
      socket.on('error', () => finish(new FileError('SERVICE_UNAVAILABLE')));
      socket.on('close', () => { if (!settled) finish(new FileError('SERVICE_UNAVAILABLE')); });
      socket.on('data', chunk => {
        response = Buffer.concat([response, chunk]);
        if (!sent || response.length > 4096) return finish(new FileError('SERVICE_UNAVAILABLE'));
        const end = response.indexOf(0);
        if (end < 0) return;
        if (end !== response.length - 1) return finish(new FileError('SERVICE_UNAVAILABLE'));
        const verdict = response.subarray(0, end).toString('utf8');
        if (verdict === 'stream: OK') finish();
        else if (/^stream: [^\r\n\u0000]+ FOUND$/.test(verdict)) finish(new FileError('FILE_REJECTED'));
        else finish(new FileError('SERVICE_UNAVAILABLE'));
      });
      socket.once('connect', () => {
        socket.write('zINSTREAM\0');
        let offset = 0;
        const write = () => {
          while (!settled && offset < bytes.length) {
            const chunk = bytes.subarray(offset, offset + 65536); offset += chunk.length;
            const size = Buffer.alloc(4); size.writeUInt32BE(chunk.length);
            socket.write(size);
            if (!socket.write(chunk)) { socket.once('drain', write); return; }
          }
          if (!settled) { sent = true; socket.write(Buffer.alloc(4)); }
        };
        write();
      });
    });
  }
}
import { createConnection } from 'node:net';
import { FileError } from '../../domain/errors.ts';
