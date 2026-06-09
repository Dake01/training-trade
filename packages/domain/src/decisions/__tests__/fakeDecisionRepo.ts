import type { SessionAssetRecord } from "../../sessions/assetTypes";
import type { SessionRecord } from "../../sessions/types";
import type {
  DecisionRecord,
  DecisionRepository,
  DecisionStore,
} from "../types";

/**
 * In-memory DecisionRepository used to unit test the capture rules. Sessions
 * and session<->asset links are seeded read-only (this story creates neither);
 * decisions accumulate append-only as the rules run.
 */
export function createFakeDecisionRepository(
  sessions: SessionRecord[] = [],
  links: SessionAssetRecord[] = [],
): DecisionRepository {
  const sessionRows = [...sessions];
  const linkRows = [...links];
  const decisions: DecisionRecord[] = [];

  const store: DecisionStore = {
    findSession: (id) => sessionRows.find((row) => row.id === id) ?? null,
    findLink: (sessionId, assetId) =>
      linkRows.find(
        (link) => link.sessionId === sessionId && link.assetId === assetId,
      ) ?? null,
    insertDecision: (record) => {
      // Append-only: never deduplicate, even on identical values.
      decisions.push(record);
      return record;
    },
    listBySessionId: (sessionId) =>
      decisions.filter((decision) => decision.sessionId === sessionId),
  };

  return { transaction: (fn) => fn(store) };
}

/** Build a minimal open session record for seeding the fake repository. */
export function openSession(id: string): SessionRecord {
  return {
    id,
    status: "open",
    createdAt: "2026-06-08T14:00:00.000Z",
    updatedAt: "2026-06-08T14:00:00.000Z",
    openedAt: "2026-06-08T14:00:00.000Z",
    closedAt: null,
  };
}

/** Build a minimal session<->asset link for seeding the fake repository. */
export function link(sessionId: string, assetId: string): SessionAssetRecord {
  return {
    sessionId,
    assetId,
    linkedAt: "2026-06-08T14:00:00.000Z",
  };
}
