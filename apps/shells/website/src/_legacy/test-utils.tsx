import { render, type RenderOptions } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import type { ReactElement, ReactNode } from "react";
import { AuthProvider } from "../providers/AuthProvider.js";

interface WrapperProps {
  children: ReactNode;
}

/**
 * Render component with Router wrapper
 */
export function renderWithRouter(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  function Wrapper({ children }: WrapperProps) {
    return <BrowserRouter>{children}</BrowserRouter>;
  }

  return render(ui, { wrapper: Wrapper, ...options });
}

/**
 * Render component with Auth + Router wrapper
 */
export function renderWithAuth(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  function Wrapper({ children }: WrapperProps) {
    return (
      <BrowserRouter>
        <AuthProvider>{children}</AuthProvider>
      </BrowserRouter>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}
