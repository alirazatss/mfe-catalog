import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div style={{ textAlign: "center", padding: "2rem 0" }}>
      <h1 style={{ fontSize: "3rem", fontWeight: "bold", color: "#1f2937", margin: "0 0 1rem" }}>
        Welcome to MF Mono
      </h1>

      <p
        style={{
          fontSize: "1.25rem",
          color: "#6b7280",
          margin: "0 0 3rem",
          maxWidth: "600px",
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        A modern micro-frontend monorepo with hybrid routing, dynamic loading, and auto-discovery.
      </p>

      <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
        <Link
          to="/widget"
          style={{
            display: "inline-block",
            padding: "1rem 2rem",
            background: "#667eea",
            color: "white",
            textDecoration: "none",
            borderRadius: "8px",
            fontWeight: "600",
            fontSize: "1.125rem",
          }}
        >
          Try Widget Demo
        </Link>
      </div>

      <div
        style={{
          marginTop: "4rem",
          padding: "2rem",
          background: "#f3f4f6",
          borderRadius: "12px",
          maxWidth: "800px",
          margin: "4rem auto 0",
        }}
      >
        <h2
          style={{ fontSize: "1.5rem", fontWeight: "600", color: "#1f2937", margin: "0 0 1.5rem" }}
        >
          Features
        </h2>
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
            textAlign: "left",
          }}
        >
          {[
            "🔄 Auto-discovery",
            "⚡ Dynamic loading",
            "🛣️ Hybrid routing",
            "🎯 Route guards",
            "📦 Code splitting",
            "🔗 basePath contract",
          ].map((feature) => (
            <li key={feature} style={{ color: "#374151", fontSize: "1rem" }}>
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
