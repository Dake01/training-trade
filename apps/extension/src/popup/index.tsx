import { useCallback, useEffect, useState } from "react";
import type {
  ApiResponse,
  Decision,
  DecisionSide,
  SessionContext,
  TrackedAsset,
} from "@training-trade/shared";

/**
 * Light popup entry point. It only talks to the review app's API (active
 * session, its tracked assets, and decision capture/replay) and never touches
 * packages/db directly. No automatic TradingView integration in V1. Configure
 * the API base via the `PLASMO_PUBLIC_API_BASE` env var.
 */
const API_BASE = process.env.PLASMO_PUBLIC_API_BASE ?? "http://localhost:3000";

type ActiveData = { session: SessionContext | null };
type AssetsData = { assets: TrackedAsset[] };
type DecisionsData = { decisions: Decision[] };
type CaptureDecisionData = { decision: Decision };

function Popup() {
  const [session, setSession] = useState<SessionContext | null>(null);
  const [assets, setAssets] = useState<TrackedAsset[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [busy, setBusy] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);

  const [assetId, setAssetId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [referencePrice, setReferencePrice] = useState("");

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

  const effectiveAssetId =
    assetId && assets.some((a) => a.id === assetId)
      ? assetId
      : (assets[0]?.id ?? "");

  const amountsValid =
    /^\d+(\.\d+)?$/.test(quantity.trim()) &&
    Number(quantity) > 0 &&
    /^\d+(\.\d+)?$/.test(referencePrice.trim()) &&
    Number(referencePrice) > 0;
  const canCapture = !busy && effectiveAssetId !== "" && amountsValid;

  const capture = async (side: DecisionSide) => {
    if (!session || !canCapture) return;
    setBusy(true);
    setCaptureError(null);
    try {
      const res = await fetch(
        `${API_BASE}/api/sessions/${encodeURIComponent(session.id)}/decisions`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            assetId: effectiveAssetId,
            side,
            quantity: quantity.trim(),
            referencePrice: referencePrice.trim(),
          }),
        },
      );
      const body = (await res.json()) as ApiResponse<CaptureDecisionData>;
      if (!res.ok || body.error) {
        setCaptureError(body.error?.message ?? "Echec de l'enregistrement.");
        return;
      }
      setQuantity("");
      setReferencePrice("");
      await loadDecisions(session.id);
    } catch {
      setCaptureError("Application de revue injoignable.");
    } finally {
      setBusy(false);
    }
  };

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
            {assets.length === 0 ? (
              <p style={{ margin: 0, fontSize: 12 }}>
                Aucun actif associe. Ajoutez-en un dans l&apos;app de revue.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <select
                  value={effectiveAssetId}
                  onChange={(event) => setAssetId(event.target.value)}
                  aria-label="Actif de la decision"
                  style={{ fontSize: 12, padding: 4 }}
                >
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.symbol}
                    </option>
                  ))}
                </select>
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
                    onChange={(event) => setReferencePrice(event.target.value)}
                    placeholder="Prix"
                    aria-label="Prix de reference"
                    style={{ width: "50%", fontSize: 12, padding: 4 }}
                  />
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => void capture("buy")}
                    disabled={!canCapture}
                    style={{ flex: 1, fontSize: 12, padding: 4 }}
                  >
                    Acheter
                  </button>
                  <button
                    type="button"
                    onClick={() => void capture("sell")}
                    disabled={!canCapture}
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
