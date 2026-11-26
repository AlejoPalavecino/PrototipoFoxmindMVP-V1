import type {IncomingMessage,ServerResponse} from 'node:http';
import {studyJson,studyReject,readStudyBody} from '../uploads/http.ts';
import type { StudyReminderQueries } from '../../application/read-ports.ts';
export function installStudyReminders(app:{use(path:string,handler:(request:IncomingMessage,response:ServerResponse,next:()=>void)=>void):unknown},runtime:StudyReminderQueries,admit:(request:IncomingMessage,response:ServerResponse)=>Promise<unknown>){
 app.use('/api/v1',(request,response,next)=>{
  const url=new URL(request.url??'/','http://study.invalid'),match=/^\/study-folders\/reminders(?:\/([a-f0-9-]{36})\/read)?$/iu.exec(url.pathname);
  if(!match){next();return;}response.setHeader('Cache-Control','no-store');
  void(async()=>{await admit(request,response);if(url.search)throw {code:'INVALID_INPUT'};
   if(!match[1]&&request.method==='GET')studyJson(response,200,await runtime.list(request));
   else if(match[1]&&request.method==='POST'){const body=(await readStudyBody(request,100)).toString('utf8');if(body&&body!=='{}')throw {code:'INVALID_INPUT'};studyJson(response,200,await runtime.read(request,match[1]));}
   else studyJson(response,405,{error:{code:'METHOD_NOT_ALLOWED'}});
  })().catch(error=>studyReject(response,error));
 });
}
