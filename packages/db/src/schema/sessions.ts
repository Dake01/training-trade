import { sql } from "drizzle-orm";
import { sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * `sessions` table. Columns are snake_case in SQLite; Drizzle exposes them as
 * camelCase TypeScript keys, which is the snake_case <-> camelCase boundary
 * required by the architecture.
 *
 * The partial unique index enforces, at the DB level, that at most one session
 * can be `open` at a time (defence in depth alongside the domain transaction).
 */
export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    status: text("status").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    openedAt: text("opened_at").notNull(),
    closedAt: text("closed_at"),
  },
  (table) => [
    uniqueIndex("uniq_active_session")
      .on(table.status)
      .where(sql`${table.status} = 'open'`),
  ],
);

export type SessionRow = typeof sessions.$inferSelect;
export type NewSessionRow = typeof sessions.$inferInsert;
