import { defineConfig } from "drizzle-kit";

// Drizzle Kit config for future migrations. V1 also bootstraps the schema
// programmatically via `ensureSchema` so the app runs without a migrate step.
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/schema/sessions.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? ".data/training-trade.sqlite",
  },
});
