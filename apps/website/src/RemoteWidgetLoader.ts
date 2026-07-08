// Remote Widget Loader with error handling

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
    // Dynamically import the remote module
    const { CounterWidget } = await import("remoteWidget/CounterWidget");

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

    // Show error UI
    const errorMessage = error instanceof Error ? error.message : String(error);
    container.innerHTML = `
      <div style="padding: 2rem; background: #fee2e2; border: 2px solid #ef4444; border-radius: 12px; color: #991b1b;">
        <h3 style="margin: 0 0 1rem; color: #dc2626;">Failed to Load Remote Widget</h3>
        <p style="margin: 0 0 0.5rem;">The microfrontend could not be loaded.</p>
        <details style="margin-top: 1rem;">
          <summary style="cursor: pointer; font-weight: 600;">Error Details</summary>
          <pre style="margin-top: 0.5rem; padding: 1rem; background: white; border-radius: 6px; overflow: auto; font-size: 0.875rem;">${errorMessage}</pre>
        </details>
        <p style="margin-top: 1rem; font-size: 0.875rem; opacity: 0.8;">
          Make sure the remote widget is running on <code>http://localhost:5174</code>
        </p>
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
