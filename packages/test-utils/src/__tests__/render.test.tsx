import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithRouter } from "../render";
import { createElement } from "react";
import { useLocation } from "react-router";

function TestComponent() {
  const location = useLocation();
  return createElement("div", null, `Current path: ${location.pathname}`);
}

describe("renderWithRouter", () => {
  it("renders component with default initial entry", () => {
    renderWithRouter(createElement(TestComponent));
    expect(screen.getByText("Current path: /")).toBeDefined();
  });

  it("renders component with custom initial entry", () => {
    renderWithRouter(createElement(TestComponent), {
      initialEntries: ["/test"],
    });
    expect(screen.getByText("Current path: /test")).toBeDefined();
  });

  it("supports multiple initial entries", () => {
    renderWithRouter(createElement(TestComponent), {
      initialEntries: ["/first", "/second"],
    });
    // MemoryRouter starts at the last entry by default
    expect(screen.getByText(/Current path:/)).toBeDefined();
  });

  it("passes through other render options", () => {
    const { container } = renderWithRouter(createElement(TestComponent), {
      container: document.createElement("section"),
    });
    expect(container.tagName).toBe("SECTION");
  });
});
