import type { Decision } from "@training-trade/shared";
import { SessionNotActiveError, SessionNotFoundError } from "../sessions/errors";
import type { SessionDeps } from "../sessions/types";
import { AssetNotInSessionError } from "./errors";
import { toDecision } from "./mappers";
import type {
  CaptureDecisionInput,
  DecisionRecord,
  DecisionRepository,
} from "./types";

/**
 * Capture a buy/sell decision on an open session (AC 1).
 *
 * Business rules enforced here:
 * - the session must exist, otherwise {@link SessionNotFoundError};
 * - the session must be `open`, otherwise {@link SessionNotActiveError}
 *   (a `closed`/`suspended` session stays consultable but cannot gain events);
 * - the asset must already be linked to the session (story 1.3), otherwise
 *   {@link AssetNotInSessionError} — no free-text instrument is created here;
 * - capture is append-only: each call records a new event, even when the same
 *   values are submitted twice (no silent deduplication).
 *
 * `logicalTimestamp` defaults to the capture instant when the caller omits it,
 * so the UI can record without managing a replay clock. The check + insert run
 * inside `repo.transaction` so the rule and the write are atomic.
 *
 * Portfolio, PnL and statistics are intentionally NOT computed here (epic 2).
 */
export function captureDecision(
  repo: DecisionRepository,
  deps: SessionDeps,
  sessionId: string,
  input: CaptureDecisionInput,
): Decision {
  return repo.transaction((store) => {
    const session = store.findSession(sessionId);
    if (!session) {
      throw new SessionNotFoundError();
    }
    if (session.status !== "open") {
      throw new SessionNotActiveError();
    }

    const link = store.findLink(sessionId, input.assetId);
    if (!link) {
      throw new AssetNotInSessionError();
    }

    const createdAt = deps.clock.now().toISOString();
    const record: DecisionRecord = {
      id: deps.ids.generate(),
      sessionId,
      assetId: input.assetId,
      side: input.side,
      quantity: input.quantity,
      referencePrice: input.referencePrice,
      logicalTimestamp: input.logicalTimestamp ?? createdAt,
      createdAt,
    };

    return toDecision(store.insertDecision(record));
  });
}
