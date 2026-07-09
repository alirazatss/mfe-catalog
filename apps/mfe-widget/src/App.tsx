import { BrowserRouter, MemoryRouter, Routes, Route, Navigate } from "react-router";
import WidgetDashboard from "./pages/WidgetDashboard";
import CounterPage from "./pages/CounterPage";
import SettingsPage from "./pages/SettingsPage";

interface AppProps {
  basePath?: string;
  router?: "browser" | "memory";
}

export default function App({ basePath = "/", router: routerType = "browser" }: AppProps) {
  if (import.meta.env.DEV) {
    console.log(`[MFE-Widget] Rendering with basePath="${basePath}", router="${routerType}"`);
  }

  const routes = (
    <Routes>
      <Route path="/" element={<WidgetDashboard />} />
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
        </div>
      )}
    </div>
  );
}

// Named export for Module Federation
export { App };
