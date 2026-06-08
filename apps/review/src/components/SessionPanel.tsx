"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  ApiResponse,
  Session,
  SessionContext,
} from "@training-trade/shared";

type ActiveData = { session: SessionContext | null };
type SessionData = { session: Session };

async function readEnvelope<T>(response: Response): Promise<ApiResponse<T>> {
  return (await response.json()) as ApiResponse<T>;
}

export function SessionPanel() {
  const [active, setActive] = useState<SessionContext | null>(null);
  const [closed, setClosed] = useState<Session | null>(null);
  const [resumeId, setResumeId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshActive = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions/active", { cache: "no-store" });
      const body = await readEnvelope<ActiveData>(res);
      setActive(body.data?.session ?? null);
    } catch {
      setError("Impossible de charger la session active.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshActive();
  }, [refreshActive]);

  const createSession = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions", { method: "POST" });
      const body = await readEnvelope<SessionData>(res);
      if (body.error) {
        setError(body.error.message);
        await refreshActive();
        return;
      }
      const created = body.data?.session;
      if (created) {
        setClosed(null);
        setActive({
          id: created.id,
          status: created.status,
          openedAt: created.openedAt,
          canReceiveDecisions: created.canReceiveDecisions,
        });
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
      const res = await fetch(`/api/sessions/${active.id}/close`, {
        method: "POST",
      });
      const body = await readEnvelope<SessionData>(res);
      if (body.error) {
        setError(body.error.message);
        await refreshActive();
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
      const res = await fetch(`/api/sessions/${id}/resume`, { method: "POST" });
      const body = await readEnvelope<SessionData>(res);
      if (body.error) {
        setError(body.error.message);
        return;
      }
      setClosed(null);
      setResumeId("");
      await refreshActive();
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
            onClose={() => void closeActiveSession()}
            disabled={busy}
          />
        ) : closed ? (
          <ClosedSessionCard session={closed} />
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
  onClose,
  disabled,
}: {
  session: SessionContext;
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

function ClosedSessionCard({ session }: { session: Session }) {
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
        <dt style={{ color: "#9aa0a6" }}>Decisions</dt>
        <dd style={{ margin: 0 }}>Indisponible (session cloturee)</dd>
      </dl>
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
