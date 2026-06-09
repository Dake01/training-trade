import { describe, expect, it } from "vitest";
import { SessionNotFoundError } from "../errors";
import { addSessionAsset } from "../addSessionAsset";
import { listSessionAssets } from "../listSessionAssets";
import {
  createFakeSessionAssetRepository,
  openSession,
} from "./fakeAssetRepo";
import { fixedDeps } from "./fakeRepo";

describe("listSessionAssets", () => {
  it("returns an empty list for a session with no assets", () => {
    const repo = createFakeSessionAssetRepository([openSession("s-1")]);
    expect(listSessionAssets(repo, "s-1")).toEqual([]);
  });

  it("returns the linked assets of a session", () => {
    const repo = createFakeSessionAssetRepository([openSession("s-1")]);
    addSessionAsset(repo, fixedDeps({ ids: ["a-1"] }), "s-1", {
      symbol: "AAPL",
      name: "Apple",
    });

    const assets = listSessionAssets(repo, "s-1");
    expect(assets).toHaveLength(1);
    expect(assets[0]).toMatchObject({ id: "a-1", symbol: "AAPL", name: "Apple" });
  });

  it("orders assets by linkedAt then symbol", () => {
    const repo = createFakeSessionAssetRepository([openSession("s-1")]);
    addSessionAsset(
      repo,
      fixedDeps({ ids: ["a-1"], iso: "2026-06-08T10:00:00.000Z" }),
      "s-1",
      { symbol: "MSFT" },
    );
    addSessionAsset(
      repo,
      fixedDeps({ ids: ["a-2"], iso: "2026-06-08T09:00:00.000Z" }),
      "s-1",
      { symbol: "AAPL" },
    );

    // AAPL was linked earlier, so it comes first despite being added second.
    expect(listSessionAssets(repo, "s-1").map((a) => a.symbol)).toEqual([
      "AAPL",
      "MSFT",
    ]);
  });

  it("refuses an unknown session", () => {
    const repo = createFakeSessionAssetRepository([]);
    expect(() => listSessionAssets(repo, "missing")).toThrow(
      SessionNotFoundError,
    );
  });
});
