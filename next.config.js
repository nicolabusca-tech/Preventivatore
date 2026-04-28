/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    const isProd = process.env.NODE_ENV === "production";
    const base = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      // Non serve quasi mai nel tool interno; impedisce clickjacking.
      { key: "X-Frame-Options", value: "DENY" },
      // Se in futuro servono feature specifiche, si può restringere/espandere.
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
      },
    ];
    if (isProd) {
      base.push({
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains; preload",
      });
    }

    return [
      {
        source: "/:path*",
        headers: base,
      },
    ];
  },
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
