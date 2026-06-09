import { describe, expect, it } from "vitest";
import {
  SessionNotActiveError,
  SessionNotFoundError,
} from "../errors";
import { addSessionAsset } from "../addSessionAsset";
import {
  createFakeSessionAssetRepository,
  openSession,
} from "./fakeAssetRepo";
import { fixedDeps } from "./fakeRepo";

describe("addSessionAsset", () => {
  it("links a new asset to an open session", () => {
    const repo = createFakeSessionAssetRepository([openSession("s-1")]);
    const { asset, created } = addSessionAsset(repo, fixedDeps(), "s-1", {
      symbol: "AAPL",
      name: "Apple",
    });

    expect(created).toBe(true);
    expect(asset.symbol).toBe("AAPL");
    expect(asset.name).toBe("Apple");
    expect(asset.id).toBe("id-1");
    expect(asset.createdAt).toBe("2026-06-08T14:00:00.000Z");
    expect(asset.linkedAt).toBe("2026-06-08T14:00:00.000Z");
  });

  it("normalises the symbol to uppercase before persisting", () => {
    const repo = createFakeSessionAssetRepository([openSession("s-1")]);
    const { asset } = addSessionAsset(repo, fixedDeps(), "s-1", {
      symbol: " aapl ",
    });
    expect(asset.symbol).toBe("AAPL");
    expect(asset.name).toBeNull();
  });

  it("is idempotent when the same asset is added twice (case-insensitive)", () => {
    const repo = createFakeSessionAssetRepository([openSession("s-1")]);
    const first = addSessionAsset(repo, fixedDeps({ ids: ["id-1", "id-2"] }), "s-1", {
      symbol: "AAPL",
    });
    const second = addSessionAsset(repo, fixedDeps({ ids: ["id-2", "id-3"] }), "s-1", {
      symbol: "aapl",
    });

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.asset.id).toBe(first.asset.id);
    // The catalogue still holds a single AAPL asset (no duplicate created).
    expect(listSymbols(repo, "s-1")).toEqual(["AAPL"]);
  });

  it("supports several assets on one session", () => {
    const repo = createFakeSessionAssetRepository([openSession("s-1")]);
    addSessionAsset(repo, fixedDeps({ ids: ["a-1"] }), "s-1", { symbol: "AAPL" });
    addSessionAsset(repo, fixedDeps({ ids: ["a-2"] }), "s-1", { symbol: "MSFT" });

    expect(listSymbols(repo, "s-1").sort()).toEqual(["AAPL", "MSFT"]);
  });

  it("reuses the catalogue asset across sessions", () => {
    const repo = createFakeSessionAssetRepository([
      openSession("s-1"),
      openSession("s-2"),
    ]);
    const a = addSessionAsset(repo, fixedDeps({ ids: ["a-1"] }), "s-1", {
      symbol: "AAPL",
    });
    const b = addSessionAsset(repo, fixedDeps({ ids: ["a-2"] }), "s-2", {
      symbol: "AAPL",
    });

    // Same catalogue asset, attached to two different sessions.
    expect(b.asset.id).toBe(a.asset.id);
    // A new link in another session is still a creation.
    expect(b.created).toBe(true);
    expect(listSymbols(repo, "s-1")).toEqual(["AAPL"]);
    expect(listSymbols(repo, "s-2")).toEqual(["AAPL"]);
  });

  it("refuses an unknown session", () => {
    const repo = createFakeSessionAssetRepository([]);
    expect(() =>
      addSessionAsset(repo, fixedDeps(), "missing", { symbol: "AAPL" }),
    ).toThrow(SessionNotFoundError);
  });

  it.each(["closed", "suspended"] as const)(
    "refuses adding an asset to a %s session",
    (status) => {
      const repo = createFakeSessionAssetRepository([
        { ...openSession("s-1"), status },
      ]);
      expect(() =>
        addSessionAsset(repo, fixedDeps(), "s-1", { symbol: "AAPL" }),
      ).toThrow(SessionNotActiveError);
    },
  );
});

function listSymbols(
  repo: ReturnType<typeof createFakeSessionAssetRepository>,
  sessionId: string,
): string[] {
  return repo.transaction((store) =>
    store.listLinks(sessionId).map(({ asset }) => asset.symbol),
  );
}
