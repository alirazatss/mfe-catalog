import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import Layout from "./Layout.js";
import { mockUser } from "../test/mocks.js";
import * as AuthProviderModule from "../providers/AuthProvider.js";

// Mock useAuth hook
const mockUseAuth = vi.fn();
vi.spyOn(AuthProviderModule, "useAuth").mockImplementation(mockUseAuth);

describe("Layout", () => {
  it("should display login link when not authenticated", () => {
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
        <Layout />
      </BrowserRouter>,
    );

    expect(screen.getByText("Login")).toBeInTheDocument();
    expect(screen.queryByText("Logout")).not.toBeInTheDocument();
  });

  it("should display logout button when authenticated", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: mockUser,
      login: vi.fn(),
      logout: vi.fn(),
      initialize: vi.fn(),
    });

    render(
      <BrowserRouter>
        <Layout />
      </BrowserRouter>,
    );

    expect(screen.getByText("Logout")).toBeInTheDocument();
    expect(screen.queryByText("Login")).not.toBeInTheDocument();
  });

  it("should display user name when authenticated", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: mockUser,
      login: vi.fn(),
      logout: vi.fn(),
      initialize: vi.fn(),
    });

    render(
      <BrowserRouter>
        <Layout />
      </BrowserRouter>,
    );

    expect(screen.getByText(mockUser.name)).toBeInTheDocument();
  });

  it("should display user email when name is not available", () => {
    const userWithoutName = { ...mockUser, name: undefined };

    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: userWithoutName,
      login: vi.fn(),
      logout: vi.fn(),
      initialize: vi.fn(),
    });

    render(
      <BrowserRouter>
        <Layout />
      </BrowserRouter>,
    );

    expect(screen.getByText(mockUser.email)).toBeInTheDocument();
  });

  it("should call logout when logout button is clicked", async () => {
    const user = userEvent.setup();
    const mockLogout = vi.fn().mockResolvedValue(undefined);

    // Mock window.location.href
    const originalLocation = window.location;
    delete (window as any).location;
    window.location = Object.assign({}, originalLocation, { href: "" }) as any;

    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: mockUser,
      login: vi.fn(),
      logout: mockLogout,
      initialize: vi.fn(),
    });

    render(
      <BrowserRouter>
        <Layout />
      </BrowserRouter>,
    );

    const logoutButton = screen.getByText("Logout");
    await user.click(logoutButton);

    expect(mockLogout).toHaveBeenCalled();

    // Restore window.location
    window.location = originalLocation as any;
  });

  it("should render navigation links", () => {
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
        <Layout />
      </BrowserRouter>,
    );

    expect(screen.getByText("MF Mono")).toBeInTheDocument();
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Widget")).toBeInTheDocument();
  });

  it("should render children when provided", () => {
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
        <Layout>
          <div>Custom Content</div>
        </Layout>
      </BrowserRouter>,
    );

    expect(screen.getByText("Custom Content")).toBeInTheDocument();
  });
});
