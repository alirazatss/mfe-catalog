import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import WidgetDashboard from './WidgetDashboard.js';
import { mockUser } from '../test/mocks.js';
import * as navigation from '../utils/navigation.js';

// Mock navigateTo
const mockNavigateTo = vi.fn();
vi.spyOn(navigation, 'navigateTo').mockImplementation(mockNavigateTo);

describe('WidgetDashboard', () => {
  it('should render dashboard title', () => {
    render(
      <MemoryRouter>
        <WidgetDashboard />
      </MemoryRouter>
    );

    expect(screen.getByText('Widget Dashboard')).toBeInTheDocument();
  });

  it('should display welcome message when user is provided', () => {
    render(
      <MemoryRouter>
        <WidgetDashboard user={mockUser} />
      </MemoryRouter>
    );

    expect(screen.getByText(/Welcome,/)).toBeInTheDocument();
    expect(screen.getByText(mockUser.name)).toBeInTheDocument();
  });

  it('should not display welcome message when user is null', () => {
    render(
      <MemoryRouter>
        <WidgetDashboard user={null} />
      </MemoryRouter>
    );

    expect(screen.queryByText(/Welcome,/)).not.toBeInTheDocument();
  });

  it('should render navigation links', () => {
    render(
      <MemoryRouter>
        <WidgetDashboard />
      </MemoryRouter>
    );

    expect(screen.getByText('Counter Widget')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('should call navigateTo when cross-MFE navigation button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <MemoryRouter>
        <WidgetDashboard />
      </MemoryRouter>
    );

    const button = screen.getByText('Navigate to Home (Cross-MFE)');
    await user.click(button);

    expect(mockNavigateTo).toHaveBeenCalledWith('/');
  });

  it('should render cross-MFE navigation demo section', () => {
    render(
      <MemoryRouter>
        <WidgetDashboard />
      </MemoryRouter>
    );

    expect(screen.getByText('Cross-MFE Navigation Demo')).toBeInTheDocument();
    expect(screen.getByText(/Click the button below to navigate/)).toBeInTheDocument();
  });
});
