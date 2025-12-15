/** @type {import('next').NextConfig} */
const backendUrl = (
  process.env.API_BASE_URL ||
  process.env.BACKEND_URL ||
  "http://localhost:8080"
).replace(/\/$/, "");

const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: "/upload/:path*",
        destination: `${backendUrl}/upload/:path*`,
      },
    ];
  },
};

export default nextConfig;
