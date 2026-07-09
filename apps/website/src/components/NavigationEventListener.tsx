import { useEffect } from "react";
import { useNavigate } from "react-router";

/**
 * Component that listens for cross-MFE navigation events
 * Must be rendered inside BrowserRouter
 */
export function NavigationEventListener() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleNavigation = (event: Event) => {
      const customEvent = event as CustomEvent<{ path: string; state?: any; replace?: boolean }>;
      const { path, state, replace } = customEvent.detail;

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
    };

    // Register event listener
    window.addEventListener("mfe:navigate", handleNavigation as EventListener);

    if (import.meta.env.DEV) {
      console.log("[App] Navigation event listener registered");
    }

    // Cleanup
    return () => {
      window.removeEventListener("mfe:navigate", handleNavigation as EventListener);
    };
  }, [navigate]);

  return null; // This component doesn't render anything
}
