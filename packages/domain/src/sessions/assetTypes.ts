import type { SessionRecord } from "./types";

/**
 * Catalogue asset entity (camelCase). The DB layer maps this to/from the
 * snake_case `assets` table; the API layer maps it to the public DTO. The
 * `symbol` is the V1 business identifier and is stored already normalised
 * (uppercase) by the domain.
 */
export interface AssetRecord {
  id: string;
  symbol: string;
  name: string | null;
  /** ISO 8601 instant the asset entered the catalogue. */
  createdAt: string;
}

/** Many-to-many link between a session and a catalogue asset. */
export interface SessionAssetRecord {
  sessionId: string;
  assetId: string;
  /** ISO 8601 instant the asset was attached to the session. */
  linkedAt: string;
}

/**
 * Transactional view handed to asset operations. It exposes just enough of the
 * sessions, assets and link tables to enforce the association rules atomically.
 */
export interface SessionAssetStore {
  /** Read a session (any status) so the rules can check existence + status. */
  findSession(sessionId: string): SessionRecord | null;
  /** Look up a catalogue asset by its normalised symbol. */
  findAssetBySymbol(symbol: string): AssetRecord | null;
  /** Insert the asset or return the already-existing asset for the same symbol. */
  insertAsset(record: AssetRecord): AssetRecord;
  findLink(sessionId: string, assetId: string): SessionAssetRecord | null;
  /** Insert the link or return the already-existing link for the same pair. */
  insertLink(record: SessionAssetRecord): SessionAssetRecord;
  /** All asset+link pairs attached to a session (order not guaranteed here). */
  listLinks(
    sessionId: string,
  ): Array<{ asset: AssetRecord; link: SessionAssetRecord }>;
}

/**
 * Repository port for asset association. Implemented by packages/db (SQLite)
 * in production and by an in-memory fake in unit tests. `transaction` gives the
 * find-or-create + link sequence exclusive, atomic access.
 */
export interface SessionAssetRepository {
  transaction<T>(fn: (store: SessionAssetStore) => T): T;
}

/** Domain input for attaching an asset; validation/shape lives in shared. */
export interface AddSessionAssetInput {
  symbol: string;
  name?: string | null;
}
