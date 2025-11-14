/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['replicate.delivery', 'pbxt.replicate.delivery', '*.amazonaws.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Mark database drivers as external for client-side builds
    // These should only be used on the server side
    if (!isServer) {
      config.externals = config.externals || [];
      // Use function form for externals to be more flexible
      config.externals.push(({ context, request }, callback) => {
        if (
          request === 'pg' ||
          request === 'pg-native' ||
          request === 'mysql2' ||
          request === 'mongodb'
        ) {
          return callback(null, `commonjs ${request}`);
        }
        callback();
      });
    }
    return config;
  },
}

module.exports = nextConfig

