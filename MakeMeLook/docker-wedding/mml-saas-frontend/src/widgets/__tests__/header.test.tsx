import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Header } from '../header';
import { useAuthStore } from '@/features/auth/auth-store';

vi.mock('@/features/auth/auth-store', () => ({
  useAuthStore: vi.fn(),
}));

describe('Header', () => {
  beforeEach(() => {
    vi.mocked(useAuthStore).mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (selector: (state: any) => any) =>
        selector({
          user: {
            id: 1,
            email: 'test@example.com',
            name: 'Test User',
            status: 'active',
          },
          accessToken: 'token',
          isAuthenticated: true,
          isLoading: false,
          setAuth: vi.fn(),
          setAccessToken: vi.fn(),
          clearAuth: vi.fn(),
          handleAuthResponse: vi.fn(),
          initialize: vi.fn(),
        }),
    );
  });

  it('renders user name', () => {
    render(
      <BrowserRouter>
        <Header onMobileMenuToggle={vi.fn()} />
      </BrowserRouter>,
    );

    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('renders navigation elements', () => {
    render(
      <BrowserRouter>
        <Header onMobileMenuToggle={vi.fn()} />
      </BrowserRouter>,
    );

    // Breadcrumbs should be present
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });
});
