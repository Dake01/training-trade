import { useCallback, useEffect, useRef, useState } from "react";
// Import the TradingView helper from a Zod-free subpath: pulling it from the
// package barrel ("@training-trade/shared") would bundle every Zod schema, which
// Plasmo/Parcel cannot bundle (z.enum throws at runtime in the popup).
import { parseTvContext, type TvRawSignals } from "@training-trade/shared/tv";
import type {
  ApiResponse,
  Decision,
  DecisionSide,
  SessionContext,
  TrackedAsset,
} from "@training-trade/shared";

// Copied from packages/shared/src/schemas/decision.ts — Zod can't be bundled in the popup by Plasmo/Parcel
const ISO_DATETIME_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

const API_BASE = process.env.PLASMO_PUBLIC_API_BASE ?? "http://localhost:3000";

type ActiveData = { session: SessionContext | null };
type AssetsData = { assets: TrackedAsset[] };
type DecisionsData = { decisions: Decision[] };
type CaptureDecisionData = { decision: Decision };
type LinkAssetData = { asset: TrackedAsset };

function formatLogicalTime(isoStr: string): string {
  try {
    return new Date(isoStr).toISOString().slice(0, 19).replace("T", " ");
  } catch {
    return isoStr;
  }
}

// Executed inside the TradingView page via chrome.scripting.executeScript — must be self-contained.
/**
 * Runs INSIDE the TradingView page via chrome.scripting.executeScript, so it
 * must be fully self-contained (no outside references). It only SCRAPES the DOM
 * — all parsing happens in the popup via the pure, tested `parseTvContext`.
 * TradingView's CSS classes are obfuscated and change between deployments, so we
 * rely on the most stable signals: the header symbol-search button (stable `id`)
 * and `document.title` (carries the live ticker and usually the live price).
 */
function scrapeTvSignals(): TvRawSignals {
  const raw: TvRawSignals = {
    title: "",
    header: "",
    legend: "",
    url: "",
    legendOhlc: "",
    domPrice: "",
    timestampText: "",
  };
  try {
    raw.title = (document.title ?? "").trim();

    const headerEl = document.getElementById("header-toolbar-symbol-search");
    raw.header = (headerEl?.textContent ?? "").trim();

    const legendEl = document.querySelector('[data-name="legend-source-title"]');
    raw.legend = (legendEl?.textContent ?? "").trim();

    raw.url = new URLSearchParams(location.search).get("symbol") ?? "";

    // Chart legend OHLC for the current bar — its Close is the chart price
    // (correct in Replay mode). The values live next to the stable
    // `legend-source-title`; walk up from it to the ancestor that holds the
    // OHLC text. This avoids guessing the (obfuscated) value-container class.
    const hasOhlc = (t: string) => /O\s*[0-9]/.test(t) && /C\s*[0-9]/.test(t);
    if (legendEl) {
      let node: Element | null = legendEl;
      for (let i = 0; i < 6 && node; i++) {
        const text = (node.textContent ?? "").trim();
        if (hasOhlc(text)) {
          raw.legendOhlc = text;
          break;
        }
        node = node.parentElement;
      }
    }
    // Robust fallback: scan the page for the smallest element whose text looks
    // like an OHLC sequence (O<num> H<num> ... C<num>). The shortest match is the
    // tight legend values container, immune to obfuscated class names.
    if (!raw.legendOhlc) {
      const OHLC_SEQ = /O\s*[0-9][0-9.,]*\s*H\s*[0-9][0-9.,]*[\s\S]*?C\s*[0-9]/;
      let best = "";
      for (const el of document.querySelectorAll("div,span")) {
        const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
        if (text.length > 0 && text.length < 140 && OHLC_SEQ.test(text)) {
          if (best === "" || text.length < best.length) best = text;
        }
      }
      if (best) raw.legendOhlc = best;
    }

    for (const sel of [
      "[class*='priceValue']",
      "[class*='lastPrice']",
      "[class*='last-']",
      "[class*='currentPrice']",
    ]) {
      const el = document.querySelector(sel);
      const text = (el?.textContent ?? "").trim();
      if (text) {
        raw.domPrice = text;
        break;
      }
    }

    // Status-bar date label (current bar time on the chart).
    for (const sel of [
      '[class*="statusLine"] [class*="dateRange"]',
      '[class*="bottom-widgetbar"] [class*="date"]',
      '[class*="chart-bottom-toolbar"] time',
      '[class*="statusLine"]',
    ]) {
      const el = document.querySelector(sel);
      const text = (el?.textContent ?? "").trim();
      if (/\d{4}-\d{2}-\d{2}/.test(text)) {
        raw.timestampText = text;
        break;
      }
    }
  } catch {
    // DOM access failed — return whatever was collected so far
  }
  return raw;
}

function Popup() {
  const [session, setSession] = useState<SessionContext | null>(null);
  const [assets, setAssets] = useState<TrackedAsset[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [busy, setBusy] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);

  // Manual-input form state
  const [assetId, setAssetId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [referencePrice, setReferencePrice] = useState("");
  const [logicalTimestamp, setLogicalTimestamp] = useState("");

  // TradingView context state
  const [tvSymbol, setTvSymbol] = useState<string | null>(null);
  const [tvPrice, setTvPrice] = useState<string | null>(null);
  const [tvTimestamp, setTvTimestamp] = useState<string | null>(null);
  const [autoLinking, setAutoLinking] = useState(false);
  // Diagnostics: raw values seen in the TV page (helps debug detection)
  const [tvDebug, setTvDebug] = useState<Record<string, string> | null>(null);
  const [onTradingView, setOnTradingView] = useState(false);

  // Fallback path: free-text symbol input
  const [manualSymbol, setManualSymbol] = useState("");

  // Tracks which symbol was last auto-linked to prevent repeated attempts
  const lastLinkedSymbolRef = useRef<string | null>(null);
  const referencePriceSourceRef = useRef<"manual" | "tv">("manual");
  const logicalTimestampSourceRef = useRef<"manual" | "tv">("manual");

  // Poll the active TradingView tab directly for symbol + price via executeScript.
  // This is more reliable than content-script messaging: reads the live DOM
  // regardless of content-script state or reload timing.
  useEffect(() => {
    if (typeof chrome === "undefined" || !chrome.tabs?.query || !chrome.scripting?.executeScript) return;

    const poll = () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab?.id || !tab?.url) {
          setOnTradingView(false);
          return;
        }
        try {
          if (!new URL(tab.url).hostname.endsWith("tradingview.com")) {
            setOnTradingView(false);
            return;
          }
        } catch {
          setOnTradingView(false);
          return;
        }
        setOnTradingView(true);
        // Inject into ALL frames: the chart (and its OHLC legend) often lives in
        // a sub-frame that the top-frame-only default would miss. Merge the
        // signals across frames, taking the first non-empty value for each field.
        chrome.scripting.executeScript(
          { target: { tabId: tab.id, allFrames: true }, func: scrapeTvSignals },
          (results) => {
            if (chrome.runtime.lastError) {
              setTvDebug({ injection: chrome.runtime.lastError.message ?? "echec" });
              return;
            }
            const merged: TvRawSignals = {
              title: "",
              header: "",
              legend: "",
              url: "",
              legendOhlc: "",
              domPrice: "",
              timestampText: "",
            };
            for (const r of results ?? []) {
              const s = r?.result as TvRawSignals | undefined;
              if (!s) continue;
              for (const key of Object.keys(merged) as (keyof TvRawSignals)[]) {
                if (!merged[key] && s[key]) merged[key] = s[key];
              }
            }
            setTvDebug(merged as unknown as Record<string, string>);
            const { symbol, price, isoTimestamp } = parseTvContext(merged);
            setTvSymbol(symbol);
            setTvPrice(price);
            setTvTimestamp(isoTimestamp);
          },
        );
      });
    };

    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, []);

  // Auto-fill referencePrice from tvPrice when the field is empty
  useEffect(() => {
    if (tvPrice) {
      setReferencePrice((prev) => {
        if (prev === "" || referencePriceSourceRef.current === "tv") {
          referencePriceSourceRef.current = "tv";
          return tvPrice;
        }
        return prev;
      });
      return;
    }

    if (referencePriceSourceRef.current === "tv") {
      referencePriceSourceRef.current = "manual";
      setReferencePrice("");
    }
  }, [tvPrice]);

  // Auto-fill logicalTimestamp from the TradingView status bar when empty.
  useEffect(() => {
    if (tvTimestamp) {
      setLogicalTimestamp((prev) => {
        if (prev === "" || logicalTimestampSourceRef.current === "tv") {
          logicalTimestampSourceRef.current = "tv";
          return tvTimestamp;
        }
        return prev;
      });
      return;
    }

    if (logicalTimestampSourceRef.current === "tv") {
      logicalTimestampSourceRef.current = "manual";
      setLogicalTimestamp("");
    }
  }, [tvTimestamp]);

  const loadDecisions = useCallback(async (sessionId: string) => {
    const res = await fetch(
      `${API_BASE}/api/sessions/${encodeURIComponent(sessionId)}/decisions`,
    );
    const body = (await res.json()) as ApiResponse<DecisionsData>;
    if (!res.ok || body.error) return;
    setDecisions(body.data?.decisions ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/sessions/active`);
        const body = (await res.json()) as ApiResponse<ActiveData>;
        if (cancelled) return;
        if (!res.ok || body.error) {
          setStatus("error");
          return;
        }

        const active = body.data?.session ?? null;
        setSession(active);

        if (active) {
          const assetsRes = await fetch(
            `${API_BASE}/api/sessions/${encodeURIComponent(active.id)}/assets`,
          );
          const assetsBody = (await assetsRes.json()) as ApiResponse<AssetsData>;
          if (cancelled) return;
          if (!assetsRes.ok || assetsBody.error) {
            setStatus("error");
            return;
          }
          setAssets(assetsBody.data?.assets ?? []);
          await loadDecisions(active.id);
          if (cancelled) return;
        } else {
          setAssets([]);
          setDecisions([]);
        }

        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadDecisions]);

  // Auto-link the TV-detected symbol to the session when not already linked
  useEffect(() => {
    if (status !== "ready" || !session || !tvSymbol) return;

    const normalized = tvSymbol.toUpperCase();
    if (lastLinkedSymbolRef.current === normalized) return;

    const existing = assets.find((a) => a.symbol.toUpperCase() === normalized);
    if (existing) {
      lastLinkedSymbolRef.current = normalized;
      setAssetId(existing.id);
      return;
    }

    // Symbol not yet linked — auto-link via the review API
    lastLinkedSymbolRef.current = normalized;
    setAutoLinking(true);

    void (async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/sessions/${encodeURIComponent(session.id)}/assets`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ symbol: normalized }),
          },
        );
        const body = (await res.json()) as ApiResponse<LinkAssetData>;
        if (!res.ok || body.error) return;
        const linked = body.data?.asset;
        if (linked) {
          setAssets((prev) =>
            prev.some((a) => a.id === linked.id) ? prev : [...prev, linked],
          );
          setAssetId(linked.id);
        }
      } catch {
        // Auto-link failed silently — fallback to manual selection
      } finally {
        setAutoLinking(false);
      }
    })();
  }, [session, tvSymbol, assets, status]);

  const SYMBOL_VALID_RE = /^[A-Za-z0-9][A-Za-z0-9:/._-]{0,31}$/;
  const tvAsset = tvSymbol
    ? assets.find((a) => a.symbol.toUpperCase() === tvSymbol.toUpperCase())
    : null;
  const tvCaptureReady = tvSymbol !== null && tvAsset !== null && !autoLinking;
  const captureSymbol = manualSymbol.trim() || tvSymbol?.trim() || "";
  const captureSymbolValid = SYMBOL_VALID_RE.test(captureSymbol);
  const effectivePrice = referencePrice.trim() || (tvCaptureReady ? (tvPrice ?? "") : "");

  const quantityValid =
    /^\d+(\.\d+)?$/.test(quantity.trim()) && Number(quantity) > 0;
  const priceValid =
    /^\d+(\.\d+)?$/.test(effectivePrice) && Number(effectivePrice) > 0;
  const amountsValid = quantityValid && priceValid;

  const trimmedTs = logicalTimestamp.trim();
  const logicalTimestampValid =
    trimmedTs === "" || ISO_DATETIME_RE.test(trimmedTs);
  // TV path: asset already resolved via auto-link
  const canCaptureTv = !busy && tvCaptureReady && amountsValid && logicalTimestampValid;

  // Fallback path: resolve or create the asset at capture time using the typed
  // symbol, or the detected TV symbol if the asset is visible but not yet linked.
  const canCaptureFallback =
    !busy && !autoLinking && captureSymbolValid && amountsValid && logicalTimestampValid;

  const capture = async (side: DecisionSide, isTvPath: boolean) => {
    if (!session) return;
    if (isTvPath ? !canCaptureTv : !canCaptureFallback) return;
    setBusy(true);
    setCaptureError(null);
    try {
      let resolvedAssetId = isTvPath ? (tvAsset?.id ?? "") : "";

      // Fallback path: resolve asset ID from the typed symbol (auto-link if needed)
      if (!isTvPath) {
        const normalized = captureSymbol.toUpperCase();
        const existing = assets.find((a) => a.symbol.toUpperCase() === normalized);
        if (existing) {
          resolvedAssetId = existing.id;
        } else {
          const linkRes = await fetch(
            `${API_BASE}/api/sessions/${encodeURIComponent(session.id)}/assets`,
            {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ symbol: normalized }),
            },
          );
          const linkBody = (await linkRes.json()) as ApiResponse<LinkAssetData>;
          if (!linkRes.ok || linkBody.error) {
            setCaptureError(linkBody.error?.message ?? "Impossible de lier l'actif.");
            return;
          }
          const linked = linkBody.data?.asset;
          if (linked) {
            setAssets((prev) =>
              prev.some((a) => a.id === linked.id) ? prev : [...prev, linked],
            );
            resolvedAssetId = linked.id;
          }
        }
      }

      const payload: Record<string, string> = {
        assetId: resolvedAssetId,
        side,
        quantity: quantity.trim(),
        referencePrice: effectivePrice,
      };
      if (trimmedTs && logicalTimestampValid) {
        payload.logicalTimestamp = trimmedTs;
      }

      const res = await fetch(
        `${API_BASE}/api/sessions/${encodeURIComponent(session.id)}/decisions`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = (await res.json()) as ApiResponse<CaptureDecisionData>;
      if (!res.ok || body.error) {
        setCaptureError(body.error?.message ?? "Echec de l'enregistrement.");
        return;
      }
      setQuantity("");
      if (!tvCaptureReady) setReferencePrice("");
      await loadDecisions(session.id);
    } catch {
      setCaptureError("Application de revue injoignable.");
    } finally {
      setBusy(false);
    }
  };

  // Detect which capture path to display
  const tvActive = tvSymbol !== null;

  return (
    <div style={{ width: 280, padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <h3 style={{ margin: "0 0 8px" }}>Training Trade</h3>
      {status === "loading" && <p>Chargement…</p>}
      {status === "error" && <p>Application de revue injoignable.</p>}
      {status === "ready" &&
        (session ? (
          <div>
            <p style={{ margin: "0 0 4px", color: "#5ad17a" }}>Session active</p>
            <p style={{ margin: 0, fontFamily: "monospace", fontSize: 12 }}>
              {session.id}
            </p>

            <p style={{ margin: "8px 0 4px", fontSize: 12, color: "#9aa0a6" }}>
              Nouvelle decision
            </p>

            {tvCaptureReady ? (
              // Nominal path — TradingView context detected
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div
                  style={{
                    padding: "6px 8px",
                    background: "#1e2630",
                    borderRadius: 4,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontFamily: "monospace", fontWeight: "bold", fontSize: 13 }}>
                    {tvSymbol}
                  </span>
                  {tvPrice && (
                    <span style={{ fontSize: 12, color: "#9aa0a6" }}>{tvPrice}</span>
                  )}
                </div>

                {tvDebug && (
                  <details style={{ fontSize: 10, color: "#9aa0a6" }}>
                    <summary style={{ cursor: "pointer" }}>Diagnostic detection</summary>
                    <pre
                      style={{
                        margin: "4px 0 0",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-all",
                        fontSize: 10,
                      }}
                    >
                      {Object.entries(tvDebug)
                        .map(([k, v]) => `${k}: ${v || "(vide)"}`)
                        .join("\n")}
                    </pre>
                  </details>
                )}

                {autoLinking ? (
                  <p style={{ margin: 0, fontSize: 12, color: "#9aa0a6" }}>
                    Liaison de l&apos;actif…
                  </p>
                ) : (
                  <>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={quantity}
                      onChange={(event) => setQuantity(event.target.value)}
                      placeholder="Quantite"
                      aria-label="Quantite"
                      style={{ fontSize: 12, padding: 4 }}
                    />
                    {!tvPrice && (
                      <input
                        type="text"
                        inputMode="decimal"
                        value={referencePrice}
                        onChange={(event) => {
                          referencePriceSourceRef.current = "manual";
                          setReferencePrice(event.target.value);
                        }}
                        placeholder="Prix"
                        aria-label="Prix de reference"
                        style={{ fontSize: 12, padding: 4 }}
                      />
                    )}
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => void capture("buy", true)}
                        disabled={!canCaptureTv}
                        style={{ flex: 1, fontSize: 12, padding: 4 }}
                      >
                        Acheter
                      </button>
                      <button
                        type="button"
                        onClick={() => void capture("sell", true)}
                        disabled={!canCaptureTv}
                        style={{ flex: 1, fontSize: 12, padding: 4 }}
                      >
                        Vendre
                      </button>
                    </div>
                  </>
                )}

                {captureError && (
                  <p style={{ margin: 0, fontSize: 11, color: "#ff8a80" }}>
                    {captureError}
                  </p>
                )}
              </div>
            ) : (
              // Fallback path — no TradingView context, manual symbol entry
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {tvActive && (
                  <>
                    <div
                      style={{
                        padding: "6px 8px",
                        background: "#1e2630",
                        borderRadius: 4,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontFamily: "monospace", fontWeight: "bold", fontSize: 13 }}>
                        {tvSymbol}
                      </span>
                      {tvPrice && (
                        <span style={{ fontSize: 12, color: "#9aa0a6" }}>{tvPrice}</span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: 11, color: "#e0b341" }}>
                      Actif TradingView detecte, mais la liaison n&apos;a pas encore abouti.
                    </p>
                  </>
                )}
                {onTradingView && tvDebug && (
                  <details style={{ fontSize: 10, color: "#9aa0a6" }}>
                    <summary style={{ cursor: "pointer" }}>Diagnostic detection</summary>
                    <pre
                      style={{
                        margin: "4px 0 0",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-all",
                        fontSize: 10,
                      }}
                    >
                      {Object.entries(tvDebug)
                        .map(([k, v]) => `${k}: ${v || "(vide)"}`)
                        .join("\n")}
                    </pre>
                  </details>
                )}
                <input
                  type="text"
                  value={manualSymbol}
                  onChange={(event) => setManualSymbol(event.target.value.toUpperCase())}
                  placeholder={tvSymbol ? `Actif detecte: ${tvSymbol}` : "Actif (ex: AAPL)"}
                  aria-label="Symbole de l'actif"
                  style={{ fontSize: 12, padding: 4 }}
                />
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                    placeholder="Quantite"
                    aria-label="Quantite"
                    style={{ width: "50%", fontSize: 12, padding: 4 }}
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    value={referencePrice}
                    onChange={(event) => {
                      referencePriceSourceRef.current = "manual";
                      setReferencePrice(event.target.value);
                    }}
                    placeholder="Prix"
                    aria-label="Prix de reference"
                    style={{ width: "50%", fontSize: 12, padding: 4 }}
                  />
                </div>
                <input
                  type="text"
                  value={logicalTimestamp}
                  onChange={(event) => {
                    logicalTimestampSourceRef.current = "manual";
                    setLogicalTimestamp(event.target.value);
                  }}
                  placeholder="Horodatage (ex: 2025-01-15T09:30:00Z)"
                  aria-label="Horodatage logique (optionnel)"
                  style={{
                    fontSize: 11,
                    padding: 4,
                    borderColor: !logicalTimestampValid ? "#ff8a80" : undefined,
                  }}
                />
                {!logicalTimestampValid && (
                  <p style={{ margin: 0, fontSize: 11, color: "#ff8a80" }}>
                    Format invalide. Ex&nbsp;: 2025-01-15T09:30:00Z
                  </p>
                )}
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => void capture("buy", false)}
                    disabled={!canCaptureFallback}
                    style={{ flex: 1, fontSize: 12, padding: 4 }}
                  >
                    Acheter
                  </button>
                  <button
                    type="button"
                    onClick={() => void capture("sell", false)}
                    disabled={!canCaptureFallback}
                    style={{ flex: 1, fontSize: 12, padding: 4 }}
                  >
                    Vendre
                  </button>
                </div>
                {captureError && (
                  <p style={{ margin: 0, fontSize: 11, color: "#ff8a80" }}>
                    {captureError}
                  </p>
                )}
              </div>
            )}

            <p style={{ margin: "8px 0 4px", fontSize: 12, color: "#9aa0a6" }}>
              Decisions recentes
            </p>
            {decisions.length === 0 ? (
              <p style={{ margin: 0, fontSize: 12 }}>Aucune decision.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12 }}>
                {decisions.map((decision) => (
                  <li key={decision.id}>
                    <span style={{ fontFamily: "monospace" }}>
                      {decision.side === "buy" ? "Achat" : "Vente"}
                    </span>{" "}
                    {decision.quantity} @ {decision.referencePrice}
                    {" — "}
                    <span style={{ color: "#9aa0a6", fontSize: 11 }}>
                      {formatLogicalTime(decision.logicalTimestamp)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p>Aucune session active.</p>
        ))}
    </div>
  );
}

export default Popup;
