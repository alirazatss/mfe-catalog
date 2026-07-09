import { Link, Outlet } from "react-router";
import type { ReactNode } from "react";
import { NavigationEventListener } from "./NavigationEventListener";

interface LayoutProps {
  children?: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <>
      {/* Navigation event listener (doesn't render anything) */}
      <NavigationEventListener />
      
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <header style={{
          background: "#667eea",
          color: "white",
          padding: "1rem 2rem",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
        }}>
          <nav style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", gap: "2rem", alignItems: "center" }}>
            <Link to="/" style={{ color: "white", textDecoration: "none", fontWeight: "bold", fontSize: "1.25rem" }}>
              MF Mono
            </Link>
            <div style={{ display: "flex", gap: "1.5rem" }}>
              <Link to="/" style={{ color: "white", textDecoration: "none" }}>
                Home
              </Link>
              <Link to="/widget" style={{ color: "white", textDecoration: "none" }}>
                Widget
              </Link>
            </div>
          </nav>
        </header>

        {/* Main Content */}
        <main style={{ flex: 1, padding: "2rem", maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
          {children || <Outlet />}
        </main>

        {/* Footer */}
        <footer style={{
          background: "#f3f4f6",
          padding: "1.5rem 2rem",
          borderTop: "1px solid #e5e7eb",
          textAlign: "center",
          color: "#6b7280"
        }}>
          <p>Micro-Frontend Monorepo with Hybrid Routing</p>
        </footer>
      </div>
    </>
  );
}
