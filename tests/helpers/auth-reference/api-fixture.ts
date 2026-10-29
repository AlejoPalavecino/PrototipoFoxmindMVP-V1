import type {NextApiRequest,NextApiResponse} from 'next';

// Explicit synthetic fixture. No upstream, credentials, persistence or body logging.
export default async function fixture(req:NextApiRequest,res:NextApiResponse){
  const path='/'+(req.query.path as string[]).join('/');
  const referer=new URL(req.headers.referer??'http://127.0.0.1');
  const mode=referer.searchParams.get('mode')??'default';
  res.setHeader('X-Foxmind-Fixture','true');res.setHeader('Cache-Control','no-store');
  if(path==='/auth/session'&&req.method==='GET'){
    if(mode==='loading')await new Promise(resolve=>setTimeout(resolve,4000));
    if(mode==='session-error')return res.status(503).json({error:{code:'SERVICE_UNAVAILABLE'}});
    return res.json({authenticated:false});
  }
  if(path==='/auth/csrf'&&req.method==='GET')return res.json({csrfToken:'synthetic-fixture-only'});
  if(req.method!=='POST'||!['/auth/login','/auth/register','/auth/password-recovery/request'].includes(path)){
    return res.status(404).json({error:{code:'NOT_FOUND'}});
  }
  if(mode==='busy')await new Promise(resolve=>setTimeout(resolve,4000));
  if(mode==='rate'){
    res.setHeader('Retry-After','60');return res.status(429).json({error:{code:'RATE_LIMITED'}});
  }
  if(mode==='error'||mode==='busy')return res.status(503).json({error:{code:'SERVICE_UNAVAILABLE'}});
  if(path==='/auth/login')return res.status(401).json({error:{code:'AUTHENTICATION_FAILED'}});
  return res.status(202).json({status:'accepted'});
}
