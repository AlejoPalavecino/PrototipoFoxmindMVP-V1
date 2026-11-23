// Pages get a per-request nonce CSP from proxy.ts; this policy covers the routes it skips.
const nonPagePolicy = "default-src 'self'; script-src 'self'; object-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";

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
      ] },
      ...['/api/:path*', '/_next/:path*'].map(source => ({ source, headers: [{ key: 'Content-Security-Policy', value: nonPagePolicy }] })),
    ];
  },
};
export default config;
