import { describe, it, expect, beforeEach, afterEach } from "vite-plus/test";
import { clearSlot, renderAccessDeniedIntoMain, renderNotFoundIntoMain } from "./slots.js";

function seedDom(): void {
  document.body.innerHTML = `
    <div id="app">
      <div id="header-slot"></div>
      <main id="main-slot"></main>
    </div>
    <template id="shell-template-not-found">
      <div class="shell-not-found">
        <h1>Not found</h1>
      </div>
    </template>
    <template id="shell-template-access-denied">
      <div class="shell-access-denied">
        <h1>Access denied</h1>
      </div>
    </template>
  `;
}

describe("slots", () => {
  beforeEach(() => {
    seedDom();
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("renderNotFoundIntoMain injects the not-found template", () => {
    renderNotFoundIntoMain();
    const main = document.getElementById("main-slot")!;
    expect(main.querySelector(".shell-not-found")).toBeTruthy();
    expect(main.textContent).toContain("Not found");
  });

  it("renderAccessDeniedIntoMain injects the access-denied template", () => {
    renderAccessDeniedIntoMain();
    const main = document.getElementById("main-slot")!;
    expect(main.querySelector(".shell-access-denied")).toBeTruthy();
    expect(main.textContent).toContain("Access denied");
  });

  it("renderNotFoundIntoMain replaces existing content", () => {
    const main = document.getElementById("main-slot")!;
    main.innerHTML = "<span>old content</span>";
    renderNotFoundIntoMain();
    expect(main.textContent).not.toContain("old content");
  });

  it("clearSlot empties an existing slot", () => {
    const header = document.getElementById("header-slot")!;
    header.innerHTML = "<span>hi</span>";
    clearSlot("header-slot");
    expect(header.innerHTML).toBe("");
  });

  it("clearSlot is a no-op for missing slots", () => {
    expect(() => clearSlot("does-not-exist")).not.toThrow();
  });

  it("does nothing when the template is missing", () => {
    document.getElementById("shell-template-not-found")?.remove();
    const main = document.getElementById("main-slot")!;
    main.innerHTML = "keep me";
    // Not throwing is the requirement; content is cleared regardless.
    expect(() => renderNotFoundIntoMain()).not.toThrow();
    expect(main.innerHTML).toBe("");
  });
});
