import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App from './App';

const mocks = vi.hoisted(() => ({
  session: null as { user: { email: string } } | null,
}));

vi.mock('./app/FireBuddyProvider', () => ({
  AppProvider: ({ children }: { children: ReactNode }) => children,
  useFireBuddy: () => ({
    authError: null,
    authLoading: false,
    clearAuthError: vi.fn(),
    session: mocks.session,
    signOut: vi.fn(),
    syncError: null,
    syncStatus: 'idle',
    themeMode: 'light',
    toggleTheme: vi.fn(),
    updatePassword: vi.fn(),
  }),
}));

describe('public application routes', () => {
  beforeEach(() => {
    mocks.session = null;
    window.history.pushState({}, '', '/');
  });

  it('shows legal pages without requiring a session', async () => {
    window.history.pushState({}, '', '/terms');
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Terms of use' })).toBeTruthy();
  });

  it('keeps legal pages public for signed-in users', async () => {
    mocks.session = { user: { email: 'alex@example.com' } };
    window.history.pushState({}, '', '/privacy');
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Privacy notice' })).toBeTruthy();
  });

  it('shows the invalid recovery state when a reset session is absent', async () => {
    window.history.pushState({}, '', '/reset-password');
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Reset link unavailable' })).toBeTruthy();
  });
});
