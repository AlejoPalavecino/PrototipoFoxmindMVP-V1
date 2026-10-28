import type { NextApiRequest, NextApiResponse } from 'next';
// This catch-all has no upstream, credentials, filesystem writes or persistent state.
export default function fixture(req: NextApiRequest, res: NextApiResponse) {
  const path = '/' + (req.query.path as string[]).join('/');
  const referer = new URL(req.headers.referer ?? 'http://127.0.0.1');
  // Files preserves its no-referrer policy. Its generated page supplies only this
  // short-lived synthetic view selector; it is never a production credential.
  const fixtureView = !req.headers.referer && req.cookies.foxmind_qa_fixture_view === 'files' ? '/files' : referer.pathname;
  const mode = referer.searchParams.get('mode');
  const user = {id:'11111111-1111-4111-8111-111111111111',firstName:'Alex',lastName:'Prueba',email:'alex@example.test',emailVerified:referer.pathname!=='/verify-email'};
  res.setHeader('X-Foxmind-Fixture', 'true');
  res.setHeader('Cache-Control', 'no-store');
  if (mode === 'error') return res.status(503).json({fixture:true,error:{code:'SERVICE_UNAVAILABLE'}});
  if (req.method !== 'GET') return res.status(409).json({fixture:true,error:{code:'LINK_INVALID'}});
  if (path === '/auth/session') return res.json(['/profile','/settings','/files','/verify-email'].includes(fixtureView) ? {authenticated:true,user} : {authenticated:false});
  if (path === '/account') return res.json(user);
  if (path === '/auth/csrf') return res.json({csrfToken:'synthetic-fixture-only'});
  if (path.includes('/files/usage')) return res.json({usedBytes:'1200000',quotaBytes:'100000000',availableBytes:'98800000'});
  return res.status(404).json({fixture:true,error:{code:'NOT_FOUND'}});
}
