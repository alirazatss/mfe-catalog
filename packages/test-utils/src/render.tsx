/**
 * @mfe-runtime/test-utils — Render helpers
 *
 * Implements shared-test-utils / Shared test mocks and render helpers.
 * See openspec/changes/shared-boilerplate-packages/specs/shared-test-utils/spec.md
 */

import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { ReactElement, ReactNode } from "react";

interface WrapperProps {
  children: ReactNode;
}

/**
 * Render component with Router wrapper for MFE internal routing.
 *
 * Provides a MemoryRouter context for components that use routing,
 * allowing route assertions without a real browser history.
 *
 * @param ui - The React element to render
 * @param options - Render options including optional initial route entries
 * @returns Testing Library render result
 *
 * @example
 * ```ts
 * import { renderWithRouter } from "@mfe-runtime/test-utils";
 * import { screen } from "@testing-library/react";
 *
 * test("navigates to home", () => {
 *   renderWithRouter(<App />, { initialEntries: ["/home"] });
 *   expect(screen.getByText("Home Page")).toBeInTheDocument();
 * });
 * ```
 */
export function renderWithRouter(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper"> & { initialEntries?: string[] },
): RenderResult {
  const { initialEntries = ["/"], ...renderOptions } = options || {};

  function Wrapper({ children }: WrapperProps) {
    return <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>;
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}
