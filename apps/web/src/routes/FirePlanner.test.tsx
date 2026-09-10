import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { calculateRetirement, type FireProfile, type RetirementPlan } from '@firebuddy/shared';
import fixtures from '../../../../packages/shared/fixtures/retirement.json';
import FireSetup from './FireSetup';
import FirePlanner from './FirePlanner';

const state = vi.hoisted(() => ({ profile: null as FireProfile | null, updateProfile: vi.fn(), runScenario: vi.fn() }));
vi.mock('../app/FinancialFoundationProvider', () => ({ useFinancialFoundation: () => ({
  profile: state.profile, positions: [], snapshots: [], contributions: [], status: 'ready', demoMode: true,
  summary: { effectiveDate: '2026-01-01', fire: calculateRetirement(state.profile?.activePlan, 0, '2026-01-01') },
  updateProfile: state.updateProfile, runScenario: state.runScenario,
}) }));
vi.mock('../app/FireBuddyProvider', async () => ({
  ...await vi.importActual('../app/FireBuddyProvider'), useFireBuddy: () => ({ transactions: [] }),
}));

const plan = { ...fixtures.base, cpfPlan: 'unknown' } as RetirementPlan;
function setupProfile(): FireProfile {
  return { id: 'p', userId: 'u', monthlyContribution: '0', expectedReturnRate: '0.05', inflationRate: '0.025', withdrawalRate: '0.04', retirementSpendingOverride: null, targetFiDate: null, birthYear: 1976, createdAt: '', updatedAt: '', activePlan: plan, draftPlan: { step: 1, inputs: plan } };
}

describe('retirement plan workflows', () => {
  beforeEach(() => { state.profile = setupProfile(); state.updateProfile.mockReset().mockResolvedValue(undefined); state.runScenario.mockReset().mockResolvedValue(calculateRetirement(plan, 0, '2026-01-01')); });

  it('resumes the saved step and saves manual spending only to the draft', async () => {
    render(<MemoryRouter><FireSetup /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Spending and savings' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/Retirement spending per month/), { target: { value: '4000' } });
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

  it('shows unknown CPF and compares a scenario without saving', async () => {
    render(<MemoryRouter><FirePlanner /></MemoryRouter>);
    expect(screen.getAllByText(/CPF income not included: payout is not yet known/).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText('Monthly spending today (SGD)'), { target: { value: '2000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Compare scenario' }));
    await waitFor(() => expect(state.runScenario).toHaveBeenCalledWith(expect.objectContaining({ planOverrides: expect.objectContaining({ monthlySpending: 2000 }) })));
    expect(state.updateProfile).not.toHaveBeenCalled();
  });
});
