import type { SessionRecord } from "../sessions/types";

/**
 * Internal, persistence-facing portfolio snapshot entity (camelCase).
 * The DB layer maps this to/from snake_case columns.
 *
 * `kind`: 'bootstrap' (story 2.1) or 'decision' (story 2.2 and beyond).
 * `snapshotIndex`: 0 for bootstrap, 1+ for decision snapshots.
 * `decisionId`: null for bootstrap; links to the decision that triggered this snapshot.
 * All monetary values are exact decimal strings — never JS floats.
 */
export interface PortfolioSnapshotRecord {
  id: string;
  sessionId: string;
  kind: string;
  cash: string;
  referenceCurrency: string;
  totalValue: string;
  snapshotIndex: number;
  createdAt: string;
  decisionId: string | null;
}

/**
 * Internal, persistence-facing position entity for one asset within a snapshot.
 * `averagePrice`: weighted average cost basis.
 * `lastPrice`: last referencePrice seen for this asset.
 * `marketValue = quantity * lastPrice`.
 */
export interface PortfolioPositionRecord {
  id: string;
  snapshotId: string;
  assetId: string;
  quantity: string;
  averagePrice: string;
  lastPrice: string;
  marketValue: string;
  createdAt: string;
}

/** Transactional view handed to portfolio operations. */
export interface PortfolioStore {
  findSession(sessionId: string): SessionRecord | null;
  findBootstrap(sessionId: string): PortfolioSnapshotRecord | null;
  insertBootstrap(record: PortfolioSnapshotRecord): void;

  findLatestSnapshot(sessionId: string): PortfolioSnapshotRecord | null;
  findAllSnapshots(sessionId: string): PortfolioSnapshotRecord[];
  findPositionsBySnapshot(snapshotId: string): PortfolioPositionRecord[];
  findSnapshotByDecision(sessionId: string, decisionId: string): PortfolioSnapshotRecord | null;
  appendSnapshot(snapshot: PortfolioSnapshotRecord, positions: PortfolioPositionRecord[]): void;
  deleteDecisionSnapshots(sessionId: string): void;
}

/**
 * Repository port for portfolio operations. Implemented by packages/db (SQLite)
 * in production and by in-memory fakes in unit tests.
 */
export interface PortfolioRepository {
  findBootstrap(sessionId: string): PortfolioSnapshotRecord | null;
  transaction<T>(fn: (store: PortfolioStore) => T): T;
}
