"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ApiResponse,
  Decision,
  DecisionSide,
  Session,
  SessionContext,
  TrackedAsset,
} from "@training-trade/shared";

type ActiveData = { session: SessionContext | null };
type SessionData = { session: Session };
type AssetsData = { assets: TrackedAsset[] };
type AddAssetData = { asset: TrackedAsset };
type DecisionsData = { decisions: Decision[] };
type CaptureDecisionData = { decision: Decision };

async function readEnvelope<T>(response: Response): Promise<ApiResponse<T>> {
  return (await response.json()) as ApiResponse<T>;
}

function toActiveContext(session: Session): SessionContext {
  return {
    id: session.id,
    status: session.status,
    openedAt: session.openedAt,
    canReceiveDecisions: session.canReceiveDecisions,
  };
}

export function SessionPanel() {
  const [active, setActive] = useState<SessionContext | null>(null);
  const [closed, setClosed] = useState<Session | null>(null);
  const [resumeId, setResumeId] = useState("");
  const [assets, setAssets] = useState<TrackedAsset[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const displayedIdRef = useRef<string | null>(null);
  const [symbolInput, setSymbolInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The session whose assets + decisions are currently on screen. Decisions
  // stay consultable after close, so the closed card reads from the same id.
  const displayedId = active?.id ?? closed?.id ?? null;

  const refreshActive = useCallback(
    async ({ clearError = true }: { clearError?: boolean } = {}) => {
      setLoading(true);
      if (clearError) {
        setError(null);
      }
      try {
        const res = await fetch("/api/sessions/active", { cache: "no-store" });
        const body = await readEnvelope<ActiveData>(res);
        setActive(body.data?.session ?? null);
      } catch {
        setError("Impossible de charger la session active.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void refreshActive();
  }, [refreshActive]);

  const refreshAssets = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(
        `/api/sessions/${encodeURIComponent(sessionId)}/assets`,
        { cache: "no-store" },
      );
      const body = await readEnvelope<AssetsData>(res);
      if (displayedIdRef.current !== sessionId) {
        return;
      }
      if (!res.ok || body.error) {
        setError(body.error?.message ?? "Impossible de charger les actifs.");
        return;
      }
      setAssets(body.data?.assets ?? []);
    } catch {
      if (displayedIdRef.current === sessionId) {
        setError("Impossible de charger les actifs.");
      }
    }
  }, []);

  const refreshDecisions = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(
        `/api/sessions/${encodeURIComponent(sessionId)}/decisions`,
        { cache: "no-store" },
      );
      const body = await readEnvelope<DecisionsData>(res);
      if (displayedIdRef.current !== sessionId) {
        return;
      }
      if (!res.ok || body.error) {
        setError(body.error?.message ?? "Impossible de charger les decisions.");
        return;
      }
      setDecisions(body.data?.decisions ?? []);
    } catch {
      if (displayedIdRef.current === sessionId) {
        setError("Impossible de charger les decisions.");
      }
    }
  }, []);

  // Load (or clear) the assets + decisions whenever the displayed session
  // changes. Both stay consultable for a closed session, so this is keyed on
  // the displayed id (active or just-closed), not on the active id alone.
  useEffect(() => {
    displayedIdRef.current = displayedId;
    if (displayedId) {
      void refreshAssets(displayedId);
      void refreshDecisions(displayedId);
    } else {
      setAssets([]);
      setDecisions([]);
    }
  }, [displayedId, refreshAssets, refreshDecisions]);

  const addAsset = useCallback(async () => {
    if (!active) return;
    const symbol = symbolInput.trim();
    if (!symbol) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/sessions/${encodeURIComponent(active.id)}/assets`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ symbol }),
        },
      );
      const body = await readEnvelope<AddAssetData>(res);
      if (body.error) {
        // Keep the active session and the list untouched; only surface the error.
        setError(body.error.message);
        return;
      }
      setSymbolInput("");
      await refreshAssets(active.id);
    } catch {
      setError("Impossible d'ajouter l'actif.");
    } finally {
      setBusy(false);
    }
  }, [active, symbolInput, refreshAssets]);

  const captureDecision = useCallback(
    async (input: {
      assetId: string;
      side: DecisionSide;
      quantity: string;
      referencePrice: string;
    }): Promise<boolean> => {
      if (!active) return false;
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/sessions/${encodeURIComponent(active.id)}/decisions`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(input),
          },
        );
        const body = await readEnvelope<CaptureDecisionData>(res);
        if (body.error) {
          // Keep the session and history untouched; only surface the error.
          setError(body.error.message);
          return false;
        }
        await refreshDecisions(active.id);
        return true;
      } catch {
        setError("Impossible d'enregistrer la decision.");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [active, refreshDecisions],
  );

  const createSession = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions", { method: "POST" });
      const body = await readEnvelope<SessionData>(res);
      if (body.error) {
        const message = body.error.message;
        await refreshActive({ clearError: false });
        setError(message);
        return;
      }
      const created = body.data?.session;
      if (created) {
        setClosed(null);
        setActive(toActiveContext(created));
      }
    } catch {
      setError("Impossible de creer la session.");
    } finally {
      setBusy(false);
    }
  }, [refreshActive]);

  const closeActiveSession = useCallback(async () => {
    if (!active) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/sessions/${encodeURIComponent(active.id)}/close`,
        { method: "POST" },
      );
      const body = await readEnvelope<SessionData>(res);
      if (body.error) {
        const message = body.error.message;
        await refreshActive({ clearError: false });
        setError(message);
        return;
      }
      setActive(null);
      setClosed(body.data?.session ?? null);
    } catch {
      setError("Impossible de cloturer la session.");
    } finally {
      setBusy(false);
    }
  }, [active, refreshActive]);

  const resumeSession = useCallback(async () => {
    const id = resumeId.trim();
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${encodeURIComponent(id)}/resume`, {
        method: "POST",
      });
      const body = await readEnvelope<SessionData>(res);
      if (body.error) {
        const message = body.error.message;
        await refreshActive({ clearError: false });
        setError(message);
        return;
      }
      const resumed = body.data?.session;
      if (resumed) {
        setClosed(null);
        setResumeId("");
        setActive(toActiveContext(resumed));
      }
    } catch {
      setError("Impossible de reprendre la session.");
    } finally {
      setBusy(false);
    }
  }, [resumeId, refreshActive]);

  return (
    <section style={{ marginTop: 24 }}>
      <button
        type="button"
        onClick={() => void createSession()}
        disabled={busy || active !== null}
        style={primaryButtonStyle(active !== null, busy)}
      >
        {busy ? "Patientez…" : "Creer et ouvrir une session"}
      </button>

      {error && (
        <p role="alert" style={{ color: "#ff8a80", marginTop: 16 }}>
          {error}
        </p>
      )}

      <div style={{ marginTop: 24 }}>
        {loading ? (
          <p style={{ color: "#9aa0a6" }}>Chargement…</p>
        ) : active ? (
          <ActiveSessionCard
            session={active}
            assets={assets}
            decisions={decisions}
            symbolInput={symbolInput}
            onSymbolChange={setSymbolInput}
            onAddAsset={() => void addAsset()}
            onCapture={captureDecision}
            onClose={() => void closeActiveSession()}
            disabled={busy}
          />
        ) : closed ? (
          <ClosedSessionCard session={closed} assets={assets} decisions={decisions} />
        ) : (
          <p style={{ color: "#9aa0a6" }}>
            Aucune session active. Cree-en une pour commencer.
          </p>
        )}
      </div>

      <ResumeBox
        value={resumeId}
        onChange={setResumeId}
        onResume={() => void resumeSession()}
        disabled={busy || active !== null}
      />
    </section>
  );
}

function primaryButtonStyle(
  disabledLook: boolean,
  busy: boolean,
): React.CSSProperties {
  return {
    padding: "12px 20px",
    fontSize: 16,
    fontWeight: 600,
    color: "#0f1115",
    background: disabledLook ? "#3a3f47" : "#5ad17a",
    border: "none",
    borderRadius: 8,
    cursor: busy || disabledLook ? "not-allowed" : "pointer",
  };
}

const cardStyle: React.CSSProperties = {
  border: "1px solid #2a2f37",
  borderRadius: 10,
  padding: 20,
  background: "#161a21",
};

const dlStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "auto 1fr",
  gap: "8px 16px",
  margin: 0,
};

function ActiveSessionCard({
  session,
  assets,
  decisions,
  symbolInput,
  onSymbolChange,
  onAddAsset,
  onCapture,
  onClose,
  disabled,
}: {
  session: SessionContext;
  assets: TrackedAsset[];
  decisions: Decision[];
  symbolInput: string;
  onSymbolChange: (next: string) => void;
  onAddAsset: () => void;
  onCapture: (input: {
    assetId: string;
    side: DecisionSide;
    quantity: string;
    referencePrice: string;
  }) => Promise<boolean>;
  onClose: () => void;
  disabled: boolean;
}) {
  return (
    <div style={cardStyle}>
      <h2 style={{ marginTop: 0, fontSize: 18 }}>Session active</h2>
      <dl style={dlStyle}>
        <dt style={{ color: "#9aa0a6" }}>Identifiant</dt>
        <dd style={{ margin: 0, fontFamily: "monospace" }}>{session.id}</dd>
        <dt style={{ color: "#9aa0a6" }}>Statut</dt>
        <dd style={{ margin: 0 }}>{session.status}</dd>
        <dt style={{ color: "#9aa0a6" }}>Ouverte le</dt>
        <dd style={{ margin: 0 }}>{session.openedAt}</dd>
        <dt style={{ color: "#9aa0a6" }}>Decisions</dt>
        <dd style={{ margin: 0 }}>
          {session.canReceiveDecisions
            ? "Prete a recevoir des decisions"
            : "Indisponible"}
        </dd>
      </dl>

      <SessionAssets
        assets={assets}
        symbolInput={symbolInput}
        onSymbolChange={onSymbolChange}
        onAddAsset={onAddAsset}
        disabled={disabled}
      />

      <DecisionCapture assets={assets} onCapture={onCapture} disabled={disabled} />

      <DecisionHistory decisions={decisions} assets={assets} />

      <button
        type="button"
        onClick={onClose}
        disabled={disabled}
        style={{
          marginTop: 16,
          padding: "10px 16px",
          fontSize: 14,
          fontWeight: 600,
          color: "#0f1115",
          background: "#ffb86b",
          border: "none",
          borderRadius: 8,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        Cloturer la session
      </button>
    </div>
  );
}

function SessionAssets({
  assets,
  symbolInput,
  onSymbolChange,
  onAddAsset,
  disabled,
}: {
  assets: TrackedAsset[];
  symbolInput: string;
  onSymbolChange: (next: string) => void;
  onAddAsset: () => void;
  disabled: boolean;
}) {
  const canAdd = !disabled && symbolInput.trim().length > 0;
  return (
    <div style={{ marginTop: 20, borderTop: "1px solid #2a2f37", paddingTop: 16 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "#9aa0a6" }}>
        Actifs suivis
      </h3>

      {assets.length === 0 ? (
        <p style={{ margin: "0 0 12px", color: "#9aa0a6", fontSize: 13 }}>
          Aucun actif associe pour le moment.
        </p>
      ) : (
        <ul
          style={{
            listStyle: "none",
            margin: "0 0 12px",
            padding: 0,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {assets.map((asset) => (
            <li
              key={asset.id}
              title={asset.name ?? asset.symbol}
              style={{
                padding: "4px 10px",
                fontSize: 13,
                fontFamily: "monospace",
                color: "#e6e8eb",
                background: "#0f1115",
                border: "1px solid #2a2f37",
                borderRadius: 999,
              }}
            >
              {asset.symbol}
              {asset.name ? (
                <span style={{ color: "#9aa0a6", fontFamily: "system-ui" }}>
                  {" "}
                  · {asset.name}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (canAdd) onAddAsset();
        }}
        style={{ display: "flex", gap: 8 }}
      >
        <input
          type="text"
          value={symbolInput}
          onChange={(event) => onSymbolChange(event.target.value)}
          placeholder="Symbole (ex: NASDAQ:AAPL)"
          aria-label="Symbole de l'actif a suivre"
          style={{
            flex: 1,
            padding: "8px 12px",
            fontSize: 14,
            color: "#e6e8eb",
            background: "#0f1115",
            border: "1px solid #2a2f37",
            borderRadius: 8,
          }}
        />
        <button
          type="submit"
          disabled={!canAdd}
          style={{
            padding: "8px 16px",
            fontSize: 14,
            fontWeight: 600,
            color: "#0f1115",
            background: canAdd ? "#5ad17a" : "#3a3f47",
            border: "none",
            borderRadius: 8,
            cursor: canAdd ? "pointer" : "not-allowed",
          }}
        >
          Ajouter
        </button>
      </form>
    </div>
  );
}

const decimalInputStyle: React.CSSProperties = {
  width: 90,
  padding: "8px 12px",
  fontSize: 14,
  color: "#e6e8eb",
  background: "#0f1115",
  border: "1px solid #2a2f37",
  borderRadius: 8,
};

function sideButtonStyle(
  side: DecisionSide,
  enabled: boolean,
): React.CSSProperties {
  const accent = side === "buy" ? "#5ad17a" : "#ff8a80";
  return {
    padding: "8px 16px",
    fontSize: 14,
    fontWeight: 600,
    color: "#0f1115",
    background: enabled ? accent : "#3a3f47",
    border: "none",
    borderRadius: 8,
    cursor: enabled ? "pointer" : "not-allowed",
  };
}

function DecisionCapture({
  assets,
  onCapture,
  disabled,
}: {
  assets: TrackedAsset[];
  onCapture: (input: {
    assetId: string;
    side: DecisionSide;
    quantity: string;
    referencePrice: string;
  }) => Promise<boolean>;
  disabled: boolean;
}) {
  const [assetId, setAssetId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [referencePrice, setReferencePrice] = useState("");

  // Default the selector to the first available asset so capture is one click
  // away once an asset is linked.
  const effectiveAssetId =
    assetId && assets.some((a) => a.id === assetId)
      ? assetId
      : (assets[0]?.id ?? "");

  const amountsValid =
    /^\d+(\.\d+)?$/.test(quantity.trim()) &&
    Number(quantity) > 0 &&
    /^\d+(\.\d+)?$/.test(referencePrice.trim()) &&
    Number(referencePrice) > 0;
  const canCapture = !disabled && effectiveAssetId !== "" && amountsValid;

  const submit = async (side: DecisionSide) => {
    if (!canCapture) return;
    const ok = await onCapture({
      assetId: effectiveAssetId,
      side,
      quantity: quantity.trim(),
      referencePrice: referencePrice.trim(),
    });
    if (ok) {
      setQuantity("");
      setReferencePrice("");
    }
  };

  return (
    <div style={{ marginTop: 20, borderTop: "1px solid #2a2f37", paddingTop: 16 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "#9aa0a6" }}>
        Nouvelle decision
      </h3>

      {assets.length === 0 ? (
        <p style={{ margin: 0, color: "#9aa0a6", fontSize: 13 }}>
          Associez d&apos;abord un actif pour enregistrer une decision.
        </p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <select
            value={effectiveAssetId}
            onChange={(event) => setAssetId(event.target.value)}
            aria-label="Actif de la decision"
            style={{
              padding: "8px 12px",
              fontSize: 14,
              color: "#e6e8eb",
              background: "#0f1115",
              border: "1px solid #2a2f37",
              borderRadius: 8,
            }}
          >
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.symbol}
              </option>
            ))}
          </select>
          <input
            type="text"
            inputMode="decimal"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            placeholder="Quantite"
            aria-label="Quantite"
            style={decimalInputStyle}
          />
          <input
            type="text"
            inputMode="decimal"
            value={referencePrice}
            onChange={(event) => setReferencePrice(event.target.value)}
            placeholder="Prix"
            aria-label="Prix de reference"
            style={decimalInputStyle}
          />
          <button
            type="button"
            onClick={() => void submit("buy")}
            disabled={!canCapture}
            style={sideButtonStyle("buy", canCapture)}
          >
            Acheter
          </button>
          <button
            type="button"
            onClick={() => void submit("sell")}
            disabled={!canCapture}
            style={sideButtonStyle("sell", canCapture)}
          >
            Vendre
          </button>
        </div>
      )}
    </div>
  );
}

function DecisionHistory({
  decisions,
  assets,
}: {
  decisions: Decision[];
  assets: TrackedAsset[];
}) {
  const symbolOf = (assetId: string) =>
    assets.find((asset) => asset.id === assetId)?.symbol ?? assetId;

  return (
    <div style={{ marginTop: 20, borderTop: "1px solid #2a2f37", paddingTop: 16 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "#9aa0a6" }}>
        Historique des decisions
      </h3>

      {decisions.length === 0 ? (
        <p style={{ margin: 0, color: "#9aa0a6", fontSize: 13 }}>
          Aucune decision enregistree pour le moment.
        </p>
      ) : (
        <ol
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {decisions.map((decision) => (
            <li
              key={decision.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "6px 10px",
                fontSize: 13,
                background: "#0f1115",
                border: "1px solid #2a2f37",
                borderRadius: 8,
              }}
            >
              <span
                style={{
                  minWidth: 52,
                  textAlign: "center",
                  fontWeight: 600,
                  color: "#0f1115",
                  background: decision.side === "buy" ? "#5ad17a" : "#ff8a80",
                  borderRadius: 999,
                  padding: "2px 8px",
                }}
              >
                {decision.side === "buy" ? "Achat" : "Vente"}
              </span>
              <span style={{ fontFamily: "monospace", color: "#e6e8eb" }}>
                {symbolOf(decision.assetId)}
              </span>
              <span style={{ color: "#9aa0a6" }}>
                {decision.quantity} @ {decision.referencePrice}
              </span>
              <span
                style={{ marginLeft: "auto", color: "#5f6671", fontSize: 12 }}
                title={`Enregistre: ${decision.createdAt}`}
              >
                {decision.logicalTimestamp}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function ClosedSessionCard({
  session,
  assets,
  decisions,
}: {
  session: Session;
  assets: TrackedAsset[];
  decisions: Decision[];
}) {
  return (
    <div style={cardStyle}>
      <h2 style={{ marginTop: 0, fontSize: 18 }}>Session cloturee</h2>
      <dl style={dlStyle}>
        <dt style={{ color: "#9aa0a6" }}>Identifiant</dt>
        <dd style={{ margin: 0, fontFamily: "monospace" }}>{session.id}</dd>
        <dt style={{ color: "#9aa0a6" }}>Statut</dt>
        <dd style={{ margin: 0 }}>{session.status}</dd>
        <dt style={{ color: "#9aa0a6" }}>Cloturee le</dt>
        <dd style={{ margin: 0 }}>{session.closedAt ?? "—"}</dd>
        <dt style={{ color: "#9aa0a6" }}>Nouvelle decision</dt>
        <dd style={{ margin: 0 }}>Indisponible (session cloturee)</dd>
      </dl>

      {/* History stays consultable after close (AC 2). */}
      <DecisionHistory decisions={decisions} assets={assets} />
    </div>
  );
}

function ResumeBox({
  value,
  onChange,
  onResume,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  onResume: () => void;
  disabled: boolean;
}) {
  return (
    <div style={{ marginTop: 24, display: "flex", gap: 8 }}>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Identifiant de session a reprendre"
        aria-label="Identifiant de session a reprendre"
        style={{
          flex: 1,
          padding: "10px 12px",
          fontSize: 14,
          color: "#e6e8eb",
          background: "#0f1115",
          border: "1px solid #2a2f37",
          borderRadius: 8,
        }}
      />
      <button
        type="button"
        onClick={onResume}
        disabled={disabled || value.trim().length === 0}
        style={{
          padding: "10px 16px",
          fontSize: 14,
          fontWeight: 600,
          color: "#0f1115",
          background:
            disabled || value.trim().length === 0 ? "#3a3f47" : "#5ad17a",
          border: "none",
          borderRadius: 8,
          cursor:
            disabled || value.trim().length === 0 ? "not-allowed" : "pointer",
        }}
      >
        Reprendre
      </button>
    </div>
  );
}
