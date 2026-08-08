import { describe, it, expect, vi, beforeEach, afterEach } from "vite-plus/test";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { createMFELifecycle } from "../lifecycle";
import type { MFEProps } from "../types";

vi.mock("react-dom/client", () => ({
  createRoot: vi.fn(),
}));

describe("createMFELifecycle", () => {
  let mockRoot: {
    render: ReturnType<typeof vi.fn>;
    unmount: ReturnType<typeof vi.fn>;
  };
  let mockContainer: HTMLElement;

  beforeEach(() => {
    mockRoot = {
      render: vi.fn(),
      unmount: vi.fn(),
    };
    (createRoot as any).mockReturnValue(mockRoot);
    mockContainer = document.createElement("div");
    document.body.appendChild(mockContainer);
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("returns lifecycle functions", () => {
    const TestComponent = () => createElement("div", null, "Test");
    const lifecycle = createMFELifecycle({ Component: TestComponent });

    expect(lifecycle.bootstrap).toBeInstanceOf(Function);
    expect(lifecycle.mount).toBeInstanceOf(Function);
    expect(lifecycle.unmount).toBeInstanceOf(Function);
  });

  it("bootstrap resolves immediately", async () => {
    const TestComponent = () => createElement("div", null, "Test");
    const lifecycle = createMFELifecycle({ Component: TestComponent });

    await expect(lifecycle.bootstrap()).resolves.toBeUndefined();
  });

  describe("mount", () => {
    it("creates a root and renders component into container", async () => {
      const TestComponent = vi.fn(() => createElement("div", null, "Test"));
      const lifecycle = createMFELifecycle({ Component: TestComponent });

      const props: MFEProps = {
        container: mockContainer,
        basePath: "/",
        isAuthenticated: false,
      };

      await lifecycle.mount(props);

      expect(createRoot).toHaveBeenCalledWith(mockContainer);
      expect(mockRoot.render).toHaveBeenCalled();
    });

    it("wraps component in StrictMode", async () => {
      const TestComponent = () => createElement("div", null, "Test");
      const lifecycle = createMFELifecycle({ Component: TestComponent });

      const props: MFEProps = {
        container: mockContainer,
        basePath: "/",
        isAuthenticated: false,
      };

      await lifecycle.mount(props);

      const renderCall = mockRoot.render.mock.calls[0][0];
      // Check that the outer element is StrictMode (Symbol(react.strict_mode))
      expect(renderCall.type).toBeDefined();
      expect(String(renderCall.type)).toContain("react.strict_mode");
    });

    it("forwards all props to the component", async () => {
      const TestComponent = vi.fn(() => createElement("div", null, "Test"));
      const lifecycle = createMFELifecycle({ Component: TestComponent });

      const props: MFEProps & { user?: { name: string } } = {
        container: mockContainer,
        basePath: "/test",
        isAuthenticated: true,
        user: { name: "Test User" },
      };

      await lifecycle.mount(props);

      expect(mockRoot.render).toHaveBeenCalled();
      const renderCall = mockRoot.render.mock.calls[0][0];
      const componentElement = renderCall.props.children;
      expect(componentElement.props).toMatchObject({
        basePath: "/test",
        isAuthenticated: true,
        user: { name: "Test User" },
      });
    });

    it("unmounts existing root before creating new one on remount", async () => {
      const TestComponent = () => createElement("div", null, "Test");
      const lifecycle = createMFELifecycle({ Component: TestComponent });

      const props: MFEProps = {
        container: mockContainer,
        basePath: "/",
        isAuthenticated: false,
      };

      // First mount
      await lifecycle.mount(props);
      expect(createRoot).toHaveBeenCalledTimes(1);
      expect(mockRoot.render).toHaveBeenCalledTimes(1);

      // Remount to same container
      await lifecycle.mount(props);
      expect(mockRoot.unmount).toHaveBeenCalledTimes(1);
      expect(createRoot).toHaveBeenCalledTimes(2);
      expect(mockRoot.render).toHaveBeenCalledTimes(2);
    });

    it("maintains separate roots for different containers", async () => {
      const TestComponent = () => createElement("div", null, "Test");
      const lifecycle = createMFELifecycle({ Component: TestComponent });

      const container1 = document.createElement("div");
      const container2 = document.createElement("div");

      await lifecycle.mount({
        container: container1,
        basePath: "/",
        isAuthenticated: false,
      });

      await lifecycle.mount({
        container: container2,
        basePath: "/",
        isAuthenticated: false,
      });

      expect(createRoot).toHaveBeenCalledTimes(2);
      expect(createRoot).toHaveBeenCalledWith(container1);
      expect(createRoot).toHaveBeenCalledWith(container2);
    });
  });

  describe("unmount", () => {
    it("unmounts the root and cleans up bookkeeping", async () => {
      const TestComponent = () => createElement("div", null, "Test");
      const lifecycle = createMFELifecycle({ Component: TestComponent });

      const props: MFEProps = {
        container: mockContainer,
        basePath: "/",
        isAuthenticated: false,
      };

      await lifecycle.mount(props);
      await lifecycle.unmount(props);

      expect(mockRoot.unmount).toHaveBeenCalledTimes(1);
    });

    it("does nothing if container was not mounted", async () => {
      const TestComponent = () => createElement("div", null, "Test");
      const lifecycle = createMFELifecycle({ Component: TestComponent });

      const props: MFEProps = {
        container: mockContainer,
        basePath: "/",
        isAuthenticated: false,
      };

      await expect(lifecycle.unmount(props)).resolves.toBeUndefined();
      expect(mockRoot.unmount).not.toHaveBeenCalled();
    });

    it("allows remount after unmount", async () => {
      const TestComponent = () => createElement("div", null, "Test");
      const lifecycle = createMFELifecycle({ Component: TestComponent });

      const props: MFEProps = {
        container: mockContainer,
        basePath: "/",
        isAuthenticated: false,
      };

      await lifecycle.mount(props);
      await lifecycle.unmount(props);
      await lifecycle.mount(props);

      expect(createRoot).toHaveBeenCalledTimes(2);
      expect(mockRoot.render).toHaveBeenCalledTimes(2);
      expect(mockRoot.unmount).toHaveBeenCalledTimes(1);
    });
  });
});
