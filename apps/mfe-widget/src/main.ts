import { StrictMode, createElement } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { CounterWidget } from "./components/CounterWidget";

// When running standalone, render the React app with BrowserRouter
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

// Export for Module Federation
export { CounterWidget, App };
export default App;
