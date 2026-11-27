// Pages get a per-request nonce CSP from proxy.ts; this policy covers the routes it skips.
const nonPagePolicy = "default-src 'self'; script-src 'self'; object-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";
// FoxMind uses none of these; fullscreen (PDF viewer in the preview iframe) and clipboard stay allowed.
const permissionsPolicy = 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()';
// Browsers ignore HSTS over plain HTTP, but sending it only behind an HTTPS edge keeps local HTTPS dev hosts unpinned.
const strictTransportSecurity = 'max-age=63072000; includeSubDomains';

const config = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      { source: '/:path*', headers: [
        { key: 'Cache-Control', value: 'no-store' },
        { key: 'Referrer-Policy', value: 'no-referrer' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Permissions-Policy', value: permissionsPolicy },
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
      ] },
      { source: '/:path*', has: [{ type: 'header', key: 'x-forwarded-proto', value: 'https' }], headers: [
        { key: 'Strict-Transport-Security', value: strictTransportSecurity },
      ] },
      ...['/api/:path*', '/_next/:path*'].map(source => ({ source, headers: [{ key: 'Content-Security-Policy', value: nonPagePolicy }] })),
    ];
  },
};
export default config;
