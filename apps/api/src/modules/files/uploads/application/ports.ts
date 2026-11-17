import type { FileReadPort } from '../../downloads/public.ts';
import type { FileScope } from '../../custody/public.ts';
import type { UploadIntent } from '../../domain/policy.ts';
import type { view } from '../../domain/file-view.ts';

export interface FileHttpPort extends FileReadPort {
  authorizeReceive(request: unknown, id: string): Promise<{ expectedBytes: number }>;
  begin(request: unknown, scope: FileScope, intent: UploadIntent, targetId?: string | null): Promise<ReturnType<typeof view>>;
  usage(request: unknown, scope: FileScope): Promise<{ usedBytes: bigint; quotaBytes: bigint; availableBytes: bigint }>;
  status(request: unknown, id: string): Promise<ReturnType<typeof view>>;
  receive(request: unknown, id: string, input: Buffer): Promise<ReturnType<typeof view>>;
}
