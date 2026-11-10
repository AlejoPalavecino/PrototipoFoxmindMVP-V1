import {useCallback,useEffect,useState} from 'react';
type Reminder={id:string;title:string;folderId:string;startsAt:string;readAt:string|null};
export function useStudyReminders(enabled:boolean){
 const[data,setData]=useState<{items:Reminder[];unreadCount:number}>({items:[],unreadCount:0}),[error,setError]=useState('');
 const load=useCallback(async(signal?:AbortSignal)=>{
  if(!enabled)return;
  try{const response=await fetch('/api/v1/study-folders/reminders',{credentials:'same-origin',cache:'no-store',signal});if(!response.ok)throw Error();const value=await response.json();if(!signal?.aborted){setData(value);setError('');}}
  catch{if(!signal?.aborted)setError('No pudimos actualizar tus recordatorios de estudio.');}
 },[enabled]);
 useEffect(()=>{if(!enabled){setData({items:[],unreadCount:0});return;}const controller=new AbortController();void load(controller.signal);const timer=setInterval(()=>void load(controller.signal),30_000);return()=>{controller.abort();clearInterval(timer);};},[enabled,load]);
 const open=async(item:Reminder)=>{
  if(!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/iu.test(item.id)||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/iu.test(item.folderId))return;
  try{const csrf=await fetch('/api/v1/auth/csrf',{credentials:'same-origin',cache:'no-store'});if(!csrf.ok)throw Error();const token=await csrf.json();const response=await fetch(`/api/v1/study-folders/reminders/${item.id}/read`,{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-CSRF-Token':token.csrfToken},body:'{}'});if(!response.ok)throw Error();window.location.assign(`/carpetas-de-estudio/${item.folderId}`);}
  catch{setError('No pudimos abrir el repaso. Podés volver a intentarlo.');}
 };
 return {data,error,load,open};
}
export function StudyReminderList({reminders,onlyUnread}:{reminders:ReturnType<typeof useStudyReminders>;onlyUnread:boolean}){
 const items=reminders.data.items.filter(item=>!onlyUnread||!item.readAt);
 return <section aria-label="Recordatorios privados de estudio"><h3>Mis repasos · Solo para vos</h3>{reminders.error?<p role="alert">{reminders.error}<button onClick={()=>void reminders.load()}>Reintentar recordatorios</button></p>:null}
  {!items.length?<p>No tenés recordatorios de estudio pendientes.</p>:<ul className="p6-notifications">{items.map(item=><li key={item.id} className={item.readAt?'':'unread'}><h4>{item.title}</h4><time dateTime={item.startsAt}>{new Date(item.startsAt).toLocaleString('es-AR',{dateStyle:'medium',timeStyle:'short'})}</time><button onClick={()=>void reminders.open(item)}>Abrir repaso</button></li>)}</ul>}</section>;
}
