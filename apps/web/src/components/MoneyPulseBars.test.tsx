import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MoneyPulseBars } from './MoneyPulseBars';

describe('Money Pulse bars', () => {
  it('uses the same scale for all three amounts', () => {
    render(<MoneyPulseBars income={5000} expenses={3000} savings={2000} savingsRate={0.4} />);
    const bars = screen.getAllByRole('img');
    expect(bars.map(bar => (bar.firstElementChild as HTMLElement).style.width)).toEqual(['100%', '60%', '40%']);
    expect(screen.getByText('40.0%')).toBeTruthy();
  });

  it('keeps a negative savings amount visible as a deficit', () => {
    render(<MoneyPulseBars income={1000} expenses={2000} savings={-1000} savingsRate={-1} />);
    const deficit = screen.getByRole('img', { name: /Savings:.*deficit/ });
    expect((deficit.firstElementChild as HTMLElement).style.width).toBe('50%');
    expect((deficit.firstElementChild as HTMLElement).style.backgroundColor).toBe('var(--expense)');
    expect(screen.getByText('-100.0%')).toBeTruthy();
  });

  it('renders zero and unavailable values without fabricated bar lengths', () => {
    render(<MoneyPulseBars income={0} expenses={0} savings={null} savingsRate={null} />);
    expect(screen.getByRole('img', { name: 'Savings: unavailable' })).toBeTruthy();
    expect(screen.getAllByRole('img').every(bar => (bar.firstElementChild as HTMLElement).style.width === '0%')).toBe(true);
  });
});
