import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the workspace root so Next does not pick up unrelated lockfiles.
  turbopack: {
    root: resolve(here, "..", ".."),
  },
  // Workspace packages ship TypeScript source; let Next transpile them.
  transpilePackages: [
    "@training-trade/shared",
    "@training-trade/domain",
    "@training-trade/db",
  ],
  // better-sqlite3 is a native module and must not be bundled.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
