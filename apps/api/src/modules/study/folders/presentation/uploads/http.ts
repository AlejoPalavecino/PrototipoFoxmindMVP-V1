import type {IncomingMessage,ServerResponse} from 'node:http';
import type { StudyUploadOperations } from '../../application/read-ports.ts';
import { uploadDeadlineMs } from '../../../../../../../../src/core/domain/documents/document-formats.ts';

const STUDY_UPLOAD_LIMIT=50_000_000;
const bodyError=(code:string)=>Object.assign(new Error(code),{code});
/** Reads a bounded body; fails on overflow, declared-length mismatch or a stalled client (default 15 s overall). */
/** `idleMs` cuts a sender that goes quiet, so a deliberately slow body cannot hold its transfer slot. */
export function readStudyBody(request:IncomingMessage,limit:number,timeoutMs=15_000,idleMs=5000):Promise<Buffer> {
  return new Promise((resolve,reject)=>{
    const chunks:Buffer[]=[];let total=0,done=false;
    const finish=(error?:{code:string})=>{
      if(done)return;done=true;clearTimeout(timer);clearTimeout(idle);request.off('data',onData);request.off('end',onEnd);request.off('error',onError);request.off('aborted',onAbort);
      if(error){request.pause();reject(bodyError(error.code));}else resolve(Buffer.concat(chunks));
    };
    const stall=()=>finish({code:'REQUEST_TIMEOUT'});let idle=setTimeout(stall,idleMs);
    const onData=(chunk:Buffer|string)=>{clearTimeout(idle);idle=setTimeout(stall,idleMs);const buffer=Buffer.from(chunk);total+=buffer.length;if(total>limit)finish({code:'INVALID_INPUT'});else chunks.push(buffer);};
    const onEnd=()=>finish();const onError=()=>finish({code:'INVALID_INPUT'});const onAbort=()=>finish({code:'INVALID_INPUT'});
    const timer=setTimeout(()=>finish({code:'REQUEST_TIMEOUT'}),timeoutMs);
    request.on('data',onData);request.once('end',onEnd);request.once('error',onError);request.once('aborted',onAbort);
  });
}
export function studyJson(response:ServerResponse,status:number,value:unknown){if(response.writableEnded||response.destroyed)return;response.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});response.end(JSON.stringify(value));}
export function studyReject(response:ServerResponse,error:unknown){
  const codes:Record<string,number>={AUTH_REQUIRED:401,EMAIL_VERIFICATION_REQUIRED:403,CSRF_INVALID:403,ORIGIN_NOT_ALLOWED:403,FORBIDDEN:403,INVALID_INPUT:400,INVALID_UPLOAD:400,FILE_REJECTED:422,FILE_NOT_READY:409,CONFLICT:409,QUOTA_EXCEEDED:409,RATE_LIMITED:429,REQUEST_TIMEOUT:408};
  const candidate=error&&typeof error==='object'&&'code'in error?String(error.code):'';
  const code=Object.hasOwn(codes,candidate)?candidate:'SERVICE_UNAVAILABLE';studyJson(response,codes[code]??503,{error:{code}});
}
/** Shared bound on concurrent byte transfers, created by the composition root. */
export interface StudyTransferGate { acquire(owner:string):(()=>void)|undefined }
// Without a shared gate (isolated tests) keep the former ceiling of four transfers.
function localGate():StudyTransferGate{let active=0;return {acquire:()=>{if(active>=4)return undefined;active++;let done=false;return ()=>{if(!done){done=true;active--;}};}};}
export function installStudyUploads(app:{use(path:string,handler:(request:IncomingMessage,response:ServerResponse,next:()=>void)=>void):unknown},files:StudyUploadOperations,admit:(request:IncomingMessage,response:ServerResponse)=>Promise<string|null|void>,transfers:StudyTransferGate=localGate()) {
  const uuid='[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}';
  const route=new RegExp(`^/study-folders/(${uuid})/uploads(?:/(${uuid})(/file)?)?$`,'iu');
  let active=0;
  app.use('/api/v1',(request,response,next)=>{
    const url=new URL(request.url??'/','http://study.invalid'),match=route.exec(url.pathname);
    if(!match){next();return;}
    response.setHeader('Cache-Control','no-store');
    if(active>=16){studyReject(response,{});return;}active++;
    let release:(()=>void)|undefined;
    void(async()=>{
      const owner=await admit(request,response);
      const [,folder,id,file]=match,method=request.method??'GET';
      // Only byte transfers take a slot; creating, polling and listing do not.
      if(id&&((file&&method==='GET')||(!file&&method==='PUT'))){release=transfers.acquire(owner??'');if(!release)throw {code:'SERVICE_UNAVAILABLE'};}
      if([...url.searchParams.keys()].some(k=>k!=='mode')||url.searchParams.size>1)throw {code:'INVALID_INPUT'};
      if(!id&&method==='POST') {
        if(!request.headers['content-type']?.startsWith('application/json'))throw {code:'INVALID_INPUT'};
        const body=JSON.parse((await readStudyBody(request,4096)).toString('utf8'));
        studyJson(response,201,await files.begin(request,folder!,body));
      }else if(id&&!file&&method==='PUT') {
        // Authenticate and authorize before buffering anything; early rejections must not drain the body.
        response.setHeader('Connection','close');
        const {expectedBytes}=await files.authorizeReceive(request,folder!,id),declared=request.headers['content-length'];
        if(request.headers['transfer-encoding']||!/^\d+$/u.test(declared??'')||Number(declared)!==expectedBytes||expectedBytes<1||expectedBytes>STUDY_UPLOAD_LIMIT)throw {code:'INVALID_UPLOAD'};
        studyJson(response,200,await files.receive(request,folder!,id,await readStudyBody(request,expectedBytes,uploadDeadlineMs(expectedBytes))));
      }
      else if(id&&!file&&method==='GET')studyJson(response,200,await files.status(request,folder!,id));
      else if(id&&file&&method==='GET') {
        const mode=url.searchParams.get('mode')??'download';if(!['preview','download'].includes(mode))throw {code:'INVALID_INPUT'};
        const result=await files.read(request,folder!,id),preview=mode==='preview'&&['application/pdf','image/png','image/jpeg'].includes(result.mime);
        response.writeHead(200,{'Content-Type':result.mime,'Content-Length':result.bytes.length,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store',
          'Content-Security-Policy':"sandbox; default-src 'none'",'Content-Disposition':`${preview?'inline':'attachment'}; filename*=UTF-8''${encodeURIComponent(result.name)}`});response.end(result.bytes);
      }else studyJson(response,405,{error:{code:'METHOD_NOT_ALLOWED'}});
    })().catch(error=>studyReject(response,error)).finally(()=>{active--;release?.();});
  });
}
