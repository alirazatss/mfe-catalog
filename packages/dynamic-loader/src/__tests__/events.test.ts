import { describe, it, expect, beforeEach, vi } from "vitest";
import { LoaderEvents } from "../events.js";

describe("LoaderEvents", () => {
  let events: LoaderEvents;

  beforeEach(() => {
    events = new LoaderEvents();
  });

  describe("Event Registration", () => {
    it("should register an event listener", () => {
      const listener = vi.fn();
      events.on("config:fetch:success", listener);

      events.emit("config:fetch:success", { config: { remotes: [] } });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({ config: { remotes: [] } });
    });

    it("should return unsubscribe function", () => {
      const listener = vi.fn();
      const unsubscribe = events.on("config:fetch:success", listener);

      unsubscribe();
      events.emit("config:fetch:success", { config: { remotes: [] } });

      expect(listener).not.toHaveBeenCalled();
    });

    it("should support multiple listeners for same event", () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      events.on("config:fetch:success", listener1);
      events.on("config:fetch:success", listener2);

      events.emit("config:fetch:success", { config: { remotes: [] } });

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });
  });

  describe("Event Removal", () => {
    it("should remove specific event listener", () => {
      const listener = vi.fn();
      events.on("config:fetch:success", listener);

      events.off("config:fetch:success", listener);
      events.emit("config:fetch:success", { config: { remotes: [] } });

      expect(listener).not.toHaveBeenCalled();
    });

    it("should clear all listeners for an event", () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      events.on("config:fetch:success", listener1);
      events.on("config:fetch:success", listener2);

      events.clear("config:fetch:success");
      events.emit("config:fetch:success", { config: { remotes: [] } });

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });

    it("should clear all listeners for all events", () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      events.on("config:fetch:success", listener1);
      events.on("remote:load:success", listener2);

      events.clear();
      events.emit("config:fetch:success", { config: { remotes: [] } });
      events.emit("remote:load:success", { name: "test", container: {} });

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });
  });

  describe("Event Emission", () => {
    it("should emit events to registered listeners", () => {
      const listener = vi.fn();
      events.on("remote:load:start", listener);

      events.emit("remote:load:start", { name: "mfe-widget" });

      expect(listener).toHaveBeenCalledWith({ name: "mfe-widget" });
    });

    it("should handle listener errors gracefully", () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      const throwingListener = vi.fn(() => {
        throw new Error("Listener error");
      });
      const normalListener = vi.fn();

      events.on("config:fetch:success", throwingListener);
      events.on("config:fetch:success", normalListener);

      events.emit("config:fetch:success", { config: { remotes: [] } });

      expect(consoleError).toHaveBeenCalled();
      expect(normalListener).toHaveBeenCalled();

      consoleError.mockRestore();
    });

    it("should not throw if no listeners registered", () => {
      expect(() => {
        events.emit("config:fetch:success", { config: { remotes: [] } });
      }).not.toThrow();
    });
  });
});
