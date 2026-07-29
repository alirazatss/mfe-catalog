import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { onMFEEvent, MFE_EVENTS } from "@mfe-runtime/events";

/**
 * Component that listens for cross-MFE navigation events
 * Must be rendered inside BrowserRouter
 */
export function NavigationEventListener() {
  const navigate = useNavigate();

  useEffect(() => {
    // Subscribe to navigation events using event bus
    const cleanup = onMFEEvent(MFE_EVENTS.NAVIGATE, ({ path, state, replace }) => {
      // Validate path (security check)
      if (!path.startsWith("/")) {
        console.error("[Navigation] Invalid path:", path);
        return;
      }

      if (path.startsWith("http://") || path.startsWith("https://")) {
        console.error("[Navigation] External URLs not allowed:", path);
        return;
      }

      // Navigate using React Router
      void navigate(path, { state, replace });

      if (import.meta.env.DEV) {
        console.log(`[Navigation] Navigated to: ${path}`);
      }
    });

    if (import.meta.env.DEV) {
      console.log("[App] Navigation event listener registered");
    }

    // Cleanup function removes listener
    return cleanup;
  }, [navigate]);

  return null; // This component doesn't render anything
}
