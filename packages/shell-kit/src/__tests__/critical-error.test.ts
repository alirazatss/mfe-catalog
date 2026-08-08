import { describe, it, expect, beforeEach, vi } from "vite-plus/test";
import { createCriticalErrorRenderer } from "../critical-error";

describe("Critical Error Renderer", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("renders critical error template into root", () => {
    document.body.innerHTML = `
      <div id="app"><div>Some content</div></div>
      <template id="shell-template-critical-error">
        <div class="critical-error">Something went wrong</div>
      </template>
    `;

    const renderer = createCriticalErrorRenderer();
    renderer.render("app");

    const app = document.getElementById("app");
    expect(app?.innerHTML).toContain("Something went wrong");
    expect(app?.querySelector(".critical-error")).toBeTruthy();
  });

  it("clears existing content before rendering", () => {
    document.body.innerHTML = `
      <div id="app"><div id="old-content">Old content</div></div>
      <template id="shell-template-critical-error">
        <div class="critical-error">Error</div>
      </template>
    `;

    const renderer = createCriticalErrorRenderer();
    renderer.render("app");

    const app = document.getElementById("app");
    expect(app?.querySelector("#old-content")).toBeNull();
    expect(app?.innerHTML).toContain("Error");
  });

  it("renders fallback UI when template is missing", () => {
    document.body.innerHTML = `<div id="app"></div>`;

    const renderer = createCriticalErrorRenderer();
    renderer.render("app");

    const app = document.getElementById("app");
    expect(app?.innerHTML).toContain("Something went wrong");
    expect(app?.innerHTML).toContain("Reload");
    expect(app?.querySelector("button")).toBeTruthy();
  });

  it("accepts custom template ID", () => {
    document.body.innerHTML = `
      <div id="app"></div>
      <template id="custom-error">
        <div class="custom">Custom error</div>
      </template>
    `;

    const renderer = createCriticalErrorRenderer();
    renderer.render("app", "custom-error");

    const app = document.getElementById("app");
    expect(app?.innerHTML).toContain("Custom error");
  });

  it("logs error to console when root element is missing", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const renderer = createCriticalErrorRenderer();
    renderer.render("missing-app");

    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("#missing-app missing"));
  });

  it("logs reason in dev mode", () => {
    const originalEnv = import.meta.env;
    (import.meta as any).env = { DEV: true };
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    document.body.innerHTML = `
      <div id="app"></div>
      <template id="shell-template-critical-error">
        <div>Error</div>
      </template>
    `;

    const renderer = createCriticalErrorRenderer();
    renderer.render("app", undefined, "Test reason");

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Critical error:"),
      "Test reason",
    );

    (import.meta as any).env = originalEnv;
  });
});
