import { getDefaultPortfolioRepository } from "@training-trade/db";
import { handleGetSessionPortfolioHistory } from "@/server/portfolioHandlers";

// SQLite (better-sqlite3) requires the Node.js runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  return ctx.params.then(({ id }) =>
    handleGetSessionPortfolioHistory(getDefaultPortfolioRepository(), id),
  );
}
