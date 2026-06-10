import { SessionPanel } from "@/components/SessionPanel";

function AppLogo({ size = 34 }: { size?: number }) {
  return (
    <img
      src="/icon.png"
      alt=""
      width={size}
      height={size}
      style={{ borderRadius: 8, flex: "0 0 auto" }}
    />
  );
}

export default function HomePage() {
  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "48px 24px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <AppLogo />
        <h1 style={{ margin: 0 }}>Training Trade</h1>
      </div>
      <p style={{ marginTop: 0, color: "#9aa0a6" }}>
        Cree et ouvre une session de trading simule pour commencer un replay.
      </p>
      <SessionPanel />
    </main>
  );
}
