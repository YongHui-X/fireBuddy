import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ResetPassword from './ResetPassword';

const mocks = vi.hoisted(() => ({
  clearAuthError: vi.fn(),
  session: { user: { email: 'alex@example.com' } } as { user: { email: string } } | null,
  signOut: vi.fn(),
  updatePassword: vi.fn(),
}));

vi.mock('../app/FireBuddyProvider', async () => {
  const actual = await vi.importActual<typeof import('../app/FireBuddyProvider')>('../app/FireBuddyProvider');
  return {
    ...actual,
    useFireBuddy: () => ({
      authError: null,
      clearAuthError: mocks.clearAuthError,
      session: mocks.session,
      signOut: mocks.signOut,
      themeMode: 'light',
      toggleTheme: vi.fn(),
      updatePassword: mocks.updatePassword,
    }),
  };
});

describe('password recovery screen', () => {
  beforeEach(() => {
    mocks.clearAuthError.mockReset();
    mocks.session = { user: { email: 'alex@example.com' } };
    mocks.signOut.mockReset().mockResolvedValue(undefined);
    mocks.updatePassword.mockReset().mockResolvedValue(undefined);
  });

  it('shows an expired state without an authenticated recovery session', () => {
    mocks.session = null;
    render(<MemoryRouter><ResetPassword /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'Reset link unavailable' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Return to sign in' }).getAttribute('href')).toBe('/');
  });

  it('rejects mismatched passwords before calling Supabase', () => {
    render(<MemoryRouter><ResetPassword /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'secret12' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'different12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));

    expect(screen.getByRole('alert').textContent).toContain('do not match');
    expect(mocks.updatePassword).not.toHaveBeenCalled();
  });

  it('updates the password and signs out the recovery session', async () => {
    render(<MemoryRouter initialEntries={['/reset-password']}><ResetPassword /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'secret12' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'secret12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));

    await waitFor(() => expect(mocks.updatePassword).toHaveBeenCalledWith('secret12'));
    expect(mocks.signOut).toHaveBeenCalledOnce();
  });
});
