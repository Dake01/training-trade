import { primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sessions } from "./sessions";

/**
 * `assets` catalogue table. Columns are snake_case in SQLite; Drizzle exposes
 * them as camelCase TypeScript keys. `symbol` carries a unique index so the
 * same instrument is stored once and reused across sessions.
 */
export const assets = sqliteTable(
  "assets",
  {
    id: text("id").primaryKey(),
    symbol: text("symbol").notNull(),
    name: text("name"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [uniqueIndex("uniq_asset_symbol").on(table.symbol)],
);

export type AssetRow = typeof assets.$inferSelect;
export type NewAssetRow = typeof assets.$inferInsert;

/**
 * `session_assets` link table (many-to-many between sessions and assets). The
 * composite primary key enforces a single link per `(session_id, asset_id)`,
 * and both columns are foreign keys (with `foreign_keys = ON`).
 */
export const sessionAssets = sqliteTable(
  "session_assets",
  {
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id),
    assetId: text("asset_id")
      .notNull()
      .references(() => assets.id),
    linkedAt: text("linked_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.sessionId, table.assetId] })],
);

export type SessionAssetRow = typeof sessionAssets.$inferSelect;
export type NewSessionAssetRow = typeof sessionAssets.$inferInsert;
