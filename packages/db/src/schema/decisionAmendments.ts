import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { assets } from "./assets";
import { decisions } from "./decisions";
import { sessions } from "./sessions";

/**
 * `decision_amendments` table — append-only trail of comments, corrections and
 * cancellations applied to a decision (story 1.5). The root `decisions` row is
 * never mutated nor deleted: every change is a new event here, so the history
 * stays auditable.
 *
 * Columns are snake_case in SQLite; Drizzle exposes them as camelCase keys.
 * `comment` holds a comment, `reason` an optional correction/cancellation
 * motive, and the `replacement_*` columns the corrected business fields.
 * Money/quantity fields stay TEXT decimal strings so the exact value persisted
 * matches what the user entered. The two composite indexes match the domain read
 * orders (per decision, and per session) scoped by audit instant.
 */
export const decisionAmendments = sqliteTable(
  "decision_amendments",
  {
    id: text("id").primaryKey(),
    decisionId: text("decision_id")
      .notNull()
      .references(() => decisions.id),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id),
    kind: text("kind").notNull(),
    comment: text("comment"),
    reason: text("reason"),
    replacementAssetId: text("replacement_asset_id").references(() => assets.id),
    replacementSide: text("replacement_side"),
    replacementQuantity: text("replacement_quantity"),
    replacementReferencePrice: text("replacement_reference_price"),
    replacementLogicalTimestamp: text("replacement_logical_timestamp"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("idx_amendments_decision_order").on(
      table.decisionId,
      table.createdAt,
      table.id,
    ),
    index("idx_amendments_session_order").on(
      table.sessionId,
      table.createdAt,
      table.id,
    ),
  ],
);

export type DecisionAmendmentRow = typeof decisionAmendments.$inferSelect;
export type NewDecisionAmendmentRow = typeof decisionAmendments.$inferInsert;
