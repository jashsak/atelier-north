/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@me/engine"],
  experimental: { externalDir: true },
  // The engine reads data/materials.json via a dynamically-built path, so Next's
  // serverless file tracer can't see the dependency by static analysis. Force it
  // to bundle the corpus into the functions that need it — without this, they
  // 404/500 on Vercel despite building cleanly. (Swatch images are handled
  // separately — copied into public/ at build time, served as static assets.)
  outputFileTracingIncludes: {
    "/api/ask": ["../../data/materials.json"],
    "/api/narrate": ["../../data/materials.json"],
  },
  webpack: (config) => {
    // resolve NodeNext-style ".js" specifiers to their ".ts" sources (engine + web)
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
    };
    return config;
  },
};
export default nextConfig;
