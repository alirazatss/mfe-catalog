import "./style.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App";
import { initializeRemotes } from "./config/remotes";

async function bootstrap() {
  // Initialize dynamic loader before rendering
  try {
    await initializeRemotes();
    
    if (import.meta.env.DEV) {
      console.log("[App] Dynamic loader initialized successfully");
    }
  } catch (error) {
    console.error("[App] Failed to initialize dynamic loader:", error);
    // Continue anyway - errors will be handled by route loaders
  }
  
  // Render React app with BrowserRouter
  const root = createRoot(document.getElementById("app")!);
  
  root.render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>
  );
  
  if (import.meta.env.DEV) {
    console.log("[App] Router initialized and rendered");
  }
}

// Bootstrap the application
bootstrap().catch((error) => {
  console.error("[App] Fatal error during bootstrap:", error);
  document.getElementById("app")!.innerHTML = `
    <div style="padding: 2rem; text-align: center;">
      <h1 style="color: #dc2626;">Application Error</h1>
      <p style="color: #6b7280;">Failed to start the application. Check the console for details.</p>
    </div>
  `;
});
