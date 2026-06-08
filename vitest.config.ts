import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const fromRoot = (relativePath: string) =>
  fileURLToPath(new URL(relativePath, import.meta.url));

// Tests run from the repo root with workspace packages aliased to their
// TypeScript sources, so no pre-build step is required before `vitest run`.
export default defineConfig({
  resolve: {
    alias: {
      "@training-trade/shared": fromRoot("./packages/shared/src/index.ts"),
      "@training-trade/domain": fromRoot("./packages/domain/src/index.ts"),
      "@training-trade/db": fromRoot("./packages/db/src/index.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**"],
  },
});
