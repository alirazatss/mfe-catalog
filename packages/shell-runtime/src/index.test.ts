import { describe, expect, it } from "vite-plus/test";
import { createShellRuntime } from "./index.js";

describe("shell-runtime package surface", () => {
  it("can be imported without touching browser globals", async () => {
    const originalWindow = (globalThis as Record<string, unknown>).window;
    const originalDocument = (globalThis as Record<string, unknown>).document;

    Reflect.deleteProperty(globalThis as Record<string, unknown>, "window");
    Reflect.deleteProperty(globalThis as Record<string, unknown>, "document");

    const mod = await import("./index.js");

    expect(typeof mod.createShellRuntime).toBe("function");

    if (originalWindow !== undefined) {
      (globalThis as Record<string, unknown>).window = originalWindow;
    }
    if (originalDocument !== undefined) {
      (globalThis as Record<string, unknown>).document = originalDocument;
    }
  });

  it("rejects missing required adapters", () => {
    expect(() => createShellRuntime(undefined as never)).toThrow(/manifest/i);
  });
});
