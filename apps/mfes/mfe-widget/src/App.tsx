import { BrowserRouter, MemoryRouter, Routes, Route, Navigate } from "react-router";
import { useEffect } from "react";
import WidgetDashboard from "./pages/WidgetDashboard";
import CounterPage from "./pages/CounterPage";
import SettingsPage from "./pages/SettingsPage";
import { setupAuthListeners } from "./utils/apiClient";

interface User {
  id: string;
  email: string;
  name: string;
  roles?: string[];
}

interface AppProps {
  basePath?: string;
  router?: "browser" | "memory";
  isAuthenticated?: boolean;
  user?: User | null;
}

export default function App({
  basePath = "/",
  router: routerType = "browser",
  isAuthenticated = false,
  user = null,
}: AppProps) {
  // Initialize auth event listeners on mount
  useEffect(() => {
    setupAuthListeners();
  }, []);

  if (import.meta.env.DEV) {
    console.log(`[MFE-Widget] Rendering mfe with basePath="${basePath}", router="${routerType}"`);
    console.log(`[MFE-Widget] Auth state:`, { isAuthenticated, user: user?.email });
  }

  const routes = (
    <Routes>
      <Route path="/" element={<WidgetDashboard user={user} />} />
      <Route path="/counter" element={<CounterPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );

  return (
    <div style={{ minHeight: "400px" }}>
      {routerType === "memory" ? (
        <MemoryRouter initialEntries={["/"]} initialIndex={0}>
          {routes}
        </MemoryRouter>
      ) : (
        <BrowserRouter basename={basePath}>{routes}</BrowserRouter>
      )}

      {import.meta.env.DEV && (
        <div
          style={{
            marginTop: "1rem",
            padding: "1rem",
            background: "#f3f4f6",
            borderRadius: "8px",
            fontSize: "0.875rem",
            borderTop: "2px solid #e5e7eb",
          }}
        >
          <strong>MFE-Widget Dev Info:</strong> basePath={basePath}, router={routerType}
          {isAuthenticated && user && (
            <div style={{ marginTop: "0.5rem" }}>
              Logged in as: {user.name} ({user.email})
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Named export for Module Federation
export { App };
