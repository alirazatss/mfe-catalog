import { render, type RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { ReactElement, ReactNode } from 'react';

interface WrapperProps {
  children: ReactNode;
}

/**
 * Render component with Router wrapper for MFE internal routing
 */
export function renderWithRouter(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & { initialEntries?: string[] }
) {
  const { initialEntries = ['/'], ...renderOptions } = options || {};

  function Wrapper({ children }: WrapperProps) {
    return <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>;
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}
