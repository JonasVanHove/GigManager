/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  poweredByHeader: false,
  
  // Headers for security and caching
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
    ];
  },

  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "**.gravatar.com",
      },
    ],
    formats: ["image/webp", "image/avif"],
    // Optimize images by default
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1 year in seconds
  },

  experimental: {
    outputFileTracingIncludes: {
      "/api/**/*": [
        "./node_modules/.prisma/client/schema.prisma",
        "./node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node",
      ],
    },
    outputFileTracingExcludes: {
      "/api/**/*": [
        "./node_modules/pdfjs-dist/**/*",
        "./node_modules/canvas/**/*",
        "./node_modules/.prisma/client/query_engine-*.tmp*",
        "./node_modules/.prisma/client/query_engine-*.dll.node*",
        "./node_modules/.prisma/client/libquery_engine-debian-openssl-3.0.x.so.node",
        "./node_modules/.prisma/client/libquery_engine-darwin-arm64.so.node",
        "./node_modules/.prisma/client/libquery_engine-darwin-x64.so.node",
        "./node_modules/.prisma/client/libquery_engine-linux-arm64.so.node",
        "./node_modules/.prisma/client/libquery_engine-linux-musl-arm64.so.node",
        "./node_modules/.prisma/client/libquery_engine-linux-musl-openssl-3.0.x.so.node",
        "./node_modules/.prisma/client/libquery_engine-windows-openssl-3.0.x.dll.node",
        "./node_modules/.prisma/client/libquery_engine-windows-msvc.dll.node",
        "./node_modules/prisma/**/*",
        "./node_modules/@prisma/**/*",
      ],
    },
    optimizePackageImports: ["lodash-es"],
    // Dynamic page size for better performance
    ppr: false, // Partial prerendering (consider enabling for specific routes)
  },

  // Webpack optimization
  webpack: (config, { isServer }) => {
    config.optimization.minimize = true;
    
    // Exclude large client-side libraries and native modules from server bundle
    if (isServer) {
      if (!config.externals) config.externals = [];
      if (Array.isArray(config.externals)) {
        config.externals.push("pdfjs-dist", "canvas");
      }
    }
    
    // Provide safe fallbacks for modules that are server-only (e.g., canvas)
    // This prevents client-side bundling errors when packages like pdfjs-dist
    // conditionally require native modules that aren't available in the browser.
    if (!config.resolve) config.resolve = {};
    if (!config.resolve.fallback) config.resolve.fallback = {};
    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false,
      fs: false,
      path: false,
      os: false,
    };

    return config;
  },

  // Swc compression
  swcMinify: true,

  // Production source maps optimization
  productionBrowserSourceMaps: false,
};

export default nextConfig;
