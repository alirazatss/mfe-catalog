import { describe, it, expect, vi } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import App from "./App.js";
import { mockUser } from "./test/mocks.js";
import * as apiClient from "./utils/apiClient.js";

// Mock setupAuthListeners
const mockSetupAuthListeners = vi.fn();
vi.spyOn(apiClient, "setupAuthListeners").mockImplementation(mockSetupAuthListeners);

describe("App", () => {
  it("should render with default props", () => {
    render(<App />);

    expect(screen.getByText("Widget Dashboard")).toBeInTheDocument();
  });

  it("should call setupAuthListeners on mount", () => {
    render(<App />);

    expect(mockSetupAuthListeners).toHaveBeenCalled();
  });

  it("should render WidgetDashboard at root path", () => {
    render(<App router="memory" />);

    expect(screen.getByText("Widget Dashboard")).toBeInTheDocument();
  });

  it("should pass user prop to WidgetDashboard", () => {
    render(<App router="memory" isAuthenticated={true} user={mockUser} />);

    expect(screen.getByText(/Welcome,/)).toBeInTheDocument();
    expect(screen.getByText(mockUser.name)).toBeInTheDocument();
  });

  it('should use MemoryRouter when router="memory"', () => {
    render(<App router="memory" />);

    // Should render without errors
    expect(screen.getByText("Widget Dashboard")).toBeInTheDocument();
  });

  it("should use BrowserRouter by default", () => {
    render(<App />);

    // Should render without errors
    expect(screen.getByText("Widget Dashboard")).toBeInTheDocument();
  });

  it("should apply basePath prop", () => {
    render(<App basePath="/widget" router="memory" />);

    expect(screen.getByText("Widget Dashboard")).toBeInTheDocument();
  });
});
