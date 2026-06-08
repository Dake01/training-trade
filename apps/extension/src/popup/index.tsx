import { useEffect, useState } from "react";
import type { ApiResponse, SessionContext } from "@training-trade/shared";

/**
 * Light popup entry point. It only reads the active session from the review
 * app's API. No automatic TradingView integration in V1 (story 1.1 scope).
 * Configure the API base via the `PLASMO_PUBLIC_API_BASE` env var.
 */
const API_BASE = process.env.PLASMO_PUBLIC_API_BASE ?? "http://localhost:3000";

type ActiveData = { session: SessionContext | null };

function Popup() {
  const [session, setSession] = useState<SessionContext | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/sessions/active`);
        const body = (await res.json()) as ApiResponse<ActiveData>;
        if (cancelled) return;
        setSession(body.data?.session ?? null);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
            <p style={{ margin: "4px 0 0", fontSize: 12 }}>
              Statut: {session.status}
            </p>
          </div>
        ) : (
          <p>Aucune session active.</p>
        ))}
    </div>
  );
}

export default Popup;
