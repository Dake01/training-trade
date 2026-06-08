import { SessionPanel } from "@/components/SessionPanel";

export default function HomePage() {
  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "48px 24px",
      }}
    >
      <h1 style={{ marginBottom: 4 }}>Training Trade</h1>
      <p style={{ marginTop: 0, color: "#9aa0a6" }}>
        Cree et ouvre une session de trading simule pour commencer un replay.
      </p>
      <SessionPanel />
    </main>
  );
}
