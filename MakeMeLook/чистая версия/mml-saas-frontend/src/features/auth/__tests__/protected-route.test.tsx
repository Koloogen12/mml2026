import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../protected-route';
import { useAuthStore } from '../auth-store';

vi.mock('../auth-store', () => ({
  useAuthStore: vi.fn(),
}));

describe('ProtectedRoute', () => {
  it('redirects to login when not authenticated', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      accessToken: null,
      setAuth: vi.fn(),
      setAccessToken: vi.fn(),
      clearAuth: vi.fn(),
      handleAuthResponse: vi.fn(),
      initialize: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/en/auth/login" element={<div>Login Page</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<div>Protected Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('shows spinner when loading', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      user: null,
      accessToken: null,
      setAuth: vi.fn(),
      setAccessToken: vi.fn(),
      clearAuth: vi.fn(),
      handleAuthResponse: vi.fn(),
      initialize: vi.fn(),
    });

    render(
      <BrowserRouter>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<div>Protected Content</div>} />
          </Route>
        </Routes>
      </BrowserRouter>,
    );

    // Spinner should be visible (animate-spin class on the inner div)
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('renders protected content when authenticated', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        status: 'active',
      },
      accessToken: 'token',
      setAuth: vi.fn(),
      setAccessToken: vi.fn(),
      clearAuth: vi.fn(),
      handleAuthResponse: vi.fn(),
      initialize: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/auth/login" element={<div>Login Page</div>} />
          <Route path="/auth/verify-email" element={<div>Verify Email</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<div>Protected Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});
