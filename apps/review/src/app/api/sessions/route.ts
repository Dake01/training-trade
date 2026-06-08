import { getDefaultSessionRepository } from "@training-trade/db";
import { handleCreateSession } from "@/server/sessionHandlers";

// SQLite (better-sqlite3) requires the Node.js runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(): Response {
  return handleCreateSession(getDefaultSessionRepository());
}
