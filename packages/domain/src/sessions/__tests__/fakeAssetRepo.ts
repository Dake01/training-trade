import type {
  AssetRecord,
  SessionAssetRecord,
  SessionAssetRepository,
  SessionAssetStore,
} from "../assetTypes";
import type { SessionRecord } from "../types";

/**
 * In-memory SessionAssetRepository used to unit test the asset-association
 * rules. Sessions are seeded read-only (this story never creates them); assets
 * and links accumulate as the rules run.
 */
export function createFakeSessionAssetRepository(
  sessions: SessionRecord[] = [],
): SessionAssetRepository {
  const sessionRows = [...sessions];
  const assets: AssetRecord[] = [];
  const links: SessionAssetRecord[] = [];

  const store: SessionAssetStore = {
    findSession: (id) => sessionRows.find((row) => row.id === id) ?? null,
    findAssetBySymbol: (symbol) =>
      assets.find((asset) => asset.symbol === symbol) ?? null,
    insertAsset: (record) => {
      const existing = assets.find((asset) => asset.symbol === record.symbol);
      if (existing) return existing;
      assets.push(record);
      return record;
    },
    findLink: (sessionId, assetId) =>
      links.find(
        (link) => link.sessionId === sessionId && link.assetId === assetId,
      ) ?? null,
    insertLink: (record) => {
      const existing = links.find(
        (link) => link.sessionId === record.sessionId && link.assetId === record.assetId,
      );
      if (existing) return existing;
      links.push(record);
      return record;
    },
    listLinks: (sessionId) =>
      links
        .filter((link) => link.sessionId === sessionId)
        .map((link) => {
          const asset = assets.find((row) => row.id === link.assetId);
          if (!asset) throw new Error(`Unknown asset ${link.assetId}`);
          return { asset, link };
        }),
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
