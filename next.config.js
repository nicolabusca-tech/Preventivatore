/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Serve per evitare che bundler sposti i binari di @sparticuz/chromium (PDF su Vercel)
  experimental: {
    serverComponentsExternalPackages: ["@sparticuz/chromium"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push(function chromiumExternal({ request }, callback) {
        if (request === "@sparticuz/chromium") {
          return callback(null, "commonjs @sparticuz/chromium");
        }
        callback();
      });
    }
    return config;
  },
};

module.exports = nextConfig;
