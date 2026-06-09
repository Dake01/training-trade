import { getDefaultDecisionRepository } from "@training-trade/db";
import {
  handleCaptureDecision,
  handleListSessionDecisions,
} from "@/server/decisionHandlers";

// SQLite (better-sqlite3) requires the Node.js runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await ctx.params;
  return handleCaptureDecision(getDefaultDecisionRepository(), id, request);
}

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await ctx.params;
  return handleListSessionDecisions(getDefaultDecisionRepository(), id);
}
