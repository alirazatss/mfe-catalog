import { useRef, useEffect } from "react";
import { Link } from "react-router";
import { CounterWidget } from "../components/CounterWidget";

export default function CounterPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<CounterWidget | null>(null);

  useEffect(() => {
    if (containerRef.current && !widgetRef.current) {
      widgetRef.current = new CounterWidget(containerRef.current, {
        initialValue: 0,
        theme: "light",
        onCountChange: (count) => {
          if (import.meta.env.DEV) {
            console.log(`[Counter Page] Count changed: ${count}`);
          }
        },
      });
    }

    return () => {
      if (widgetRef.current) {
        widgetRef.current.destroy();
        widgetRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{ padding: "2rem" }}>
      <div style={{ marginBottom: "1rem" }}>
        <Link to=".." style={{ color: "#3b82f6", textDecoration: "none" }}>
          ← Back to Dashboard
        </Link>
      </div>

      <h2 style={{ marginBottom: "1rem", fontSize: "1.5rem", fontWeight: "bold" }}>
        Counter Widget Page
      </h2>

      <p style={{ marginBottom: "2rem", color: "#6b7280" }}>
        This is the interactive counter widget component.
      </p>

      <div
        style={{
          padding: "2rem",
          background: "white",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <div ref={containerRef} />
      </div>

      {import.meta.env.DEV && (
        <div
          style={{
            marginTop: "2rem",
            padding: "1rem",
            background: "#f3f4f6",
            borderRadius: "8px",
            fontSize: "0.875rem",
          }}
        >
          <strong>Dev Info:</strong> This page demonstrates a nested route within the MFE-Widget.
          The widget is initialized when this component mounts and cleaned up on unmount.
        </div>
      )}
    </div>
  );
}
