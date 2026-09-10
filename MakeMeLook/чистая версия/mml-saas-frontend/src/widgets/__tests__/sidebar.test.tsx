import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Sidebar } from '../sidebar';

describe('Sidebar', () => {
  it('renders navigation items', () => {
    render(
      <BrowserRouter>
        <Sidebar collapsed={false} onToggleCollapse={vi.fn()} />
      </BrowserRouter>,
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
  });

  it('shows collapse button in expanded mode', () => {
    render(
      <BrowserRouter>
        <Sidebar collapsed={false} onToggleCollapse={vi.fn()} />
      </BrowserRouter>,
    );

    expect(screen.getByText('Collapse')).toBeInTheDocument();
  });

  it('renders in collapsed mode', () => {
    render(
      <BrowserRouter>
        <TooltipProvider>
          <Sidebar collapsed={true} onToggleCollapse={vi.fn()} />
        </TooltipProvider>
      </BrowserRouter>,
    );

    // Labels should not be visible in collapsed mode (hidden by CSS/SR-only)
    expect(screen.queryByText('Collapse')).not.toBeInTheDocument();
  });
});
