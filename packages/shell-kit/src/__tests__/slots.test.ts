import { describe, it, expect, beforeEach } from "vitest";
import { createSlotRenderers } from "../slots";

describe("Slot Renderers", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  describe("renderNotFound", () => {
    it("renders not-found template into slot", () => {
      document.body.innerHTML = `
        <div id="main-slot"></div>
        <template id="shell-template-not-found">
          <div class="not-found">Page not found</div>
        </template>
      `;

      const renderers = createSlotRenderers();
      renderers.renderNotFound("main-slot");

      const slot = document.getElementById("main-slot");
      expect(slot?.innerHTML).toContain("Page not found");
      expect(slot?.querySelector(".not-found")).toBeTruthy();
    });

    it("clears previous content before rendering", () => {
      document.body.innerHTML = `
        <div id="main-slot"><p>Old content</p></div>
        <template id="shell-template-not-found">
          <div class="not-found">Page not found</div>
        </template>
      `;

      const renderers = createSlotRenderers();
      renderers.renderNotFound("main-slot");

      const slot = document.getElementById("main-slot");
      expect(slot?.innerHTML).not.toContain("Old content");
      expect(slot?.innerHTML).toContain("Page not found");
    });

    it("does nothing if slot does not exist", () => {
      const renderers = createSlotRenderers();
      expect(() => renderers.renderNotFound("missing-slot")).not.toThrow();
    });

    it("accepts custom template ID", () => {
      document.body.innerHTML = `
        <div id="main-slot"></div>
        <template id="custom-404">
          <div class="custom">Custom 404</div>
        </template>
      `;

      const renderers = createSlotRenderers();
      renderers.renderNotFound("main-slot", "custom-404");

      const slot = document.getElementById("main-slot");
      expect(slot?.innerHTML).toContain("Custom 404");
    });
  });

  describe("renderAccessDenied", () => {
    it("renders access-denied template into slot", () => {
      document.body.innerHTML = `
        <div id="main-slot"></div>
        <template id="shell-template-access-denied">
          <div class="access-denied">Access denied</div>
        </template>
      `;

      const renderers = createSlotRenderers();
      renderers.renderAccessDenied("main-slot");

      const slot = document.getElementById("main-slot");
      expect(slot?.innerHTML).toContain("Access denied");
      expect(slot?.querySelector(".access-denied")).toBeTruthy();
    });

    it("clears previous content before rendering", () => {
      document.body.innerHTML = `
        <div id="main-slot"><p>Old content</p></div>
        <template id="shell-template-access-denied">
          <div class="access-denied">Access denied</div>
        </template>
      `;

      const renderers = createSlotRenderers();
      renderers.renderAccessDenied("main-slot");

      const slot = document.getElementById("main-slot");
      expect(slot?.innerHTML).not.toContain("Old content");
      expect(slot?.innerHTML).toContain("Access denied");
    });
  });

  describe("clearSlot", () => {
    it("clears slot content", () => {
      document.body.innerHTML = `
        <div id="main-slot"><p>Some content</p></div>
      `;

      const renderers = createSlotRenderers();
      renderers.clearSlot("main-slot");

      const slot = document.getElementById("main-slot");
      expect(slot?.innerHTML).toBe("");
    });

    it("does nothing if slot does not exist", () => {
      const renderers = createSlotRenderers();
      expect(() => renderers.clearSlot("missing-slot")).not.toThrow();
    });
  });
});
