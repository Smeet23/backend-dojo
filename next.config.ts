import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  // Links from before courses existed point at the backend course.
  async redirects() {
    return [
      // The app was renamed from Backend Dojo; old links land on the new domain.
      {
        source: "/:path*",
        has: [{ type: "host", value: "backend-dojo-ashen.vercel.app" }],
        destination: "https://grokstack.vercel.app/:path*",
        permanent: true,
      },
      { source: "/lectures/:slug", destination: "/courses/backend/:slug", permanent: true },
      { source: "/practice", destination: "/courses/backend/practice", permanent: true },
    ];
  },
  // Lets a phone on the same Wi-Fi open the dev server.
  allowedDevOrigins: ["192.168.*.*"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

// Plugins are passed by name so they work under Turbopack.
const withMDX = createMDX({
  options: {
    remarkPlugins: ["remark-gfm"],
    rehypePlugins: ["rehype-slug"],
  },
});

export default withMDX(nextConfig);
