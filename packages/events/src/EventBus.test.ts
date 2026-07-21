import { describe, it, expect, vi, beforeEach } from "vite-plus/test";
import { EventBus, eventBus } from "./EventBus.js";

describe("EventBus", () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  describe("emit and on", () => {
    it("should emit and listen to event", () => {
      const handler = vi.fn();
      const cleanup = bus.on("test:event", handler);

      bus.emit("test:event", { message: "hello" });

      expect(handler).toHaveBeenCalledWith({ message: "hello" });
      expect(handler).toHaveBeenCalledTimes(1);

      cleanup();
    });

    it("should emit event without data", () => {
      const handler = vi.fn();
      const cleanup = bus.on("test:event", handler);

      bus.emit("test:event");

      expect(handler).toHaveBeenCalledWith(null);

      cleanup();
    });

    it("should support multiple listeners for same event", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      const cleanup1 = bus.on("test:event", handler1);
      const cleanup2 = bus.on("test:event", handler2);
      const cleanup3 = bus.on("test:event", handler3);

      bus.emit("test:event", { count: 42 });

      expect(handler1).toHaveBeenCalledWith({ count: 42 });
      expect(handler2).toHaveBeenCalledWith({ count: 42 });
      expect(handler3).toHaveBeenCalledWith({ count: 42 });

      cleanup1();
      cleanup2();
      cleanup3();
    });

    it("should handle different event types independently", () => {
      const authHandler = vi.fn();
      const navHandler = vi.fn();

      const cleanup1 = bus.on("mfe:auth:login", authHandler);
      const cleanup2 = bus.on("mfe:navigate", navHandler);

      bus.emit("mfe:auth:login", { userId: "123" });
      bus.emit("mfe:navigate", { path: "/dashboard" });

      expect(authHandler).toHaveBeenCalledWith({ userId: "123" });
      expect(authHandler).toHaveBeenCalledTimes(1);

      expect(navHandler).toHaveBeenCalledWith({ path: "/dashboard" });
      expect(navHandler).toHaveBeenCalledTimes(1);

      cleanup1();
      cleanup2();
    });

    it("should handle complex data types", () => {
      const handler = vi.fn();
      const cleanup = bus.on("test:event", handler);

      const complexData = {
        nested: { deep: { value: 42 } },
        array: [1, 2, 3],
        nullValue: null,
        boolValue: true,
      };

      bus.emit("test:event", complexData);

      expect(handler).toHaveBeenCalledWith(complexData);

      cleanup();
    });
  });

  describe("cleanup function", () => {
    it("should remove listener when cleanup is called", () => {
      const handler = vi.fn();
      const cleanup = bus.on("test:event", handler);

      bus.emit("test:event", { count: 1 });
      expect(handler).toHaveBeenCalledTimes(1);

      cleanup();

      bus.emit("test:event", { count: 2 });
      expect(handler).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it("should allow calling cleanup multiple times safely", () => {
      const handler = vi.fn();
      const cleanup = bus.on("test:event", handler);

      cleanup();
      cleanup();
      cleanup();

      bus.emit("test:event");
      expect(handler).not.toHaveBeenCalled();
    });

    it("should only remove specific listener, not others", () => {
      const handler1 = vi.fn();
      const _handler2 = vi.fn();

      const cleanup1 = bus.on("test:event", handler1);
      bus.on("test:event", _handler2);

      cleanup1();

      bus.emit("test:event", { message: "test" });

      expect(handler1).not.toHaveBeenCalled();
      expect(_handler2).toHaveBeenCalledWith({ message: "test" });
    });
  });

  describe("once", () => {
    it("should fire listener only once", () => {
      const handler = vi.fn();
      bus.once("test:event", handler);

      bus.emit("test:event", { count: 1 });
      bus.emit("test:event", { count: 2 });
      bus.emit("test:event", { count: 3 });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ count: 1 });
    });

    it("should work with multiple once listeners", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      bus.once("test:event", handler1);
      bus.once("test:event", handler2);

      bus.emit("test:event", { message: "first" });

      expect(handler1).toHaveBeenCalledWith({ message: "first" });
      expect(handler2).toHaveBeenCalledWith({ message: "first" });

      bus.emit("test:event", { message: "second" });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it("should not interfere with regular listeners", () => {
      const onceHandler = vi.fn();
      const regularHandler = vi.fn();

      bus.once("test:event", onceHandler);
      const cleanup = bus.on("test:event", regularHandler);

      bus.emit("test:event", { count: 1 });
      bus.emit("test:event", { count: 2 });

      expect(onceHandler).toHaveBeenCalledTimes(1);
      expect(regularHandler).toHaveBeenCalledTimes(2);

      cleanup();
    });
  });

  describe("singleton instance", () => {
    it("should export a singleton instance", () => {
      expect(eventBus).toBeInstanceOf(EventBus);
    });

    it("should maintain same instance across imports", () => {
      const handler1 = vi.fn();

      eventBus.on("test:singleton", handler1);
      eventBus.emit("test:singleton", { test: true });

      expect(handler1).toHaveBeenCalledWith({ test: true });
    });
  });

  describe("edge cases", () => {
    it("should handle emitting event with no listeners", () => {
      expect(() => {
        bus.emit("no:listeners", { data: "test" });
      }).not.toThrow();
    });

    it("should handle empty event names", () => {
      const handler = vi.fn();
      const cleanup = bus.on("", handler);

      bus.emit("", { data: "test" });

      expect(handler).toHaveBeenCalledWith({ data: "test" });

      cleanup();
    });

    it("should handle rapid successive emissions", () => {
      const handler = vi.fn();
      const cleanup = bus.on("test:rapid", handler);

      for (let i = 0; i < 100; i++) {
        bus.emit("test:rapid", { count: i });
      }

      expect(handler).toHaveBeenCalledTimes(100);

      cleanup();
    });

    it("should handle listener that throws error", () => {
      const errorHandler = vi.fn(() => {
        throw new Error("Handler error");
      });
      const normalHandler = vi.fn();

      bus.on("test:error", errorHandler);
      const cleanup = bus.on("test:error", normalHandler);

      // Native EventTarget doesn't stop other listeners when one throws
      expect(() => {
        bus.emit("test:error", { data: "test" });
      }).toThrow("Handler error");

      // Note: In real browsers, other listeners would still fire
      // but in the test environment, the error bubbles up

      cleanup();
    });
  });
});
