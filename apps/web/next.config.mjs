/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@me/engine"],
  experimental: { externalDir: true },
  webpack: (config) => {
    // resolve NodeNext-style ".js" specifiers to their ".ts" sources (engine + web)
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
    };
    return config;
  },
};
export default nextConfig;
