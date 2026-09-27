import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { calculateRetirement, type FireProfile, type RetirementPlan, type WealthPosition, type WealthPositionSnapshot } from '@firebuddy/shared';
import fixtures from '../../../../packages/shared/fixtures/retirement.json';
import FireSetup from './FireSetup';
import FirePlanner from './FirePlanner';
import { setViewportWidth, viewports } from '../test/viewport';

const state = vi.hoisted(() => ({ profile: null as FireProfile | null, positions: [] as WealthPosition[], snapshots: [] as WealthPositionSnapshot[], updateProfile: vi.fn(), runScenario: vi.fn(), addSnapshot: vi.fn() }));
vi.mock('../app/financialFoundationContext', () => ({ useFinancialFoundation: () => ({
  profile: state.profile, positions: state.positions, snapshots: state.snapshots, contributions: [], status: 'ready', demoMode: true,
  summary: { effectiveDate: '2026-01-01', fire: calculateRetirement(state.profile?.activePlan, 0, '2026-01-01') },
  updateProfile: state.updateProfile, runScenario: state.runScenario, addSnapshot: state.addSnapshot,
}) }));
vi.mock('../app/fireBuddyContext', async () => ({
  ...await vi.importActual('../app/fireBuddyContext'), useFireBuddy: () => ({ transactions: [] }),
}));

const plan = { ...fixtures.base, cpfPlan: 'unknown' } as RetirementPlan;
function setupProfile(): FireProfile {
  return { id: 'p', userId: 'u', monthlyContribution: '0', expectedReturnRate: '0.05', inflationRate: '0.025', withdrawalRate: '0.04', retirementSpendingOverride: null, targetFiDate: null, birthYear: 1976, createdAt: '', updatedAt: '', activePlan: plan, draftPlan: { step: 1, inputs: plan } };
}

const brokerage: WealthPosition = { id: 'broker', userId: 'u', name: 'Brokerage', positionKind: 'asset', positionType: 'investment', liquidityClass: 'less_liquid', includeInFi: true, isEmergencyFund: false, restrictionType: 'none', currency: 'SGD', interestRate: null, monthlyPayment: null, nextPaymentDate: null, originalPrincipal: null, isArchived: false, archivedAt: null, latestSnapshot: null, createdAt: '', updatedAt: '' };

describe('retirement plan workflows', () => {
  beforeEach(() => {
    state.profile = setupProfile(); state.positions = []; state.snapshots = [];
    state.updateProfile.mockReset().mockResolvedValue(undefined); state.addSnapshot.mockReset().mockResolvedValue(undefined);
    state.runScenario.mockReset().mockResolvedValue(calculateRetirement(plan, 0, '2026-01-01'));
  });

  it('records a typed asset value in Wealth when the assets step is saved, so both pages agree', async () => {
    state.positions = [brokerage];
    state.snapshots = [{ id: 's1', userId: 'u', wealthPositionId: 'broker', valueDate: '2025-12-01', amount: '100000.00', createdAt: '', updatedAt: '' }];
    state.profile!.draftPlan = { step: 2, inputs: { ...plan, assetIds: ['broker'], portfolioOverride: null } };
    render(<MemoryRouter><FireSetup /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Brokerage value for this plan (SGD)'), { target: { value: '120000' } });
    expect(screen.getByText(/recorded in Wealth as today’s value \(2026-01-01\)/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(state.updateProfile).toHaveBeenCalled());
    expect(state.addSnapshot).toHaveBeenCalledWith('broker', { valueDate: '2026-01-01', amount: '120000.00' });
    expect(state.addSnapshot.mock.invocationCallOrder[0]).toBeLessThan(state.updateProfile.mock.invocationCallOrder[0]);
    const saved = state.updateProfile.mock.calls[0][0].draftPlan.inputs;
    expect(saved.portfolioOverride).toBeNull();
    expect(saved.assetIds).toEqual(['broker']);
  });

  it('explains on the planner where the starting portfolio comes from', () => {
    state.profile!.activePlan = { ...plan, assetIds: ['broker'], portfolioOverride: null };
    render(<MemoryRouter><FirePlanner /></MemoryRouter>);
    expect(screen.getByText(/from 1 asset ticked in setup, at their latest values in/)).toBeTruthy();
  });

  it('resumes the saved step and saves manual spending only to the draft', async () => {
    render(<MemoryRouter><FireSetup /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Spending and savings' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/How much will you spend during retirement/), { target: { value: '4000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm step and continue' }));
    await waitFor(() => expect(state.updateProfile).toHaveBeenCalled());
    const payload = state.updateProfile.mock.calls[0][0];
    expect(payload.activePlan).toBeUndefined();
    expect(payload.draftPlan.step).toBe(2);
    expect(payload.draftPlan.inputs.monthlySpending).toBe(4000);
    expect(state.profile!.activePlan!.monthlySpending).toBe(3000);
    expect(screen.getByRole('heading', { name: 'Retirement assets' })).toBeTruthy();
  });

  it('retains the step and active plan after a failed save', async () => {
    state.updateProfile.mockRejectedValueOnce(new Error('Save failed'));
    render(<MemoryRouter><FireSetup /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm step and continue' }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Save failed');
    expect(screen.getByRole('heading', { name: 'Spending and savings' })).toBeTruthy();
    expect(state.profile!.activePlan).toEqual(plan);
  });

  it('requires final confirmation and activates separately from the draft', async () => {
    state.profile!.draftPlan = { step: 4, inputs: plan };
    render(<MemoryRouter><FireSetup /></MemoryRouter>);
    fireEvent.click(screen.getByRole('checkbox', { name: /I confirm/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm and activate plan' }));
    await waitFor(() => expect(state.updateProfile).toHaveBeenCalled());
    expect(state.updateProfile.mock.calls[0][0]).toMatchObject({ activePlan: plan, draftPlan: null });
  });

  it('previews the outcome of the draft on the review step and links back to each step', () => {
    state.profile!.draftPlan = { step: 4, inputs: plan };
    render(<MemoryRouter><FireSetup /></MemoryRouter>);
    // The fixture retires this month with no capital, so the preview reports a shortfall.
    expect(screen.getByText(/Shortfall of .* at retirement/)).toBeTruthy();
    expect(screen.getByText('Typed by you')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Edit timeline' }));
    expect(screen.getByRole('heading', { name: 'Your timeline' })).toBeTruthy();
    expect(state.updateProfile).not.toHaveBeenCalled();
  });

  it('ticks the optional income step once it has been confirmed and passed', async () => {
    state.profile!.draftPlan = { step: 3, inputs: plan };
    render(<MemoryRouter><FireSetup /></MemoryRouter>);
    const incomeStep = screen.getByRole('button', { name: /Retirement income/ });
    expect(incomeStep.className).not.toContain('retirement-step-done');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm step and continue' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Assumptions and review' })).toBeTruthy());
    expect(screen.getByRole('button', { name: /Retirement income/ }).className).toContain('retirement-step-done');
  });

  it('explains when the draft is too incomplete to preview', () => {
    state.profile!.draftPlan = { step: 4, inputs: { ...plan, retirementMonth: '' } };
    render(<MemoryRouter><FireSetup /></MemoryRouter>);
    expect(screen.getByText('No preview yet')).toBeTruthy();
    expect(screen.queryByText(/at retirement$/)).toBeNull();
  });

  it('shows unknown CPF and compares a scenario without saving', async () => {
    render(<MemoryRouter><FirePlanner /></MemoryRouter>);
    expect(screen.getAllByText(/CPF income not included: payout is not yet known/).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText('Monthly spending today (SGD)'), { target: { value: '2000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Compare scenario' }));
    await waitFor(() => expect(state.runScenario).toHaveBeenCalledWith(expect.objectContaining({ planOverrides: expect.objectContaining({ monthlySpending: 2000 }) })));
    expect(state.updateProfile).not.toHaveBeenCalled();
  });

  it('keeps unsaved setup answers when the route unmounts and mounts again', () => {
    const first = render(<MemoryRouter><FireSetup /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText(/How much will you spend during retirement/), { target: { value: '4200' } });
    fireEvent.change(screen.getByLabelText('Your monthly income (SGD)'), { target: { value: '7000' } });
    first.unmount();

    render(<MemoryRouter><FireSetup /></MemoryRouter>);
    expect((screen.getByLabelText(/How much will you spend during retirement/) as HTMLInputElement).value).toBe('4200');
    expect((screen.getByLabelText('Your monthly income (SGD)') as HTMLInputElement).value).toBe('7000');
    expect(state.updateProfile).not.toHaveBeenCalled();
  });

  it('discards the tab draft once a newer profile has been saved', () => {
    const first = render(<MemoryRouter><FireSetup /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText(/How much will you spend during retirement/), { target: { value: '4200' } });
    first.unmount();

    state.profile = { ...setupProfile(), updatedAt: '2026-09-20T00:00:00Z' };
    render(<MemoryRouter><FireSetup /></MemoryRouter>);
    expect((screen.getByLabelText(/How much will you spend during retirement/) as HTMLInputElement).value).toBe('3000');
  });

  it('keeps the temporary scenario and its result when the planner is reopened', async () => {
    const first = render(<MemoryRouter><FirePlanner /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Monthly spending today (SGD)'), { target: { value: '2000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Compare scenario' }));
    await waitFor(() => expect(document.querySelector('.retirement-scenario-result')).not.toBeNull());
    first.unmount();

    render(<MemoryRouter><FirePlanner /></MemoryRouter>);
    expect((screen.getByLabelText('Monthly spending today (SGD)') as HTMLInputElement).value).toBe('2000');
    expect(document.querySelector('.retirement-scenario-result')).not.toBeNull();
    expect(state.runScenario).toHaveBeenCalledTimes(1);
  });
});

describe('retirement planning on a phone', () => {
  beforeEach(() => {
    state.profile = setupProfile();
    state.updateProfile.mockReset().mockResolvedValue(undefined);
    state.runScenario.mockReset().mockResolvedValue(calculateRetirement(plan, 0, '2026-01-01'));
  });

  it('collapses the plan summary so it does not sit between the form and its actions', () => {
    setViewportWidth(viewports.phone);
    const phone = render(<MemoryRouter><FireSetup /></MemoryRouter>);

    const disclosure = document.querySelector('.setup-summary-disclosure');
    expect(disclosure).not.toBeNull();
    expect((disclosure as HTMLDetailsElement).open).toBe(false);
    // The aside form is reserved for the three-column layout.
    expect(screen.queryByRole('complementary', { name: 'Your plan so far' })).toBeNull();
    phone.unmount();

    setViewportWidth(viewports.desktop);
    render(<MemoryRouter><FireSetup /></MemoryRouter>);
    expect(screen.getByRole('complementary', { name: 'Your plan so far' })).toBeTruthy();
    expect(document.querySelector('.setup-summary-disclosure')).toBeNull();
  });

  it('keeps only the setup call to action in the planner toolbar on a phone', () => {
    setViewportWidth(viewports.phone);
    render(<MemoryRouter><FirePlanner /></MemoryRouter>);

    expect(screen.queryByRole('link', { name: 'Review assets' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'More FIRE Planner actions' }));
    const sheet = screen.getByRole('dialog', { name: 'FIRE Planner' });
    expect(within(sheet).getByRole('button', { name: 'Review assets' })).toBeTruthy();
  });
});
