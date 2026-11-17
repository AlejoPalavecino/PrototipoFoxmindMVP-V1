import {useEffect,useRef,useState} from 'react';
import type {StudyConversation,StudyDetail} from './study-contracts.ts';
import {requestStudyGeneration,studyGenerationRequests,studyGenerationRetryData,type StudyGenerationInput,type StudyGenerationRequest,type StudyGenerationRun} from './study-generation';

type LocalIntent={requestId:string;conversationId?:string;data:StudyGenerationInput;phase:'SENDING'|'SYNCING'|'UNCERTAIN'|'FAILED'|'CANCELLED';error?:string};
type Options={detail:StudyDetail;current?:StudyConversation;busy:boolean;active:boolean;run:StudyGenerationRun;onConversation:(id:string)=>void;onReload:()=>Promise<void>;cancelGeneration?:(requestId:string)=>Promise<'CANCELLED'|'ALREADY_FINISHED'>};

export function useStudyGeneration(options:Options){
 const [local,setLocal]=useState<LocalIntent>(),[submitting,setSubmitting]=useState(false),[cancelling,setCancelling]=useState(''),[error,setError]=useState('');
 const localRef=useRef(local),locked=useRef(false),cancelLock=useRef(false),mounted=useRef(true),latest=useRef(options);
 latest.current=options;
 const allRequests=options.detail.conversations.flatMap(studyGenerationRequests),requests=studyGenerationRequests(options.current);
 const receipt=local&&allRequests.find(request=>request.requestId===local.requestId);
 const visibleLocal=receipt?undefined:local;
 function updateLocal(value:LocalIntent|undefined){localRef.current=value;if(mounted.current)setLocal(value);}
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 useEffect(()=>{if(receipt)updateLocal(undefined);},[receipt?.requestId,receipt?.status]);
 const pollKey=allRequests.filter(request=>request.status==='PENDING').map(request=>request.requestId).sort().join(',')+
  (visibleLocal&&['SYNCING','UNCERTAIN','CANCELLED'].includes(visibleLocal.phase)?`:${visibleLocal.requestId}:${visibleLocal.phase}`:'');
 useEffect(()=>{
  if(!pollKey||options.busy||submitting)return;
  let alive=true,timer:ReturnType<typeof setTimeout>;
  const schedule=()=>{timer=setTimeout(async()=>{
   try{await latest.current.onReload();if(alive)setError('');}
   catch{if(alive)setError('No pudimos actualizar la propuesta. Seguimos conservando tu solicitud.');}
   if(alive)schedule();
  },2000);};
  schedule();return()=>{alive=false;clearTimeout(timer);};
 },[pollKey,options.busy,submitting]);

 async function dispatch(data:StudyGenerationInput,conversationId:string|undefined,requestId:string){
  if(locked.current||latest.current.busy||!latest.current.active)return false;
  locked.current=true;setSubmitting(true);setError('');
  let intent:LocalIntent={requestId,conversationId,data:structuredClone(data),phase:'SENDING'};updateLocal(intent);
  try{
   const result=await requestStudyGeneration({conversationId,data:intent.data,requestId,run:latest.current.run,onConversation:id=>{
    intent={...intent,conversationId:id};updateLocal(intent);if(mounted.current)latest.current.onConversation(id);
   }});
   const cancelled=(result.response as {result?:{status?:string}})?.result?.status==='CANCELLED';
   updateLocal({...intent,phase:cancelled?'CANCELLED':'SYNCING'});
   if(mounted.current)try{await latest.current.onReload();}catch{/* A successful command is not retried while its saved result is being read. */}
   return !cancelled;
  }catch(failure){
   const code=(failure as {code?:string})?.code;
   const uncertain=code==='SERVICE_UNAVAILABLE'||code==='PENDING'||!(failure&&typeof failure==='object'&&'code' in failure);
   updateLocal({...intent,phase:uncertain?'UNCERTAIN':'FAILED',error:failure instanceof Error?failure.message:'No pudimos preparar la propuesta. Tu indicación se conserva.'});
   return false;
  }finally{locked.current=false;if(mounted.current)setSubmitting(false);}
 }
 function submit(data:StudyGenerationInput){
  if(studyGenerationRequests(latest.current.current).some(request=>request.status==='PENDING')||localRef.current&&['SENDING','SYNCING','UNCERTAIN'].includes(localRef.current.phase))return Promise.resolve(false);
  return dispatch(data,latest.current.current?.id,crypto.randomUUID());
 }
 function retry(request:StudyGenerationRequest){
  if(!['FAILED','CANCELLED','INSUFFICIENT'].includes(request.status)||requests.some(item=>item.status==='PENDING'))return Promise.resolve(false);
  return dispatch(studyGenerationRetryData(request),request.conversationId,crypto.randomUUID());
 }
 function retryLocal(){const intent=localRef.current;if(!intent||!['UNCERTAIN','FAILED','CANCELLED'].includes(intent.phase))return Promise.resolve(false);
  return dispatch(intent.data,intent.conversationId,intent.phase==='UNCERTAIN'?intent.requestId:crypto.randomUUID());
 }
 async function stop(requestId:string){
  if(cancelLock.current||!latest.current.cancelGeneration)return;
  cancelLock.current=true;setCancelling(requestId);setError('');
  try{
   const outcome=await latest.current.cancelGeneration(requestId);
   if(outcome==='CANCELLED'&&localRef.current?.requestId===requestId)updateLocal({...localRef.current,phase:'CANCELLED'});
   if(mounted.current)await latest.current.onReload();
  }catch{if(mounted.current)setError('No pudimos confirmar la cancelación. Volvé a consultar el estado o intentá detenerla otra vez.');}
  finally{cancelLock.current=false;if(mounted.current)setCancelling('');}
 }
 return {requests,local:visibleLocal,submitting,cancelling,error,submit,retry,retryLocal,stop,
  blocked:submitting||requests.some(request=>request.status==='PENDING')||!!visibleLocal&&['SENDING','SYNCING','UNCERTAIN'].includes(visibleLocal.phase)};
}
