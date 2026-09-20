import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SpendingPieChart } from './SpendingPieChart';

// Note: the SVG itself cannot be asserted on here. ResponsiveContainer sizes itself from a parent
// that jsdom reports as 0x0, so no slices or callout labels ever paint. The callout-collision
// behaviour is a visual check on a device; what is testable is the readout that replaces the
// hover tooltip on touch.

const data = [
  { name: 'Travel', value: 186, color: '#2B6A4F' },
  { name: 'Bills & Utilities', value: 98, color: '#35678A' },
];

describe('SpendingPieChart on a phone', () => {
  it('offers a tap readout instead of a hover tooltip on touch', () => {
    render(<SpendingPieChart data={data} labels="none" interaction="tap" />);

    // role="status" so a selection is announced without stealing focus.
    expect(screen.getByRole('status').textContent).toBe('Tap a slice for its share.');
  });

  it('has no readout when a pointer can hover, because the tooltip does that job', () => {
    render(<SpendingPieChart data={data} />);

    expect(screen.queryByRole('status')).toBeNull();
  });
});
