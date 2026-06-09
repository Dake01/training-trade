import type { SessionAssetRecord } from "../../../sessions/assetTypes";
import type { SessionRecord } from "../../../sessions/types";
import type { DecisionRecord } from "../../types";
import type {
  DecisionAmendmentRecord,
  DecisionAmendmentRepository,
  DecisionAmendmentStore,
} from "../types";

/**
 * In-memory DecisionAmendmentRepository for unit-testing the amendment rules.
 * Sessions, links and root decisions are seeded read-only (this story creates
 * none of them); amendments accumulate append-only as the rules run.
 */
export function createFakeAmendmentRepository(seed: {
  sessions?: SessionRecord[];
  links?: SessionAssetRecord[];
  decisions?: DecisionRecord[];
} = {}): DecisionAmendmentRepository {
  const sessionRows = [...(seed.sessions ?? [])];
  const linkRows = [...(seed.links ?? [])];
  const decisionRows = [...(seed.decisions ?? [])];
  const amendments: DecisionAmendmentRecord[] = [];

  const store: DecisionAmendmentStore = {
    findSession: (id) => sessionRows.find((row) => row.id === id) ?? null,
    findDecision: (id) => decisionRows.find((row) => row.id === id) ?? null,
    findLink: (sessionId, assetId) =>
      linkRows.find(
        (link) => link.sessionId === sessionId && link.assetId === assetId,
      ) ?? null,
    insertAmendment: (record) => {
      amendments.push(record);
      return record;
    },
    listByDecisionId: (decisionId) =>
      amendments.filter((a) => a.decisionId === decisionId),
    listDecisionsBySessionId: (sessionId) =>
      decisionRows.filter((d) => d.sessionId === sessionId),
    listAmendmentsBySessionId: (sessionId) =>
      amendments.filter((a) => a.sessionId === sessionId),
  };

  return { transaction: (fn) => fn(store) };
}

/** Build a minimal open session record for seeding. */
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

/** Build a minimal session<->asset link for seeding. */
export function link(sessionId: string, assetId: string): SessionAssetRecord {
  return { sessionId, assetId, linkedAt: "2026-06-08T14:00:00.000Z" };
}

/** Build a minimal root decision record for seeding. */
export function decision(
  id: string,
  sessionId: string,
  assetId: string,
  overrides: Partial<DecisionRecord> = {},
): DecisionRecord {
  return {
    id,
    sessionId,
    assetId,
    side: "buy",
    quantity: "10",
    referencePrice: "123.45",
    logicalTimestamp: "2026-06-09T09:00:00.000Z",
    createdAt: "2026-06-09T09:00:00.000Z",
    ...overrides,
  };
}
