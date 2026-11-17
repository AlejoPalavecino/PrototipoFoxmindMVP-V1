import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { DOCUMENT_MAX_BYTES } from '../../../../../../../src/core/domain/documents/document-formats.ts';
import { FileError } from '../../domain/errors.ts';

const compoundFile = Buffer.from('d0cf11e0a1b11ae1', 'hex');
const image = 'foxmind-office-converter:local';
let active = 0;

export function legacyOffice(extension: string): extension is 'doc' | 'ppt' {
  return extension === 'doc' || extension === 'ppt';
}

export async function convertLegacyOffice(bytes: Uint8Array, extension: 'doc' | 'ppt', signal?: AbortSignal) {
  if (bytes.length < 512 || bytes.length > DOCUMENT_MAX_BYTES
    || !Buffer.from(bytes.subarray(0, 8)).equals(compoundFile)) throw new FileError('FILE_REJECTED');
  if (active >= 2 || signal?.aborted) throw new FileError('SERVICE_UNAVAILABLE');
  const name = `foxmind-office-${randomUUID()}`;
  const args = ['run', '--rm', '--interactive', '--pull=never', '--name', name, '--network=none',
    '--read-only', '--tmpfs', '/scratch:rw,nosuid,nodev,noexec,size=96m,mode=1777',
    '--tmpfs', '/tmp:rw,nosuid,nodev,noexec,size=16m,mode=1777', '--user=65534:65534',
    '--security-opt=no-new-privileges', '--cap-drop=ALL', '--pids-limit=32', '--memory=512m',
    '--memory-swap=512m', '--cpus=1', image, extension];
  active++;
  try {
    const converted = await new Promise<Buffer>((resolve, reject) => {
      const child = execFile('docker', args, { windowsHide: true, encoding: 'buffer', signal, timeout: 14_000, maxBuffer: DOCUMENT_MAX_BYTES },
        (error, stdout) => {
          if (error || !stdout.length) reject(new FileError(error?.code === 2 ? 'FILE_REJECTED' : 'SERVICE_UNAVAILABLE'));
          else resolve(stdout);
        });
      // Docker may reject the operation before consuming stdin.
      child.stdin?.on('error', () => {});
      child.stdin?.end(bytes);
    });
    return { bytes: converted, extension: extension === 'doc' ? 'docx' as const : 'pptx' as const };
  } finally {
    await new Promise<void>(resolve => {
      execFile('docker', ['rm', '--force', name], { windowsHide: true, timeout: 3000 }, () => resolve());
    });
    active--;
  }
}
