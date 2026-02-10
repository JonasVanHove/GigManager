/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure Prisma engine files are available in serverless/edge functions
  experimental: {
    outputFileTracingIncludes: {
      "/api/**/*": ["./node_modules/.prisma/**/*"],
    },
  },
};

export default nextConfig;
