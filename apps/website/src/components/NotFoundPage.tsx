import { Link } from "react-router";

export default function NotFoundPage() {
  return (
    <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
      <h1 style={{ fontSize: "6rem", fontWeight: "bold", color: "#dc2626", margin: "0" }}>
        404
      </h1>
      <h2 style={{ fontSize: "2rem", fontWeight: "600", color: "#1f2937", margin: "1rem 0" }}>
        Page Not Found
      </h2>
      <p style={{ fontSize: "1.125rem", color: "#6b7280", margin: "0 0 2rem" }}>
        The page you're looking for doesn't exist.
      </p>
      <Link
        to="/"
        style={{
          display: "inline-block",
          padding: "0.75rem 1.5rem",
          background: "#667eea",
          color: "white",
          textDecoration: "none",
          borderRadius: "6px",
          fontWeight: "600"
        }}
      >
        Go Home
      </Link>
    </div>
  );
}
