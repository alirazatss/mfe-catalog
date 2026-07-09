import { Link } from "react-router";
import { navigateTo } from "../utils/navigation";

interface User {
  id: string;
  email: string;
  name: string;
  roles?: string[];
}

interface WidgetDashboardProps {
  user?: User | null;
}

export default function WidgetDashboard({ user }: WidgetDashboardProps) {
  return (
    <div style={{ padding: "2rem" }}>
      <h2 style={{ marginBottom: "1rem", fontSize: "1.5rem", fontWeight: "bold" }}>
        Widget Dashboard
      </h2>

      {user && (
        <p style={{ marginBottom: "1rem", color: "#6b7280" }}>
          Welcome, <strong>{user.name}</strong>!
        </p>
      )}

      <p style={{ marginBottom: "2rem", color: "#6b7280" }}>
        This is the main dashboard page of the MFE-Widget micro-frontend.
      </p>

      <div
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          marginBottom: "2rem",
        }}
      >
        <Link
          to="counter"
          style={{
            padding: "1.5rem",
            background: "#3b82f6",
            color: "white",
            textDecoration: "none",
            borderRadius: "8px",
            textAlign: "center",
            fontWeight: "600",
          }}
        >
          Counter Widget
        </Link>

        <Link
          to="settings"
          style={{
            padding: "1.5rem",
            background: "#8b5cf6",
            color: "white",
            textDecoration: "none",
            borderRadius: "8px",
            textAlign: "center",
            fontWeight: "600",
          }}
        >
          Settings
        </Link>
      </div>

      <div
        style={{
          padding: "1rem",
          background: "#fef3c7",
          borderLeft: "4px solid #f59e0b",
          borderRadius: "4px",
          marginBottom: "2rem",
        }}
      >
        <h3 style={{ fontWeight: "600", marginBottom: "0.5rem" }}>Cross-MFE Navigation Demo</h3>
        <p style={{ fontSize: "0.875rem", marginBottom: "1rem" }}>
          Click the button below to navigate to the home page using the cross-MFE navigation system.
        </p>
        <button
          onClick={() => navigateTo("/")}
          style={{
            padding: "0.5rem 1rem",
            background: "#f59e0b",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "600",
          }}
        >
          Navigate to Home (Cross-MFE)
        </button>
      </div>

      {import.meta.env.DEV && (
        <div
          style={{
            padding: "1rem",
            background: "#f3f4f6",
            borderRadius: "8px",
            fontSize: "0.875rem",
          }}
        >
          <strong>Dev Info:</strong> This page demonstrates internal routing within the MFE-Widget.
          The navigation above uses React Router Link components, while the cross-MFE button uses
          the custom navigation system.
        </div>
      )}
    </div>
  );
}
