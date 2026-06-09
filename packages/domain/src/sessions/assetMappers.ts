import type { TrackedAsset } from "@training-trade/shared";
import type { AssetRecord, SessionAssetRecord } from "./assetTypes";

/** Normalise a raw symbol to its canonical catalogue form (trimmed uppercase). */
export function normaliseSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

/** Combine a catalogue asset and its session link into the public DTO. */
export function toTrackedAsset(
  asset: AssetRecord,
  link: SessionAssetRecord,
): TrackedAsset {
  return {
    id: asset.id,
    symbol: asset.symbol,
    name: asset.name,
    createdAt: asset.createdAt,
    linkedAt: link.linkedAt,
  };
}
