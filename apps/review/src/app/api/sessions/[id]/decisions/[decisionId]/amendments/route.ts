import { getDefaultDecisionAmendmentRepository } from "@training-trade/db";
import { handleAmendDecision } from "@/server/decisionHandlers";

// SQLite (better-sqlite3) requires the Node.js runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string; decisionId: string }> },
): Promise<Response> {
  const { id, decisionId } = await ctx.params;
  return handleAmendDecision(
    getDefaultDecisionAmendmentRepository(),
    id,
    decisionId,
    request,
  );
}
