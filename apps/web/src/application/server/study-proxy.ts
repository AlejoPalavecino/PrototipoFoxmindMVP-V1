import { request as httpRequest, type IncomingMessage, type ServerResponse } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { Transform } from 'node:stream';

const root = '/api/v1/study-folders', uuid = '[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}';
const requestLimit=1048576,jsonLimit=4*1024*1024,binaryLimit=50*1024*1024;
function fail(response: ServerResponse, status: number, code: string): void {
  if (response.destroyed || response.writableEnded) return;
  if (response.headersSent) { response.destroy(); return; }
  response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  response.end(JSON.stringify({ error: { code } }));
}
function destination(value?: string): string {
  const url = new URL(value ?? ''), local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.origin !== value || url.username || url.password || !(url.protocol === 'https:' || local && url.protocol === 'http:')) throw new Error();
  return url.origin;
}
function select(request:IncomingMessage):{url:URL;method:string;binary:boolean;upload:boolean}{
 const raw=request.url??'',method=request.method??'GET';
 if(/[\\#%]/u.test(raw.split('?')[0]!)||raw.split('?')[0]!.includes('..'))throw new Error();
 const url=new URL(raw,'http://web.invalid'),path=url.pathname;
 if(raw.startsWith('/api/v1/chat-attachments/')){
  const route=new RegExp(`^/api/v1/chat-attachments/(?:teacher/|student/${uuid}/)${uuid}(?:/(${uuid})(/file)?)?$`,'u');
  const match=route.exec(path);
  if(!match)throw Object.assign(new Error(),{status:404});
  const binary=Boolean(match[2]);
  if(binary&&!path.startsWith('/api/v1/chat-attachments/teacher/'))throw Object.assign(new Error(),{status:404});
  if(!(binary?['GET']:match[1]?['PUT','DELETE']:['GET']).includes(method))throw Object.assign(new Error(),{status:405});
  const keys=[...url.searchParams.keys()];
  if(new Set(keys).size!==keys.length||keys.some(key=>binary?key!=='mode':method!=='PUT'||!['name','copy'].includes(key))
    ||binary&&url.searchParams.has('mode')&&!['preview','download'].includes(url.searchParams.get('mode')!))throw new Error();
  return {url,method,binary,upload:method==='PUT'};
 }
 if(!raw.startsWith(root))throw new Error();
 const folder=new RegExp(`^${root}/${uuid}$`,'i'),commands=new RegExp(`^${root}/${uuid}/commands$`,'i');
 const uploads=new RegExp(`^${root}/${uuid}/uploads$`,'i'),uploadId=new RegExp(`^${root}/${uuid}/uploads/${uuid}$`,'i');
 const file=new RegExp(`^${root}/${uuid}/uploads/${uuid}/file$`,'i');
 const docxPreview=new RegExp(`^${root}/${uuid}/docx-preview/${uuid}$`,'i');
 const readReminder=new RegExp(`^${root}/reminders/${uuid}/read$`,'i');
 const binary=file.test(path),upload=uploadId.test(path)&&method==='PUT';
 const allowed=path===root?['GET','POST']:folder.test(path)?['GET','PATCH']:commands.test(path)||uploads.test(path)||readReminder.test(path)?['POST']:uploadId.test(path)?['GET','PUT']:binary||docxPreview.test(path)||path===`${root}/reminders`?['GET']:[];
 if(!allowed.length)throw Object.assign(new Error(),{status:404});
 if(!allowed.includes(method))throw Object.assign(new Error(),{status:405});
 const keys=[...url.searchParams.keys()];if(new Set(keys).size!==keys.length||keys.some(key=>!binary||key!=='mode')||url.searchParams.has('mode')&&!['preview','download'].includes(url.searchParams.get('mode')!))throw new Error();
 return{url,method,binary,upload};
}
function read(stream: IncomingMessage, limit: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []; let size = 0, settled = false;
    const done = (error?: Error) => {
      if (settled) return; settled = true; clearTimeout(timer);
      stream.off('data', data); stream.off('end', end); stream.off('error', abort); stream.off('aborted', abort);
      if (error) { stream.pause(); reject(error); } else resolve(Buffer.concat(chunks));
    };
    const data = (chunk: Buffer) => { size += chunk.length; if (size > limit) done(new RangeError()); else chunks.push(chunk); };
    const end = () => done(), abort = () => done(new Error());
    const timer = setTimeout(abort, 10000);
    stream.on('data', data); stream.once('end', end); stream.once('error', abort); stream.once('aborted', abort);
  });
}
function length(value: string | string[] | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !/^[0-9]+$/u.test(value) || !Number.isSafeInteger(Number(value))) throw new Error();
  return Number(value);
}
async function metadata(request: IncomingMessage, method: string, upload=false, uploadLimit=binaryLimit): Promise<Buffer | undefined> {
  const expected = length(request.headers['content-length']);
  if (request.headers['content-encoding'] !== undefined) throw new Error();
  if ((expected ?? 0) > (upload?uploadLimit:requestLimit)) throw new RangeError();
  if (method === 'GET' || method === 'DELETE') { if ((expected ?? 0) || request.headers['transfer-encoding']) throw new Error(); return undefined; }
  if(upload){if(!/^application\/octet-stream(?:\s*;|$)/iu.test(request.headers['content-type']??''))throw new Error();return read(request,uploadLimit);}
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?\s*$/iu.test(request.headers['content-type'] ?? '')) throw new Error();
  const content = await read(request, requestLimit);
  if (expected !== undefined && content.length !== expected) throw new Error();
  JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(content)); return content;
}
function counter(max: number, expected?: number): Transform {
  let received = 0;
  return new Transform({ transform(chunk: Buffer, _encoding, callback) {
    received += chunk.length; callback(received > max || (expected !== undefined && received > expected) ? new Error() : null, chunk);
  }, flush(callback) { callback(expected !== undefined && received !== expected ? new Error() : undefined); } });
}
function responseHeaders(result: IncomingMessage): Record<string, string> {
  const headers: Record<string, string> = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  for (const key of ['retry-after', 'x-request-id']) { const value = result.headers[key]; if (typeof value === 'string') headers[key] = value; }
  const clearing = (result.headers['set-cookie'] ?? []).filter(value =>
    /^foxmind_session=; Path=\/; HttpOnly; SameSite=Lax(?:; Secure)?; Max-Age=0$/u.test(value));
  if (clearing.length === 1) headers['Set-Cookie'] = clearing[0]!;
  return headers;
}
async function receive(result: IncomingMessage, response: ServerResponse, binary: boolean, privateImage: boolean): Promise<void> {
  const status = result.statusCode ?? 503, contentType = result.headers['content-type'] ?? '', expected = length(result.headers['content-length']);
  if (status >= 300 && status < 400 || result.headers['content-encoding'] !== undefined) throw new Error();
  const headers = responseHeaders(result);
  if (status === 204) { response.writeHead(status, headers); response.end(); return; }
  const isBinary = binary && status === 200, max = isBinary ? (privateImage ? 10485760 : binaryLimit) : jsonLimit;
  if ((expected ?? 0) > max) throw new Error();
  if (!isBinary) {
    if (!/^application\/json(?:\s*;|$)/iu.test(contentType)) throw new Error();
    const data = await read(result, max);
    if (expected !== undefined && data.length !== expected) throw new Error();
    JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(data));
    if (!response.destroyed && !response.writableEnded) { response.writeHead(status, { ...headers, 'Content-Type': 'application/json; charset=utf-8' }); response.end(data); }
    return;
  }
  const octet = /^application\/octet-stream(?:\s*;|$)/iu.test(contentType);
  if (privateImage ? !/^(image\/png|image\/jpeg|application\/octet-stream)(?:\s*;|$)/iu.test(contentType) : !octet && !/^(application\/pdf|image\/png|image\/jpeg|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|application\/vnd\.openxmlformats-officedocument\.presentationml\.presentation|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|application\/zip)(?:\s*;|$)/iu.test(contentType)) throw new Error();
  headers['Content-Type'] = contentType;
  headers['Content-Security-Policy'] = "sandbox; default-src 'none'; frame-ancestors 'self'";
  headers['Cross-Origin-Resource-Policy'] = 'same-origin';
  if (expected !== undefined) headers['Content-Length'] = String(expected);
  const disposition = result.headers['content-disposition'];
  const attachmentOnly=!/^(application\/pdf|image\/png|image\/jpeg)(?:\s*;|$)/iu.test(contentType);
  if (attachmentOnly) headers['Content-Disposition'] = typeof disposition === 'string' && /^attachment(?:\s*;|$)/iu.test(disposition) ? disposition : 'attachment';
  else if (typeof disposition === 'string') headers['Content-Disposition'] = disposition;
  await new Promise<void>((resolve, reject) => {
    const limiter = counter(max, expected);
    const failed = () => { limiter.destroy(); reject(new Error()); };
    result.once('error', failed); result.once('aborted', failed); limiter.once('error', failed);
    response.once('finish', resolve); response.writeHead(status, headers); result.pipe(limiter).pipe(response);
  });
}
function forward(request: IncomingMessage, response: ServerResponse, origin: string,
  selected: ReturnType<typeof select>, content?: Buffer): Promise<void> {
  return new Promise(resolve => {
    const headers: Record<string, string> = {};
    for (const key of ['cookie', 'origin', 'x-csrf-token', 'content-type']) {
      const value = request.headers[key]; if (typeof value === 'string') headers[key] = value;
    }
    if (content) headers['content-length'] = String(content.length);
    const transport = origin.startsWith('https:') ? httpsRequest : httpRequest;
    const upstream = transport(origin + selected.url.pathname + selected.url.search, { method: selected.method, headers });
    let incoming: IncomingMessage | undefined, settled = false;
    const finish = () => { if (settled) return; settled = true; clearTimeout(timer);
      request.off('aborted', finish); response.off('close', finish); incoming?.destroy(); upstream.destroy(); resolve(); };
    const unavailable = () => { if (!settled) fail(response, 503, 'SERVICE_UNAVAILABLE'); finish(); };
    const timer = setTimeout(unavailable, selected.binary || selected.upload ? 65000 : 150000);
    request.once('aborted', finish); response.once('close', finish); upstream.once('error', unavailable);
    upstream.once('response', result => { incoming = result; void receive(result, response, selected.binary, false).then(finish, unavailable); });
    upstream.end(content);
  });
}
export async function proxyStudyRequest(request: IncomingMessage, response: ServerResponse, configuredOrigin?: string): Promise<void> {
  let selected: ReturnType<typeof select>, content: Buffer | undefined, origin: string;
  try { selected = select(request); content = await metadata(request, selected.method,selected.upload,
    selected.url.pathname.startsWith('/api/v1/chat-attachments/') ? 20_000_000 : binaryLimit); }
  catch (error) {
    const status = error instanceof RangeError ? 413 : (error as { status?: number }).status ?? 400;
    if (!request.complete) { response.setHeader('Connection', 'close'); request.resume(); }
    fail(response, status, status === 413 ? 'REQUEST_TOO_LARGE' : status === 405 ? 'METHOD_NOT_ALLOWED' : status === 404 ? 'NOT_FOUND' : 'INVALID_INPUT'); return;
  }
  try { origin = destination(configuredOrigin); } catch { fail(response, 503, 'SERVICE_UNAVAILABLE'); return; }
  await forward(request, response, origin, selected, content);
}
