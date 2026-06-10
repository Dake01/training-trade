import {
  getDefaultDecisionAmendmentRepository,
  getDefaultPortfolioRepository,
} from "@training-trade/db";
import { handleGetSessionStats } from "@/server/statsHandlers";

// SQLite (better-sqlite3) requires the Node.js runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  return ctx.params.then(({ id }) =>
    handleGetSessionStats(
      getDefaultDecisionAmendmentRepository(),
      getDefaultPortfolioRepository(),
      id,
    ),
  );
}
