import { NextResponse } from 'next/server';
import { createNonce, pageContentSecurityPolicy } from './src/application/server/content-security-policy.ts';

/** Issues a fresh CSP nonce per page request; any client-sent x-nonce is overwritten. */
export function proxy(request: Request) {
  const nonce = createNonce();
  const policy = pageContentSecurityPolicy(nonce, process.env.NODE_ENV === 'development');
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('content-security-policy', policy);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set('Content-Security-Policy', policy);
  return response;
}

// API and static assets keep the policy from next.config.mjs.
export const config = { matcher: ['/((?!api/|_next/static/|_next/image|favicon\\.ico).*)'] };
