import { describe, expect, it } from "vitest";
import {
  addSessionAssetRequestSchema,
  addSessionAssetResponseSchema,
  assetSymbolSchema,
  sessionAssetsResponseSchema,
  trackedAssetSchema,
} from "../sessionAsset";

const asset = {
  id: "asset-1",
  symbol: "NASDAQ:AAPL",
  name: "Apple",
  createdAt: "2026-06-09T08:54:26.000Z",
  linkedAt: "2026-06-09T08:54:26.000Z",
};

describe("assetSymbolSchema", () => {
  it.each(["AAPL", "NASDAQ:AAPL", "BTC/USDT", "EURUSD", "BRK.B", "ES-MINI"])(
    "accepts market-style symbol %s",
    (symbol) => {
      expect(assetSymbolSchema.parse(symbol)).toBe(symbol);
    },
  );

  it("trims surrounding whitespace", () => {
    expect(assetSymbolSchema.parse("  aapl  ")).toBe("aapl");
  });

  it("rejects an empty or whitespace-only symbol", () => {
    expect(() => assetSymbolSchema.parse("")).toThrow();
    expect(() => assetSymbolSchema.parse("   ")).toThrow();
  });

  it("rejects a symbol with forbidden characters", () => {
    expect(() => assetSymbolSchema.parse("AA PL")).toThrow();
    expect(() => assetSymbolSchema.parse("AA$PL")).toThrow();
  });

  it("rejects an unreasonably long symbol", () => {
    expect(() => assetSymbolSchema.parse("A".repeat(64))).toThrow();
  });
});

describe("addSessionAssetRequestSchema", () => {
  it("accepts a symbol with an optional name", () => {
    expect(
      addSessionAssetRequestSchema.parse({ symbol: "NASDAQ:AAPL", name: "Apple" }),
    ).toEqual({ symbol: "NASDAQ:AAPL", name: "Apple" });
  });

  it("accepts a symbol without a name", () => {
    const parsed = addSessionAssetRequestSchema.parse({ symbol: "AAPL" });
    expect(parsed.symbol).toBe("AAPL");
    expect(parsed.name ?? null).toBeNull();
  });

  it("treats a blank name as no name", () => {
    const parsed = addSessionAssetRequestSchema.parse({
      symbol: "AAPL",
      name: "   ",
    });
    expect(parsed.name ?? null).toBeNull();
  });

  it("rejects an invalid symbol", () => {
    expect(() =>
      addSessionAssetRequestSchema.parse({ symbol: "" }),
    ).toThrow();
  });
});

describe("trackedAssetSchema", () => {
  it("accepts a full asset DTO", () => {
    expect(trackedAssetSchema.parse(asset)).toEqual(asset);
  });

  it("accepts a null name", () => {
    expect(trackedAssetSchema.parse({ ...asset, name: null }).name).toBeNull();
  });

  it("rejects a non ISO timestamp", () => {
    expect(() =>
      trackedAssetSchema.parse({ ...asset, linkedAt: "2026/06/09" }),
    ).toThrow();
  });
});

describe("session asset response schemas", () => {
  it("accepts the add-asset payload", () => {
    expect(addSessionAssetResponseSchema.parse({ asset })).toEqual({ asset });
  });

  it("accepts the list payload", () => {
    expect(
      sessionAssetsResponseSchema.parse({ assets: [asset] }),
    ).toEqual({ assets: [asset] });
  });

  it("accepts an empty list", () => {
    expect(sessionAssetsResponseSchema.parse({ assets: [] })).toEqual({
      assets: [],
    });
  });
});
