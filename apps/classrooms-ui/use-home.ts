'use client';
import { useCallback,useEffect,useRef,useState } from 'react';
import type { HomeModuleName,HomeResponse } from '../../src/core/domain/index.ts';
import { HomeClientError,type HomeClient } from './home-api.ts';
export function useHome(client:HomeClient|undefined,subjectId?:string) {
  const [state,setState]=useState<{owner:string|undefined;data:HomeResponse|null;error:string;loading:boolean}>({owner:subjectId,data:null,error:'',loading:true});
  const controller=useRef<AbortController|null>(null),generation=useRef(0),lastLoaded=useRef(0);
  const timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';
  const refresh=useCallback(async()=>{
    controller.current?.abort();const current=new AbortController();controller.current=current;
    const version=++generation.current;setState({owner:subjectId,data:null,error:'',loading:true});
    try {
      if(!client)throw new HomeClientError('SERVICE_UNAVAILABLE',503);
      const data=await client.read({timeZone},current.signal);
      if(subjectId && data.subjectId!==subjectId)throw new HomeClientError('FORBIDDEN',403);
      if(current.signal.aborted || generation.current!==version)return;
      lastLoaded.current=Date.now();setState({owner:subjectId,data,error:'',loading:false});
    }catch(error){if(!current.signal.aborted && generation.current===version)setState({owner:subjectId,data:null,error:(error as Error).message,loading:false});}
  },[client,subjectId,timeZone]);
  useEffect(()=>{
    void refresh();const focus=()=>{if(Date.now()-lastLoaded.current>=60_000)void refresh();};
    window.addEventListener('focus',focus);
    return()=>{generation.current++;controller.current?.abort();window.removeEventListener('focus',focus);};
  },[refresh]);
  const retry=useCallback(async(module:HomeModuleName)=>{
    if(!client)return;const current=controller.current,version=generation.current;
    try{
      const result=await client.page({module,timeZone,cursor:null},current?.signal);
      if(current?.signal.aborted || generation.current!==version)return;
      setState(old=>!old.data || old.data.subjectId!==result.subjectId ? {owner:subjectId,data:null,error:'FORBIDDEN',loading:false}
        : {...old,data:{...old.data,modules:{...old.data.modules,[module]:result.page}}});
    }catch(error){
      if(current?.signal.aborted || generation.current!==version)return;
      const fatal=['AUTH_REQUIRED','EMAIL_VERIFICATION_REQUIRED','FORBIDDEN'].includes((error as {code?:string}).code??'');
      setState(old=>fatal?{owner:subjectId,data:null,error:(error as Error).message,loading:false}:!old.data?old:
        {...old,data:{...old.data,modules:{...old.data.modules,[module]:{status:'error',code:'SERVICE_UNAVAILABLE',retryable:true}}}});
    }
  },[client,subjectId,timeZone]);
  return {...(state.owner===subjectId?state:{owner:subjectId,data:null,error:'',loading:true}),refresh,retry,timeZone,generation:generation.current};
}
