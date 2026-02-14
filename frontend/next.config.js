/** @type {import('next').NextConfig} */
const buildStamp = process.env.NEXT_PUBLIC_APP_VERSION || new Date().toISOString();

const nextConfig = {
  // output: 'standalone', // disabled - docker-compose uses 'next start'
  reactStrictMode: true,
  transpilePackages: ['@xyflow/react'],
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || 'https://flowcube.frzgroup.com.br',
    // Used by AppUpdateNotifier to detect stale tabs after a deploy.
    NEXT_PUBLIC_APP_VERSION: buildStamp,
  },
  async headers() {
    // Avoid long-lived caching of HTML/RSC, which can strand users on stale bundles.
    return [
      {
        source:
          '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-cache, no-store, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
