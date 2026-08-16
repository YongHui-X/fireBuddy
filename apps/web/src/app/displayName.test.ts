import { describe, expect, it } from 'vitest';

import { getDisplayName } from './displayName';

describe('getDisplayName', () => {
  it('prefers profile metadata and normalizes its case', () => {
    expect(getDisplayName({
      email: 'fallback@example.com',
      user_metadata: { name: 'bEN' },
    })).toBe('Ben');
  });

  it('turns a separated email prefix into a readable title-case name', () => {
    expect(getDisplayName({ email: 'ben.tan@example.com' })).toBe('Ben Tan');
  });

  it('uses the fallback when no user name is available', () => {
    expect(getDisplayName(null)).toBe('Demo user');
  });
});
