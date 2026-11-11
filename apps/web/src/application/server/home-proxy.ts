import { request as httpRequest, type IncomingMessage, type ServerResponse } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { parseHomeQuery, parseHomePageQuery, parseHomeResponse, parseHomeModuleResponse } from '../../../../../src/core/domain/index.ts';
function fail(response:ServerResponse,status:number,code:string):void {
  if (response.destroyed || response.writableEnded) return;
  response.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  response.end(JSON.stringify({error:{code}}));
}
function route(request:IncomingMessage):URL {
  const raw=request.url??'';
  if (/[\\#]/.test(raw) || /%|\.\./.test(raw.split('?')[0])) throw new Error();
  const url=new URL(raw,'http://web.invalid');
  const match=/^\/api\/v1\/home\/modules\/(pending|review|feedback|agenda|queries|materials|classrooms|drafts|submitted)$/.exec(url.pathname);
  if (url.pathname!=='/api/v1/home' && !match) throw Object.assign(new Error(),{status:404});
  if (request.method!=='GET') throw Object.assign(new Error(),{status:405});
  if (request.headers['transfer-encoding'] || Number(request.headers['content-length']??0) || request.headers['content-encoding']) throw new Error();
  const query=Object.fromEntries(url.searchParams);
  if ([...url.searchParams.keys()].length!==Object.keys(query).length) throw new Error();
  if (match) {
    if (Object.hasOwn(query,'module')) throw new Error();
    parseHomePageQuery({...query,module:match[1],cursor:query.cursor??null});
  } else parseHomeQuery(query);
  return url;
}
function destination(value?:string):string {
  const url=new URL(value??''),local=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  if (url.origin!==value || url.username || url.password || !(url.protocol==='https:' || local && url.protocol==='http:')) throw new Error();
  return url.origin;
}
function read(result:IncomingMessage):Promise<Buffer> {
  return new Promise((resolve,reject)=>{
    let size=0,ended=false; const chunks:Buffer[]=[];
    const finish=(error?:Error)=>{
      if (ended) return; ended=true; clearTimeout(timer);
      result.off('data',data);result.off('end',end);result.off('error',abort);result.off('aborted',abort);
      if (error) { result.destroy(); reject(error); } else resolve(Buffer.concat(chunks));
    };
    const data=(chunk:Buffer)=>{size+=chunk.length;if(size>2*1024*1024)finish(new Error());else chunks.push(chunk);};
    const end=()=>finish(),abort=()=>finish(new Error()),timer=setTimeout(abort,30_000);
    result.on('data',data);result.once('end',end);result.once('error',abort);result.once('aborted',abort);
  });
}
async function upstreamBody(result:IncomingMessage,response:ServerResponse,module:boolean):Promise<void> {
  const status=result.statusCode??503;
  if (status>=300 && status<400 || result.headers['content-encoding'] || !/^application\/json(?:;|$)/i.test(result.headers['content-type']??'')) throw new Error();
  const content=await read(result),body:unknown=JSON.parse(content.toString());
  if (status===200) { if(module)parseHomeModuleResponse(body);else parseHomeResponse(body); }
  else if (status<400 || status>599) throw new Error();
  if(response.destroyed || response.writableEnded)return;
  const headers:Record<string,string|string[]>={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
  for(const key of ['set-cookie','x-request-id','retry-after']){const value=result.headers[key];if(value!==undefined)headers[key]=value;}
  response.writeHead(status,headers);response.end(content);
}
function forward(request:IncomingMessage,response:ServerResponse,origin:string,url:URL):Promise<void> {
  return new Promise(resolve=>{
    const headers:Record<string,string>={};
    for(const key of ['cookie','origin']){const value=request.headers[key];if(typeof value==='string')headers[key]=value;}
    const upstream=(origin.startsWith('https:')?httpsRequest:httpRequest)(origin+url.pathname+url.search,{method:'GET',headers});
    let incoming:IncomingMessage|undefined,settled=false;
    const finish=()=>{if(settled)return;settled=true;clearTimeout(timer);request.off('aborted',finish);response.off('close',finish);incoming?.destroy();upstream.destroy();resolve();};
    const unavailable=()=>{if(!settled)fail(response,503,'SERVICE_UNAVAILABLE');finish();},timer=setTimeout(unavailable,30_000);
    request.once('aborted',finish);response.once('close',finish);upstream.once('error',unavailable);
    upstream.once('response',result=>{incoming=result;void upstreamBody(result,response,url.pathname.includes('/modules/')).then(finish,unavailable);});
    upstream.end();
  });
}
export async function proxyHomeRequest(request:IncomingMessage,response:ServerResponse,configuredOrigin?:string):Promise<void> {
  let url:URL,origin:string;
  try{url=route(request);}catch(error){
    const status=(error as {status?:number}).status??400;
    fail(response,status,status===404?'NOT_FOUND':status===405?'METHOD_NOT_ALLOWED':'INVALID_INPUT');return;
  }
  try{origin=destination(configuredOrigin);}catch{fail(response,503,'SERVICE_UNAVAILABLE');return;}
  await forward(request,response,origin,url);
}
