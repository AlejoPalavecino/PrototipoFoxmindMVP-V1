function reject(): never { throw new Error('FILE_REJECTED'); }
function crc32(bytes: Buffer, start: number, end: number): number {
  let crc = 0xffffffff;
  for (let i = start; i < end; i++) { crc ^= bytes[i]!; for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
}
function png(bytes: Buffer): void {
  let pos = 8, first = true, ended = false;
  while (pos + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(pos), end = pos + 12 + length;
    if (end > bytes.length) return reject();
    const type = bytes.toString('ascii', pos + 4, pos + 8);
    if ((first && (type !== 'IHDR' || length !== 13)) || ['acTL','fcTL','fdAT'].includes(type)
      || crc32(bytes, pos + 4, end - 4) !== bytes.readUInt32BE(end - 4)) return reject();
    first = false; pos = end;
    if (type === 'IEND') { if (length || pos !== bytes.length) return reject(); ended = true; break; }
  }
  if (!ended) return reject();
}
function nextMarker(bytes: Buffer, offset: number, inScan: boolean): { marker: number; next: number } {
  let pos = offset;
  while (pos < bytes.length) {
    if (bytes[pos++] !== 0xff) { if (!inScan) return reject(); continue; }
    while (pos < bytes.length && bytes[pos] === 0xff) pos++;
    if (pos >= bytes.length) return reject();
    const marker = bytes[pos++]!;
    if (inScan && (marker === 0 || (marker >= 0xd0 && marker <= 0xd7))) continue;
    if (marker === 0) return reject();
    return { marker, next: pos };
  }
  return reject();
}
function jpeg(bytes: Buffer): void {
  let pos = 2, inScan = false, sawScan = false;
  while (pos < bytes.length) {
    const found = nextMarker(bytes, pos, inScan); pos = found.next; const marker = found.marker;
    if (marker === 0xd9) { if (!sawScan || pos !== bytes.length) return reject(); return; }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7) || pos + 2 > bytes.length) return reject();
    const length = bytes.readUInt16BE(pos);
    if (length < 2 || pos + length > bytes.length) return reject();
    if (marker === 0xe2 && length >= 6 && bytes.toString('binary', pos + 2, pos + 6) === 'MPF\0') return reject();
    pos += length; inScan = marker === 0xda; if (inScan) sawScan = true;
  }
  return reject();
}
export function verifyStillImage(bytes: Buffer): 'png' | 'jpeg' {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) { png(bytes); return 'png'; }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) { jpeg(bytes); return 'jpeg'; }
  return reject();
}
