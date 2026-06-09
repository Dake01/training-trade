import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { assets } from "./assets";
import { sessions } from "./sessions";

/**
 * `decisions` table — append-only buy/sell events (story 1.4). Columns are
 * snake_case in SQLite; Drizzle exposes them as camelCase TypeScript keys.
 *
 * Money/quantity fields are stored as TEXT decimal strings so the exact value
 * persisted matches what the user entered (no floating-point drift). Both
 * foreign keys are enforced with `foreign_keys = ON`. The composite index
 * matches the domain read order (`logical_timestamp, created_at, id`) scoped to
 * a session, so listing a session's history is an ordered index scan.
 */
export const decisions = sqliteTable(
  "decisions",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id),
    assetId: text("asset_id")
      .notNull()
      .references(() => assets.id),
    side: text("side").notNull(),
    quantity: text("quantity").notNull(),
    referencePrice: text("reference_price").notNull(),
    logicalTimestamp: text("logical_timestamp").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("idx_decisions_session_order").on(
      table.sessionId,
      table.logicalTimestamp,
      table.createdAt,
      table.id,
    ),
  ],
);

export type DecisionRow = typeof decisions.$inferSelect;
export type NewDecisionRow = typeof decisions.$inferInsert;
