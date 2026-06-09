import type { TrackedAsset } from "@training-trade/shared";
import { SessionNotActiveError, SessionNotFoundError } from "./errors";
import { normaliseSymbol, toTrackedAsset } from "./assetMappers";
import type {
  AddSessionAssetInput,
  AssetRecord,
  SessionAssetRecord,
  SessionAssetRepository,
} from "./assetTypes";
import type { SessionDeps } from "./types";

/** Outcome of {@link addSessionAsset}. `created` is false on an idempotent re-add. */
export interface AddSessionAssetResult {
  asset: TrackedAsset;
  /** True when a new session<->asset link was created this call. */
  created: boolean;
}

/**
 * Attach a tracked asset to an open session (AC 1).
 *
 * Business rules enforced here:
 * - the session must exist, otherwise {@link SessionNotFoundError};
 * - the session must be `open`, otherwise {@link SessionNotActiveError}
 *   (a `closed`/`suspended` session keeps its links but cannot gain new ones);
 * - the symbol is normalised (trimmed + uppercase) before any comparison, so
 *   `aapl` and `AAPL` are the same asset;
 * - the catalogue asset is created only if it does not exist yet, and reused
 *   otherwise so the same asset can be tracked across several sessions;
 * - linking is idempotent: re-adding an already-linked asset returns it without
 *   creating a duplicate link.
 *
 * The read + writes run inside `repo.transaction` so the find-or-create + link
 * sequence is atomic.
 */
export function addSessionAsset(
  repo: SessionAssetRepository,
  deps: SessionDeps,
  sessionId: string,
  input: AddSessionAssetInput,
): AddSessionAssetResult {
  const symbol = normaliseSymbol(input.symbol);
  const name = input.name?.trim() ? input.name.trim() : null;

  return repo.transaction((store) => {
    const session = store.findSession(sessionId);
    if (!session) {
      throw new SessionNotFoundError();
    }
    if (session.status !== "open") {
      throw new SessionNotActiveError();
    }

    let asset = store.findAssetBySymbol(symbol);
    if (!asset) {
      const createdAsset: AssetRecord = {
        id: deps.ids.generate(),
        symbol,
        name,
        createdAt: deps.clock.now().toISOString(),
      };
      asset = store.insertAsset(createdAsset);
    }

    let link = store.findLink(sessionId, asset.id);
    const created = !link;
    if (!link) {
      const createdLink: SessionAssetRecord = {
        sessionId,
        assetId: asset.id,
        linkedAt: deps.clock.now().toISOString(),
      };
      link = store.insertLink(createdLink);
    }

    return { asset: toTrackedAsset(asset, link), created };
  });
}
