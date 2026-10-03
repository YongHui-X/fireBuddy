import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Profile from './Profile';

const mocks = vi.hoisted(() => ({
  setAiPreference: vi.fn(),
  notify: vi.fn(),
  toggleTheme: vi.fn(),
  exportAccount: vi.fn(),
  deleteAccountPermanently: vi.fn(),
  signOut: vi.fn(),
  createObjectUrl: vi.fn(),
  revokeObjectUrl: vi.fn(),
}));

vi.mock('../app/fireBuddyContext', async () => ({
  ...await vi.importActual<typeof import('../app/fireBuddyContext')>('../app/fireBuddyContext'),
  useFireBuddy: () => ({
    session: { access_token: 'access-token', user: { id: 'user-id', email: 'sam@example.com' } },
    themeMode: 'light', toggleTheme: mocks.toggleTheme, demoMode: false,
    aiPreference: 'off', aiPreferenceStatus: 'ready', setAiPreference: mocks.setAiPreference,
    profile: { id: 'user-id', email: 'sam@example.com', aiPreference: 'off', aiConsentedAt: null },
    notify: mocks.notify,
  }),
}));

vi.mock('../api', () => ({
  exportAccount: mocks.exportAccount,
  deleteAccountPermanently: mocks.deleteAccountPermanently,
}));

vi.mock('../supabase', () => ({ supabase: { auth: { signOut: mocks.signOut } } }));

function renderProfile() {
  return render(<MemoryRouter><Profile onRequestLogout={vi.fn()} /></MemoryRouter>);
}

describe('Profile AI and account controls', () => {
  beforeEach(() => {
    mocks.setAiPreference.mockReset().mockResolvedValue(undefined);
    mocks.notify.mockReset();
    mocks.exportAccount.mockReset().mockResolvedValue({ blob: new Blob(['{}']), filename: 'firebuddy-export.json' });
    mocks.deleteAccountPermanently.mockReset().mockResolvedValue(undefined);
    mocks.signOut.mockReset().mockResolvedValue(undefined);
    mocks.createObjectUrl.mockReset().mockReturnValue('blob:account-export');
    mocks.revokeObjectUrl.mockReset();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: mocks.createObjectUrl });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: mocks.revokeObjectUrl });
  });

  it('renders Off, Guide and Personalised radios with Off checked', () => {
    renderProfile();
    const group = screen.getByRole('radiogroup', { name: 'AI level' });
    expect(within(group).getByRole('radio', { name: 'Off' }).getAttribute('aria-checked')).toBe('true');
    expect(within(group).getByRole('radio', { name: 'Guide' }).getAttribute('aria-checked')).toBe('false');
    expect(within(group).getByRole('radio', { name: 'Personalised' }).getAttribute('aria-checked')).toBe('false');
  });

  it('clicking Guide saves that preference', async () => {
    renderProfile();
    fireEvent.click(screen.getByRole('radio', { name: 'Guide' }));
    await waitFor(() => expect(mocks.setAiPreference).toHaveBeenCalledWith('guide'));
  });

  it('Download my data exports through a temporary anchor', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    try {
      renderProfile();
      fireEvent.click(screen.getByRole('button', { name: /Download my data/ }));
      await waitFor(() => expect(mocks.exportAccount).toHaveBeenCalledWith('access-token'));
      await waitFor(() => expect(click).toHaveBeenCalledOnce());
      expect(mocks.createObjectUrl).toHaveBeenCalledOnce();
      expect(mocks.revokeObjectUrl).toHaveBeenCalledWith('blob:account-export');
    } finally {
      click.mockRestore();
    }
  });

  it('Delete account requires typed confirmation before deleting and signing out', async () => {
    renderProfile();
    fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete your account?' });
    const confirm = within(dialog).getByRole('button', { name: 'Delete account' }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Confirmation' }), { target: { value: 'DELETE' } });
    expect(confirm.disabled).toBe(false);
    fireEvent.click(confirm);
    await waitFor(() => expect(mocks.deleteAccountPermanently).toHaveBeenCalledWith('access-token'));
    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledOnce());
  });
});
