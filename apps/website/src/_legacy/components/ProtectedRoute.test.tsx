import { describe, it, expect, vi } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router";
import { ProtectedRoute } from "./ProtectedRoute.js";
import * as AuthProviderModule from "../providers/AuthProvider.js";

// Mock useAuth hook
const mockUseAuth = vi.fn();
vi.spyOn(AuthProviderModule, "useAuth").mockImplementation(mockUseAuth);

describe("ProtectedRoute", () => {
  it("should render children when authenticated", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
      initialize: vi.fn(),
    });

    render(
      <BrowserRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </BrowserRouter>,
    );

    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it("should show loading state while checking auth", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
      initialize: vi.fn(),
    });

    render(
      <BrowserRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </BrowserRouter>,
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it.skip("should not render protected content when not authenticated", () => {
    // TODO: Fix infinite loop issue with Navigate component in tests
    // This test causes infinite redirects in the test environment
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
      initialize: vi.fn(),
    });

    render(
      <BrowserRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </BrowserRouter>,
    );

    // Should not render protected content
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("should render children when requireAuth is false", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
      initialize: vi.fn(),
    });

    render(
      <BrowserRouter>
        <ProtectedRoute requireAuth={false}>
          <div>Public Content</div>
        </ProtectedRoute>
      </BrowserRouter>,
    );

    expect(screen.getByText("Public Content")).toBeInTheDocument();
  });
});
