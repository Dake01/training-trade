import type { SessionContext } from "@training-trade/shared";
import { toSessionContext } from "./mappers";
import type { SessionRepository } from "./types";

/**
 * Return the minimal context of the currently active (open) session, or `null`
 * if none exists (AC 2). The `canReceiveDecisions` guard in the context proves
 * the open session is ready to receive future decisions.
 */
export function getActiveSession(
  repo: SessionRepository,
): SessionContext | null {
  const active = repo.findActive();
  return active ? toSessionContext(active) : null;
}
