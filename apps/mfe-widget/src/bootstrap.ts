/**
 * Module Federation Bootstrap Entry Point
 *
 * This file is executed before the remote is shared with the host application.
 * It initializes shared dependencies and returns the module scope.
 */

import { StrictMode, createElement } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.js";
import { CounterWidget } from "./components/CounterWidget.js";

// Export for Module Federation
export { CounterWidget, App };

// Standalone rendering (when accessed directly)
export async function bootstrap(): Promise<void> {
  const rootElement = document.getElementById("app");
  if (rootElement) {
    const root = createRoot(rootElement);
    root.render(
      createElement(StrictMode, null, createElement(App, { basePath: "/", router: "browser" })),
    );

    if (import.meta.env.DEV) {
      console.log("[MFE-Widget] Running in standalone mode with BrowserRouter");
    }
  }
}

// Auto-bootstrap when running standalone (not as a remote)
const g = globalThis as Record<string, unknown> & {
  __REACT_DEVTOOLS_GLOBAL_HOOK__?: { isCommitted?: boolean };
};
if (import.meta.env.MODE === "development" && !g.__REACT_DEVTOOLS_GLOBAL_HOOK__?.isCommitted) {
  bootstrap().catch((err) => console.error("[MFE-Widget] Bootstrap error:", err));
}
