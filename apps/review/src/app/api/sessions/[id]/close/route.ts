import { getDefaultSessionRepository } from "@training-trade/db";
import { handleCloseSession } from "@/server/sessionHandlers";

// SQLite (better-sqlite3) requires the Node.js runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await ctx.params;
  return handleCloseSession(getDefaultSessionRepository(), id);
}
