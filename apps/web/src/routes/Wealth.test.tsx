import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WealthPosition } from '@firebuddy/shared';
import Wealth from './Wealth';
import { setViewportWidth, viewports } from '../test/viewport';

const now = '2026-09-01T00:00:00.000Z';
const today = new Date().toLocaleDateString('en-CA');
function position(id: string, name: string, values: Partial<WealthPosition> = {}): WealthPosition {
  return {
    id, userId: 'u', name, positionKind: 'asset', positionType: 'cash', liquidityClass: 'liquid', includeInFi: true, isEmergencyFund: false,
    restrictionType: 'none', currency: 'SGD', interestRate: null, monthlyPayment: null, nextPaymentDate: null, originalPrincipal: null,
    isArchived: false, archivedAt: null, latestSnapshot: null, createdAt: now, updatedAt: now, ...values,
  };
}
const snapshot = (positionId: string, amount: string) => ({ id: `${positionId}-snap`, userId: 'u', wealthPositionId: positionId, valueDate: '2026-09-01', amount, createdAt: now, updatedAt: now });

const state = vi.hoisted(() => ({
  positions: [] as WealthPosition[], snapshots: [] as ReturnType<typeof snapshot>[],
  addPosition: vi.fn(), editPosition: vi.fn(), removePosition: vi.fn(), addSnapshot: vi.fn(), addContribution: vi.fn(), loadSnapshotHistory: vi.fn(),
}));
vi.mock('../app/fireBuddyContext', async () => ({
  ...await vi.importActual('../app/fireBuddyContext'), useFireBuddy: () => ({ transactions: [] }),
}));
vi.mock('../app/financialFoundationContext', () => ({ useFinancialFoundation: () => ({
  positions: state.positions, snapshots: state.snapshots, contributions: [], demoMode: true, error: null,
  addPosition: state.addPosition, editPosition: state.editPosition, removePosition: state.removePosition,
  addSnapshot: state.addSnapshot, removeSnapshot: vi.fn(), addContribution: state.addContribution, removeContribution: vi.fn(), loadSnapshotHistory: state.loadSnapshotHistory,
}) }));

const openAdd = () => { fireEvent.click(screen.getByRole('button', { name: 'Add' })); return screen.getByRole('dialog', { name: 'Add to your wealth' }); };
const openEdit = (name: string) => { fireEvent.click(screen.getByRole('button', { name: `Edit ${name}` })); return screen.getByRole('dialog', { name: `Edit ${name}` }); };

describe('wealth positions', () => {
  beforeEach(() => {
    setViewportWidth(viewports.desktop);
    for (const fn of [state.addPosition, state.editPosition, state.removePosition, state.addSnapshot, state.addContribution]) fn.mockReset().mockResolvedValue(undefined);
    state.positions = [
      position('cash', 'Cash reserve', { isEmergencyFund: true }),
      position('srs', 'SRS account', { positionType: 'investment', liquidityClass: 'restricted', restrictionType: 'other_restricted' }),
      position('car', 'Car loan', { positionKind: 'liability', positionType: 'loan', liquidityClass: 'less_liquid', includeInFi: false, interestRate: '0.0350', monthlyPayment: '546.50', originalPrincipal: '40000.00' }),
      position('card', 'Visa', { positionKind: 'liability', positionType: 'credit_card', includeInFi: false, interestRate: '0.2600', monthlyPayment: '100.00' }),
      position('old', 'Old loan', { positionKind: 'liability', positionType: 'loan', liquidityClass: 'less_liquid', includeInFi: false }),
    ];
    state.snapshots = [snapshot('cash', '31200'), snapshot('srs', '20000'), snapshot('car', '30000'), snapshot('card', '12000'), snapshot('old', '500')];
  });

  it('shows net worth headlines and groups liabilities with signed balances and payoff outlooks', () => {
    render(<MemoryRouter><Wealth /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Net worth' }).nextElementSibling!.textContent).toBe('S$8,700');
    const assets = screen.getByRole('article', { name: 'Assets' });
    const liabilities = screen.getByRole('article', { name: 'Liabilities' });
    expect(within(assets).getByText('Cash reserve')).toBeTruthy();
    expect(within(assets).getByText('Cash · Counts toward FI · Emergency fund')).toBeTruthy();
    expect(within(assets).getByText('Investment · Locked until retirement · Counts toward FI')).toBeTruthy();
    expect(within(assets).queryByText('Car loan')).toBeNull();
    expect(within(liabilities).getByText('−S$42,500')).toBeTruthy();
    expect(within(liabilities).getByText('−S$30,000')).toBeTruthy();
    expect(within(liabilities).getByText(/Paid off by .* 2031 · S\$2,7\d\d interest left/)).toBeTruthy();
    expect(within(liabilities).getByText('Payment does not cover monthly interest').className).toBe('payoff-warning');
    expect(within(liabilities).getByText('Add rate and payment to see payoff')).toBeTruthy();
    expect(within(liabilities).getByLabelText('25% repaid')).toBeTruthy();
  });

  it('adds an asset, a debt and a contribution from one sheet with switchable tabs', async () => {
    render(<MemoryRouter><Wealth /></MemoryRouter>);
    const sheet = openAdd();
    expect(within(sheet).getByRole('tab', { name: 'Asset', selected: true })).toBeTruthy();
    expect(within(sheet).queryByLabelText('Interest rate (% per year)')).toBeNull();
    fireEvent.change(within(sheet).getByLabelText('Name'), { target: { value: 'Brokerage' } });
    fireEvent.change(within(sheet).getByLabelText('Type'), { target: { value: 'investment' } });
    fireEvent.change(within(sheet).getByLabelText('Current value (SGD)'), { target: { value: '5000' } });
    fireEvent.click(within(sheet).getByLabelText(/Locked until retirement/));
    fireEvent.click(within(sheet).getByRole('button', { name: 'Add asset' }));
    await waitFor(() => expect(state.addPosition).toHaveBeenCalledTimes(1));
    expect(state.addPosition.mock.calls[0][0]).toMatchObject({ name: 'Brokerage', positionKind: 'asset', positionType: 'investment', liquidityClass: 'restricted', restrictionType: 'other_restricted', includeInFi: true, isEmergencyFund: false });
    expect(state.addPosition.mock.calls[0][1]).toEqual({ valueDate: today, amount: '5000.00' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    const debtSheet = openAdd();
    fireEvent.click(within(debtSheet).getByRole('tab', { name: 'Debt' }));
    expect((within(debtSheet).getByLabelText('Type') as HTMLSelectElement).value).toBe('loan');
    expect(within(debtSheet).queryByLabelText(/Counts toward FI/)).toBeNull();
    fireEvent.change(within(debtSheet).getByLabelText('Name'), { target: { value: 'Reno loan' } });
    fireEvent.change(within(debtSheet).getByLabelText('Amount owed today (SGD)'), { target: { value: '15000' } });
    fireEvent.change(within(debtSheet).getByLabelText('Interest rate (% per year)'), { target: { value: '6.5' } });
    fireEvent.change(within(debtSheet).getByLabelText('Monthly payment (SGD)'), { target: { value: '450' } });
    fireEvent.click(within(debtSheet).getByRole('button', { name: 'Add debt' }));
    await waitFor(() => expect(state.addPosition).toHaveBeenCalledTimes(2));
    const [input, initialSnapshot] = state.addPosition.mock.calls[1];
    expect(input).toMatchObject({ positionKind: 'liability', positionType: 'loan', includeInFi: false, interestRate: '0.0650', monthlyPayment: '450.00', nextPaymentDate: null, originalPrincipal: '15000.00' });
    expect(initialSnapshot.amount).toBe('15000.00');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    const contributionSheet = openAdd();
    fireEvent.click(within(contributionSheet).getByRole('tab', { name: 'Contribution' }));
    fireEvent.change(within(contributionSheet).getByLabelText('FI asset'), { target: { value: 'srs' } });
    fireEvent.change(within(contributionSheet).getByLabelText('Amount (SGD)'), { target: { value: '800' } });
    fireEvent.click(within(contributionSheet).getByRole('button', { name: 'Save contribution' }));
    await waitFor(() => expect(state.addContribution).toHaveBeenCalledWith({ wealthPositionId: 'srs', amount: '800.00', contributionDate: today, note: null }));
  });

  it('records an edited value as a new dated snapshot without rewriting the position', async () => {
    render(<MemoryRouter><Wealth /></MemoryRouter>);
    const sheet = openEdit('Cash reserve');
    expect((within(sheet).getByLabelText('Value (SGD)') as HTMLInputElement).value).toBe('31200');
    expect(within(sheet).getByText(/Last recorded S\$31,200 on 2026-09-01/)).toBeTruthy();
    fireEvent.change(within(sheet).getByLabelText('Value (SGD)'), { target: { value: '33000' } });
    fireEvent.click(within(sheet).getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(state.addSnapshot).toHaveBeenCalledWith('cash', { valueDate: today, amount: '33000.00' }));
    expect(state.editPosition).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('saves only the changed details and unlocks a restricted asset', async () => {
    render(<MemoryRouter><Wealth /></MemoryRouter>);
    const sheet = openEdit('SRS account');
    expect((within(sheet).getByLabelText(/Locked until retirement/) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(within(sheet).getByLabelText(/Locked until retirement/));
    fireEvent.change(within(sheet).getByLabelText('Name'), { target: { value: 'Brokerage' } });
    fireEvent.click(within(sheet).getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(state.editPosition).toHaveBeenCalledWith('srs', { name: 'Brokerage', liquidityClass: 'less_liquid', restrictionType: 'none' }));
    expect(state.addSnapshot).not.toHaveBeenCalled();
  });

  it('edits saved debt terms from the liability row without touching the balance', async () => {
    render(<MemoryRouter><Wealth /></MemoryRouter>);
    const sheet = openEdit('Car loan');
    expect((within(sheet).getByLabelText('Interest rate (% per year)') as HTMLInputElement).value).toBe('3.5');
    expect((within(sheet).getByLabelText('Amount owed (SGD)') as HTMLInputElement).value).toBe('30000');
    fireEvent.change(within(sheet).getByLabelText('Monthly payment (SGD)'), { target: { value: '600' } });
    fireEvent.click(within(sheet).getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(state.editPosition).toHaveBeenCalledWith('car', { monthlyPayment: '600.00' }));
    expect(state.addSnapshot).not.toHaveBeenCalled();
  });

  it('keeps the sheet open and shows the failure when a save is rejected', async () => {
    state.addSnapshot.mockRejectedValueOnce(new Error('Snapshot rejected'));
    render(<MemoryRouter><Wealth /></MemoryRouter>);
    const sheet = openEdit('Cash reserve');
    fireEvent.change(within(sheet).getByLabelText('Value (SGD)'), { target: { value: '1' } });
    fireEvent.click(within(sheet).getByRole('button', { name: 'Save changes' }));
    expect((await within(sheet).findByRole('alert')).textContent).toBe('Snapshot rejected');
    expect(screen.getByRole('dialog', { name: 'Edit Cash reserve' })).toBeTruthy();
  });

  it('archives a position from its edit sheet', async () => {
    render(<MemoryRouter><Wealth /></MemoryRouter>);
    const sheet = openEdit('Old loan');
    fireEvent.click(within(sheet).getByRole('button', { name: 'Archive' }));
    await waitFor(() => expect(state.removePosition).toHaveBeenCalledWith('old'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('opens the add sheet on the requested tab from the phone overflow menu', () => {
    setViewportWidth(viewports.phone);
    render(<MemoryRouter><Wealth /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'More Wealth actions' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Wealth' })).getByRole('button', { name: 'Add debt' }));
    const sheet = screen.getByRole('dialog', { name: 'Add to your wealth' });
    expect(within(sheet).getByRole('tab', { name: 'Debt', selected: true })).toBeTruthy();
    expect(within(sheet).getByLabelText('Amount owed today (SGD)')).toBeTruthy();
  });
});
