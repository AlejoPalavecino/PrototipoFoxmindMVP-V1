'use client';
import { completeHomeQueue } from './home-queue.ts';
import { useCallback,useEffect,useRef,useState } from 'react';
import type { HomeModuleName, HomeResponse } from '../../../../../../src/core/domain/index.ts';
import { HomeClientError, type HomeClient } from '../api/home-api.ts';
export function useHome(client:HomeClient|undefined,subjectId?:string,focusedClassroomId?:string) {
  const focusRef=useRef(focusedClassroomId);focusRef.current=focusedClassroomId;
  const [orders,setOrders]=useState({review:'asc' as 'asc'|'desc',queries:'desc' as 'asc'|'desc'});
  const orderRef=useRef(orders);orderRef.current=orders;
  const sequences=useRef<Partial<Record<HomeModuleName,number>>>({});
  const [ordering,setOrdering]=useState<Partial<Record<HomeModuleName,boolean>>>({});
  const [state,setState]=useState<{owner:string|undefined;data:HomeResponse|null;error:string;loading:boolean}>({owner:subjectId,data:null,error:'',loading:true});
  const controller=useRef<AbortController|null>(null),generation=useRef(0),lastLoaded=useRef(0);
  const timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';
  const refresh=useCallback(async()=>{
    controller.current?.abort();const current=new AbortController();controller.current=current;
    const version=++generation.current;setOrdering({});setState({owner:subjectId,data:null,error:'',loading:true});
    try {
      if(!client)throw new HomeClientError('SERVICE_UNAVAILABLE',503);
      const data=await client.read({timeZone},current.signal);
      if(subjectId && data.subjectId!==subjectId)throw new HomeClientError('FORBIDDEN',403);
      const focusId=focusRef.current;
      if(focusId&&data.modules.classrooms.status==='ready'){
        try{
          let rooms=data.modules.classrooms;const seen=new Set<string>();
          while(rooms.nextCursor&&!rooms.items.some(item=>item.classroom.id===focusId)
            &&(data.memberships?.teach===undefined||rooms.items.filter(item=>item.classroom.role==='teacher'&&!item.classroom.archived).length<data.memberships.teach)){
            if(seen.has(rooms.nextCursor))throw new Error();seen.add(rooms.nextCursor);
            const result=await client.page({module:'classrooms',timeZone,cursor:rooms.nextCursor},current.signal);
            if(result.subjectId!==data.subjectId)throw new HomeClientError('FORBIDDEN',403);
            if(result.module!=='classrooms'||result.page.status!=='ready')throw new Error();
            const page=result.page as typeof rooms;
            rooms={...page,items:[...rooms.items,...page.items.filter(item=>!rooms.items.some(previous=>previous.id===item.id))]};
          }
          data.modules={...data.modules,classrooms:rooms};
        }catch(error){
          if(current.signal.aborted||['AUTH_REQUIRED','EMAIL_VERIFICATION_REQUIRED','FORBIDDEN'].includes((error as {code?:string}).code??''))throw error;
          data.modules={...data.modules,classrooms:{status:'error',code:'SERVICE_UNAVAILABLE',retryable:true}};
        }
      }
      for(const module of ['review','queries'] as const){
        const order=orderRef.current[module];

        try{
          const result=order===(module==='review'?'asc':'desc')?{subjectId:data.subjectId,module,page:data.modules[module]}:await client.page({module,timeZone,cursor:null,order},current.signal);
          if(result.subjectId!==data.subjectId)throw new HomeClientError('FORBIDDEN',403);
          if(result.module!==module)throw new HomeClientError('SERVICE_UNAVAILABLE',503);
          data.modules={...data.modules,[module]:await completeHomeQueue(client,module,result.page,data.subjectId,timeZone,order,current.signal)};
        }catch(error){
          if(current.signal.aborted||['AUTH_REQUIRED','EMAIL_VERIFICATION_REQUIRED','FORBIDDEN'].includes((error as {code?:string}).code??''))throw error;
          data.modules={...data.modules,[module]:{status:'error',code:'SERVICE_UNAVAILABLE',retryable:true}};
        }
      }
      if(current.signal.aborted || generation.current!==version)return;
      lastLoaded.current=Date.now();setState({owner:subjectId,data,error:'',loading:false});
    }catch(error){if(!current.signal.aborted && generation.current===version)setState({owner:subjectId,data:null,error:(error as Error).message,loading:false});}
  },[client,subjectId,timeZone]);
  useEffect(()=>{
    void refresh();const focus=()=>{if(Date.now()-lastLoaded.current>=60_000)void refresh();};
    window.addEventListener('focus',focus);
    return()=>{generation.current++;controller.current?.abort();window.removeEventListener('focus',focus);};
  },[refresh]);
  const retry=useCallback(async(module:HomeModuleName,requestedOrder?:'asc'|'desc')=>{
    if(!client)return;const current=controller.current,version=generation.current;
    const sequence=(sequences.current[module]??0)+1;sequences.current[module]=sequence;
    const order=module==='review'||module==='queries'?requestedOrder??orderRef.current[module]:undefined;
    if(order)setOrdering(old=>({...old,[module]:true}));
    try{
      const result=await client.page({module,timeZone,cursor:null,...(order?{order}:{})},current?.signal);
      if(current?.signal.aborted || generation.current!==version||sequences.current[module]!==sequence)return;
      if(result.module!==module)throw new HomeClientError('SERVICE_UNAVAILABLE',503);
      if(module==='review'||module==='queries')result.page=await completeHomeQueue(client,module,result.page,result.subjectId,timeZone,order!,current?.signal);
      if(current?.signal.aborted || generation.current!==version||sequences.current[module]!==sequence)return;
      setState(old=>!old.data || old.data.subjectId!==result.subjectId ? {owner:subjectId,data:null,error:'FORBIDDEN',loading:false}
        : {...old,data:{...old.data,modules:{...old.data.modules,[module]:result.page}}});
    }catch(error){
      if(current?.signal.aborted || generation.current!==version||sequences.current[module]!==sequence)return;
      const fatal=['AUTH_REQUIRED','EMAIL_VERIFICATION_REQUIRED','FORBIDDEN'].includes((error as {code?:string}).code??'');
      setState(old=>fatal?{owner:subjectId,data:null,error:(error as Error).message,loading:false}:!old.data?old:
        {...old,data:{...old.data,modules:{...old.data.modules,[module]:{status:'error',code:'SERVICE_UNAVAILABLE',retryable:true}}}});
    }finally{if(order&&generation.current===version&&sequences.current[module]===sequence)setOrdering(old=>({...old,[module]:false}));}
  },[client,subjectId,timeZone]);
  function changeOrder(module:'review'|'queries',order:'asc'|'desc'){
    orderRef.current={...orderRef.current,[module]:order};setOrders(orderRef.current);
    void retry(module,order);
  }
  return {...(state.owner===subjectId?state:{owner:subjectId,data:null,error:'',loading:true}),refresh,retry,changeOrder,orders,ordering,timeZone,generation:generation.current};
}
