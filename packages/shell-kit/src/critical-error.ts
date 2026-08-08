/**
 * @mfe-runtime/shell-kit — Critical error rendering
 *
 * Implements shell-kit / Slot and critical-error rendering utilities.
 * See openspec/changes/shared-boilerplate-packages/specs/shell-kit/spec.md
 *
 * Renders the static critical-error template when bootstrap fails
 * unrecoverably (manifest fetch failed with no cache, etc.).
 */

export interface CriticalErrorRenderer {
  /**
   * Render critical error UI into the specified root element.
   * @param rootElementId - ID of the root element (typically "app")
   * @param templateId - ID of the critical error template (defaults to "shell-template-critical-error")
   * @param reason - Optional error reason (logged in dev mode)
   */
  render(rootElementId: string, templateId?: string, reason?: string): void;
}

export function createCriticalErrorRenderer(): CriticalErrorRenderer {
  return {
    render(
      rootElementId: string,
      templateId = "shell-template-critical-error",
      reason?: string,
    ): void {
      const root = document.getElementById(rootElementId);
      const template = document.getElementById(templateId) as HTMLTemplateElement | null;

      if (!root) {
        console.error(`[shell-kit] #${rootElementId} missing — cannot render critical error`);
        return;
      }

      // Clear whatever is currently in the root (may be partial slots)
      root.innerHTML = "";

      if (template?.content) {
        root.appendChild(template.content.cloneNode(true));
      } else {
        // Fallback if templates were stripped: render minimal inline error
        const fallback = document.createElement("div");
        fallback.className = "shell-critical-error";
        fallback.setAttribute("role", "alert");
        fallback.innerHTML = `
          <h1>Something went wrong</h1>
          <p>Please reload the page. If the problem persists, contact support.</p>
          <button type="button" onclick="window.location.reload()">Reload</button>
        `;
        root.appendChild(fallback);
      }

      if (reason && import.meta.env?.DEV) {
        console.error("[shell-kit] Critical error:", reason);
      }
    },
  };
}
