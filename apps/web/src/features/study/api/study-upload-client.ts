import type { CsrfTokenSource } from '../../../../../../src/core/contracts/csrf.ts';
export type StudyUploadStatus={id:string;name:string;ready:boolean;validation:string;scan:string;rejectionCode:string|null};

export async function studyUploadRequest(path:string,method='GET',body?:BodyInit,signal?:AbortSignal,csrf?:CsrfTokenSource):Promise<StudyUploadStatus>{
  const headers:Record<string,string>={};
  if(method!=='GET'){
    headers['X-CSRF-Token']=csrf?await sharedToken(csrf):await freshToken();
    headers['Content-Type']=method==='PUT'?'application/octet-stream':'application/json';
  }
  const timeout=AbortSignal.timeout(65000);
  const response=await fetch('/api/v1/study-folders'+path,{method,body,headers,credentials:'same-origin',
    cache:'no-store',signal:signal?AbortSignal.any([signal,timeout]):timeout});
  const result=await response.json();
  if(!response.ok&&result?.error?.code==='CSRF_INVALID')csrf?.invalidate();
  if(!response.ok)throw new Error(result?.error?.code==='QUOTA_EXCEEDED'
    ?'No hay espacio disponible para este archivo.':'No pudimos validar el archivo. Revisá su formato y volvé a intentar.');
  return result as StudyUploadStatus;
}

const sessionChanged='Tu sesión cambió. Volvé a iniciar sesión.';
async function freshToken(){
  const csrf=await fetch('/api/v1/auth/csrf',{credentials:'same-origin',cache:'no-store'});
  if(!csrf.ok)throw new Error(sessionChanged);
  return (await csrf.json()).csrfToken as string;
}
async function sharedToken(source:CsrfTokenSource){
  try{return await source.token();}catch{throw new Error(sessionChanged);}
}
