/**
 * Thin Shell — critical error rendering.
 *
 * Renders the static critical-error template into #app when bootstrap fails
 * unrecoverably (manifest fetch failed with no cache, etc.).
 * See ADR-0006 (graceful failure handling — bootstrap layer).
 */

export function renderCriticalError(reason?: string): void {
  const app = document.getElementById("app");
  const template = document.getElementById(
    "shell-template-critical-error",
  ) as HTMLTemplateElement | null;

  if (!app) {
    console.error("[shell] #app missing — cannot render critical error");
    return;
  }

  // Clear whatever is currently in #app (may be partial slots)
  app.innerHTML = "";

  if (template?.content) {
    app.appendChild(template.content.cloneNode(true));
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
    app.appendChild(fallback);
  }

  if (reason && import.meta.env.DEV) {
    console.error("[shell] Critical error:", reason);
  }
}
