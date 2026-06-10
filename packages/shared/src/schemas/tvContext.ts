/**
 * Raw, unparsed signals scraped from the TradingView page. The popup collects
 * these via `chrome.scripting.executeScript` (DOM access only, no parsing) and
 * hands them to {@link parseTvContext}. Keeping the parsing pure makes it
 * testable without a DOM and keeps the injected scraper trivial.
 */
export type TvRawSignals = {
  /** `document.title` of the TradingView tab. */
  title: string;
  /** Text content of the header symbol-search button (stable `id`). */
  header: string;
  /** Text content of the chart legend source title (often the company name). */
  legend: string;
  /** `symbol` URL query param (e.g. `EURONEXT:ALRIB`). */
  url: string;
  /**
   * Text of the chart legend OHLC values for the current bar
   * (e.g. `O2,310 H2,370 B2,210 C2,370 +0,060`). Its Close (`C`) value is the
   * chart price — correct in Replay mode, where the live quote does not apply.
   */
  legendOhlc: string;
  /** First price-looking string scraped from the DOM, if any. */
  domPrice: string;
  /** First date-time-looking string scraped from the chart status bar, if any. */
  timestampText: string;
};

/**
 * A ticker may start with a letter OR a digit (e.g. `0IAX`, `52C`), but must
 * contain at least one letter — that requirement is what excludes pure numbers
 * like prices ("300", "10.10") while still accepting digit-leading symbols.
 */
const TICKER_RE = /^[A-Z0-9][A-Z0-9._-]{0,14}$/;
const HAS_LETTER_RE = /[A-Z]/;

/**
 * Words that look like tickers but never are — the "TradingView" brand that
 * always appears in the tab title. Guards against inventing a bogus asset from
 * page chrome. (Layout/account names in the title are avoided by trusting the
 * header symbol button and the URL over the title.)
 */
const TICKER_STOPWORDS = new Set(["TRADINGVIEW"]);

function isTicker(token: string): boolean {
  const up = token.toUpperCase();
  return (
    TICKER_RE.test(up) && HAS_LETTER_RE.test(up) && !TICKER_STOPWORDS.has(up)
  );
}

/** ISO 8601 guard — mirrors the isoDateTime regex used elsewhere in shared. */
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

/** Broad date-time text pattern as rendered in TradingView's status bar. */
const DATETIME_TEXT_RE = /\b(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?)\b/;

/** Parse a raw status-bar date string into a validated ISO 8601 UTC timestamp. */
function parseTimestamp(text: string): string | null {
  const match = DATETIME_TEXT_RE.exec(text);
  const rawStr = match?.[1]?.replace(" ", "T");
  if (!rawStr) return null;
  // Ensure seconds are present for ISO 8601 compliance.
  const normalized = rawStr.length === 16 ? `${rawStr}:00` : rawStr;
  const iso = `${normalized}Z`;
  const date = new Date(iso);
  return !isNaN(date.getTime()) && ISO_RE.test(iso) ? iso : null;
}

/** Extract the first ticker-looking token from a free-form string. */
function firstTicker(text: string): string | null {
  for (const token of text.split(/[\s·—|]+/)) {
    const up = token.trim().toUpperCase();
    if (isTicker(up)) return up;
  }
  return null;
}

/** Normalise a raw price string ("2 370,5 EUR") to a positive decimal, or null. */
function normalisePrice(text: string): string | null {
  const cleaned = text.replace(/\s/g, "").replace(/[^0-9,.]/g, "").replace(",", ".");
  return /^\d+(\.\d+)?$/.test(cleaned) && Number(cleaned) > 0 ? cleaned : null;
}

/**
 * Extract the Close (`C`) value from a TradingView OHLC legend string such as
 * `O2,310 H2,370 B2,210 C2,370 +0,060 (+2,60%)`. The `C`/Close label is the same
 * across locales (FR uses O/H/B/C); this is the bar price shown on the chart,
 * which is what Replay mode reflects.
 */
function closeFromLegend(legendOhlc: string): string | null {
  // The legend must contain an Open value; this also guards against a stray "C"
  // in a company name being mistaken for the Close.
  if (!/O\s*[0-9]/.test(legendOhlc)) return null;

  // TradingView concatenates legend values without separators ("C2,1802,180"),
  // making "2,1802,180" ambiguous. All OHLC values share the same number of
  // decimals, so read that count from the Open and pin the Close to exactly it.
  const openDecimals = legendOhlc.match(/O\s*[0-9]+[.,]([0-9]+?)(?=\s|[HLB])/);
  const decLen = openDecimals?.[1]?.length;

  const closeRe = decLen
    ? new RegExp(`C\\s*([0-9]+[.,][0-9]{${decLen}})`)
    : /C\s*([0-9]+(?:[.,][0-9]+)?)/;

  const match = legendOhlc.match(closeRe);
  return match?.[1] ? normalisePrice(match[1]) : null;
}

/**
 * Resolve the current TradingView symbol and price from raw page signals.
 *
 * Symbol priority: header button → URL ticker part → title tokens. The header
 * reflects the displayed instrument; the URL is canonical; the free-form title
 * (which can carry layout/account names) is only a last resort.
 *
 * Price priority: the chart legend Close → a price-looking DOM string → the
 * `document.title` live quote. The legend Close comes first so Replay mode uses
 * the bar shown on the chart rather than the live market price in the title.
 * Both "," and "." decimal separators are accepted.
 */
export function parseTvContext(raw: TvRawSignals): {
  symbol: string | null;
  price: string | null;
  isoTimestamp: string | null;
} {
  let symbol: string | null = null;

  // 1. Header button text — most reliable, matches the displayed instrument.
  const headerToken = raw.header.trim().split(/\s+/)[0] ?? "";
  if (isTicker(headerToken)) {
    symbol = headerToken.toUpperCase();
  }
  // 2. Ticker part of the canonical URL symbol (EXCHANGE:TICKER) — trusted over
  //    the free-form title, which can carry layout/account names.
  if (!symbol && raw.url) {
    const dec = decodeURIComponent(raw.url);
    const part = dec.includes(":") ? (dec.split(":")[1] ?? dec) : dec;
    if (isTicker(part)) symbol = part.toUpperCase();
  }
  // 3. First ticker-looking token in the title — last resort.
  if (!symbol) symbol = firstTicker(raw.title);

  // 1. Chart legend Close — the price shown on the chart (Replay-aware).
  let price = closeFromLegend(raw.legendOhlc);
  // 2. Generic price scraped from the DOM (price axis / last price).
  if (!price && raw.domPrice) price = normalisePrice(raw.domPrice);
  // 3. Live quote in the tab title — last resort (wrong during Replay).
  if (!price) {
    const priceInTitle = raw.title.match(/\d{1,7}[.,]\d{1,6}/);
    if (priceInTitle) price = normalisePrice(priceInTitle[0]);
  }

  const isoTimestamp = raw.timestampText ? parseTimestamp(raw.timestampText) : null;

  return { symbol, price, isoTimestamp };
}
