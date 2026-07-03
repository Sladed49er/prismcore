import type { NextConfig } from "next";

/** The dedicated domain for the public PrismOptimize audit tool. */
const PRISMOPTIMIZE_HOSTS = ["prismoptimize.com", "www.prismoptimize.com"];

const nextConfig: NextConfig = {
  // Workspace packages are shipped as raw TypeScript (just-in-time packages);
  // Next transpiles them so there is no separate build step.
  transpilePackages: ["@prismcore/module-sdk", "@prismcore/db"],
  async rewrites() {
    // prismoptimize.com serves the public audit tool at its root.
    return PRISMOPTIMIZE_HOSTS.map((host) => ({
      source: "/",
      has: [{ type: "host" as const, value: host }],
      destination: "/prismseo",
    }));
  },
};

export default nextConfig;
