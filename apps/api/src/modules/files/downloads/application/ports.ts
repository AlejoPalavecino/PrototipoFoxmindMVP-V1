export interface FileReadPort {
  read(request: unknown, id: string, mode?: 'download' | 'preview'): Promise<{ bytes: Uint8Array; headers: Record<string, string> }>;
}
