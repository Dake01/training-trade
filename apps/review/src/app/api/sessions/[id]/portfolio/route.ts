import { getDefaultPortfolioRepository } from "@training-trade/db";
import { handleGetSessionPortfolio } from "@/server/portfolioHandlers";

// SQLite (better-sqlite3) requires the Node.js runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return params.then(({ id }) =>
    handleGetSessionPortfolio(getDefaultPortfolioRepository(), id),
  );
}
