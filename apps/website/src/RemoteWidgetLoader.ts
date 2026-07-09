// Remote Widget Loader with dynamic loader integration

import { loader } from "./config/remotes.ts";

let widgetInstance: any = null;

export async function loadRemoteWidget(
  container: HTMLElement,
  options: { initialValue?: number; theme?: "light" | "dark" } = {},
): Promise<void> {
  const loadingDiv = document.createElement("div");
  loadingDiv.className = "remote-widget-loading";
  loadingDiv.innerHTML = `
    <div style="padding: 2rem; text-align: center; background: #f3f4f6; border-radius: 12px;">
      <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #e5e7eb; border-top-color: #667eea; border-radius: 50%; animation: spin 1s linear infinite;"></div>
      <p style="margin-top: 1rem; color: #6b7280;">Loading Remote Widget...</p>
    </div>
    <style>
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
  `;
  container.appendChild(loadingDiv);

  try {
    // Load the remote using dynamic loader
    const remoteContainer = await loader.loadRemote("mfe-widget");

    // Get the CounterWidget module from the remote
    const factory = await remoteContainer.get("./CounterWidget");
    const module = factory();
    const { CounterWidget } = module;

    // Remove loading indicator
    container.removeChild(loadingDiv);

    // Create and render the widget
    widgetInstance = new CounterWidget(container, {
      initialValue: options.initialValue ?? 0,
      theme: options.theme ?? "light",
      onCountChange: (count: number) => {
        console.log("[Host] Counter value changed:", count);
      },
    });

    console.log("[Host] Remote widget loaded successfully!");
  } catch (error) {
    console.error("[Host] Failed to load remote widget:", error);

    // Remove loading indicator
    if (container.contains(loadingDiv)) {
      container.removeChild(loadingDiv);
    }

    // Show enhanced error UI with specific messages
    const errorMessage = error instanceof Error ? error.message : String(error);
    let helpText = "Make sure the remote is configured correctly.";

    if (errorMessage.includes("not found in config")) {
      helpText =
        "The remote 'mfe-widget' is not present in remotes.config.json. Check that the config was generated correctly.";
    } else if (errorMessage.includes("is disabled")) {
      helpText =
        "The remote 'mfe-widget' is currently disabled in the configuration. Check the 'enabled' flag in remotes.config.json.";
    } else if (errorMessage.includes("Failed to load script")) {
      helpText =
        "Could not load the remote script. Make sure the remote widget is running on the configured port (default: http://localhost:5174).";
    } else if (errorMessage.includes("Failed to load config")) {
      helpText =
        "Could not load remotes.config.json. Make sure it was generated correctly (run: pnpm generate:config).";
    }

    container.innerHTML = `
      <div style="padding: 2rem; background: #fee2e2; border: 2px solid #ef4444; border-radius: 12px; color: #991b1b;">
        <h3 style="margin: 0 0 1rem; color: #dc2626;">Failed to Load Remote Widget</h3>
        <p style="margin: 0 0 0.5rem;">The microfrontend could not be loaded.</p>
        <p style="margin: 1rem 0; padding: 1rem; background: #fef3c7; border-left: 4px solid #f59e0b; color: #92400e; border-radius: 4px;">
          <strong>Suggestion:</strong> ${helpText}
        </p>
        <details style="margin-top: 1rem;">
          <summary style="cursor: pointer; font-weight: 600;">Error Details</summary>
          <pre style="margin-top: 0.5rem; padding: 1rem; background: white; border-radius: 6px; overflow: auto; font-size: 0.875rem;">${errorMessage}</pre>
        </details>
      </div>
    `;
  }
}

export function destroyRemoteWidget(): void {
  if (widgetInstance && typeof widgetInstance.destroy === "function") {
    widgetInstance.destroy();
    widgetInstance = null;
  }
}
