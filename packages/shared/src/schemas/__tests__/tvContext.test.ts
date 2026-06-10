import { describe, expect, it } from "vitest";
import { parseTvContext, type TvRawSignals } from "../tvContext";

function raw(overrides: Partial<TvRawSignals> = {}): TvRawSignals {
  return {
    title: "",
    header: "",
    legend: "",
    url: "",
    legendOhlc: "",
    domPrice: "",
    timestampText: "",
    ...overrides,
  };
}

describe("parseTvContext — symbol resolution", () => {
  it("prefers the header symbol-search button text", () => {
    const { symbol } = parseTvContext(
      raw({ header: "ALKAL", title: "Something else", url: "EURONEXT:ALRIB" }),
    );
    expect(symbol).toBe("ALKAL");
  });

  it("takes only the first token of a noisy header", () => {
    const { symbol } = parseTvContext(raw({ header: "AAPL Apple Inc" }));
    expect(symbol).toBe("AAPL");
  });

  it("falls back to the first ticker-looking token in the title", () => {
    const { symbol } = parseTvContext(
      raw({ title: "ALKAL 10,10 ▼ −9.82% — Kalray SA — TradingView" }),
    );
    expect(symbol).toBe("ALKAL");
  });

  it("skips price-like tokens when scanning the title", () => {
    // Leading price must not be mistaken for a ticker.
    const { symbol } = parseTvContext(raw({ title: "10.10 AAPL Apple" }));
    expect(symbol).toBe("AAPL");
  });

  it("uses the ticker part of a canonical URL symbol when nothing else works", () => {
    const { symbol } = parseTvContext(raw({ url: "EURONEXT:ALRIB" }));
    expect(symbol).toBe("ALRIB");
  });

  it("decodes a URL-encoded symbol", () => {
    const { symbol } = parseTvContext(raw({ url: "NASDAQ%3AAAPL" }));
    expect(symbol).toBe("AAPL");
  });

  it("accepts a digit-leading ticker from the header (e.g. 0IAX)", () => {
    const { symbol } = parseTvContext(raw({ header: "0IAX" }));
    expect(symbol).toBe("0IAX");
  });

  it("accepts other digit-leading tickers (e.g. 52C)", () => {
    const { symbol } = parseTvContext(raw({ header: "52C" }));
    expect(symbol).toBe("52C");
  });

  it("trusts the header over a noisy title carrying an account/layout name", () => {
    // Regression: the title held "THOMAS"; the header holds the real symbol.
    const { symbol } = parseTvContext(
      raw({ header: "0IAX", title: "THOMAS — Dassault Aviation SA — TradingView" }),
    );
    expect(symbol).toBe("0IAX");
  });

  it("prefers the URL ticker over the title when the header is empty", () => {
    const { symbol } = parseTvContext(
      raw({ title: "THOMAS layout", url: "LSIN:0IAX" }),
    );
    expect(symbol).toBe("0IAX");
  });

  it("rejects a pure-number token as a symbol (no letter)", () => {
    const { symbol } = parseTvContext(raw({ title: "300,0 0IAX" }));
    expect(symbol).toBe("0IAX");
  });

  it("returns null when no reliable symbol is present", () => {
    const { symbol } = parseTvContext(raw({ title: "TradingView", legend: "Kalray SA" }));
    expect(symbol).toBeNull();
  });

  it("does not invent a symbol from a company-name-only legend", () => {
    // Legend is intentionally NOT used as a symbol source (it holds the long name).
    const { symbol } = parseTvContext(raw({ legend: "Kalray SA" }));
    expect(symbol).toBeNull();
  });
});

describe("parseTvContext — price resolution", () => {
  it("reads a comma-decimal price from the title", () => {
    const { price } = parseTvContext(raw({ title: "ALKAL 10,10 ▼ −9.82%" }));
    expect(price).toBe("10.10");
  });

  it("reads a dot-decimal price from the title", () => {
    const { price } = parseTvContext(raw({ title: "AAPL 182.50 ▲ +1.2%" }));
    expect(price).toBe("182.50");
  });

  it("falls back to a scraped DOM price (comma locale)", () => {
    const { price } = parseTvContext(raw({ header: "ALKAL", domPrice: "10,10 EUR" }));
    expect(price).toBe("10.10");
  });

  it("returns null when no positive price can be read", () => {
    const { price } = parseTvContext(raw({ title: "AAPL ▲", domPrice: "—" }));
    expect(price).toBeNull();
  });

  it("rejects a zero price", () => {
    const { price } = parseTvContext(raw({ domPrice: "0.00" }));
    expect(price).toBeNull();
  });
});

describe("parseTvContext — price prefers the chart legend (Replay mode)", () => {
  it("uses the legend Close, not the live title quote, in Replay", () => {
    // Regression: in Replay the title carries the live quote (5.70) while the
    // chart bar Close is 2.370 — the chart price must win.
    const { price } = parseTvContext(
      raw({
        title: "MEMS 5.70 ▼ −1.72% — MEMSCAP SA — TradingView",
        legendOhlc: "MEMSCAP SA · 1D · Euronext Paris O2,310 H2,370 B2,210 C2,370 +0,060 (+2,60%)",
      }),
    );
    expect(price).toBe("2.370");
  });

  it("parses the Close from a space-free concatenated legend", () => {
    const { price } = parseTvContext(
      raw({ legendOhlc: "MEMSCAPSAO2,310H2,370B2,210C2,370+0,060(+2,60%)" }),
    );
    expect(price).toBe("2.370");
  });

  it("captures a single Close number when the next value is glued to it", () => {
    // Real diagnostic capture: the Close "2,180" is immediately followed by
    // another "2,180" with no separator — only the first must be taken.
    const { price } = parseTvContext(
      raw({
        title: "ALRIB 12,56 ▼ −5.28% Thomas",
        legendOhlc: "O2,180H2,190B2,160C2,1802,180∅−0,010 (−0,46%)Vol2,77 K−0,700 (−5,28%)",
      }),
    );
    expect(price).toBe("2.180");
  });

  it("does not mistake a 'C' in the company name for the Close", () => {
    // No OHLC numbers present → no false positive from "MEMSCAP".
    const { price } = parseTvContext(raw({ legendOhlc: "MEMSCAP SA" }));
    expect(price).toBeNull();
  });

  it("handles a dot-decimal legend", () => {
    const { price } = parseTvContext(
      raw({ legendOhlc: "O295.6 H301.0 L295.6 C300.0 +2.2" }),
    );
    expect(price).toBe("300.0");
  });

  it("falls back to the title quote when no legend is present", () => {
    const { price } = parseTvContext(raw({ title: "AAPL 182.50 ▲ +1.2%" }));
    expect(price).toBe("182.50");
  });
});

describe("parseTvContext — timestamp resolution", () => {
  it("parses a status-bar date into a validated ISO 8601 UTC timestamp", () => {
    const { isoTimestamp } = parseTvContext(
      raw({ timestampText: "2025-01-15 09:30" }),
    );
    expect(isoTimestamp).toBe("2025-01-15T09:30:00Z");
  });

  it("keeps seconds when already present", () => {
    const { isoTimestamp } = parseTvContext(
      raw({ timestampText: "Bar: 2025-01-15 09:30:45 (UTC)" }),
    );
    expect(isoTimestamp).toBe("2025-01-15T09:30:45Z");
  });

  it("returns null when no date is present", () => {
    expect(parseTvContext(raw({ timestampText: "no date here" })).isoTimestamp).toBeNull();
  });
});

describe("parseTvContext — combined realistic snapshots", () => {
  it("resolves symbol, price and timestamp from a typical snapshot", () => {
    const result = parseTvContext(
      raw({
        title: "ALKAL 10,10 ▼ −9.82% Kalray SA — EURONEXT:ALRIB — TradingView",
        header: "ALKAL",
        url: "EURONEXT:ALRIB",
        timestampText: "2025-01-15 09:30",
      }),
    );
    expect(result).toEqual({
      symbol: "ALKAL",
      price: "10.10",
      isoTimestamp: "2025-01-15T09:30:00Z",
    });
  });

  it("degrades gracefully when off TradingView (all blank)", () => {
    expect(parseTvContext(raw())).toEqual({
      symbol: null,
      price: null,
      isoTimestamp: null,
    });
  });
});
