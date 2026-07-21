import { describe, it, expect, beforeEach, afterEach } from "vite-plus/test";
import { renderCriticalError } from "./critical-error.js";

describe("renderCriticalError", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="app">
        <div id="header-slot"><span>header stuff</span></div>
        <main id="main-slot"><span>main stuff</span></main>
      </div>
      <template id="shell-template-critical-error">
        <div class="shell-critical-error" role="alert">
          <h1>Something went wrong</h1>
          <button type="button">Reload</button>
        </div>
      </template>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("replaces #app content with the critical-error template", () => {
    renderCriticalError();
    const app = document.getElementById("app")!;
    expect(app.querySelector(".shell-critical-error")).toBeTruthy();
    expect(app.textContent).toContain("Something went wrong");
    // Original slots removed
    expect(document.getElementById("header-slot")).toBeNull();
    expect(document.getElementById("main-slot")).toBeNull();
  });

  it("falls back to an inline error when the template is missing", () => {
    document.getElementById("shell-template-critical-error")?.remove();
    renderCriticalError("no manifest");
    const app = document.getElementById("app")!;
    expect(app.textContent).toContain("Something went wrong");
    expect(app.querySelector('[role="alert"]')).toBeTruthy();
  });

  it("does not throw when #app is missing", () => {
    document.body.innerHTML = "";
    expect(() => renderCriticalError()).not.toThrow();
  });
});
