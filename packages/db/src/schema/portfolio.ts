import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sessions } from "./sessions";
import { decisions } from "./decisions";

/**
 * `portfolio_snapshots` table. One row per portfolio state checkpoint.
 * kind='bootstrap' is the initial row (story 2.1); kind='decision' snapshots
 * are appended by story 2.2 after each buy/sell application.
 *
 * `decision_id` is null for bootstrap and set for decision snapshots,
 * enabling idempotent re-application via the partial unique index.
 */
export const portfolioSnapshots = sqliteTable(
  "portfolio_snapshots",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id),
    kind: text("kind").notNull(),
    cash: text("cash").notNull(),
    referenceCurrency: text("reference_currency").notNull(),
    totalValue: text("total_value").notNull(),
    snapshotIndex: integer("snapshot_index").notNull().default(0),
    createdAt: text("created_at").notNull(),
    decisionId: text("decision_id"),
  },
  (table) => [
    uniqueIndex("uniq_portfolio_bootstrap")
      .on(table.sessionId)
      .where(sql`${table.kind} = 'bootstrap'`),
    uniqueIndex("uniq_portfolio_snapshot_decision")
      .on(table.sessionId, table.decisionId)
      .where(sql`${table.decisionId} IS NOT NULL`),
    index("idx_portfolio_snapshots_session_order").on(
      table.sessionId,
      table.snapshotIndex,
    ),
  ],
);

export type PortfolioSnapshotRow = typeof portfolioSnapshots.$inferSelect;
export type NewPortfolioSnapshotRow = typeof portfolioSnapshots.$inferInsert;
