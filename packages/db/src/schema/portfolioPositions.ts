import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";
import { portfolioSnapshots } from "./portfolio";
import { assets } from "./assets";

/**
 * `portfolio_positions` table. One row per asset position per snapshot.
 * Linked to a snapshot so each portfolio checkpoint has its full positions list.
 * `quantity`, `average_price`, `last_price`, and `market_value` are exact
 * decimal strings, consistent with the decisions convention.
 */
export const portfolioPositions = sqliteTable(
  "portfolio_positions",
  {
    id: text("id").primaryKey(),
    snapshotId: text("snapshot_id")
      .notNull()
      .references(() => portfolioSnapshots.id),
    assetId: text("asset_id")
      .notNull()
      .references(() => assets.id),
    quantity: text("quantity").notNull(),
    averagePrice: text("average_price").notNull(),
    lastPrice: text("last_price").notNull(),
    marketValue: text("market_value").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("idx_portfolio_positions_snapshot").on(table.snapshotId),
    index("idx_portfolio_positions_asset").on(table.assetId),
  ],
);

export type PortfolioPositionRow = typeof portfolioPositions.$inferSelect;
export type NewPortfolioPositionRow = typeof portfolioPositions.$inferInsert;
