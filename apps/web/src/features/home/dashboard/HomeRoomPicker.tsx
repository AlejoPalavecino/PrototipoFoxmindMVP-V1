'use client';
import { useEffect, useRef, useState } from 'react';
import type { ClassroomItem, HomeResponse } from '../../../../../../src/core/domain/home/home.ts';
import type { HomeClient } from '../api/home-api.ts';
import { Dialog } from '../../../../../shared-ui/feedback.tsx';
import { Cover } from '../../../../../shared-ui/academic-cover.tsx';
export function HomeRoomPicker({data,client,title,onSelect,onClose,onUnauthorized,onClassrooms,tone='focus'}:{
  data:HomeResponse;client?:HomeClient;title:string;onSelect:(room:ClassroomItem)=>void;onClose:()=>void;
  onUnauthorized:()=>void;onClassrooms?:()=>void;tone?:string;
}) {
  const source=data.modules.classrooms;
  const [items,setItems]=useState<ClassroomItem[]>(source.status==='ready'?source.items:[]);
  const [cursor,setCursor]=useState(source.status==='ready'?source.nextCursor:null);
  const [failed,setFailed]=useState(source.status==='error'),[loading,setLoading]=useState(false);
  const rooms=items.filter(item=>item.classroom.role==='teacher'&&!item.classroom.archived);
  const [selected,setSelected]=useState(rooms.length===1&&(!cursor||data.memberships?.teach===1)?rooms[0].id:'');
  const controller=useRef<AbortController|null>(null),pending=useRef(false);
  useEffect(()=>()=>controller.current?.abort(),[]);
  useEffect(()=>{
    const eligible=items.filter(item=>item.classroom.role==='teacher'&&!item.classroom.archived);
    if(!selected&&(!cursor||data.memberships?.teach===1)&&eligible.length===1)setSelected(eligible[0].id);
  },[items,cursor,selected,data.memberships?.teach]);
  async function more() {
    if(!client||pending.current)return;
    pending.current=true;setLoading(true);setFailed(false);
    const request=new AbortController();controller.current=request;
    try{
      const result=await client.page({module:'classrooms',timeZone:data.timeZone,cursor},request.signal);
      if(request.signal.aborted)return;
      if(result.subjectId!==data.subjectId){onUnauthorized();return;}
      if(result.module!=='classrooms'||result.page.status!=='ready')throw new Error();
      const page=result.page as Extract<HomeResponse['modules']['classrooms'],{status:'ready'}>;
      if(cursor&&page.nextCursor===cursor)throw new Error();
      setItems(old=>[...old,...page.items.filter(item=>!old.some(previous=>previous.id===item.id))]);
      setCursor(page.nextCursor);
    }catch(error){
      if(request.signal.aborted)return;
      if(['AUTH_REQUIRED','EMAIL_VERIFICATION_REQUIRED','FORBIDDEN'].includes((error as {code?:string}).code??'')){onUnauthorized();return;}
      if((error as {code?:string}).code==='INVALID_INPUT'){setItems([]);setSelected('');setCursor(null);}
      setFailed(true);
    }finally{pending.current=false;if(!request.signal.aborted)setLoading(false);}
  }
  const chosen=rooms.find(item=>item.id===selected);
  return <Dialog title={title} onClose={onClose} className={`fm-home-room-dialog fm-home-room-dialog--${tone}`}>
    <p>Elegí un aula para continuar.</p>
    <fieldset className="fm-home-room-options" aria-busy={loading}><legend className="sr-only">Aulas activas</legend>
      {rooms.map(item=><label key={item.id} className="fm-home-room-option">
        <input type="radio" name="home-classroom" value={item.id} checked={selected===item.id} onChange={()=>setSelected(item.id)}/>
        <Cover kind={item.classroom.coverKey}/><span><strong>{item.classroom.name}</strong><small>{item.classroom.division} · {item.classroom.subject}</small></span>
      </label>)}
    </fieldset>
    {!rooms.length&&!failed?<p role="status">{cursor?'Buscá más aulas disponibles.':'No tenés aulas activas disponibles.'}</p>:null}
    {failed?<p role="alert">No pudimos cargar tus aulas. <button disabled={loading} onClick={()=>void more()}>Reintentar</button></p>:null}
    {cursor&&!failed&&client?<button disabled={loading} onClick={()=>void more()}>{loading?'Cargando aulas…':'Cargar más aulas'}</button>:null}
    {onClassrooms&&(!rooms.length||cursor&&!client)?<button onClick={onClassrooms}>Ir a Mis aulas</button>:null}
    <footer><button onClick={onClose}>Cancelar</button><button className="primary" disabled={!chosen||loading||failed} onClick={()=>{if(chosen)onSelect(chosen);}}>Continuar</button></footer>
  </Dialog>;
}
