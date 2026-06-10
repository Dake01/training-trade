import type { SessionRecord } from "../../sessions/types";
import type {
  PortfolioPositionRecord,
  PortfolioRepository,
  PortfolioSnapshotRecord,
  PortfolioStore,
} from "../types";

/**
 * In-memory PortfolioRepository for unit testing portfolio business rules.
 * Sessions are seeded read-only; snapshots and positions accumulate as
 * operations run.
 */
export function createFakePortfolioRepository(
  sessions: SessionRecord[] = [],
  snapshots: PortfolioSnapshotRecord[] = [],
  positions: PortfolioPositionRecord[] = [],
): PortfolioRepository {
  const sessionRows = [...sessions];
  const snapshotRows = [...snapshots];
  const positionRows = [...positions];

  const store: PortfolioStore = {
    findSession: (id) => sessionRows.find((row) => row.id === id) ?? null,
    findBootstrap: (sessionId) =>
      snapshotRows.find(
        (row) => row.sessionId === sessionId && row.kind === "bootstrap",
      ) ?? null,
    insertBootstrap: (record) => {
      snapshotRows.push(record);
    },
    findLatestSnapshot: (sessionId) => {
      const matching = snapshotRows.filter((row) => row.sessionId === sessionId);
      if (matching.length === 0) return null;
      return matching.reduce((latest, row) =>
        row.snapshotIndex > latest.snapshotIndex ? row : latest,
      );
    },
    findAllSnapshots: (sessionId) =>
      snapshotRows
        .filter((row) => row.sessionId === sessionId)
        .sort((a, b) => a.snapshotIndex - b.snapshotIndex),
    findPositionsBySnapshot: (snapshotId) =>
      positionRows.filter((row) => row.snapshotId === snapshotId),
    findSnapshotByDecision: (sessionId, decisionId) =>
      snapshotRows.find(
        (row) => row.sessionId === sessionId && row.decisionId === decisionId,
      ) ?? null,
    appendSnapshot: (snapshot, positions) => {
      snapshotRows.push(snapshot);
      positionRows.push(...positions);
    },
    deleteDecisionSnapshots: (sessionId) => {
      const toDelete = snapshotRows
        .filter((row) => row.sessionId === sessionId && row.kind === "decision")
        .map((row) => row.id);
      // Remove positions for deleted snapshots first.
      for (let i = positionRows.length - 1; i >= 0; i--) {
        if (toDelete.includes(positionRows[i]!.snapshotId)) {
          positionRows.splice(i, 1);
        }
      }
      // Remove decision snapshots.
      for (let i = snapshotRows.length - 1; i >= 0; i--) {
        if (toDelete.includes(snapshotRows[i]!.id)) {
          snapshotRows.splice(i, 1);
        }
      }
    },
  };

  return {
    findBootstrap: (sessionId) => store.findBootstrap(sessionId),
    transaction: (fn) => fn(store),
  };
}

/** Build a minimal open session record for seeding the fake repository. */
export function openSession(id: string): SessionRecord {
  return {
    id,
    status: "open",
    createdAt: "2026-06-10T10:00:00.000Z",
    updatedAt: "2026-06-10T10:00:00.000Z",
    openedAt: "2026-06-10T10:00:00.000Z",
    closedAt: null,
  };
}

/** Build a minimal closed session record for seeding the fake repository. */
export function closedSession(id: string): SessionRecord {
  return {
    id,
    status: "closed",
    createdAt: "2026-06-10T10:00:00.000Z",
    updatedAt: "2026-06-10T11:00:00.000Z",
    openedAt: "2026-06-10T10:00:00.000Z",
    closedAt: "2026-06-10T11:00:00.000Z",
  };
}

/** Build a bootstrap snapshot for seeding the fake repository. */
export function bootstrapSnapshot(sessionId: string): PortfolioSnapshotRecord {
  return {
    id: "snap-bootstrap",
    sessionId,
    kind: "bootstrap",
    cash: "10000",
    referenceCurrency: "EUR",
    totalValue: "10000",
    snapshotIndex: 0,
    createdAt: "2026-06-10T10:00:00.000Z",
    decisionId: null,
  };
}
