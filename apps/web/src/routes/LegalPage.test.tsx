import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import LegalPage from './LegalPage';

vi.mock('../app/fireBuddyContext', async () => {
  const actual = await vi.importActual<typeof import('../app/fireBuddyContext')>('../app/fireBuddyContext');
  return {
    ...actual,
    useFireBuddy: () => ({ themeMode: 'light', toggleTheme: vi.fn() }),
  };
});

describe('public legal pages', () => {
  it.each([
    ['terms', 'Terms of use', 'Educational purpose'],
    ['privacy', 'Privacy notice', 'Information handled'],
  ] as const)('renders the %s draft with FireBuddy navigation', (kind, title, section) => {
    render(<MemoryRouter><LegalPage kind={kind} /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: title })).toBeTruthy();
    expect(screen.getByText('Draft for review before production')).toBeTruthy();
    expect(screen.getByRole('heading', { name: section })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Back to FireBuddy' }).getAttribute('href')).toBe('/');
  });
});
