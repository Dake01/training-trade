import type { TrackedAsset } from "@training-trade/shared";
import { SessionNotFoundError } from "./errors";
import { toTrackedAsset } from "./assetMappers";
import type { SessionAssetRepository } from "./assetTypes";

/**
 * List the assets attached to a session (AC 2).
 *
 * Business rules enforced here:
 * - the session must exist, otherwise {@link SessionNotFoundError} (a closed
 *   session keeps its links and stays consultable);
 * - assets are returned in a stable order: `linkedAt` ascending, then `symbol`
 *   ascending as a tie-breaker.
 */
export function listSessionAssets(
  repo: SessionAssetRepository,
  sessionId: string,
): TrackedAsset[] {
  return repo.transaction((store) => {
    const session = store.findSession(sessionId);
    if (!session) {
      throw new SessionNotFoundError();
    }

    return store
      .listLinks(sessionId)
      .map(({ asset, link }) => toTrackedAsset(asset, link))
      .sort(
        (a, b) =>
          a.linkedAt.localeCompare(b.linkedAt) ||
          a.symbol.localeCompare(b.symbol),
      );
  });
}
