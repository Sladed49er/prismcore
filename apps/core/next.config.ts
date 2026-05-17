import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace packages are shipped as raw TypeScript (just-in-time packages);
  // Next transpiles them so there is no separate build step.
  transpilePackages: ["@prismcore/module-sdk", "@prismcore/db"],
};

export default nextConfig;
