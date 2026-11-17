import type {IncomingMessage,ServerResponse} from 'node:http';
import type { StudyUploadOperations } from '../../application/read-ports.ts';

export async function readStudyBody(request:IncomingMessage,limit:number):Promise<Buffer> {
  const chunks:Buffer[]=[];let total=0;
  for await(const chunk of request){total+=chunk.length;if(total>limit)throw Object.assign(new Error('INVALID_INPUT'),{code:'INVALID_INPUT'});chunks.push(Buffer.from(chunk));}
  return Buffer.concat(chunks);
}
export function studyJson(response:ServerResponse,status:number,value:unknown){if(response.writableEnded||response.destroyed)return;response.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});response.end(JSON.stringify(value));}
export function studyReject(response:ServerResponse,error:unknown){
  const codes:Record<string,number>={AUTH_REQUIRED:401,EMAIL_VERIFICATION_REQUIRED:403,CSRF_INVALID:403,ORIGIN_NOT_ALLOWED:403,FORBIDDEN:403,INVALID_INPUT:400,INVALID_UPLOAD:400,FILE_REJECTED:422,FILE_NOT_READY:409,CONFLICT:409,QUOTA_EXCEEDED:409,RATE_LIMITED:429};
  const candidate=error&&typeof error==='object'&&'code'in error?String(error.code):'';
  const code=Object.hasOwn(codes,candidate)?candidate:'SERVICE_UNAVAILABLE';studyJson(response,codes[code]??503,{error:{code}});
}
export function installStudyUploads(app:{use(path:string,handler:(request:IncomingMessage,response:ServerResponse,next:()=>void)=>void):unknown},files:StudyUploadOperations,admit:(request:IncomingMessage,response:ServerResponse)=>Promise<void>) {
  const uuid='[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}';
  const route=new RegExp(`^/study-folders/(${uuid})/uploads(?:/(${uuid})(/file)?)?$`,'iu');
  let active=0;
  app.use('/api/v1',(request,response,next)=>{
    const url=new URL(request.url??'/','http://study.invalid'),match=route.exec(url.pathname);
    if(!match){next();return;}
    response.setHeader('Cache-Control','no-store');
    if(active>=4){studyReject(response,{});return;}active++;
    void(async()=>{
      await admit(request,response);
      const [,folder,id,file]=match,method=request.method??'GET';
      if([...url.searchParams.keys()].some(k=>k!=='mode')||url.searchParams.size>1)throw {code:'INVALID_INPUT'};
      if(!id&&method==='POST') {
        if(!request.headers['content-type']?.startsWith('application/json'))throw {code:'INVALID_INPUT'};
        const body=JSON.parse((await readStudyBody(request,4096)).toString('utf8'));
        studyJson(response,201,await files.begin(request,folder!,body));
      }else if(id&&!file&&method==='PUT')studyJson(response,200,await files.receive(request,folder!,id,await readStudyBody(request,50_000_000)));
      else if(id&&!file&&method==='GET')studyJson(response,200,await files.status(request,folder!,id));
      else if(id&&file&&method==='GET') {
        const mode=url.searchParams.get('mode')??'download';if(!['preview','download'].includes(mode))throw {code:'INVALID_INPUT'};
        const result=await files.read(request,folder!,id),preview=mode==='preview'&&['application/pdf','image/png','image/jpeg'].includes(result.mime);
        response.writeHead(200,{'Content-Type':result.mime,'Content-Length':result.bytes.length,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store',
          'Content-Security-Policy':"sandbox; default-src 'none'",'Content-Disposition':`${preview?'inline':'attachment'}; filename*=UTF-8''${encodeURIComponent(result.name)}`});response.end(result.bytes);
      }else studyJson(response,405,{error:{code:'METHOD_NOT_ALLOWED'}});
    })().catch(error=>studyReject(response,error)).finally(()=>active--);
  });
}
