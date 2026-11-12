export type StudyUploadStatus={id:string;name:string;ready:boolean;validation:string;scan:string;rejectionCode:string|null};

export async function studyUploadRequest(path:string,method='GET',body?:BodyInit,signal?:AbortSignal):Promise<StudyUploadStatus>{
  const headers:Record<string,string>={};
  if(method!=='GET'){
    const csrf=await fetch('/api/v1/auth/csrf',{credentials:'same-origin',cache:'no-store'});
    if(!csrf.ok)throw new Error('Tu sesión cambió. Volvé a iniciar sesión.');
    headers['X-CSRF-Token']=(await csrf.json()).csrfToken;
    headers['Content-Type']=method==='PUT'?'application/octet-stream':'application/json';
  }
  const timeout=AbortSignal.timeout(65000);
  const response=await fetch('/api/v1/study-folders'+path,{method,body,headers,credentials:'same-origin',
    cache:'no-store',signal:signal?AbortSignal.any([signal,timeout]):timeout});
  const result=await response.json();
  if(!response.ok)throw new Error(result?.error?.code==='QUOTA_EXCEEDED'
    ?'No hay espacio disponible para este archivo.':'No pudimos validar el archivo. Revisá su formato y volvé a intentar.');
  return result as StudyUploadStatus;
}
