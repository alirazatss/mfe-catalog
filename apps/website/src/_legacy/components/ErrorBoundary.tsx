import { useRouteError, isRouteErrorResponse, Link } from "react-router-dom";

export default function ErrorBoundary() {
  const error = useRouteError();

  let errorMessage: string;
  let errorStatus: number | undefined;

  if (isRouteErrorResponse(error)) {
    errorStatus = error.status;
    errorMessage = error.statusText || error.data;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else {
    errorMessage = "Unknown error occurred";
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        background: "#f9fafb",
      }}
    >
      <div
        style={{
          maxWidth: "600px",
          width: "100%",
          background: "white",
          borderRadius: "12px",
          padding: "3rem",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: "4rem",
            fontWeight: "bold",
            color: "#dc2626",
            margin: "0 0 1rem",
          }}
        >
          {errorStatus || "Error"}
        </h1>

        <h2
          style={{
            fontSize: "1.5rem",
            fontWeight: "600",
            color: "#1f2937",
            margin: "0 0 1rem",
          }}
        >
          {errorStatus === 404 ? "Page Not Found" : "Something went wrong"}
        </h2>

        <p
          style={{
            color: "#6b7280",
            margin: "0 0 2rem",
            fontSize: "1rem",
          }}
        >
          {errorMessage}
        </p>

        <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
          <Link
            to="/"
            style={{
              padding: "0.75rem 1.5rem",
              background: "#667eea",
              color: "white",
              textDecoration: "none",
              borderRadius: "6px",
              fontWeight: "600",
            }}
          >
            Go Home
          </Link>

          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "0.75rem 1.5rem",
              background: "white",
              color: "#667eea",
              border: "2px solid #667eea",
              borderRadius: "6px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>

        {import.meta.env.DEV && (
          <details
            style={{
              marginTop: "2rem",
              textAlign: "left",
              padding: "1rem",
              background: "#f3f4f6",
              borderRadius: "6px",
            }}
          >
            <summary style={{ cursor: "pointer", fontWeight: "600", marginBottom: "0.5rem" }}>
              Error Details (Dev Mode)
            </summary>
            <pre
              style={{
                fontSize: "0.875rem",
                overflow: "auto",
                color: "#dc2626",
              }}
            >
              {error instanceof Error ? error.stack : JSON.stringify(error, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
