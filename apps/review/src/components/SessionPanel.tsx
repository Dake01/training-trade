"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  ApiResponse,
  Session,
  SessionContext,
} from "@training-trade/shared";

type ActiveData = { session: SessionContext | null };
type CreateData = { session: Session };

async function readEnvelope<T>(response: Response): Promise<ApiResponse<T>> {
  return (await response.json()) as ApiResponse<T>;
}

export function SessionPanel() {
  const [active, setActive] = useState<SessionContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
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
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions", { method: "POST" });
      const body = await readEnvelope<CreateData>(res);
      if (body.error) {
        setError(body.error.message);
        await refreshActive();
        return;
      }
      const created = body.data?.session;
      if (created) {
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
      setCreating(false);
    }
  }, [refreshActive]);

  return (
    <section style={{ marginTop: 24 }}>
      <button
        type="button"
        onClick={() => void createSession()}
        disabled={creating || active !== null}
        style={{
          padding: "12px 20px",
          fontSize: 16,
          fontWeight: 600,
          color: "#0f1115",
          background: active ? "#3a3f47" : "#5ad17a",
          border: "none",
          borderRadius: 8,
          cursor: creating || active ? "not-allowed" : "pointer",
        }}
      >
        {creating ? "Creation…" : "Creer et ouvrir une session"}
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
          <ActiveSessionCard session={active} />
        ) : (
          <p style={{ color: "#9aa0a6" }}>
            Aucune session active. Cree-en une pour commencer.
          </p>
        )}
      </div>
    </section>
  );
}

function ActiveSessionCard({ session }: { session: SessionContext }) {
  return (
    <div
      style={{
        border: "1px solid #2a2f37",
        borderRadius: 10,
        padding: 20,
        background: "#161a21",
      }}
    >
      <h2 style={{ marginTop: 0, fontSize: 18 }}>Session active</h2>
      <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 16px", margin: 0 }}>
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
    </div>
  );
}
