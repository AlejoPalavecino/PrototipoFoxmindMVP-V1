import Head from 'next/head';
import { useRouter } from 'next/router';
import { useCallback,useEffect,useMemo,useRef,useState } from 'react';
import { Notifications } from '../../../classrooms-ui/Notifications';
import { Notice } from '../../../classrooms-ui/components';
import { AccountNavbar } from './account-navbar';
import { createAccountClient,type AccountSession } from '../lib/account-client';
import { classroomAuthHref,createWebClassroomClient } from '../lib/classroom-client';
import {FoxmindIcon} from '../../../shared-ui/FoxmindIcon';
const account=createAccountClient();
export function NotificationsScreen(){
  const router=useRouter(),[session,setSession]=useState<AccountSession>(),[error,setError]=useState(''),[busy,setBusy]=useState(false),[retry,setRetry]=useState(0),request=useRef<AbortController|null>(null);
  const requireAccount=useCallback((code:string)=>{request.current?.abort();setSession(undefined);void router.replace(classroomAuthHref(code==='EMAIL_VERIFICATION_REQUIRED'?'verify-email':'sign-in','/notificaciones'));},[router]);
  const api=useMemo(()=>createWebClassroomClient(fetch,requireAccount),[requireAccount]);
  useEffect(()=>{if(!router.isReady)return;const controller=new AbortController();request.current=controller;setError('');
    void account.session(controller.signal).then(current=>{if(controller.signal.aborted)return;if(!current.authenticated){requireAccount('AUTH_REQUIRED');return;}if(!current.user.emailVerified){requireAccount('EMAIL_VERIFICATION_REQUIRED');return;}setSession(current);}).catch(failure=>{if(!controller.signal.aborted)setError((failure as Error).message);});
    return()=>controller.abort();
  },[router.isReady,requireAccount,retry]);
  async function logout(){if(busy)return;setBusy(true);setError('');request.current?.abort();try{await account.mutate('/auth/logout');requireAccount('AUTH_REQUIRED');}catch(failure){setError((failure as Error).message);}finally{setBusy(false);}}
  return <div className="p5-app"><Head><title>Notificaciones · FoxMind</title></Head><a className="skip-link" href="#notifications-main">Saltar al contenido</a>
    {session?.authenticated?<AccountNavbar session={session} view="notificaciones" accountActions={<button disabled={busy} onClick={()=>void logout()}>Cerrar sesión</button>}/>:null}
    <main id="notifications-main" className="p5-main fm-brujula-notifications-page"><nav className="brujula-breadcrumb" aria-label="Ubicación"><a href="/inicio">Inicio</a><FoxmindIcon name="chevron-right"/><strong>Notificaciones</strong></nav><header><small>Mi espacio</small><h1>Notificaciones</h1><p>{session?.authenticated&&session.user.accountRole==='teacher'?'Entregas, consultas y respuestas de tus aulas.':'Actividades, cambios de fecha y devoluciones de tus docentes.'}</p></header>
    {error?<Notice error>{error}<button onClick={()=>setRetry(value=>value+1)}>Reintentar</button></Notice>:null}
    {session?.authenticated?<Notifications key={session.user.id} api={api} refresh={0} presentation="center" onSelect={id=>void router.push(`/mis-aulas?notificacion=${encodeURIComponent(id)}`)}/>:!error?<Notice>Comprobando tu sesión…</Notice>:null}</main>
  </div>;
}
