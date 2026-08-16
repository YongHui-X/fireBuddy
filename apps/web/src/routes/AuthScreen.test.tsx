import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AuthScreen from './AuthScreen';

const mocks = vi.hoisted(() => ({
  clearAuthError: vi.fn(),
  requestPasswordReset: vi.fn(),
  signIn: vi.fn(),
  signUp: vi.fn(),
  toggleTheme: vi.fn(),
}));

vi.mock('../app/FireBuddyProvider', async () => {
  const actual = await vi.importActual<typeof import('../app/FireBuddyProvider')>('../app/FireBuddyProvider');
  return {
    ...actual,
    useFireBuddy: () => ({
      authError: null,
      clearAuthError: mocks.clearAuthError,
      requestPasswordReset: mocks.requestPasswordReset,
      signIn: mocks.signIn,
      signUp: mocks.signUp,
      themeMode: 'dark',
      toggleTheme: mocks.toggleTheme,
    }),
  };
});

describe('FireBuddy authentication screen', () => {
  beforeEach(() => {
    mocks.clearAuthError.mockReset();
    mocks.requestPasswordReset.mockReset().mockResolvedValue(undefined);
    mocks.signIn.mockReset().mockResolvedValue(undefined);
    mocks.signUp.mockReset().mockResolvedValue(undefined);
    mocks.toggleTheme.mockReset();
  });

  it('signs in with trimmed email and exposes the reference page details', async () => {
    render(<MemoryRouter><AuthScreen /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeTruthy();
    expect(screen.getByText('Sign in to continue your FIRE journey.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'FireBuddy sign in' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Terms' }).getAttribute('href')).toBe('/terms');
    expect(screen.getByRole('link', { name: 'Privacy' }).getAttribute('href')).toBe('/privacy');

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: '  alex@example.com  ' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(mocks.signIn).toHaveBeenCalledWith('alex@example.com', 'secret12'));
  });

  it('switches password visibility and toggles to light mode', () => {
    render(<MemoryRouter><AuthScreen /></MemoryRouter>);

    const password = screen.getByLabelText('Password') as HTMLInputElement;
    expect(password.type).toBe('password');
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password.type).toBe('text');

    fireEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }));
    expect(mocks.toggleTheme).toHaveBeenCalledOnce();
  });

  it('fills the forgot password state without sending until submit', async () => {
    render(<MemoryRouter><AuthScreen /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'alex@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));

    expect(screen.getByRole('heading', { name: 'Reset your password' })).toBeTruthy();
    expect(mocks.requestPasswordReset).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

    await waitFor(() => expect(mocks.requestPasswordReset).toHaveBeenCalledWith('alex@example.com'));
    expect(screen.getByRole('status').textContent).toContain('If an account exists');
  });

  it('preserves account creation behavior', async () => {
    render(<MemoryRouter><AuthScreen /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'Create one' }));
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(mocks.signUp).toHaveBeenCalledWith('new@example.com', 'secret12'));
  });
});
