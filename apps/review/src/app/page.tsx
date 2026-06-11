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
        maxWidth: 840,
        margin: "0 auto",
        padding: "40px 24px",
      }}
    >
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <AppLogo size={40} />
          <h1 style={{ margin: 0, fontSize: 28, color: "#e6e6e6" }}>Training Trade</h1>
        </div>
        <p style={{ marginTop: 8, marginBottom: 0, color: "#9aa0a6", lineHeight: 1.5 }}>
          Simulez vos trades et analysez rapidement votre performance. Ouvrez une session,
          capturez vos décisions d'achat et de vente, puis consultez votre progression avec la
          courbe d'équité et les statistiques détaillées.
        </p>
      </div>
      <SessionPanel />
    </main>
  );
}
