import { getDefaultSessionRepository } from "@training-trade/db";
import { handleGetActiveSession } from "@/server/sessionHandlers";

// SQLite (better-sqlite3) requires the Node.js runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(): Response {
  return handleGetActiveSession(getDefaultSessionRepository());
}
