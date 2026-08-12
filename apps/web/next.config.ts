import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
] as const;

function supabaseImagePattern(): URL[] {
  const raw = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  if (!raw) return [];
  try {
    const origin = new URL(raw);
    if (
      origin.protocol !== 'https:' &&
      origin.hostname !== '127.0.0.1' &&
      origin.hostname !== 'localhost'
    ) {
      return [];
    }
    return [new URL('/storage/v1/object/public/**', origin)];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb',
    },
  },
  async headers() {
    return [
      {
        headers: [...securityHeaders],
        source: '/:path*',
      },
    ];
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: supabaseImagePattern(),
  },
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
