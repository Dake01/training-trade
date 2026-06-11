"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AmendDecisionRequest,
  ApiResponse,
  Decision,
  DecisionSide,
  Portfolio,
  PortfolioHistory,
  PortfolioPerformance,
  PortfolioStats,
  Session,
  SessionContext,
  TrackedAsset,
  DecisionTimelineEntry,
} from "@training-trade/shared";

type ActiveData = { session: SessionContext | null };
type SessionData = { session: Session };
type AssetsData = { assets: TrackedAsset[] };
type AddAssetData = { asset: TrackedAsset };
type DecisionsData = { decisions: Decision[]; timeline?: DecisionTimelineEntry[] };
type CaptureDecisionData = { decision: Decision };
type PortfolioData = { portfolio: Portfolio };
type PortfolioHistoryData = { history: PortfolioHistory };
type PortfolioPerformanceData = { performance: PortfolioPerformance };
type PortfolioStatsData = { stats: PortfolioStats };

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
  const [timeline, setTimeline] = useState<DecisionTimelineEntry[] | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [history, setHistory] = useState<PortfolioHistory | null>(null);
  const [performance, setPerformance] = useState<PortfolioPerformance | null>(null);
  const [stats, setStats] = useState<PortfolioStats | null>(null);
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

  const refreshPortfolio = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(
        `/api/sessions/${encodeURIComponent(sessionId)}/portfolio`,
        { cache: "no-store" },
      );
      const body = await readEnvelope<PortfolioData>(res);
      if (displayedIdRef.current !== sessionId) return;
      if (!res.ok || body.error) return;
      setPortfolio(body.data?.portfolio ?? null);
    } catch {
      // Portfolio summary is non-blocking — don't surface an error here.
    }
  }, []);

  const refreshHistory = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(
        `/api/sessions/${encodeURIComponent(sessionId)}/portfolio/history`,
        { cache: "no-store" },
      );
      const body = await readEnvelope<PortfolioHistoryData>(res);
      if (displayedIdRef.current !== sessionId) return;
      if (!res.ok || body.error) return;
      setHistory(body.data?.history ?? null);
    } catch {
      // Portfolio history is non-blocking — the current summary remains useful.
    }
  }, []);

  const refreshPerformance = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(
        `/api/sessions/${encodeURIComponent(sessionId)}/portfolio/performance`,
        { cache: "no-store" },
      );
      const body = await readEnvelope<PortfolioPerformanceData>(res);
      if (displayedIdRef.current !== sessionId) return;
      if (!res.ok || body.error) return;
      setPerformance(body.data?.performance ?? null);
    } catch {
      // Performance view is non-blocking; history remains the source of truth.
    }
  }, []);

  const refreshStats = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(
        `/api/sessions/${encodeURIComponent(sessionId)}/stats`,
        { cache: "no-store" },
      );
      const body = await readEnvelope<PortfolioStatsData>(res);
      if (displayedIdRef.current !== sessionId) return;
      if (!res.ok || body.error) return;
      setStats(body.data?.stats ?? null);
    } catch {
      // Stats are non-blocking; portfolio and performance remain visible.
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
      setTimeline(body.data?.timeline ?? null);
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
      void refreshPortfolio(displayedId);
      void refreshHistory(displayedId);
      void refreshPerformance(displayedId);
      void refreshStats(displayedId);
    } else {
      setAssets([]);
      setDecisions([]);
      setTimeline(null);
      setPortfolio(null);
      setHistory(null);
      setPerformance(null);
      setStats(null);
    }
  }, [displayedId, refreshAssets, refreshDecisions, refreshPortfolio, refreshHistory, refreshPerformance, refreshStats]);

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
        await Promise.all([
          refreshDecisions(active.id),
          refreshPortfolio(active.id),
          refreshHistory(active.id),
          refreshPerformance(active.id),
          refreshStats(active.id),
        ]);
        return true;
      } catch {
        setError("Impossible d'enregistrer la decision.");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [active, refreshDecisions, refreshPortfolio, refreshHistory, refreshPerformance, refreshStats],
  );

  const amendDecision = useCallback(
    async (
      decisionId: string,
      payload: AmendDecisionRequest,
    ): Promise<boolean> => {
      if (!active) return false;
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/sessions/${encodeURIComponent(active.id)}/decisions/${encodeURIComponent(
            decisionId,
          )}/amendments`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        const body = await readEnvelope<CaptureDecisionData>(res);
        if (body.error) {
          // Keep the history untouched; only surface the error.
          setError(body.error.message);
          return false;
        }
        await Promise.all([
          refreshDecisions(active.id),
          refreshPortfolio(active.id),
          refreshHistory(active.id),
          refreshPerformance(active.id),
          refreshStats(active.id),
        ]);
        return true;
      } catch {
        setError("Impossible de modifier la decision.");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [active, refreshDecisions, refreshPortfolio, refreshHistory, refreshPerformance, refreshStats],
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
            portfolio={portfolio}
            history={history}
            performance={performance}
            stats={stats}
            assets={assets}
            decisions={decisions}
            timeline={timeline}
            symbolInput={symbolInput}
            onSymbolChange={setSymbolInput}
            onAddAsset={() => void addAsset()}
            onCapture={captureDecision}
            onAmend={amendDecision}
            onClose={() => void closeActiveSession()}
            disabled={busy}
          />
        ) : closed ? (
          <ClosedSessionCard
            session={closed}
            portfolio={portfolio}
            history={history}
            performance={performance}
            stats={stats}
            assets={assets}
            decisions={decisions}
            timeline={timeline}
          />
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
  portfolio,
  history,
  performance,
  stats,
  assets,
  decisions,
  timeline,
  symbolInput,
  onSymbolChange,
  onAddAsset,
  onCapture,
  onAmend,
  onClose,
  disabled,
}: {
  session: SessionContext;
  portfolio: Portfolio | null;
  history: PortfolioHistory | null;
  performance: PortfolioPerformance | null;
  stats: PortfolioStats | null;
  assets: TrackedAsset[];
  decisions: Decision[];
  timeline: DecisionTimelineEntry[] | null;
  symbolInput: string;
  onSymbolChange: (next: string) => void;
  onAddAsset: () => void;
  onCapture: (input: {
    assetId: string;
    side: DecisionSide;
    quantity: string;
    referencePrice: string;
  }) => Promise<boolean>;
  onAmend: (
    decisionId: string,
    payload: AmendDecisionRequest,
  ) => Promise<boolean>;
  onClose: () => void;
  disabled: boolean;
}) {
  return (
    <div style={cardStyle}>
      <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid #2a2f37" }}>
        <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 18 }}>Session active</h2>
        <dl style={{ ...dlStyle, fontSize: 13 }}>
          <dt style={{ color: "#9aa0a6" }}>Identifiant</dt>
          <dd style={{ margin: 0, fontFamily: "monospace", fontSize: 12 }}>{session.id}</dd>
          <dt style={{ color: "#9aa0a6" }}>Ouverte le</dt>
          <dd style={{ margin: 0, fontSize: 12 }}>{formatSimpleTime(session.openedAt)}</dd>
        </dl>
      </div>

      <div style={{ marginBottom: 24 }}>
        {portfolio && <PortfolioSummary portfolio={portfolio} />}
        {performance && <PortfolioPerformanceChart performance={performance} />}
        {stats && <PortfolioStatsSummary stats={stats} />}
      </div>

      <DecisionHistory
        decisions={decisions}
        timeline={timeline}
        assets={assets}
        onAmend={onAmend}
        disabled={disabled}
      />

      <div
        style={{
          marginTop: 24,
          paddingTop: 20,
          borderTop: "1px solid #2a2f37",
          display: "grid",
          gap: 16,
        }}
      >
        <SessionAssets
          assets={assets}
          symbolInput={symbolInput}
          onSymbolChange={onSymbolChange}
          onAddAsset={onAddAsset}
          disabled={disabled}
        />

        <DecisionCapture assets={assets} onCapture={onCapture} disabled={disabled} />

        <button
          type="button"
          onClick={onClose}
          disabled={disabled}
          style={{
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
    <div style={{ paddingTop: 0 }}>
      <div style={{ marginBottom: 10 }}>
        <h3 style={{ margin: "0 0 6px", fontSize: 13, color: "#7a8087" }}>
          Actifs suivis
        </h3>
        {assets.length === 0 ? (
          <p style={{ margin: 0, color: "#5f6671", fontSize: 12 }}>
            Aucun actif associe pour le moment.
          </p>
        ) : (
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
            }}
          >
            {assets.map((asset) => (
              <li
                key={asset.id}
                title={asset.name ?? asset.symbol}
                style={{
                  padding: "3px 8px",
                  fontSize: 12,
                  fontFamily: "monospace",
                  color: "#c2c7cf",
                  background: "#161a21",
                  border: "1px solid #2a2f37",
                  borderRadius: 999,
                }}
              >
                {asset.symbol}
              </li>
            ))}
          </ul>
        )}
      </div>

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
            fontSize: 13,
            color: "#e6e8eb",
            background: "#161a21",
            border: "1px solid #2a2f37",
            borderRadius: 6,
          }}
        />
        <button
          type="submit"
          disabled={!canAdd}
          style={{
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 600,
            color: "#0f1115",
            background: canAdd ? "#5ad17a" : "#3a3f47",
            border: "none",
            borderRadius: 6,
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
    <div style={{ paddingTop: 0 }}>
      <h3 style={{ margin: "0 0 10px", fontSize: 13, color: "#7a8087" }}>
        Capturer une decision
      </h3>

      {assets.length === 0 ? (
        <p style={{ margin: 0, color: "#5f6671", fontSize: 12 }}>
          Associez d&apos;abord un actif pour enregistrer une decision.
        </p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <select
            value={effectiveAssetId}
            onChange={(event) => setAssetId(event.target.value)}
            aria-label="Actif de la decision"
            style={{
              padding: "8px 10px",
              fontSize: 13,
              color: "#e6e8eb",
              background: "#161a21",
              border: "1px solid #2a2f37",
              borderRadius: 6,
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
            placeholder="Qte"
            aria-label="Quantite"
            style={{
              width: 70,
              padding: "8px 10px",
              fontSize: 13,
              color: "#e6e8eb",
              background: "#161a21",
              border: "1px solid #2a2f37",
              borderRadius: 6,
            }}
          />
          <input
            type="text"
            inputMode="decimal"
            value={referencePrice}
            onChange={(event) => setReferencePrice(event.target.value)}
            placeholder="Prix"
            aria-label="Prix de reference"
            style={{
              width: 70,
              padding: "8px 10px",
              fontSize: 13,
              color: "#e6e8eb",
              background: "#161a21",
              border: "1px solid #2a2f37",
              borderRadius: 6,
            }}
          />
          <button
            type="button"
            onClick={() => void submit("buy")}
            disabled={!canCapture}
            style={{
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 600,
              color: "#0f1115",
              background: canCapture ? "#5ad17a" : "#3a3f47",
              border: "none",
              borderRadius: 6,
              cursor: canCapture ? "pointer" : "not-allowed",
            }}
          >
            Acheter
          </button>
          <button
            type="button"
            onClick={() => void submit("sell")}
            disabled={!canCapture}
            style={{
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 600,
              color: "#0f1115",
              background: canCapture ? "#ff8a80" : "#3a3f47",
              border: "none",
              borderRadius: 6,
              cursor: canCapture ? "pointer" : "not-allowed",
            }}
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
  timeline,
  assets,
  onAmend,
  disabled = false,
}: {
  decisions: Decision[];
  timeline: DecisionTimelineEntry[] | null;
  assets: TrackedAsset[];
  /** When provided, the history exposes comment/correct/cancel affordances. */
  onAmend?: (
    decisionId: string,
    payload: AmendDecisionRequest,
  ) => Promise<boolean>;
  disabled?: boolean;
}) {
  const symbolOf = (assetId: string) =>
    assets.find((asset) => asset.id === assetId)?.symbol ?? assetId;
  const entries = timeline ?? decisions.map((decision) => ({ decision, amendments: [] }));

  return (
    <div style={{ marginBottom: 0 }}>
      <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 600, color: "#e6e8eb" }}>
        Historique des decisions
      </h3>

      {entries.length === 0 ? (
        <p style={{ margin: 0, color: "#5f6671", fontSize: 13 }}>
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
            gap: 8,
          }}
        >
          {entries.map((entry) => (
            <DecisionRow
              key={entry.decision.id}
              decision={entry.decision}
              amendments={entry.amendments}
              assets={assets}
              symbol={symbolOf(entry.decision.assetId)}
              onAmend={onAmend}
              disabled={disabled}
            />
          ))}
        </ol>
      )}
    </div>
  );
}

const REVISION_BADGE: Record<string, { label: string; color: string }> = {
  corrected: { label: "Corrigé", color: "#ffb86b" },
  cancelled: { label: "Annulé", color: "#ff8a80" },
};

type AmendMode = "none" | "comment" | "correction" | "cancellation";

const miniInputStyle: React.CSSProperties = {
  padding: "6px 10px",
  fontSize: 13,
  color: "#e6e8eb",
  background: "#0f1115",
  border: "1px solid #2a2f37",
  borderRadius: 6,
};

function linkButtonStyle(enabled: boolean): React.CSSProperties {
  return {
    padding: "2px 6px",
    fontSize: 12,
    color: enabled ? "#9aa0a6" : "#5f6671",
    background: "transparent",
    border: "1px solid #2a2f37",
    borderRadius: 6,
    cursor: enabled ? "pointer" : "not-allowed",
  };
}

function formatSimpleTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear()).slice(-2);
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return isoString.substring(0, 16);
  }
}

function DecisionRow({
  decision,
  amendments,
  assets,
  symbol,
  onAmend,
  disabled,
}: {
  decision: Decision;
  amendments: DecisionTimelineEntry["amendments"];
  assets: TrackedAsset[];
  symbol: string;
  onAmend?: (
    decisionId: string,
    payload: AmendDecisionRequest,
  ) => Promise<boolean>;
  disabled: boolean;
}) {
  const [mode, setMode] = useState<AmendMode>("none");

  const revision = decision.revisionStatus ?? "original";
  const cancelled = revision === "cancelled";
  const badge = REVISION_BADGE[revision];
  // A cancelled decision is terminal: no further amendment is possible.
  const canAmend = Boolean(onAmend) && !cancelled;

  const toggle = (next: AmendMode) =>
    setMode((current) => (current === next ? "none" : next));

  const submit = async (payload: AmendDecisionRequest) => {
    if (!onAmend) return;
    const ok = await onAmend(decision.id, payload);
    if (ok) setMode("none");
  };

  return (
    <li
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "12px 14px",
        fontSize: 13,
        background: "#0f1115",
        border: "1px solid #2a2f37",
        borderRadius: 8,
        opacity: cancelled ? 0.5 : 1,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          gap: 12,
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span
            style={{
              minWidth: 50,
              textAlign: "center",
              fontWeight: 600,
              fontSize: 12,
              color: "#0f1115",
              background: decision.side === "buy" ? "#5ad17a" : "#ff8a80",
              borderRadius: 999,
              padding: "4px 8px",
              textDecoration: cancelled ? "line-through" : "none",
            }}
          >
            {decision.side === "buy" ? "ACHAT" : "VENTE"}
          </span>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 14,
              fontWeight: 600,
              color: "#e6e8eb",
              minWidth: 60,
            }}
            title={symbol}
          >
            {symbol}
          </span>
        </div>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ color: "#c2c7cf", whiteSpace: "nowrap" }}>
            <span style={{ color: "#9aa0a6" }}>Qté:</span> {decision.quantity}
          </span>
          <span style={{ color: "#c2c7cf", whiteSpace: "nowrap" }}>
            <span style={{ color: "#9aa0a6" }}>Prix:</span> {decision.referencePrice}
          </span>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-end" }}>
          <span
            style={{ color: "#5f6671", fontSize: 12, whiteSpace: "nowrap" }}
            title={decision.logicalTimestamp}
          >
            {formatSimpleTime(decision.logicalTimestamp)}
          </span>
          {badge && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: badge.color,
                border: `1px solid ${badge.color}`,
                borderRadius: 999,
                padding: "2px 6px",
              }}
            >
              {badge.label}
            </span>
          )}
        </div>
      </div>

      {decision.comment && (
        <p
          style={{
            margin: 0,
            color: "#c2c7cf",
            fontSize: 12,
            fontStyle: "italic",
          }}
        >
          💬 {decision.comment}
        </p>
      )}

      {amendments.length > 0 && (
        <div
          style={{
            padding: "8px 12px",
            background: "#161a21",
            borderLeft: "2px solid #2a2f37",
            borderRadius: 4,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {amendments.map((amendment) => (
            <AmendmentLine key={amendment.id} amendment={amendment} />
          ))}
        </div>
      )}

      {canAmend && (
        <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
          <button
            type="button"
            onClick={() => toggle("comment")}
            disabled={disabled}
            style={linkButtonStyle(!disabled)}
          >
            Commenter
          </button>
          <button
            type="button"
            onClick={() => toggle("correction")}
            disabled={disabled}
            style={linkButtonStyle(!disabled)}
          >
            Corriger
          </button>
          <button
            type="button"
            onClick={() => toggle("cancellation")}
            disabled={disabled}
            style={linkButtonStyle(!disabled)}
          >
            Annuler
          </button>
        </div>
      )}

      {canAmend && mode === "comment" && (
        <CommentEditor disabled={disabled} onSubmit={submit} />
      )}
      {canAmend && mode === "correction" && (
        <CorrectionEditor
          decision={decision}
          assets={assets}
          disabled={disabled}
          onSubmit={submit}
        />
      )}
      {canAmend && mode === "cancellation" && (
        <CancellationEditor disabled={disabled} onSubmit={submit} />
      )}
    </li>
  );
}

function AmendmentLine({
  amendment,
}: {
  amendment: DecisionTimelineEntry["amendments"][number];
}) {
  const label =
    amendment.kind === "comment"
      ? "Commentaire"
      : amendment.kind === "correction"
        ? "Correction"
        : "Annulation";
  const summary =
    amendment.kind === "comment"
      ? amendment.comment
      : amendment.kind === "correction"
        ? [
            amendment.reason,
            amendment.replacement
              ? `${amendment.replacement.assetId} · ${amendment.replacement.side} · ${amendment.replacement.quantity} @ ${amendment.replacement.referencePrice}${
                  amendment.replacement.logicalTimestamp
                    ? ` · ${amendment.replacement.logicalTimestamp}`
                    : ""
                }`
              : null,
          ]
            .filter(Boolean)
            .join(" — ")
        : amendment.reason;

  return (
    <div style={{ display: "flex", gap: 6, fontSize: 12, color: "#c2c7cf" }}>
      <strong style={{ color: "#9aa0a6" }}>{label}</strong>
      <span>{summary ?? "Aucun detail"}</span>
    </div>
  );
}

function CommentEditor({
  disabled,
  onSubmit,
}: {
  disabled: boolean;
  onSubmit: (payload: AmendDecisionRequest) => void;
}) {
  const [comment, setComment] = useState("");
  const canSave = !disabled && comment.trim().length > 0;
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (canSave) onSubmit({ kind: "comment", comment: comment.trim() });
      }}
      style={{ display: "flex", gap: 6 }}
    >
      <input
        type="text"
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder="Commentaire court"
        aria-label="Commentaire de la decision"
        maxLength={280}
        style={{ ...miniInputStyle, flex: 1 }}
      />
      <button type="submit" disabled={!canSave} style={linkButtonStyle(canSave)}>
        Enregistrer
      </button>
    </form>
  );
}

function CorrectionEditor({
  decision,
  assets,
  disabled,
  onSubmit,
}: {
  decision: Decision;
  assets: TrackedAsset[];
  disabled: boolean;
  onSubmit: (payload: AmendDecisionRequest) => void;
}) {
  const [assetId, setAssetId] = useState(decision.assetId);
  const [side, setSide] = useState<DecisionSide>(decision.side);
  const [quantity, setQuantity] = useState(decision.quantity);
  const [referencePrice, setReferencePrice] = useState(decision.referencePrice);
  const [reason, setReason] = useState("");

  const amountsValid =
    /^\d+(\.\d+)?$/.test(quantity.trim()) &&
    Number(quantity) > 0 &&
    /^\d+(\.\d+)?$/.test(referencePrice.trim()) &&
    Number(referencePrice) > 0;
  const canSave = !disabled && assetId !== "" && amountsValid;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!canSave) return;
        onSubmit({
          kind: "correction",
          ...(reason.trim() ? { reason: reason.trim() } : {}),
          replacement: {
            assetId,
            side,
            quantity: quantity.trim(),
            referencePrice: referencePrice.trim(),
          },
        });
      }}
      style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}
    >
      <select
        value={assetId}
        onChange={(event) => setAssetId(event.target.value)}
        aria-label="Actif corrige"
        style={miniInputStyle}
      >
        {assets.map((asset) => (
          <option key={asset.id} value={asset.id}>
            {asset.symbol}
          </option>
        ))}
      </select>
      <select
        value={side}
        onChange={(event) => setSide(event.target.value as DecisionSide)}
        aria-label="Sens corrige"
        style={miniInputStyle}
      >
        <option value="buy">Achat</option>
        <option value="sell">Vente</option>
      </select>
      <input
        type="text"
        inputMode="decimal"
        value={quantity}
        onChange={(event) => setQuantity(event.target.value)}
        placeholder="Quantite"
        aria-label="Quantite corrigee"
        style={{ ...miniInputStyle, width: 80 }}
      />
      <input
        type="text"
        inputMode="decimal"
        value={referencePrice}
        onChange={(event) => setReferencePrice(event.target.value)}
        placeholder="Prix"
        aria-label="Prix corrige"
        style={{ ...miniInputStyle, width: 80 }}
      />
      <input
        type="text"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Motif (optionnel)"
        aria-label="Motif de la correction"
        maxLength={280}
        style={{ ...miniInputStyle, flex: 1, minWidth: 120 }}
      />
      <button type="submit" disabled={!canSave} style={linkButtonStyle(canSave)}>
        Enregistrer
      </button>
    </form>
  );
}

function CancellationEditor({
  disabled,
  onSubmit,
}: {
  disabled: boolean;
  onSubmit: (payload: AmendDecisionRequest) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (disabled) return;
        onSubmit({
          kind: "cancellation",
          ...(reason.trim() ? { reason: reason.trim() } : {}),
        });
      }}
      style={{ display: "flex", gap: 6 }}
    >
      <input
        type="text"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Motif d'annulation (optionnel)"
        aria-label="Motif de l'annulation"
        maxLength={280}
        style={{ ...miniInputStyle, flex: 1 }}
      />
      <button
        type="submit"
        disabled={disabled}
        style={{ ...linkButtonStyle(!disabled), color: "#ff8a80", borderColor: "#ff8a80" }}
      >
        Confirmer l&apos;annulation
      </button>
    </form>
  );
}

function PortfolioStatsSummary({ stats }: { stats: PortfolioStats }) {
  const cur = stats.referenceCurrency;
  const items = [
    ["Trades", stats.tradeCount.toString()],
    ["Rendement", `${stats.performanceChange}%`],
    ["PnL net", `${stats.netPnL} ${cur}`],
  ];

  const tooltips: Record<string, string> = {
    "Rendement": "Retour sur investissement en pourcentage (gain/perte par rapport au capital initial)",
  };

  return (
    <div
      style={{
        marginTop: 0,
        padding: "16px 16px",
        background: "#0f1115",
        border: "1px solid #2a2f37",
        borderRadius: 8,
      }}
    >
      <h3 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 600, color: "#c2c7cf" }}>
        Statistiques
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
        {items.map(([label, value]) => (
          <div
            key={label}
            style={{ paddingBottom: 8 }}
            title={tooltips[label as keyof typeof tooltips]}
          >
            <div style={{ color: "#7a8087", fontSize: 11, marginBottom: 4, cursor: tooltips[label as keyof typeof tooltips] ? "help" : "default" }}>
              {label}
            </div>
            <strong style={{ color: "#e6e8eb", fontSize: 14 }}>{value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function PortfolioPerformanceChart({ performance }: { performance: PortfolioPerformance }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const values = performance.points.map((point) => Number(point.equity));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const width = 320;
  const height = 96;
  const points = performance.points.map((point, index) => {
    const x = performance.points.length === 1 ? 0 : (index / (performance.points.length - 1)) * width;
    const y = height - ((Number(point.equity) - min) / span) * height;
    return { x, y, equity: point.equity };
  });

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (points.length === 0) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;

    let closest = 0;
    let minDist = Math.abs(points[0]!.x - x);
    for (let i = 1; i < points.length; i++) {
      const dist = Math.abs(points[i]!.x - x);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    }
    setHoveredIndex(closest);
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  const hoveredPoint = hoveredIndex !== null ? points[hoveredIndex] : null;

  return (
    <div
      style={{
        marginTop: 0,
        marginBottom: 12,
        padding: "16px 16px",
        background: "#0f1115",
        border: "1px solid #2a2f37",
        borderRadius: 8,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#c2c7cf" }}>Courbe d&apos;équité</h3>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#7a8087", fontSize: 11, marginBottom: 2 }}>
            {hoveredPoint ? `Capital pointé` : "Capital courant"}
          </div>
          <div style={{ color: "#5ad17a", fontWeight: 600, fontSize: 14 }}>
            {hoveredPoint ? hoveredPoint.equity : performance.currentCapital} <span style={{ color: "#4a9d6a", fontWeight: 400, fontSize: 13 }}>{performance.referenceCurrency}</span>
          </div>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Courbe d'equite du portefeuille"
        style={{ width: "100%", maxWidth: width, height: 96, marginBottom: 8, overflow: "visible", cursor: "crosshair" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <polyline
          fill="none"
          stroke="#5ad17a"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={points.map((p) => `${p.x},${p.y}`).join(" ")}
        />
        {hoveredPoint && (
          <>
            <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r="3" fill="#ffb86b" />
            <line x1={hoveredPoint.x} y1="0" x2={hoveredPoint.x} y2={height} stroke="#5f6671" strokeWidth="1" strokeDasharray="2,2" />
          </>
        )}
      </svg>
      <div style={{ color: "#5f6671", fontSize: 11, display: "flex", gap: 12 }}>
        <span>Initial: {performance.initialCapital} {performance.referenceCurrency}</span>
        <span>Trades: {performance.points.length}</span>
      </div>
    </div>
  );
}

function subtractDecimalStrings(left: string, right: string): string {
  const value = Number(left) - Number(right);
  return Number(value.toFixed(8)).toString();
}

function WealthDuckIcon(): React.ReactElement {
  return (
    <img
      src="/icon.png"
      alt=""
      width={18}
      height={18}
      style={{ borderRadius: 4, flex: "0 0 auto" }}
    />
  );
}

function PortfolioHistoryTimeline({ history }: { history: PortfolioHistory }) {
  const cur = history.referenceCurrency;
  return (
    <div
      style={{
        marginTop: 12,
        padding: "10px 14px",
        background: "#0f1115",
        border: "1px solid #2a2f37",
        borderRadius: 8,
        fontSize: 12,
        color: "#9aa0a6",
      }}
    >
      <h3 style={{ margin: "0 0 8px", fontSize: 13, color: "#c2c7cf" }}>
        Historique portefeuille
      </h3>

      {history.snapshots.length === 0 ? (
        <p style={{ margin: 0, color: "#5f6671" }}>Aucun snapshot disponible.</p>
      ) : (
        <ol
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "grid",
            gap: 6,
          }}
        >
          {history.snapshots.map((snapshot) => (
            <li
              key={snapshot.snapshotId}
              style={{
                display: "grid",
                gridTemplateColumns: "56px minmax(110px, 1fr) minmax(130px, 1fr) minmax(110px, 1fr) 80px minmax(120px, 1.4fr)",
                gap: 8,
                alignItems: "center",
                padding: "6px 8px",
                background: "#161a21",
                borderRadius: 6,
              }}
            >
              <span style={{ color: "#5ad17a", fontWeight: 700 }}>#{snapshot.sequence}</span>
              <span>Solde espece: <strong style={{ color: "#e6e8eb" }}>{snapshot.cash} {cur}</strong></span>
              <span>Titres en portefeuille: <strong style={{ color: "#e6e8eb" }}>{subtractDecimalStrings(snapshot.totalValue, snapshot.cash)} {cur}</strong></span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <WealthDuckIcon />
                Total: <strong style={{ color: "#e6e8eb" }}>{snapshot.totalValue} {cur}</strong>
              </span>
              <span>{snapshot.positionsCount} pos.</span>
              <span title={snapshot.recordedAt}>{snapshot.recordedAt}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function PortfolioSummary({ portfolio }: { portfolio: Portfolio }) {
  const cur = portfolio.referenceCurrency;
  return (
    <div
      style={{
        marginTop: 0,
        marginBottom: 12,
        padding: "14px 16px",
        background: "#0f1115",
        border: "1px solid #2a2f37",
        borderRadius: 8,
        fontSize: 13,
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <div>
          <div style={{ color: "#7a8087", fontSize: 11, marginBottom: 4 }}>Solde espece</div>
          <div style={{ color: "#e6e8eb", fontWeight: 600, fontSize: 14 }}>
            {portfolio.cash} <span style={{ color: "#9aa0a6", fontWeight: 400, fontSize: 13 }}>{cur}</span>
          </div>
        </div>
        <div>
          <div style={{ color: "#7a8087", fontSize: 11, marginBottom: 4 }}>Titres en portefeuille</div>
          <div style={{ color: "#e6e8eb", fontWeight: 600, fontSize: 14 }}>
            {subtractDecimalStrings(portfolio.totalValue, portfolio.cash)} <span style={{ color: "#9aa0a6", fontWeight: 400, fontSize: 13 }}>{cur}</span>
          </div>
        </div>
        <div>
          <div style={{ color: "#7a8087", fontSize: 11, marginBottom: 4 }}>Capital total</div>
          <div style={{ color: "#5ad17a", fontWeight: 600, fontSize: 14 }}>
            {portfolio.totalValue} <span style={{ color: "#4a9d6a", fontWeight: 400, fontSize: 13 }}>{cur}</span>
          </div>
        </div>
      </div>

      {portfolio.positions.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <p style={{ margin: "0 0 6px", fontSize: 12, color: "#5f6671" }}>
            Positions ouvertes
          </p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
            {portfolio.positions.map((pos) => (
              <li
                key={pos.assetId}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "4px 8px",
                  background: "#161a21",
                  borderRadius: 6,
                  fontSize: 12,
                  color: "#c2c7cf",
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontFamily: "monospace", color: "#e6e8eb", minWidth: 80 }}>
                  {pos.assetId}
                </span>
                <span>
                  Qte: <strong style={{ color: "#e6e8eb" }}>{pos.quantity}</strong>
                </span>
                <span>
                  Px moy: <strong style={{ color: "#e6e8eb" }}>{pos.averagePrice}</strong>
                </span>
                <span>
                  Val. marche:{" "}
                  <strong style={{ color: "#5ad17a" }}>
                    {pos.marketValue} {cur}
                  </strong>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ClosedSessionCard({
  session,
  portfolio,
  history,
  performance,
  stats,
  assets,
  decisions,
  timeline,
}: {
  session: Session;
  portfolio: Portfolio | null;
  history: PortfolioHistory | null;
  performance: PortfolioPerformance | null;
  stats: PortfolioStats | null;
  assets: TrackedAsset[];
  decisions: Decision[];
  timeline: DecisionTimelineEntry[] | null;
}) {
  return (
    <div style={cardStyle}>
      <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid #2a2f37" }}>
        <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: 18 }}>Session cloturee</h2>
        <dl style={{ ...dlStyle, fontSize: 13 }}>
          <dt style={{ color: "#9aa0a6" }}>Identifiant</dt>
          <dd style={{ margin: 0, fontFamily: "monospace", fontSize: 12 }}>{session.id}</dd>
          <dt style={{ color: "#9aa0a6" }}>Cloturee le</dt>
          <dd style={{ margin: 0, fontSize: 12 }}>{session.closedAt ? formatSimpleTime(session.closedAt) : "—"}</dd>
        </dl>
      </div>

      <div style={{ marginBottom: 24 }}>
        {portfolio && <PortfolioSummary portfolio={portfolio} />}
        {performance && <PortfolioPerformanceChart performance={performance} />}
        {stats && <PortfolioStatsSummary stats={stats} />}
      </div>

      {/* History stays consultable after close (AC 2). */}
      <DecisionHistory decisions={decisions} timeline={timeline} assets={assets} />
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
